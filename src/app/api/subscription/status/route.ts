import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserReportCount, getUserFamilyCount } from '@/lib/data/subscriptions'

/**
 * GET /api/subscription/status
 * In 100% Free & Unlimited mode, all users have unlocked Pro & Family status.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const [reportCount, familyCount] = await Promise.all([
      getUserReportCount(userId),
      getUserFamilyCount(userId),
    ])

    return NextResponse.json({
      tier: 'unlimited',
      plan: {
        name: 'CareDesk Unlimited (100% Free)',
        priceGlobal: '$0',
        priceIndia: '₹0',
        features: [
          'Unlimited report uploads & storage',
          'Unlimited AI health chat with rich markdown',
          'Full biomarker trend graphs & analytics',
          'Unlimited family members & profiles',
          'Priority AI processing speed',
          'PDF export & clinical summary',
        ],
      },
      limits: {
        maxReportsPerMonth: -1,
        lifetimeCap: false,
        maxProfiles: -1,
      },
      usage: {
        reports: reportCount,
        familyMembers: familyCount,
      },
      subscription: {
        status: 'active',
        currentPeriodEnd: null,
        razorpayPaymentId: null,
      },
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json({ error: 'Failed to get subscription status' }, { status: 500 })
  }
}
