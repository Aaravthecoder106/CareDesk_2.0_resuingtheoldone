import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFamilyInvite } from '@/lib/data/family'
import { resolveAppUrl, sendFamilyInviteEmail } from '@/lib/email/family-invite'
import { apiLimiter } from '@/lib/rate-limit'
import { applyRateLimit, apiError } from '@/lib/api-helpers'
import { familyInviteSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401)
    const userId = user.id

    const rateLimited = applyRateLimit(req, apiLimiter, userId)
    if (rateLimited) return rateLimited

    const body = await req.json()
    const parsed = familyInviteSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || 'Invalid input', 400)
    }

    const { email, relation } = parsed.data
    const result = await createFamilyInvite(email, relation)
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 })
    }

    const inviterName =
      user.user_metadata?.full_name ||
      [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') ||
      user.email ||
      'A CareDesk user'

    const appUrl = resolveAppUrl(req.headers.get('origin'))
    const emailResult = await sendFamilyInviteEmail({
      to: email.trim(),
      token: result.token,
      inviterName,
      relation,
      appUrl,
    })

    const durationMs = Date.now() - start

    if (!emailResult.ok) {
      logger.warn({
        route: '/api/family/invite',
        userId,
        emailSent: false,
        error: emailResult.error,
        durationMs,
      }, 'Family invite email delivery failed')
      return NextResponse.json({
        ok: true,
        emailSent: false,
        token: result.token,
        error: `Invite created, but email could not be sent: ${emailResult.error}. Copy the code from Pending Invites.`,
      })
    }

    logger.info({
      route: '/api/family/invite',
      userId,
      emailSent: true,
      durationMs,
    }, 'Family invite sent')

    return NextResponse.json({ ok: true, emailSent: true })
  } catch (err) {
    const durationMs = Date.now() - start
    logger.error({
      route: '/api/family/invite',
      durationMs,
      err: err instanceof Error ? err.message : String(err),
    }, 'Family invite failed')
    return apiError(err instanceof Error ? err.message : 'Invite failed')
  }
}
