-- SECURITY: parents could SELECT the whole teachers row of their child's halaqah teacher, including `kode` (the teacher's
-- login password) and the phone number. Remove that policy; parents get only the teacher's name through a narrow function.
DROP POLICY IF EXISTS "Parent reads child teacher" ON public.teachers;

CREATE OR REPLACE FUNCTION public.guru_pembimbing()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.nama FROM public.halaqah h JOIN public.teachers t ON t.id = h.teacher_id
  WHERE h.id = public.my_student_halaqah_id()
$$;
REVOKE EXECUTE ON FUNCTION public.guru_pembimbing() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guru_pembimbing() TO authenticated, service_role;
