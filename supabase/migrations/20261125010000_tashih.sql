-- Tashih = reading corrections: ustadz logs a mistake (surah/ayat, type) for a student; later marks it fixed. Parents read only.
CREATE TABLE public.tashih (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  tanggal date NOT NULL DEFAULT public.jakarta_today(),
  surah smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayat smallint CHECK (ayat >= 1),
  jenis text NOT NULL CHECK (jenis IN ('makhraj','sifat_huruf','tajwid','mad','waqaf_ibtida','harakat','lainnya')),
  catatan text CHECK (catatan IS NULL OR length(catatan) <= 500),
  status text NOT NULL DEFAULT 'perlu' CHECK (status IN ('perlu','sudah')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tashih_student_idx ON public.tashih (student_id, tanggal DESC);
CREATE TRIGGER t_tashih_upd BEFORE UPDATE ON public.tashih FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tashih TO authenticated;
GRANT ALL ON public.tashih TO service_role;
ALTER TABLE public.tashih ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage tashih" ON public.tashih FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own tashih" ON public.tashih FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "Teacher reads tashih" ON public.tashih FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));
CREATE POLICY "Teacher inserts tashih" ON public.tashih FOR INSERT TO authenticated
  WITH CHECK (public.is_my_student(student_id) AND teacher_id = public.my_teacher_id()
              AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher updates tashih" ON public.tashih FOR UPDATE TO authenticated
  USING (public.is_my_student(student_id)) WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "Teacher deletes tashih" ON public.tashih FOR DELETE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7);
