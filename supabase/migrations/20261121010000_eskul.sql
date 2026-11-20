-- Eskul (extracurricular): admin manages everything; ustadz may enrol/remove students of their own halaqah; parents read only.

CREATE TABLE public.eskul (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL CHECK (length(btrim(nama)) BETWEEN 2 AND 60),
  pengajar text,
  deskripsi text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX eskul_nama_key ON public.eskul (lower(btrim(nama)));
CREATE TRIGGER t_eskul_upd BEFORE UPDATE ON public.eskul FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.eskul_jadwal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eskul_id uuid NOT NULL REFERENCES public.eskul(id) ON DELETE CASCADE,
  hari smallint NOT NULL CHECK (hari BETWEEN 1 AND 7),   -- 1 = Senin ... 7 = Minggu
  jam_mulai time NOT NULL,
  jam_selesai time NOT NULL,
  tempat text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jam_selesai > jam_mulai)
);
CREATE INDEX eskul_jadwal_eskul_idx ON public.eskul_jadwal (eskul_id);

CREATE TABLE public.eskul_peserta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eskul_id uuid NOT NULL REFERENCES public.eskul(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (eskul_id, student_id)
);
CREATE INDEX eskul_peserta_student_idx ON public.eskul_peserta (student_id);

-- true when the signed-in parent's child is enrolled in this eskul
CREATE OR REPLACE FUNCTION public.eskul_saya(_eskul uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.eskul_peserta p WHERE p.eskul_id = _eskul AND p.student_id = public.my_student_id())
$$;
REVOKE EXECUTE ON FUNCTION public.eskul_saya(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eskul_saya(uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eskul, public.eskul_jadwal, public.eskul_peserta TO authenticated;
GRANT ALL ON public.eskul, public.eskul_jadwal, public.eskul_peserta TO service_role;
ALTER TABLE public.eskul ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eskul_jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eskul_peserta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage eskul" ON public.eskul FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher reads eskul" ON public.eskul FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ustadz'));
CREATE POLICY "Parent reads own eskul" ON public.eskul FOR SELECT TO authenticated USING (public.eskul_saya(id));

CREATE POLICY "Admin manage eskul_jadwal" ON public.eskul_jadwal FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teacher reads eskul_jadwal" ON public.eskul_jadwal FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ustadz'));
CREATE POLICY "Parent reads own eskul_jadwal" ON public.eskul_jadwal FOR SELECT TO authenticated USING (public.eskul_saya(eskul_id));

CREATE POLICY "Admin manage eskul_peserta" ON public.eskul_peserta FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own eskul_peserta" ON public.eskul_peserta FOR SELECT TO authenticated USING (student_id = public.my_student_id());
CREATE POLICY "Teacher reads eskul_peserta" ON public.eskul_peserta FOR SELECT TO authenticated USING (public.is_my_student(student_id));
CREATE POLICY "Teacher adds eskul_peserta" ON public.eskul_peserta FOR INSERT TO authenticated WITH CHECK (public.is_my_student(student_id));
CREATE POLICY "Teacher removes eskul_peserta" ON public.eskul_peserta FOR DELETE TO authenticated USING (public.is_my_student(student_id));

-- common eskul to start with (admin can add / delete more)
INSERT INTO public.eskul (nama) VALUES
  ('Pramuka'), ('Panahan'), ('Berenang'), ('Futsal'), ('Taekwondo'), ('Kaligrafi'), ('Marawis'), ('Melukis'), ('Robotik');
