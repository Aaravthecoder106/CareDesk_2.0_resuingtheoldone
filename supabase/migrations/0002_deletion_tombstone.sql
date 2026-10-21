-- =============================================================================
-- 0002 — deletion tombstone
--
-- Records deleted user UUIDs so that any re-provisioning or late sync
-- attempts cannot resurrect a deleted account.
--
-- Service-role only: there are no `authenticated` grants or policies, so clients
-- can neither read nor write the tombstone. RLS is enabled to deny by default.
-- =============================================================================
CREATE TABLE public.deleted_users (
  id         UUID PRIMARY KEY,           -- User id that was deleted
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.deleted_users TO service_role;
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;
