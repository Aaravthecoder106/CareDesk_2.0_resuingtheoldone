import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearChatHistory } from '@/lib/data/chat'
import { apiError } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { logAudit, requestIp } from '@/lib/data/audit'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401)
    const userId = user.id

    const { searchParams } = new URL(req.url)
    const patientParam = searchParams.get('patient') || searchParams.get('patientId')
    let bodyPatientId: string | undefined
    try {
      const body = await req.json()
      bodyPatientId = body?.patientId
    } catch {
      // Body may be empty on standard DELETE
    }
    const patientId = patientParam || bodyPatientId || undefined

    const ok = await clearChatHistory(patientId)

    // Audit log clearing of chat history (HIPAA compliance)
    await logAudit({
      actorId: userId,
      action: 'DELETE',
      table: 'chat_messages',
      recordId: patientId ? `patient:${patientId}` : 'self',
      ip: requestIp(req),
    })

    logger.info({ route: '/api/chat/clear', userId, patientId, ok }, 'Chat history cleared')
    return NextResponse.json({ ok })
  } catch (err) {
    logger.error({
      route: '/api/chat/clear',
      err: err instanceof Error ? err.message : String(err),
    }, 'Clear failed')
    return apiError(err instanceof Error ? err.message : 'Clear failed')
  }
}
