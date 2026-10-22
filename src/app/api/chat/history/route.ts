import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChatHistory } from '@/lib/data/chat'
import { apiError } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { logAudit, requestIp } from '@/lib/data/audit'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patient') || searchParams.get('patientId') || undefined

    const messages = await getChatHistory(patientId)

    // Audit log read of chat history (HIPAA compliance)
    await logAudit({
      actorId: user.id,
      action: 'SELECT',
      table: 'chat_messages',
      recordId: `history:${patientId || 'self'}:${messages.length}`,
      ip: requestIp(req),
    })

    logger.debug({ route: '/api/chat/history', userId: user.id, patientId, count: messages.length }, 'Chat history fetched')
    return NextResponse.json({ messages })
  } catch (err) {
    logger.error({
      route: '/api/chat/history',
      err: err instanceof Error ? err.message : String(err),
    }, 'Failed to fetch history')
    return apiError(err instanceof Error ? err.message : 'Failed to fetch history')
  }
}
