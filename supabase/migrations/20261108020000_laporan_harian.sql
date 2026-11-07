-- Phase 2: daily reports (hafalan baru / sabiq / murojaah / tahsin), daily notes, targets, stars.
-- Nilai: L = 0-3 salah, L- = 4-5 salah, TL = lebih dari 5 salah. Each "L" earns exactly 1 star.

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.hitung_nilai(_jumlah_salah int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _jumlah_salah IS NULL THEN NULL
    WHEN _jumlah_salah <= 3 THEN 'L'
    WHEN _jumlah_salah <= 5 THEN 'L-'
    ELSE 'TL'
  END
$$;

CREATE OR REPLACE FUNCTION public.jakarta_today()
RETURNS date LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date
$$;

CREATE OR REPLACE FUNCTION public.is_my_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.halaqah h ON h.id = s.halaqah_id
    WHERE s.id = _student_id AND h.teacher_id = public.my_teacher_id()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, service_role;

-- ---------- laporan_harian ----------
-- One row per student per day per section. Max 4 stars/day follows from UNIQUE below.
CREATE TABLE public.laporan_harian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  tanggal date NOT NULL DEFAULT public.jakarta_today(),
  jenis text NOT NULL CHECK (jenis IN ('hafalan_baru','sabiq','murojaah','tahsin')),
  juz smallint CHECK (juz BETWEEN 1 AND 30),
  surah_awal smallint CHECK (surah_awal BETWEEN 1 AND 114),
  ayat_awal smallint CHECK (ayat_awal >= 1),
  surah_akhir smallint CHECK (surah_akhir BETWEEN 1 AND 114),
  ayat_akhir smallint CHECK (ayat_akhir >= 1),
  jilid text,
  halaman smallint CHECK (halaman >= 1),
  materi text,
  jumlah_salah smallint CHECK (jumlah_salah >= 0),
  nilai text NOT NULL CHECK (nilai IN ('L','L-','TL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, tanggal, jenis),
  CHECK (
    (jenis = 'tahsin' AND jilid IS NOT NULL)
    OR (jenis <> 'tahsin' AND surah_awal IS NOT NULL AND ayat_awal IS NOT NULL
        AND surah_akhir IS NOT NULL AND ayat_akhir IS NOT NULL)
  ),
  CHECK (surah_awal IS NULL OR surah_akhir IS NULL OR surah_akhir > surah_awal
         OR (surah_akhir = surah_awal AND ayat_akhir >= ayat_awal))
);
CREATE INDEX laporan_harian_student_tanggal_idx ON public.laporan_harian (student_id, tanggal DESC);
CREATE INDEX laporan_harian_tanggal_idx ON public.laporan_harian (tanggal);

-- nilai is derived from jumlah_salah whenever a count is given; otherwise the grade picked by the teacher is kept.
CREATE OR REPLACE FUNCTION public.laporan_set_nilai()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.jumlah_salah IS NOT NULL THEN
    NEW.nilai := public.hitung_nilai(NEW.jumlah_salah);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER a_laporan_set_nilai BEFORE INSERT OR UPDATE ON public.laporan_harian
  FOR EACH ROW EXECUTE FUNCTION public.laporan_set_nilai();
CREATE TRIGGER t_laporan_upd BEFORE UPDATE ON public.laporan_harian
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- bintang ----------
CREATE TABLE public.bintang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  jumlah smallint NOT NULL DEFAULT 1 CHECK (jumlah = 1),
  sumber_tipe text NOT NULL CHECK (sumber_tipe IN ('laporan','ujian')),
  sumber_id uuid NOT NULL,
  keterangan text NOT NULL,
  tanggal date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sumber_tipe, sumber_id)
);
CREATE INDEX bintang_student_idx ON public.bintang (student_id, tanggal DESC);

-- Stars are written only by this trigger (security definer); users have no write access to bintang.
CREATE OR REPLACE FUNCTION public.laporan_sync_bintang()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.bintang WHERE sumber_tipe = 'laporan' AND sumber_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.nilai = 'L' THEN
    INSERT INTO public.bintang (student_id, jumlah, sumber_tipe, sumber_id, keterangan, tanggal)
    VALUES (
      NEW.student_id, 1, 'laporan', NEW.id,
      CASE NEW.jenis WHEN 'hafalan_baru' THEN 'Hafalan Baru' WHEN 'sabiq' THEN 'Sabiq'
                     WHEN 'murojaah' THEN 'Murojaah' ELSE 'Tahsin' END,
      NEW.tanggal
    )
    ON CONFLICT (sumber_tipe, sumber_id) DO UPDATE
      SET student_id = EXCLUDED.student_id, keterangan = EXCLUDED.keterangan, tanggal = EXCLUDED.tanggal;
  ELSE
    DELETE FROM public.bintang WHERE sumber_tipe = 'laporan' AND sumber_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.laporan_sync_bintang() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER t_laporan_bintang AFTER INSERT OR UPDATE OR DELETE ON public.laporan_harian
  FOR EACH ROW EXECUTE FUNCTION public.laporan_sync_bintang();

CREATE VIEW public.student_bintang_total WITH (security_invoker = true) AS
  SELECT student_id, sum(jumlah)::int AS total FROM public.bintang GROUP BY student_id;

-- ---------- catatan_harian (kegiatan + catatan guru + "paraf OTM") ----------
CREATE TABLE public.catatan_harian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  tanggal date NOT NULL DEFAULT public.jakarta_today(),
  kegiatan text,
  catatan text,
  diketahui_ortu_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, tanggal)
);
CREATE TRIGGER t_catatan_upd BEFORE UPDATE ON public.catatan_harian
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parent acknowledgement (replaces the paper "Paraf OTM"): sets only diketahui_ortu_at, only for own child.
CREATE OR REPLACE FUNCTION public.tandai_diketahui(_tanggal date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid := public.my_student_id();
BEGIN
  IF sid IS NULL THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  UPDATE public.catatan_harian SET diketahui_ortu_at = now()
   WHERE student_id = sid AND tanggal = _tanggal AND diketahui_ortu_at IS NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.tandai_diketahui(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tandai_diketahui(date) TO authenticated;

-- ---------- target_harian ----------
-- Status is derived: "Selesai" when a laporan_harian exists for the same student/date/jenis.
CREATE TABLE public.target_harian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  tanggal date NOT NULL,
  jenis text NOT NULL CHECK (jenis IN ('hafalan_baru','sabiq','murojaah','tahsin')),
  surah_awal smallint CHECK (surah_awal BETWEEN 1 AND 114),
  ayat_awal smallint CHECK (ayat_awal >= 1),
  surah_akhir smallint CHECK (surah_akhir BETWEEN 1 AND 114),
  ayat_akhir smallint CHECK (ayat_akhir >= 1),
  jilid text,
  halaman smallint CHECK (halaman >= 1),
  materi text,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, tanggal, jenis)
);
CREATE INDEX target_harian_student_tanggal_idx ON public.target_harian (student_id, tanggal DESC);
CREATE TRIGGER t_target_upd BEFORE UPDATE ON public.target_harian
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- grants + RLS ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laporan_harian, public.catatan_harian, public.target_harian TO authenticated;
GRANT SELECT ON public.bintang, public.student_bintang_total TO authenticated;
GRANT ALL ON public.laporan_harian, public.catatan_harian, public.target_harian, public.bintang, public.student_bintang_total TO service_role;

ALTER TABLE public.laporan_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catatan_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bintang ENABLE ROW LEVEL SECURITY;

-- laporan_harian: ustadz may write only for own halaqah students, dated within the last 7 days (Asia/Jakarta)
CREATE POLICY "Admin manage laporan" ON public.laporan_harian FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own laporan" ON public.laporan_harian FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "Teacher reads laporan" ON public.laporan_harian FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));
CREATE POLICY "Teacher inserts laporan" ON public.laporan_harian FOR INSERT TO authenticated
  WITH CHECK (public.is_my_student(student_id) AND teacher_id = public.my_teacher_id()
              AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher updates laporan" ON public.laporan_harian FOR UPDATE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7)
  WITH CHECK (public.is_my_student(student_id) AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher deletes laporan" ON public.laporan_harian FOR DELETE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7);

-- catatan_harian: same rules; parents can read but only acknowledge through tandai_diketahui()
CREATE POLICY "Admin manage catatan" ON public.catatan_harian FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own catatan" ON public.catatan_harian FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "Teacher reads catatan" ON public.catatan_harian FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));
CREATE POLICY "Teacher inserts catatan" ON public.catatan_harian FOR INSERT TO authenticated
  WITH CHECK (public.is_my_student(student_id) AND teacher_id = public.my_teacher_id()
              AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher updates catatan" ON public.catatan_harian FOR UPDATE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7)
  WITH CHECK (public.is_my_student(student_id) AND tanggal BETWEEN public.jakarta_today() - 7 AND public.jakarta_today());
CREATE POLICY "Teacher deletes catatan" ON public.catatan_harian FOR DELETE TO authenticated
  USING (public.is_my_student(student_id) AND tanggal >= public.jakarta_today() - 7);

-- target_harian: ustadz manage targets for own halaqah students (any date, targets are planned ahead)
CREATE POLICY "Admin manage target" ON public.target_harian FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own target" ON public.target_harian FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "Teacher manages target" ON public.target_harian FOR ALL TO authenticated
  USING (public.is_my_student(student_id))
  WITH CHECK (public.is_my_student(student_id) AND teacher_id = public.my_teacher_id());

-- bintang: read-only for everyone (writes only via trigger)
CREATE POLICY "Admin reads bintang" ON public.bintang FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own bintang" ON public.bintang FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "Teacher reads bintang" ON public.bintang FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));
