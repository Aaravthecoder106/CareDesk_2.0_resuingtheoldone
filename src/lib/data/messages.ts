import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getFamilyMembers } from '@/lib/data/family'

export interface CriticalAttentionAlert {
  id: string
  patientId: string
  patientName: string
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  testName?: string
  value?: number | null
  unit?: string | null
  flag?: string | null
  createdAt: string
  readAt?: string | null
}

export interface DirectCareMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: 'caregiver' | 'patient'
  recipientId: string
  recipientName: string
  content: string
  createdAt: string
  readAt?: string | null
}

/**
 * Fetch all AI findings needing attention for the current user.
 * If user is a caregiver, includes findings for all connected patients.
 * If user is a patient, includes findings for their own records.
 */
export async function getCriticalAttentionAlerts(): Promise<CriticalAttentionAlert[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminSupabaseClient()
  const role = (user.user_metadata?.elder_care_role || user.user_metadata?.role || 'caregiver') as 'caregiver' | 'patient'
  const isCaregiver = role === 'caregiver'

  const alerts: CriticalAttentionAlert[] = []

  // 1. Fetch from notifications table (AI generated alerts)
  const { data: notifs } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .in('type', ['critical_alert', 'critical_ai_alert', 'health_alert'])
    .order('created_at', { ascending: false })
    .limit(30)

  if (notifs) {
    for (const n of notifs) {
      alerts.push({
        id: n.id,
        patientId: user.id,
        patientName: user.user_metadata?.full_name || 'Patient',
        title: n.title,
        message: n.body || 'AI detected items requiring clinical or caregiver attention.',
        severity: n.type.includes('critical') ? 'critical' : 'warning',
        createdAt: n.created_at,
        readAt: n.read_at,
      })
    }
  }

  // 2. Resolve connected patients if user is a caregiver, or self if patient
  let targetPatientIds: { id: string; name: string }[] = []

  if (isCaregiver) {
    const connected = await getFamilyMembers()
    targetPatientIds = connected
      .filter((m) => m.status === 'accepted')
      .map((m) => ({
        id: m.connected_user_id,
        name: m.display_name || 'Connected Patient',
      }))
  } else {
    targetPatientIds = [{
      id: user.id,
      name: user.user_metadata?.full_name || 'You (Patient)',
    }]
  }

  // 3. For connected patients, query any abnormal/critical lab results directly
  for (const target of targetPatientIds) {
    const { data: abnormalLabs } = await admin
      .from('lab_results')
      .select('id, test_name, value, unit, flag, test_date, created_at')
      .eq('patient_id', target.id)
      .neq('flag', 'normal')
      .not('flag', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (abnormalLabs) {
      for (const lab of abnormalLabs) {
        const severity: 'critical' | 'warning' =
          lab.flag?.toLowerCase() === 'critical' ? 'critical' : 'warning'

        // Avoid exact duplicate titles
        const alertTitle = `AI Attention: ${lab.test_name} is ${lab.flag?.toUpperCase()}`
        const alreadyExists = alerts.some((a) => a.title === alertTitle && a.patientId === target.id)

        if (!alreadyExists) {
          alerts.push({
            id: `lab-${lab.id}`,
            patientId: target.id,
            patientName: target.name,
            title: alertTitle,
            message: `AI detected ${lab.test_name} at ${lab.value ?? ''} ${lab.unit ?? ''} (${lab.flag}). Immediate caregiver review and doctor consult recommended.`,
            severity,
            testName: lab.test_name,
            value: lab.value,
            unit: lab.unit,
            flag: lab.flag,
            createdAt: lab.created_at || lab.test_date || new Date().toISOString(),
          })
        }
      }
    }
  }

  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Fetch direct communication messages between the user and their connected caregiver / patient.
 */
export async function getDirectCareMessages(): Promise<DirectCareMessage[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminSupabaseClient()
  const connected = await getFamilyMembers()
  const acceptedIds = connected
    .filter((m) => m.status === 'accepted')
    .map((m) => m.connected_user_id)

  if (acceptedIds.length === 0) return []

  // Fetch notifications of type 'care_message' received by user or sent by user
  const { data: messages } = await admin
    .from('notifications')
    .select('*')
    .in('type', ['care_message', 'patient_note', 'caregiver_note'])
    .or(`user_id.eq.${user.id},body.ilike.%"recipientId":"${user.id}"%`)
    .order('created_at', { ascending: true })
    .limit(100)

  const parsedList: DirectCareMessage[] = []

  if (messages) {
    for (const m of messages) {
      try {
        if (m.body && m.body.startsWith('{') && m.body.includes('"senderId"')) {
          const parsed = JSON.parse(m.body)
          parsedList.push({
            id: m.id,
            senderId: parsed.senderId,
            senderName: parsed.senderName || 'User',
            senderRole: parsed.senderRole || 'caregiver',
            recipientId: parsed.recipientId,
            recipientName: parsed.recipientName || 'User',
            content: parsed.content || '',
            createdAt: m.created_at,
            readAt: m.read_at,
          })
        } else {
          parsedList.push({
            id: m.id,
            senderId: m.user_id === user.id ? 'connected' : user.id,
            senderName: m.title.replace('Message from ', ''),
            senderRole: 'caregiver',
            recipientId: m.user_id,
            recipientName: 'You',
            content: m.body || '',
            createdAt: m.created_at,
            readAt: m.read_at,
          })
        }
      } catch {
        // Skip malformed entries
      }
    }
  }

  return parsedList
}

/**
 * Send a direct message between connected caregiver and patient.
 */
export async function sendDirectCareMessage(
  recipientId: string,
  content: string
): Promise<{ ok: true; message: DirectCareMessage } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }

    if (!content.trim()) return { ok: false, error: 'Message cannot be empty' }

    const admin = createAdminSupabaseClient()

    // Verify connection exists
    const { data: link } = await admin
      .from('family_members')
      .select('id, status')
      .eq('status', 'accepted')
      .or(`and(owner_id.eq.${user.id},member_id.eq.${recipientId}),and(owner_id.eq.${recipientId},member_id.eq.${user.id})`)
      .maybeSingle()

    if (!link) {
      return { ok: false, error: 'You can only message connected caregivers or patients.' }
    }

    const senderRole = (user.user_metadata?.elder_care_role || user.user_metadata?.role || 'caregiver') as 'caregiver' | 'patient'
    const senderName = user.user_metadata?.full_name || (senderRole === 'caregiver' ? 'Caregiver' : 'Patient')

    // Get recipient name
    const { data: recipientUser } = await admin
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', recipientId)
      .maybeSingle()

    const recipientName = [recipientUser?.first_name, recipientUser?.last_name].filter(Boolean).join(' ') || recipientUser?.email || 'Connected Partner'

    const payload = {
      senderId: user.id,
      senderName,
      senderRole,
      recipientId,
      recipientName,
      content: content.trim(),
    }

    const { data: inserted, error } = await admin
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'care_message',
        title: `Message from ${senderName}`,
        body: JSON.stringify(payload),
      })
      .select('id, created_at')
      .single()

    if (error || !inserted) {
      return { ok: false, error: error?.message || 'Failed to send message' }
    }

    const createdMsg: DirectCareMessage = {
      id: inserted.id,
      senderId: user.id,
      senderName,
      senderRole,
      recipientId,
      recipientName,
      content: content.trim(),
      createdAt: inserted.created_at,
    }

    return { ok: true, message: createdMsg }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
  }
}
