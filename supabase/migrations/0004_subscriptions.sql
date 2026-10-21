-- =============================================================================
-- 0004 — Subscriptions (Razorpay payment integration)
-- =============================================================================

CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  plan                  TEXT NOT NULL DEFAULT 'free',  -- free | pro_individual_monthly | pro_individual_annual | family_monthly | family_annual
  status                TEXT NOT NULL DEFAULT 'active', -- active | canceled | past_due | trialing
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions read own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX subscriptions_user_idx ON public.subscriptions(user_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions(status);

CREATE TRIGGER tg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
