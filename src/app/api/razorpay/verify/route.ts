import { NextResponse } from 'next/server'

/**
 * POST /api/razorpay/verify
 * CareDesk is 100% free and unlimited; verification is a no-op success.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    verified: true,
    message: 'All features are 100% free and unlocked.',
  })
}
