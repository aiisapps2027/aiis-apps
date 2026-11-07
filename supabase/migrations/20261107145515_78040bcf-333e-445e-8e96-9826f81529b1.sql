REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_teacher_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_student_halaqah_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_teacher_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_student_halaqah_id() TO authenticated, service_role;