import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getUserSubscription } from '@/lib/data/subscriptions'
import type { Tables } from '@/lib/supabase/types'

/** Free Explorer plan: messages per day and history retention. */
export const FREE_CHAT_DAILY_LIMIT = 5
export const FREE_CHAT_HISTORY_DAYS = 7

export async function getChatHistory(limit = 50): Promise<Tables<'chat_messages'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Free tier only retains 7 days of history (advertised plan limit).
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit)

  const tier = await getUserSubscription(user.id)
  if (tier === 'free') {
    const cutoff = new Date(Date.now() - FREE_CHAT_HISTORY_DAYS * 24 * 60 * 60 * 1000)
    query = query.gte('created_at', cutoff.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(`getChatHistory: ${error.message}`)
  return data || []
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
