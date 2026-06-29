
-- Lets educators archive a course (hide it from the active list without
-- losing enrollments/feedback) instead of only being able to delete it.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
