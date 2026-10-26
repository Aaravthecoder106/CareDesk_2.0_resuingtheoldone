import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCriticalAttentionAlerts,
  getDirectCareMessages,
  sendDirectCareMessage,
} from '@/lib/data/messages'
import { getFamilyMembers } from '@/lib/data/family'
import { apiError } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401)

    const [alerts, messages, connected] = await Promise.all([
      getCriticalAttentionAlerts(),
      getDirectCareMessages(),
      getFamilyMembers(),
    ])

    const acceptedPartners = connected.filter((m) => m.status === 'accepted')
    const role = (user.user_metadata?.elder_care_role || user.user_metadata?.role || 'caregiver') as 'caregiver' | 'patient'

    return NextResponse.json({
      role,
      criticalAlerts: alerts,
      directMessages: messages,
      connectedPartners: acceptedPartners,
    })
  } catch (err) {
    logger.error({
      route: '/api/messages:GET',
      err: err instanceof Error ? err.message : String(err),
    }, 'Failed to load messages')
    return apiError(err instanceof Error ? err.message : 'Failed to fetch messages')
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401)

    const body = await req.json()
    const { recipientId, content } = body

    if (!recipientId || !content) {
      return apiError('recipientId and content are required', 400)
    }

    const result = await sendDirectCareMessage(recipientId, content)
    if (!result.ok) {
      return apiError(result.error, 400)
    }

    return NextResponse.json({ ok: true, message: result.message })
  } catch (err) {
    logger.error({
      route: '/api/messages:POST',
      err: err instanceof Error ? err.message : String(err),
    }, 'Failed to send message')
    return apiError(err instanceof Error ? err.message : 'Failed to send message')
  }
}
