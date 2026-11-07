-- Private avatars: admin uploads any photo, parents upload only their own child's photo.
-- Object path convention: students/{student_id}/avatar.jpg, teachers/{teacher_id}/avatar.jpg

UPDATE storage.buckets
SET public = false,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'avatars';

CREATE OR REPLACE FUNCTION public.my_student_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.my_student_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_student_id() TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin write avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete avatars" ON storage.objects;

-- Read: admin all; parent own child + child's teacher; ustadz own halaqah students + self
CREATE POLICY "Avatars read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'avatars' AND (
    public.has_role(auth.uid(), 'admin')
    OR (storage.foldername(name))[1] = 'students' AND (
      (storage.foldername(name))[2] = public.my_student_id()::text
      OR (storage.foldername(name))[2] IN (
        SELECT s.id::text FROM public.students s
        WHERE s.halaqah_id IN (SELECT id FROM public.halaqah WHERE teacher_id = public.my_teacher_id())
      )
    )
    OR (storage.foldername(name))[1] = 'teachers' AND (
      (storage.foldername(name))[2] = public.my_teacher_id()::text
      OR (storage.foldername(name))[2] IN (
        SELECT h.teacher_id::text FROM public.halaqah h WHERE h.id = public.my_student_halaqah_id()
      )
    )
  )
);

-- Write: admin anywhere; parent only inside own child's folder
CREATE POLICY "Avatars insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND (
    public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'students' AND (storage.foldername(name))[2] = public.my_student_id()::text)
  )
);
CREATE POLICY "Avatars update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' AND (
    public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'students' AND (storage.foldername(name))[2] = public.my_student_id()::text)
  )
) WITH CHECK (
  bucket_id = 'avatars' AND (
    public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'students' AND (storage.foldername(name))[2] = public.my_student_id()::text)
  )
);
CREATE POLICY "Avatars delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars' AND (
    public.has_role(auth.uid(), 'admin')
    OR ((storage.foldername(name))[1] = 'students' AND (storage.foldername(name))[2] = public.my_student_id()::text)
  )
);

-- Parents cannot UPDATE students directly (that would expose nik/no_hp/etc.).
-- This RPC only sets foto_url, and only to a path inside their own child's folder.
CREATE OR REPLACE FUNCTION public.set_my_student_photo(_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid := public.my_student_id();
BEGIN
  IF sid IS NULL THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  IF _path IS NOT NULL AND _path NOT LIKE 'students/' || sid::text || '/%' THEN
    RAISE EXCEPTION 'Path foto tidak valid';
  END IF;
  UPDATE public.students SET foto_url = _path WHERE id = sid;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_my_student_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_student_photo(text) TO authenticated;
