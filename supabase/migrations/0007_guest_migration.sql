-- =============================================================================
-- 0007 — Guest-to-authenticated migration support
-- =============================================================================

ALTER TABLE public.preview_tokens
  ADD COLUMN IF NOT EXISTS migrated_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS migrated_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS preview_tokens_migrated_idx
  ON public.preview_tokens(migrated_user_id)
  WHERE migrated_user_id IS NOT NULL;
