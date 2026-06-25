
-- Anonymous course feedback. No user_id is stored — only the predominant
-- learning dimension at the time of submission. A unique (course_id,
-- submission_hash) prevents one student from spamming the same question.

CREATE TABLE public.course_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  dominant_dimension text NOT NULL,
  question_key text NOT NULL,
  answer_key text NOT NULL,
  submission_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, question_key, submission_hash)
);

GRANT SELECT ON public.course_feedback TO authenticated;
GRANT ALL ON public.course_feedback TO service_role;

ALTER TABLE public.course_feedback ENABLE ROW LEVEL SECURITY;

-- Only course owners can read feedback rows directly.
CREATE POLICY "Course owners read feedback"
ON public.course_feedback FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = course_feedback.course_id AND c.owner_id = auth.uid()
));

-- Submit anonymous feedback. Derives the caller's dominant dimension
-- from dimension_scores and stores it WITHOUT the user_id. The hash
-- (sha256 of user_id + course_id) lets us enforce one answer per
-- question per student without ever storing who they are.
CREATE OR REPLACE FUNCTION public.submit_course_feedback(
  _course_id uuid, _question_key text, _answer_key text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  _hash := encode(digest(_uid::text || ':' || _course_id::text, 'sha256'), 'hex');

  INSERT INTO public.course_feedback (course_id, dominant_dimension, question_key, answer_key, submission_hash)
  VALUES (_course_id, _dom, _question_key, _answer_key, _hash)
  ON CONFLICT (course_id, question_key, submission_hash)
  DO UPDATE SET answer_key = EXCLUDED.answer_key, dominant_dimension = EXCLUDED.dominant_dimension, created_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.submit_course_feedback(uuid, text, text) TO authenticated;

-- Aggregated feedback for the educator. Returns counts grouped by
-- question/answer/dominant_dimension. Only the course owner gets data;
-- everyone else gets an empty set.
CREATE OR REPLACE FUNCTION public.get_course_feedback_aggregate(_course_id uuid)
RETURNS TABLE (
  question_key text,
  answer_key text,
  dominant_dimension text,
  count bigint
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT cf.question_key, cf.answer_key, cf.dominant_dimension, count(*)::bigint
  FROM public.course_feedback cf
  WHERE cf.course_id = _course_id
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = _course_id AND c.owner_id = auth.uid()
    )
  GROUP BY cf.question_key, cf.answer_key, cf.dominant_dimension;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_feedback_aggregate(uuid) TO authenticated;

-- pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
