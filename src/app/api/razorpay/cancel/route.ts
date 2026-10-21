import { NextResponse } from 'next/server'

/**
 * POST /api/razorpay/cancel
 * CareDesk is 100% free and unlimited.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'CareDesk is 100% free and unlimited forever.',
  })
}
