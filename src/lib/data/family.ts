import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Tables } from '@/lib/supabase/types'

export type FamilyMemberWithDetails = Tables<'family_members'> & {
  display_name?: string
  member_email?: string
  connected_user_id: string
}

export async function getFamilyMembers(): Promise<FamilyMemberWithDetails[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const userId = user.id
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .or(`owner_id.eq.${userId},member_id.eq.${userId}`)

  if (error) throw new Error(`getFamilyMembers: ${error.message}`)
  const links = data || []
  if (links.length === 0) return []

  // Resolve the other side's user id and profile details
  const otherIds = links.map((l) => (l.owner_id === userId ? l.member_id : l.owner_id))
  
  // Use admin client so we reliably fetch name/email across accepted links
  const admin = createAdminSupabaseClient()
  const { data: users } = await admin
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', otherIds)

  const userMap = new Map(
    (users || []).map((u) => [
      u.id,
      {
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Connected Member',
        email: u.email,
      },
    ])
  )

  const userRole = (user.user_metadata?.elder_care_role || user.user_metadata?.role || 'caregiver') as string
  const isPatient = userRole === 'patient'

  return links.map((l) => {
    const connectedId = l.owner_id === userId ? l.member_id : l.owner_id
    const info = userMap.get(connectedId)
    return {
      ...l,
      relation: isPatient ? 'Caregiver' : 'Patient',
      display_name: info?.name,
      member_email: info?.email,
      connected_user_id: connectedId,
    }
  })
}

export async function getPendingInvites(): Promise<Tables<'family_invites'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('family_invites')
    .select('*')
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getPendingInvites: ${error.message}`)
  return data || []
}

/**
 * Generate a clean game-style Care Code (e.g. CARE-7492).
 * Fast, human-friendly for caregivers and patients.
 */
export async function createFamilyInvite(
  email?: string,
  relation?: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    // Patient rule: patient can only connect 1 caregiver
    const userRole = (user.user_metadata?.elder_care_role || user.user_metadata?.role || 'caregiver') as string
    if (userRole === 'patient') {
      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('status', 'accepted')
        .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)
      if (existing && existing.length >= 1) {
        return { ok: false, error: 'Patients can only connect to 1 caregiver. Disconnect your existing caregiver first to connect a new one.' }
      }
    }

    // Generate game-style room code (e.g. CARE-4891)
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    let token = `CARE-${randomDigits}`

    const inviteEmail = (email && email.trim()) || `${token.toLowerCase()}@carecode.internal`

    const { error } = await supabase
      .from('family_invites')
      .insert({
        owner_id: user.id,
        email: inviteEmail,
        relation: relation || (userRole === 'patient' ? 'Caregiver' : 'Patient'),
        token,
        status: 'pending',
      })

    if (error) {
      // Retry with 6-digit code in case of collision
      token = `CARE-${Math.floor(100000 + Math.random() * 900000)}`
      const { error: retryErr } = await supabase
        .from('family_invites')
        .insert({
          owner_id: user.id,
          email: inviteEmail,
          relation: relation || (userRole === 'patient' ? 'Caregiver' : 'Patient'),
          token,
          status: 'pending',
        })
      if (retryErr) return { ok: false, error: retryErr.message }
    }

    return { ok: true, token }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invite failed' }
  }
}

/**
 * Accept invite by Care Code or token.
 * Automatically links both users as 'accepted' for game-like instant connection.
 */
export async function acceptFamilyInvite(
  rawToken: string
): Promise<{ ok: true; status: string; owner_id?: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    let token = rawToken.trim()
    // Support without hyphen: CARE8492 -> CARE-8492
    if (/^CARE\d+$/i.test(token)) {
      token = token.replace(/^(CARE)(\d+)$/i, '$1-$2')
    }

    const admin = createAdminSupabaseClient()

    // 1. Look up invite by Care Code or token (case-insensitive)
    const { data: invite, error: inviteErr } = await admin
      .from('family_invites')
      .select('*')
      .ilike('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (inviteErr || !invite) {
      // Try calling RPC as fallback for legacy tokens
      const { data: rpcData, error: rpcError } = await supabase.rpc('accept_family_invite', { _token: rawToken.trim() })
      if (!rpcError && rpcData) {
        const ownerId = (rpcData as Record<string, unknown>)?.owner_id as string
        if (ownerId) {
          await admin
            .from('family_members')
            .update({ status: 'accepted' })
            .eq('owner_id', ownerId)
            .eq('member_id', user.id)
        }
        return { ok: true, status: 'accepted' }
      }
      return { ok: false, error: 'Invalid or expired Care Code. Please check the code and try again.' }
    }

    if (invite.owner_id === user.id) {
      return { ok: false, error: 'You cannot connect with your own Care Code.' }
    }

    // Patient rule: patient can only connect 1 caregiver
    const userRole = (user.user_metadata?.elder_care_role || user.user_metadata?.role || 'caregiver') as string
    if (userRole === 'patient') {
      const { data: existing } = await admin
        .from('family_members')
        .select('id')
        .eq('status', 'accepted')
        .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)
      if (existing && existing.length >= 1) {
        return { ok: false, error: 'Patients can only connect to 1 caregiver. Disconnect your existing caregiver first to connect a new one.' }
      }
    }

    // Check if the code creator is a patient who already has 1 caregiver
    const { data: ownerUserAuth } = await admin.auth.admin.getUserById(invite.owner_id)
    const ownerRole = ownerUserAuth?.user?.user_metadata?.elder_care_role || ownerUserAuth?.user?.user_metadata?.role
    if (ownerRole === 'patient') {
      const { data: ownerConnections } = await admin
        .from('family_members')
        .select('id')
        .eq('status', 'accepted')
        .or(`owner_id.eq.${invite.owner_id},member_id.eq.${invite.owner_id}`)
      if (ownerConnections && ownerConnections.length >= 1) {
        return { ok: false, error: 'This patient already has a connected caregiver.' }
      }
    }

    // 2. Link them directly as accepted (instant game-invite pairing)
    const { error: linkErr } = await admin
      .from('family_members')
      .upsert(
        {
          owner_id: invite.owner_id,
          member_id: user.id,
          relation: invite.relation || (userRole === 'patient' ? 'Caregiver' : 'Patient'),
          status: 'accepted',
        },
        { onConflict: 'owner_id,member_id' }
      )

    if (linkErr) {
      return { ok: false, error: `Failed to link: ${linkErr.message}` }
    }

    // 3. Mark invite accepted
    await admin
      .from('family_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    // 4. Create celebratory mutual notifications
    const acceptorName = user.user_metadata?.full_name || user.email || (userRole === 'patient' ? 'Patient' : 'Caregiver')
    await admin.from('notifications').insert([
      {
        user_id: invite.owner_id,
        type: 'family_confirmed',
        title: 'Connection Established',
        body: `${acceptorName} used Care Code ${invite.token} and is now connected with you. Shared medical stats, AI health consults, and care messages are now active!`,
      },
      {
        user_id: user.id,
        type: 'family_confirmed',
        title: 'Connection Established',
        body: `You are now paired. Shared medical records, AI vitals monitoring, and care messages are now active!`,
      },
    ])

    return { ok: true, status: 'accepted', owner_id: invite.owner_id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Accept failed' }
  }
}

export async function confirmFamilyMember(
  memberId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from('family_members')
      .update({ status: 'accepted' })
      .eq('id', memberId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Confirm failed' }
  }
}

export async function removeFamilyMember(memberId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const userId = user.id
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', memberId)
    .or(`owner_id.eq.${userId},member_id.eq.${userId}`)

  return !error
}

export async function getNotifications(): Promise<Tables<'notifications'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(`getNotifications: ${error.message}`)
  return data || []
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  return !error
}
