-- =============================================================================
-- 0008 — ElderCare Security Hardening, Native RLS & Chat Partitioning
--
-- 1. Storage RLS: Allow family members with accepted/active connection to read
--    files stored in an elder's reports directory.
-- 2. Native Database RLS: Allow SELECT on reports, lab_results, conditions,
--    and medications for connected family members without service_role bypasses.
-- 3. Partition Chat: Add nullable patient_id column to public.chat_messages
--    to isolate AI clinical consultations per family member / elder.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Storage: Family read access on 'reports' bucket
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. Native Database RLS: reports, lab_results, conditions, medications
-- -----------------------------------------------------------------------------

-- public.reports
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

-- public.lab_results
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

-- public.conditions
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

-- public.medications
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

-- -----------------------------------------------------------------------------
-- 3. Partition Chat: Nullable patient_id column on public.chat_messages
-- -----------------------------------------------------------------------------
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS chat_messages_user_patient_idx
  ON public.chat_messages(user_id, patient_id, created_at ASC);

-- Refresh chat policy to preserve strict user privacy
DROP POLICY IF EXISTS "chat own" ON public.chat_messages;
CREATE POLICY "chat own" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
