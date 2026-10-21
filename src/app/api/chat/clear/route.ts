import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearChatHistory } from '@/lib/data/chat'
import { apiError } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401)
    const userId = user.id

    const ok = await clearChatHistory()
    logger.info({ route: '/api/chat/clear', userId, ok }, 'Chat history cleared')
    return NextResponse.json({ ok })
  } catch (err) {
    logger.error({
      route: '/api/chat/clear',
      err: err instanceof Error ? err.message : String(err),
    }, 'Clear failed')
    return apiError(err instanceof Error ? err.message : 'Clear failed')
  }
}
