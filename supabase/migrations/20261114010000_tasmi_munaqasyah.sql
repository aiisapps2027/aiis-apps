-- Tasmi' (recited by ustadz, per juz) and Munaqasyah (twice a year, managed by admin only).
-- A student becomes a Munaqasyah candidate when a Tasmi' of one juz, graded L or L-, falls inside the semester window.

-- ---------- tasmi ----------
CREATE TABLE public.tasmi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  tanggal date NOT NULL DEFAULT public.jakarta_today(),
  juz smallint NOT NULL CHECK (juz BETWEEN 1 AND 30),
  jumlah_salah smallint CHECK (jumlah_salah >= 0),
  nilai text NOT NULL CHECK (nilai IN ('L','L-','TL')),
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, tanggal, juz)
);
CREATE INDEX tasmi_student_idx ON public.tasmi (student_id, tanggal DESC);
CREATE INDEX tasmi_tanggal_idx ON public.tasmi (tanggal);
CREATE TRIGGER a_tasmi_set_nilai BEFORE INSERT OR UPDATE ON public.tasmi
  FOR EACH ROW EXECUTE FUNCTION public.laporan_set_nilai();
CREATE TRIGGER t_tasmi_upd BEFORE UPDATE ON public.tasmi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- munaqasyah ----------
CREATE TABLE public.munaqasyah_periode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL CHECK (length(btrim(nama)) BETWEEN 3 AND 100),
  mulai date NOT NULL,              -- semester window used to find Tasmi' (inclusive)
  selesai date NOT NULL,
  tanggal_pelaksanaan date,         -- set later by admin
  diumumkan boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (selesai >= mulai)
);
CREATE TRIGGER t_munaqasyah_periode_upd BEFORE UPDATE ON public.munaqasyah_periode
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.munaqasyah_peserta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_id uuid NOT NULL REFERENCES public.munaqasyah_periode(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  juz smallint NOT NULL CHECK (juz BETWEEN 1 AND 30),
  sumber text NOT NULL DEFAULT 'otomatis' CHECK (sumber IN ('otomatis','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periode_id, student_id, juz)
);
CREATE INDEX munaqasyah_peserta_student_idx ON public.munaqasyah_peserta (student_id);

-- Admin: add every student with a passing Tasmi' inside the window; existing rows (incl. manual) are kept.
CREATE OR REPLACE FUNCTION public.hitung_calon_munaqasyah(_periode uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.munaqasyah_periode; n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  SELECT * INTO p FROM public.munaqasyah_periode WHERE id = _periode;
  IF NOT FOUND THEN RAISE EXCEPTION 'Periode tidak ditemukan'; END IF;
  INSERT INTO public.munaqasyah_peserta (periode_id, student_id, juz, sumber)
  SELECT DISTINCT p.id, t.student_id, t.juz, 'otomatis'
  FROM public.tasmi t JOIN public.students s ON s.id = t.student_id
  WHERE s.aktif AND t.nilai <> 'TL' AND t.tanggal BETWEEN p.mulai AND p.selesai
  ON CONFLICT (periode_id, student_id, juz) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.hitung_calon_munaqasyah(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hitung_calon_munaqasyah(uuid) TO authenticated;

-- Announced participants, readable by any signed-in user (names + class only).
CREATE OR REPLACE FUNCTION public.munaqasyah_diumumkan()
RETURNS TABLE (periode_id uuid, student_id uuid, nama text, kelas text, jenjang text, juz smallint, saya boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mp.periode_id, mp.student_id, s.nama, s.kelas, s.jenjang, mp.juz, (mp.student_id = public.my_student_id())
  FROM public.munaqasyah_peserta mp
  JOIN public.munaqasyah_periode p ON p.id = mp.periode_id AND p.diumumkan
  JOIN public.students s ON s.id = mp.student_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY s.jenjang, s.kelas, s.nama
$$;
REVOKE EXECUTE ON FUNCTION public.munaqasyah_diumumkan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.munaqasyah_diumumkan() TO authenticated;

-- ---------- grants + RLS ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasmi, public.munaqasyah_periode, public.munaqasyah_peserta TO authenticated;
GRANT ALL ON public.tasmi, public.munaqasyah_periode, public.munaqasyah_peserta TO service_role;
ALTER TABLE public.tasmi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.munaqasyah_periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.munaqasyah_peserta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage tasmi" ON public.tasmi FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own tasmi" ON public.tasmi FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "Teacher reads tasmi" ON public.tasmi FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));
CREATE POLICY "Teacher inserts tasmi" ON public.tasmi FOR INSERT TO authenticated
  WITH CHECK (public.is_my_student(student_id) AND teacher_id = public.my_teacher_id()
              AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher updates tasmi" ON public.tasmi FOR UPDATE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7)
  WITH CHECK (public.is_my_student(student_id) AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher deletes tasmi" ON public.tasmi FOR DELETE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7);

CREATE POLICY "Admin manage munaqasyah_periode" ON public.munaqasyah_periode FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Read announced periode" ON public.munaqasyah_periode FOR SELECT TO authenticated
  USING (diumumkan);
CREATE POLICY "Admin manage munaqasyah_peserta" ON public.munaqasyah_peserta FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
