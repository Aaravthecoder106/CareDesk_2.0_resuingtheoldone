-- =============================================================================
-- 0009 — Caregiver Role Support in Supabase
--
-- 1. Expands user_role ENUM to include 'caregiver'.
-- 2. Updates profiles_role_check constraint on public.profiles (if present).
-- 3. Updates handle_new_user() trigger function to respect the user's selected
--    role ('caregiver' vs 'patient') from Supabase Auth metadata.
-- 4. Automatically synchronizes existing caregiver users in public.users
--    and public.profiles based on auth.users metadata.
-- 5. Removes any caregiver rows from public.patients.
-- =============================================================================

-- 1. Add 'caregiver' to the Postgres user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'caregiver';

-- 2. Update profiles_role_check constraint if table 'profiles' exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('patient', 'caregiver', 'doctor', 'admin'));
  END IF;
END $$;

-- 3. Update the handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  chosen_role_text text;
  final_role public.user_role;
BEGIN
  -- Extract role from metadata (supports both 'role' and 'elder_care_role')
  chosen_role_text := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'elder_care_role',
    'patient'
  );

  IF chosen_role_text = 'caregiver' THEN
    final_role := 'caregiver'::public.user_role;
  ELSE
    final_role := 'patient'::public.user_role;
  END IF;

  -- Upsert into public.users with the correct role (casting NEW.id::text)
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    final_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.users.last_name),
    role = EXCLUDED.role,
    updated_at = now();

  -- If profiles table exists, sync it too
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name', ''),
      chosen_role_text
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = now();
  END IF;

  -- Only provision into public.patients if the role is 'patient'
  IF final_role = 'patient' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id::text)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Re-attach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix all existing users in public.users based on their auth metadata
UPDATE public.users u
SET role = 'caregiver'::public.user_role
FROM auth.users au
WHERE u.id = au.id::text
  AND (
    au.raw_user_meta_data->>'role' = 'caregiver'
    OR au.raw_user_meta_data->>'elder_care_role' = 'caregiver'
    OR u.email ILIKE '%caregiver%'
  );

-- 6. Also fix existing rows in public.profiles if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    UPDATE public.profiles p
    SET role = 'caregiver'
    FROM auth.users au
    WHERE p.id::text = au.id::text
      AND (
        au.raw_user_meta_data->>'role' = 'caregiver'
        OR au.raw_user_meta_data->>'elder_care_role' = 'caregiver'
        OR au.email ILIKE '%caregiver%'
      );
  END IF;
END $$;

-- 7. Remove any caregiver rows from public.patients
DELETE FROM public.patients
WHERE id IN (
  SELECT id FROM public.users WHERE role = 'caregiver'
);
