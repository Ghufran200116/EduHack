
-- Fix: Supabase installs pgcrypto (and most extensions) into a dedicated
-- "extensions" schema, not "public". The function's search_path was pinned
-- to "public" only, so digest() — defined in "extensions" — couldn't be
-- resolved even though the bytea cast was correct. Add "extensions" to the
-- search_path so digest() resolves regardless of which schema it landed in.
CREATE OR REPLACE FUNCTION public.submit_course_feedback(
  _course_id uuid, _question_key text, _answer_key text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _uid uuid := auth.uid();
  _enrolled boolean;
  _scores public.dimension_scores%ROWTYPE;
  _dom text;
  _hash text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _uid AND course_id = _course_id
  ) INTO _enrolled;
  IF NOT _enrolled THEN RAISE EXCEPTION 'Not enrolled in this course'; END IF;

  SELECT * INTO _scores FROM public.dimension_scores WHERE user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complete your learning profile first'; END IF;

  _dom := (
    SELECT k FROM (VALUES
      ('visual', _scores.visual),
      ('kinesthetic', _scores.kinesthetic),
      ('auditory', _scores.auditory),
      ('read_write', _scores.read_write),
      ('social', _scores.social)
    ) AS t(k, v) ORDER BY v DESC LIMIT 1
  );

  _hash := encode(digest((_uid::text || ':' || _course_id::text)::bytea, 'sha256'), 'hex');

  INSERT INTO public.course_feedback (course_id, dominant_dimension, question_key, answer_key, submission_hash)
  VALUES (_course_id, _dom, _question_key, _answer_key, _hash)
  ON CONFLICT (course_id, question_key, submission_hash)
  DO UPDATE SET answer_key = EXCLUDED.answer_key, dominant_dimension = EXCLUDED.dominant_dimension, created_at = now();
END $$;
