
-- Add ownership and join code to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS join_code text;

-- Generator for short readable codes like ABC-7K2X
CREATE OR REPLACE FUNCTION public.generate_course_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..3 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    code := code || '-';
    FOR i IN 1..4 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM public.courses WHERE join_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill codes for any existing courses
UPDATE public.courses SET join_code = public.generate_course_join_code() WHERE join_code IS NULL;

-- Default + uniqueness for new rows
ALTER TABLE public.courses ALTER COLUMN join_code SET DEFAULT public.generate_course_join_code();
ALTER TABLE public.courses ALTER COLUMN join_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS courses_join_code_key ON public.courses (join_code);

-- Educators can create their own courses & manage them
DROP POLICY IF EXISTS "Educators insert own courses" ON public.courses;
CREATE POLICY "Educators insert own courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Educators update own courses" ON public.courses;
CREATE POLICY "Educators update own courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Educators delete own courses" ON public.courses;
CREATE POLICY "Educators delete own courses" ON public.courses
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Helper RPC for students to join by code (avoids needing visibility of all courses by code)
CREATE OR REPLACE FUNCTION public.join_course_by_code(_code text)
RETURNS TABLE(course_id uuid, course_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_name text;
BEGIN
  SELECT id, name INTO v_course_id, v_name
  FROM public.courses
  WHERE upper(join_code) = upper(trim(_code));

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.enrollments (user_id, course_id)
  VALUES (auth.uid(), v_course_id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_course_id, v_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_course_by_code(text) TO authenticated;

-- Prevent duplicate enrollments
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_key ON public.enrollments (user_id, course_id);
