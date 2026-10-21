import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { PlanTier } from '@/lib/razorpay'
import { getPlanLimits } from '@/lib/razorpay'

/** All valid plan tier strings stored in the DB */
const VALID_TIERS: PlanTier[] = [
  'free',
  'pro_individual_monthly',
  'pro_individual_annual',
  'family_monthly',
  'family_annual',
]

/**
 * Get the current user's subscription tier.
 * Unlocked 100% Free & Unlimited: defaults to the highest tier ('family_annual') for all users.
 */
export async function getUserSubscription(_userId: string): Promise<PlanTier> {
  return 'family_annual'
}

/**
 * Check if the user has any active paid subscription.
 * Unlocked 100% Free & Unlimited: all users have Pro/Family access.
 */
export async function isProUser(_userId: string): Promise<boolean> {
  return true
}

/**
 * Get the user's monthly report limit.
 * Unlocked 100% Free & Unlimited.
 */
export async function getUserReportLimit(_userId: string): Promise<number> {
  return Infinity
}

/**
 * Get the user's family/profile limit.
 * Unlocked 100% Free & Unlimited.
 */
export async function getUserFamilyLimit(_userId: string): Promise<number> {
  return Infinity
}

/**
 * Count the user's reports uploaded in the current billing month.
 * For free tier, counts ALL reports (lifetime cap).
 */
export async function getUserReportCount(userId: string): Promise<number> {
  const tier = await getUserSubscription(userId)
  const limits = getPlanLimits(tier)
  const supabase = await createClient()

  if (limits.lifetimeCap) {
    // Free tier: count all reports ever
    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', userId)
    return count || 0
  }

  // Paid tier: count reports from current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', userId)
    .gte('created_at', monthStart)
  return count || 0
}

/**
 * Count the user's current family members (accepted only).
 */
export async function getUserFamilyCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('status', 'accepted')
  return count || 0
}

/**
 * Upsert a subscription record (used by webhooks and payment verification).
 */
export async function upsertSubscription(params: {
  userId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  plan: string
  status: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
}) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: params.userId,
        razorpay_order_id: params.razorpayOrderId,
        razorpay_payment_id: params.razorpayPaymentId,
        plan: params.plan,
        status: params.status,
        current_period_start: params.currentPeriodStart || null,
        current_period_end: params.currentPeriodEnd || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}

/**
 * Cancel a subscription (set status to 'canceled', plan to 'free').
 */
export async function cancelSubscription(userId: string) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan: 'free', status: 'canceled', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
}

export type CompleteOrderResult =
  | { ok: true; plan: string; userId: string; alreadyCompleted: boolean }
  | { ok: false; error: string }

/**
 * Activate a subscription from a completed Razorpay order — the single path
 * used by both /api/razorpay/verify and the payment.captured webhook.
 *
 * Reads plan/amount from the server-side razorpay_orders row (never from the
 * client), computes the period, upserts the subscription, and flips the order
 * to 'completed'. If the order was already completed this returns success
 * WITHOUT extending the period again (replay protection), so a webhook and
 * the client verify call can race safely.
 */
export async function completeRazorpayOrder(
  orderId: string,
  paymentId: string
): Promise<CompleteOrderResult> {
  const supabase = createAdminSupabaseClient()

  const { data: order, error: orderError } = await supabase
    .from('razorpay_orders')
    .select('order_id, user_id, plan, amount, status')
    .eq('order_id', orderId)
    .single()
  if (orderError || !order) return { ok: false, error: 'unknown order' }
  if (!VALID_TIERS.includes(order.plan as PlanTier) || order.plan === 'free') {
    return { ok: false, error: 'invalid plan on order' }
  }

  if (order.status === 'completed') {
    return { ok: true, plan: order.plan, userId: order.user_id, alreadyCompleted: true }
  }

  // Flip the order to 'completed' FIRST, guarded by status='created'. The
  // guarded update is the idempotency lock: if the webhook and the client
  // verify call race, exactly one of them wins (rows returned) and proceeds
  // to activate; the loser sees zero rows and treats the order as already
  // completed. This prevents both double-activation and the crash-window
  // where the order is marked done but the subscription was never written.
  const now = new Date()
  const { data: lockedRows, error: lockError } = await supabase
    .from('razorpay_orders')
    .update({ status: 'completed', completed_at: now.toISOString() })
    .eq('order_id', orderId)
    .eq('status', 'created')
    .select('order_id')

  if (lockError) return { ok: false, error: `order lock: ${lockError.message}` }
  if (!lockedRows || lockedRows.length === 0) {
    // Another path (webhook vs verify race, or a replay) already completed it.
    return { ok: true, plan: order.plan, userId: order.user_id, alreadyCompleted: true }
  }

  const periodEnd = new Date(now)
  if (order.plan.includes('monthly')) {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  try {
    await upsertSubscription({
      userId: order.user_id,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      plan: order.plan,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    })
  } catch (subError) {
    // Activation failed AFTER the order was locked as completed — revert the
    // lock so a webhook retry can re-run activation instead of losing the
    // payment (the upsert failure would otherwise leave the user unpaid).
    await supabase
      .from('razorpay_orders')
      .update({ status: 'created', completed_at: null })
      .eq('order_id', orderId)
      .eq('status', 'completed')
    throw subError
  }

  return { ok: true, plan: order.plan, userId: order.user_id, alreadyCompleted: false }
}

/**
 * Get subscription details for the settings/billing page.
 */
export async function getSubscriptionDetails(userId: string) {
  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) {
    return {
      tier: 'free' as PlanTier,
      status: 'active',
      currentPeriodEnd: null,
      razorpayPaymentId: null,
    }
  }

  const isActive = data.status === 'active' && VALID_TIERS.includes(data.plan as PlanTier) && data.plan !== 'free'

  return {
    tier: (isActive ? data.plan : 'free') as PlanTier,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    razorpayPaymentId: data.razorpay_payment_id,
  }
}
