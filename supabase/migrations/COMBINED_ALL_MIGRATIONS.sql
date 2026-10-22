-- =============================================================================
-- CareDesk — COMBINED MIGRATIONS (Native Supabase Auth + Postgres + pgvector)
--
-- Apply this file in the Supabase Dashboard SQL Editor for a fresh project.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA public;

-- Enums -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- updated_at helper -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Core identity tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name  TEXT,
  role       user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (email, first_name, last_name, updated_at) ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own" ON public.users;
CREATE POLICY "users read own" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users update own" ON public.users;
CREATE POLICY "users update own" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS tg_users_updated ON public.users;
CREATE TRIGGER tg_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Doctor profiles
CREATE TABLE IF NOT EXISTS public.doctors (
  id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  clinic_name TEXT,
  specialty   TEXT,
  npi_number  TEXT UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctors read own" ON public.doctors;
CREATE POLICY "doctors read own" ON public.doctors
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "doctors update own" ON public.doctors;
CREATE POLICY "doctors update own" ON public.doctors
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS tg_doctors_updated ON public.doctors;
CREATE TRIGGER tg_doctors_updated BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Patient profiles
CREATE TABLE IF NOT EXISTS public.patients (
  id            UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender        TEXT,
  blood_type    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients read own" ON public.patients;
CREATE POLICY "patients read own" ON public.patients
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "patients update own" ON public.patients;
CREATE POLICY "patients update own" ON public.patients
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS tg_patients_updated ON public.patients;
CREATE TRIGGER tg_patients_updated BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Native trigger to automatically provision public.users and public.patients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'patient'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.users.last_name),
    updated_at = now();

  INSERT INTO public.patients (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Patient <-> Doctor relations
CREATE TABLE IF NOT EXISTS public.patient_doctor_relations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id  UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);
GRANT SELECT ON public.patient_doctor_relations TO authenticated;
GRANT ALL ON public.patient_doctor_relations TO service_role;
ALTER TABLE public.patient_doctor_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relations read own" ON public.patient_doctor_relations;
CREATE POLICY "relations read own" ON public.patient_doctor_relations
  FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE INDEX IF NOT EXISTS pdr_doctor_idx  ON public.patient_doctor_relations(doctor_id, status);
CREATE INDEX IF NOT EXISTS pdr_patient_idx ON public.patient_doctor_relations(patient_id, status);

DROP TRIGGER IF EXISTS tg_pdr_updated ON public.patient_doctor_relations;
CREATE TRIGGER tg_pdr_updated BEFORE UPDATE ON public.patient_doctor_relations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- Reports + AI data
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  file_path  TEXT NOT NULL,
  mime_type  TEXT,
  ai_summary TEXT,
  status     report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports patient all" ON public.reports;
CREATE POLICY "reports patient all" ON public.reports
  FOR ALL TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "reports doctor read" ON public.reports;
CREATE POLICY "reports doctor read" ON public.reports
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_doctor_relations pdr
    WHERE pdr.doctor_id = auth.uid()
      AND pdr.patient_id = reports.patient_id
      AND pdr.status = 'active'
  ));

CREATE INDEX IF NOT EXISTS reports_patient_created_idx ON public.reports(patient_id, created_at DESC);

DROP TRIGGER IF EXISTS tg_reports_updated ON public.reports;
CREATE TRIGGER tg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Embeddings
CREATE TABLE IF NOT EXISTS public.report_embeddings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  embedding  vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.report_embeddings TO authenticated;
GRANT ALL ON public.report_embeddings TO service_role;
ALTER TABLE public.report_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "embeddings read own" ON public.report_embeddings;
CREATE POLICY "embeddings read own" ON public.report_embeddings
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

CREATE INDEX IF NOT EXISTS report_embeddings_report_idx ON public.report_embeddings(report_id);
CREATE INDEX IF NOT EXISTS report_embeddings_hnsw_idx ON public.report_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Normalized lab results
CREATE TABLE IF NOT EXISTS public.lab_results (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_name  TEXT NOT NULL,
  value      NUMERIC,
  unit       TEXT,
  flag       TEXT,
  test_date  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "labs patient read" ON public.lab_results;
CREATE POLICY "labs patient read" ON public.lab_results
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "labs doctor read" ON public.lab_results;
CREATE POLICY "labs doctor read" ON public.lab_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_doctor_relations pdr
    WHERE pdr.doctor_id = auth.uid()
      AND pdr.patient_id = lab_results.patient_id
      AND pdr.status = 'active'
  ));

CREATE INDEX IF NOT EXISTS lab_results_patient_idx ON public.lab_results(patient_id, test_date DESC);

-- Medications
CREATE TABLE IF NOT EXISTS public.medications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  dose       TEXT,
  frequency  TEXT,
  status     TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meds patient read" ON public.medications;
CREATE POLICY "meds patient read" ON public.medications
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "meds doctor read" ON public.medications;
CREATE POLICY "meds doctor read" ON public.medications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_doctor_relations pdr
    WHERE pdr.doctor_id = auth.uid()
      AND pdr.patient_id = medications.patient_id
      AND pdr.status = 'active'
  ));

CREATE INDEX IF NOT EXISTS medications_patient_idx ON public.medications(patient_id);

DROP TRIGGER IF EXISTS tg_medications_updated ON public.medications;
CREATE TRIGGER tg_medications_updated BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Conditions
CREATE TABLE IF NOT EXISTS public.conditions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT DEFAULT 'active',
  diagnosed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conditions TO authenticated;
GRANT ALL ON public.conditions TO service_role;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conditions patient read" ON public.conditions;
CREATE POLICY "conditions patient read" ON public.conditions
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "conditions doctor read" ON public.conditions;
CREATE POLICY "conditions doctor read" ON public.conditions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_doctor_relations pdr
    WHERE pdr.doctor_id = auth.uid()
      AND pdr.patient_id = conditions.patient_id
      AND pdr.status = 'active'
  ));

CREATE INDEX IF NOT EXISTS conditions_patient_idx ON public.conditions(patient_id);

DROP TRIGGER IF EXISTS tg_conditions_updated ON public.conditions;
CREATE TRIGGER tg_conditions_updated BEFORE UPDATE ON public.conditions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat own" ON public.chat_messages;
CREATE POLICY "chat own" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx ON public.chat_messages(user_id, created_at ASC);

-- Family
CREATE TABLE IF NOT EXISTS public.family_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  relation   TEXT,
  status     TEXT NOT NULL DEFAULT 'pending_owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_id)
);
GRANT SELECT, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family read own links" ON public.family_members;
CREATE POLICY "family read own links" ON public.family_members
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = member_id);

DROP POLICY IF EXISTS "family delete own links" ON public.family_members;
CREATE POLICY "family delete own links" ON public.family_members
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = member_id);

CREATE INDEX IF NOT EXISTS family_members_member_idx ON public.family_members(member_id, status);
CREATE INDEX IF NOT EXISTS family_members_owner_idx  ON public.family_members(owner_id, status);

DROP POLICY IF EXISTS "family read linked user" ON public.users;
CREATE POLICY "family read linked user" ON public.users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.status = 'accepted'
      AND (
        (fm.owner_id  = users.id AND fm.member_id = auth.uid())
        OR (fm.member_id = users.id AND fm.owner_id  = auth.uid())
      )
  ));

CREATE TABLE IF NOT EXISTS public.family_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  relation   TEXT,
  token      TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.family_invites TO authenticated;
GRANT ALL ON public.family_invites TO service_role;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites read own" ON public.family_invites;
CREATE POLICY "invites read own" ON public.family_invites
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "invites insert own" ON public.family_invites;
CREATE POLICY "invites insert own" ON public.family_invites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "invites delete own" ON public.family_invites;
CREATE POLICY "invites delete own" ON public.family_invites
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS family_invites_owner_idx ON public.family_invites(owner_id, status);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_snapshots TO authenticated;
GRANT ALL ON public.analytics_snapshots TO service_role;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics own or family read" ON public.analytics_snapshots;
CREATE POLICY "analytics own or family read" ON public.analytics_snapshots
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.status = 'accepted'
        AND (
          (fm.owner_id  = analytics_snapshots.user_id AND fm.member_id = auth.uid())
          OR (fm.member_id = analytics_snapshots.user_id AND fm.owner_id  = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "analytics own insert" ON public.analytics_snapshots;
CREATE POLICY "analytics own insert" ON public.analytics_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "analytics own update" ON public.analytics_snapshots;
CREATE POLICY "analytics own update" ON public.analytics_snapshots
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications own" ON public.notifications;
CREATE POLICY "notifications own" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);

-- Library settings
CREATE TABLE IF NOT EXISTS public.library_settings (
  user_id       UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_settings TO authenticated;
GRANT ALL ON public.library_settings TO service_role;
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library own" ON public.library_settings;
CREATE POLICY "library own" ON public.library_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tg_library_updated ON public.library_settings;
CREATE TRIGGER tg_library_updated BEFORE UPDATE ON public.library_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID NOT NULL,
  action     TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_id, created_at DESC);

-- Deleted Users Tombstone
CREATE TABLE IF NOT EXISTS public.deleted_users (
  id         UUID PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.deleted_users TO service_role;
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  would_use  TEXT NOT NULL,
  liked      TEXT,
  missing    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO authenticated, anon;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  plan                  TEXT NOT NULL DEFAULT 'free',
  status                TEXT NOT NULL DEFAULT 'active',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions read own" ON public.subscriptions;
CREATE POLICY "subscriptions read own" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

DROP TRIGGER IF EXISTS tg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER tg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Razorpay orders
CREATE TABLE IF NOT EXISTS public.razorpay_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     TEXT UNIQUE NOT NULL,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'created',
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.razorpay_orders TO authenticated;
GRANT ALL ON public.razorpay_orders TO service_role;
ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders read own" ON public.razorpay_orders;
CREATE POLICY "orders read own" ON public.razorpay_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS razorpay_orders_user_idx ON public.razorpay_orders(user_id);
CREATE INDEX IF NOT EXISTS razorpay_orders_order_idx ON public.razorpay_orders(order_id);
CREATE INDEX IF NOT EXISTS razorpay_orders_status_idx ON public.razorpay_orders(status);

DROP TRIGGER IF EXISTS tg_razorpay_orders_updated ON public.razorpay_orders;
CREATE TRIGGER tg_razorpay_orders_updated BEFORE UPDATE ON public.razorpay_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Preview tokens (Guest uploads)
CREATE TABLE IF NOT EXISTS public.preview_tokens (
  token            TEXT PRIMARY KEY,
  file_path        TEXT NOT NULL,
  mime_type        TEXT NOT NULL DEFAULT 'application/pdf',
  file_name        TEXT NOT NULL,
  summary          TEXT,
  lab_results      JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications      JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  migrated_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  migrated_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.preview_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS preview_tokens_created_idx ON public.preview_tokens(created_at);
CREATE INDEX IF NOT EXISTS preview_tokens_migrated_idx ON public.preview_tokens(migrated_user_id) WHERE migrated_user_id IS NOT NULL;

-- Family RPCs
CREATE OR REPLACE FUNCTION public.accept_family_invite(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.family_invites%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_invite FROM public.family_invites WHERE token = _token AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid or used invite'; END IF;
  IF v_invite.owner_id = v_uid THEN RAISE EXCEPTION 'cannot accept own invite'; END IF;
  INSERT INTO public.family_members (owner_id, member_id, relation, status)
  VALUES (v_invite.owner_id, v_uid, v_invite.relation, 'pending_owner')
  ON CONFLICT (owner_id, member_id) DO UPDATE SET status = 'pending_owner';
  UPDATE public.family_invites SET status = 'accepted' WHERE id = v_invite.id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (v_invite.owner_id, 'family_pending', 'Confirm family member',
          v_invite.email || ' accepted your invite — confirm to unlock shared analytics');
  RETURN jsonb_build_object('ok', true, 'owner_id', v_invite.owner_id, 'status', 'pending_owner');
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_family_member(_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.family_members%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_row FROM public.family_members
    WHERE id = _member_id AND owner_id = v_uid AND status = 'pending_owner';
  IF NOT FOUND THEN RAISE EXCEPTION 'no pending link to confirm'; END IF;
  UPDATE public.family_members SET status = 'accepted' WHERE id = _member_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (v_row.member_id, 'family_confirmed', 'Family link confirmed',
          'Shared analytics are now available.');
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_family_invite(TEXT)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_family_member(UUID)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.accept_family_invite(TEXT)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_family_member(UUID)  TO authenticated;

-- Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "reports storage read own" ON storage.objects;
CREATE POLICY "reports storage read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "reports storage upload own" ON storage.objects;
CREATE POLICY "reports storage upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "reports storage delete own" ON storage.objects;
CREATE POLICY "reports storage delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);


-- =============================================================================
-- 0008 — ElderCare Security Hardening, Native RLS & Chat Partitioning
-- =============================================================================

-- Storage family access
DROP POLICY IF EXISTS "reports storage read family" ON storage.objects;
CREATE POLICY "reports storage read family" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.status IN ('accepted', 'active')
        AND (
          (fm.owner_id::text = (storage.foldername(name))[1] AND fm.member_id = auth.uid())
          OR
          (fm.member_id::text = (storage.foldername(name))[1] AND fm.owner_id = auth.uid())
        )
    )
  );

-- Native RLS: reports
DROP POLICY IF EXISTS "reports patient all" ON public.reports;
DROP POLICY IF EXISTS "reports select own or family" ON public.reports;
DROP POLICY IF EXISTS "reports modify own" ON public.reports;

CREATE POLICY "reports select own or family" ON public.reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.status IN ('accepted', 'active')
        AND (
          (fm.owner_id = reports.patient_id AND fm.member_id = auth.uid())
          OR
          (fm.member_id = reports.patient_id AND fm.owner_id = auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.patient_doctor_relations pdr
      WHERE pdr.doctor_id = auth.uid()
        AND pdr.patient_id = reports.patient_id
        AND pdr.status = 'active'
    )
  );

CREATE POLICY "reports modify own" ON public.reports
  FOR ALL TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Native RLS: lab_results
DROP POLICY IF EXISTS "labs patient read" ON public.lab_results;
DROP POLICY IF EXISTS "labs select own or family" ON public.lab_results;

CREATE POLICY "labs select own or family" ON public.lab_results
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.status IN ('accepted', 'active')
        AND (
          (fm.owner_id = lab_results.patient_id AND fm.member_id = auth.uid())
          OR
          (fm.member_id = lab_results.patient_id AND fm.owner_id = auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.patient_doctor_relations pdr
      WHERE pdr.doctor_id = auth.uid()
        AND pdr.patient_id = lab_results.patient_id
        AND pdr.status = 'active'
    )
  );

-- Native RLS: conditions
DROP POLICY IF EXISTS "conditions patient read" ON public.conditions;
DROP POLICY IF EXISTS "conditions select own or family" ON public.conditions;

CREATE POLICY "conditions select own or family" ON public.conditions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.status IN ('accepted', 'active')
        AND (
          (fm.owner_id = conditions.patient_id AND fm.member_id = auth.uid())
          OR
          (fm.member_id = conditions.patient_id AND fm.owner_id = auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.patient_doctor_relations pdr
      WHERE pdr.doctor_id = auth.uid()
        AND pdr.patient_id = conditions.patient_id
        AND pdr.status = 'active'
    )
  );

-- Native RLS: medications
DROP POLICY IF EXISTS "meds patient read" ON public.medications;
DROP POLICY IF EXISTS "meds select own or family" ON public.medications;

CREATE POLICY "meds select own or family" ON public.medications
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.status IN ('accepted', 'active')
        AND (
          (fm.owner_id = medications.patient_id AND fm.member_id = auth.uid())
          OR
          (fm.member_id = medications.patient_id AND fm.owner_id = auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.patient_doctor_relations pdr
      WHERE pdr.doctor_id = auth.uid()
        AND pdr.patient_id = medications.patient_id
        AND pdr.status = 'active'
    )
  );

-- Partition Chat: chat_messages patient_id
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS chat_messages_user_patient_idx
  ON public.chat_messages(user_id, patient_id, created_at ASC);

DROP POLICY IF EXISTS "chat own" ON public.chat_messages;
CREATE POLICY "chat own" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
