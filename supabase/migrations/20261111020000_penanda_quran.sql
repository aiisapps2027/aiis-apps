-- Ayat bookmarks in the digital Qur'an, owned by a student (set by the parent account).
CREATE TABLE public.penanda_quran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  surah smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayat smallint NOT NULL CHECK (ayat >= 1),
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, surah, ayat)
);
CREATE INDEX penanda_quran_student_idx ON public.penanda_quran (student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.penanda_quran TO authenticated;
GRANT ALL ON public.penanda_quran TO service_role;
ALTER TABLE public.penanda_quran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage penanda" ON public.penanda_quran FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent manages own penanda" ON public.penanda_quran FOR ALL TO authenticated
  USING (student_id = public.my_student_id()) WITH CHECK (student_id = public.my_student_id());
CREATE POLICY "Teacher reads penanda" ON public.penanda_quran FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));
