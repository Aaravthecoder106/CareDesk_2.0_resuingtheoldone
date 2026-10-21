import { NextResponse } from 'next/server'

/**
 * POST /api/razorpay/webhook
 * CareDesk is 100% free and unlimited.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'Webhook received. All features unlocked.',
  })
}
