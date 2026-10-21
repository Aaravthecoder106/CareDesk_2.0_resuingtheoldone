import { NextResponse } from 'next/server'

/**
 * POST /api/razorpay/order
 * CareDesk is 100% free and unlimited; Razorpay order creation is disabled.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    free: true,
    message: 'CareDesk is 100% free and unlimited. No payment is required.',
  })
}
