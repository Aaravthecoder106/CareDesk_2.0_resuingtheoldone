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
 * This function provides a reliable application-level fallback.
 */
export async function ensureCurrentUserProvisioned(): Promise<Tables<'users'> | null> {
  const existing = await getCurrentUser()
  if (existing) return existing

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminSupabaseClient()
  const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || null
  const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null

  const { error: userError } = await admin
    .from('users')
    .upsert({
      id: user.id,
      email: user.email || '',
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
