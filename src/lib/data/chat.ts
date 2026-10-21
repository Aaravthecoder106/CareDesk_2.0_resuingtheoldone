import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { ensureCurrentUserProvisioned } from '@/lib/data/users'
import type { Tables } from '@/lib/supabase/types'

/** Free Explorer plan: messages per day and history retention constant. */
export const FREE_CHAT_DAILY_LIMIT = 5
export const FREE_CHAT_HISTORY_DAYS = 7

export async function getChatHistory(limit = 50): Promise<Tables<'chat_messages'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Ensure user is provisioned in public.users/patients and legacy accounts migrated
  await ensureCurrentUserProvisioned()

  // Retrieve the latest messages for the current user up to `limit`
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getChatHistory: ${error.message}`)

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

export async function clearChatHistory(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id)

  return !error
}
