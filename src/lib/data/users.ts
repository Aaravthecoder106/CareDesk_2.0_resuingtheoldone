import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Tables } from '@/lib/supabase/types'

/**
 * Server-side data-access layer for the current user's identity.
 * Reads go through the cookie-authenticated Supabase client (RLS-scoped).
 */

/**
 * Read the current user's public.users row (RLS-scoped).
 * Returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<Tables<'users'> | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error(`getCurrentUser: ${error.message}`)
  return data
}

/** Read the current user's patient profile (RLS-scoped). */
export async function getCurrentPatient(): Promise<Tables<'patients'> | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error(`getCurrentPatient: ${error.message}`)
  return data
}

/**
 * Guarantee the current user is provisioned in public.users and public.patients.
 * Under Supabase Auth, this is handled primarily by the `on_auth_user_created` trigger.
 * This function provides a reliable application-level fallback and automatically migrates
 * any legacy records (e.g. from prior Clerk auth) if an account with the same email exists under a legacy ID.
 */
export async function ensureCurrentUserProvisioned(): Promise<Tables<'users'> | null> {
  const existing = await getCurrentUser()
  if (existing) {
    const admin = createAdminSupabaseClient()
    await admin
      .from('patients')
      .upsert({ id: existing.id }, { onConflict: 'id', ignoreDuplicates: true })
    return existing
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const admin = createAdminSupabaseClient()
  const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || null
  const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null
  const userEmail = (user.email || '').trim().toLowerCase()

  // 1. Check if legacy records exist under a previous ID (e.g. Clerk user_...)
  if (userEmail) {
    const { data: legacyUser } = await admin
      .from('users')
      .select('id')
      .ilike('email', userEmail)
      .neq('id', user.id)
      .maybeSingle()

    if (legacyUser) {
      // Free the email unique constraint on the legacy row
      await admin
        .from('users')
        .update({ email: `migrated_${legacyUser.id}@caredesk.internal` })
        .eq('id', legacyUser.id)

      // Provision new user row
      await admin
        .from('users')
        .insert({
          id: user.id,
          email: userEmail,
          first_name: firstName,
          last_name: lastName,
          role: 'patient',
        })

      // Provision new patient row
      await admin
        .from('patients')
        .insert({ id: user.id })

      // Migrate patient child records
      await admin.from('reports').update({ patient_id: user.id }).eq('patient_id', legacyUser.id)
      await admin.from('medications').update({ patient_id: user.id }).eq('patient_id', legacyUser.id)
      await admin.from('conditions').update({ patient_id: user.id }).eq('patient_id', legacyUser.id)
      await admin.from('lab_results').update({ patient_id: user.id }).eq('patient_id', legacyUser.id)

      // Migrate user child records
      await admin.from('chat_messages').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('subscriptions').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('razorpay_orders').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('notifications').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('feedback').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('analytics_snapshots').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('library_settings').update({ user_id: user.id }).eq('user_id', legacyUser.id)
      await admin.from('audit_logs').update({ actor_id: user.id }).eq('actor_id', legacyUser.id)

      // Clean up legacy patient and user
      await admin.from('patients').delete().eq('id', legacyUser.id)
      await admin.from('users').delete().eq('id', legacyUser.id)

      return getCurrentUser()
    }
  }

  // 2. Normal provisioning flow
  const { error: userError } = await admin
    .from('users')
    .upsert({
      id: user.id,
      email: userEmail,
      first_name: firstName,
      last_name: lastName,
      role: 'patient',
    }, { onConflict: 'id' })

  if (userError) throw new Error(`ensureCurrentUserProvisioned: ${userError.message}`)

  await admin
    .from('patients')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

  return getCurrentUser()
}
