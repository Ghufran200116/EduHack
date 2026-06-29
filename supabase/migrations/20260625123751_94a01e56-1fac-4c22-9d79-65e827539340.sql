
REVOKE EXECUTE ON FUNCTION public.get_course_aggregate(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Seed courses
INSERT INTO public.courses (name, semester) VALUES
  ('Mathematics 1', 'Fall 2025'),
  ('Mathematics 2', 'Spring 2026'),
  ('Programming 1', 'Fall 2025'),
  ('Programming 2', 'Spring 2026'),
  ('Data & Information Analysis', 'Fall 2025'),
  ('Database Systems', 'Spring 2026');
