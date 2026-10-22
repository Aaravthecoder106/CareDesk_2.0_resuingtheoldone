import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { ensureCurrentUserProvisioned } from '@/lib/data/users'
import type { Tables } from '@/lib/supabase/types'

/** Free Explorer plan: messages per day and history retention constant. */
export const FREE_CHAT_DAILY_LIMIT = 5
export const FREE_CHAT_HISTORY_DAYS = 7

export async function getChatHistory(patientId?: string | null, limit = 50): Promise<Tables<'chat_messages'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Ensure user is provisioned in public.users/patients and legacy accounts migrated
  await ensureCurrentUserProvisioned()

  const targetPatient = patientId && patientId !== 'me' && patientId !== user.id ? patientId : null

  // Retrieve the latest messages for the current user and active patient context
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)

  if (targetPatient) {
    query = query.eq('patient_id', targetPatient)
  } else {
    // Personal conversation thread
    query = query.or(`patient_id.is.null,patient_id.eq.${user.id}`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Graceful backward compatibility if migration 0008 hasn't run on the DB yet
    if (error.code === 'PGRST204' || error.message.includes('patient_id')) {
      const fallback = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      return (fallback.data || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
    throw new Error(`getChatHistory: ${error.message}`)
  }

  // Sort ascending chronologically; if timestamps match to the microsecond, place 'user' before 'assistant'
  return (data || []).sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (diff !== 0) return diff
    if (a.role === 'user' && b.role === 'assistant') return -1
    if (a.role === 'assistant' && b.role === 'user') return 1
    return 0
  })
}

/**
 * Count the messages the current user has sent today (UTC).
 * Used to enforce the free-tier daily chat cap.
 */
export async function countChatMessagesSentToday(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', startOfDay.toISOString())

  return count || 0
}

export async function clearChatHistory(patientId?: string | null): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const targetPatient = patientId && patientId !== 'me' && patientId !== user.id ? patientId : null

  let query = supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id)

  if (targetPatient) {
    query = query.eq('patient_id', targetPatient)
  } else {
    query = query.or(`patient_id.is.null,patient_id.eq.${user.id}`)
  }

  const { error } = await query

  if (error && (error.code === 'PGRST204' || error.message.includes('patient_id'))) {
    const fallback = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)
    return !fallback.error
  }

  return !error
}
