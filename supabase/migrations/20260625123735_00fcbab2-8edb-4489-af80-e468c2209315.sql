
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('student', 'educator');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL,
  institution TEXT,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Consents
CREATE TABLE public.consents (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_consent BOOLEAN NOT NULL DEFAULT false,
  insights_consent BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consents" ON public.consents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profiling answers
CREATE TABLE public.profiling_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiling_answers TO authenticated;
GRANT ALL ON public.profiling_answers TO service_role;
ALTER TABLE public.profiling_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own answers" ON public.profiling_answers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Dimension scores
CREATE TABLE public.dimension_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  visual INTEGER NOT NULL DEFAULT 0,
  kinesthetic INTEGER NOT NULL DEFAULT 0,
  auditory INTEGER NOT NULL DEFAULT 0,
  read_write INTEGER NOT NULL DEFAULT 0,
  social INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dimension_scores TO authenticated;
GRANT ALL ON public.dimension_scores TO service_role;
ALTER TABLE public.dimension_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scores" ON public.dimension_scores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  semester TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read courses" ON public.courses FOR SELECT TO authenticated USING (true);

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own enrollments" ON public.enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Aggregate function: returns class learning mix only if >=5 consenting profiled students
CREATE OR REPLACE FUNCTION public.get_course_aggregate(_course_id UUID)
RETURNS TABLE (
  enrolled_count INTEGER,
  profiled_count INTEGER,
  consenting_count INTEGER,
  unlocked BOOLEAN,
  visual NUMERIC,
  kinesthetic NUMERIC,
  auditory NUMERIC,
  read_write NUMERIC,
  social NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrolled INTEGER;
  v_profiled INTEGER;
  v_consenting INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_enrolled FROM enrollments WHERE course_id = _course_id;
  SELECT COUNT(*) INTO v_profiled FROM enrollments e JOIN dimension_scores ds ON ds.user_id = e.user_id WHERE e.course_id = _course_id;
  SELECT COUNT(*) INTO v_consenting
    FROM enrollments e
    JOIN dimension_scores ds ON ds.user_id = e.user_id
    JOIN consents c ON c.user_id = e.user_id
    WHERE e.course_id = _course_id AND c.insights_consent = true;

  IF v_consenting < 5 THEN
    RETURN QUERY SELECT v_enrolled, v_profiled, v_consenting, false, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_enrolled,
    v_profiled,
    v_consenting,
    true,
    ROUND(AVG(ds.visual)::numeric, 1),
    ROUND(AVG(ds.kinesthetic)::numeric, 1),
    ROUND(AVG(ds.auditory)::numeric, 1),
    ROUND(AVG(ds.read_write)::numeric, 1),
    ROUND(AVG(ds.social)::numeric, 1)
  FROM enrollments e
  JOIN dimension_scores ds ON ds.user_id = e.user_id
  JOIN consents c ON c.user_id = e.user_id
  WHERE e.course_id = _course_id AND c.insights_consent = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_aggregate(UUID) TO authenticated;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, institution, subject)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'),
    NEW.raw_user_meta_data->>'institution',
    NEW.raw_user_meta_data->>'subject'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
