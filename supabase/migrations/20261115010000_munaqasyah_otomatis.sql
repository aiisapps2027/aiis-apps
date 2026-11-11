-- Munaqasyah candidates appear automatically when a Tasmi' is graded L or L-.
-- The semester period (Ganjil = Jul-Dec, Genap = Jan-Jun) is created on demand.
-- Announcing is per participant: admin publishes the pending candidates, parents only see published ones.

ALTER TABLE public.munaqasyah_peserta ADD COLUMN diumumkan boolean NOT NULL DEFAULT false;
CREATE INDEX munaqasyah_peserta_pending_idx ON public.munaqasyah_peserta (diumumkan) WHERE NOT diumumkan;
CREATE UNIQUE INDEX munaqasyah_periode_rentang ON public.munaqasyah_periode (mulai, selesai);

-- Carry over anything already announced under the old per-period switch.
UPDATE public.munaqasyah_peserta mp SET diumumkan = true
  FROM public.munaqasyah_periode p WHERE p.id = mp.periode_id AND p.diumumkan;

-- Parents get period info together with the announced participants through this function only
-- (their RLS cannot see munaqasyah_peserta, so a policy on the period table would never match).
DROP POLICY "Read announced periode" ON public.munaqasyah_periode;
DROP FUNCTION public.munaqasyah_diumumkan();
CREATE FUNCTION public.munaqasyah_diumumkan()
RETURNS TABLE (periode_id uuid, periode_nama text, mulai date, tanggal_pelaksanaan date, student_id uuid, nama text, kelas text, jenjang text, juz smallint, saya boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mp.periode_id, p.nama, p.mulai, p.tanggal_pelaksanaan, mp.student_id, s.nama, s.kelas, s.jenjang, mp.juz, (mp.student_id = public.my_student_id())
  FROM public.munaqasyah_peserta mp
  JOIN public.munaqasyah_periode p ON p.id = mp.periode_id
  JOIN public.students s ON s.id = mp.student_id
  WHERE mp.diumumkan AND auth.uid() IS NOT NULL
  ORDER BY p.mulai DESC, s.jenjang, s.kelas, s.nama
$$;
REVOKE EXECUTE ON FUNCTION public.munaqasyah_diumumkan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.munaqasyah_diumumkan() TO authenticated;

ALTER TABLE public.munaqasyah_periode DROP COLUMN diumumkan;
DROP FUNCTION public.hitung_calon_munaqasyah(uuid);

-- Semester window for a date.
CREATE OR REPLACE FUNCTION public.semester_dari(_tgl date)
RETURNS TABLE (nama text, mulai date, selesai date)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT
    CASE WHEN extract(month FROM _tgl) >= 7
      THEN 'Munaqasyah Semester Ganjil ' || extract(year FROM _tgl)::int || '/' || (extract(year FROM _tgl)::int + 1)
      ELSE 'Munaqasyah Semester Genap ' || (extract(year FROM _tgl)::int - 1) || '/' || extract(year FROM _tgl)::int END,
    CASE WHEN extract(month FROM _tgl) >= 7 THEN make_date(extract(year FROM _tgl)::int, 7, 1) ELSE make_date(extract(year FROM _tgl)::int, 1, 1) END,
    CASE WHEN extract(month FROM _tgl) >= 7 THEN make_date(extract(year FROM _tgl)::int, 12, 31) ELSE make_date(extract(year FROM _tgl)::int, 6, 30) END
$$;

CREATE OR REPLACE FUNCTION public.tasmi_sync_munaqasyah()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sm record; pid uuid; r public.tasmi;
BEGIN
  -- a removed or downgraded Tasmi' withdraws its still-unpublished candidate (unless another passing Tasmi' backs it)
  IF TG_OP IN ('UPDATE','DELETE') AND (TG_OP = 'DELETE' OR NEW.nilai = 'TL' OR NEW.juz <> OLD.juz OR NEW.student_id <> OLD.student_id OR NEW.tanggal <> OLD.tanggal) THEN
    SELECT * INTO sm FROM public.semester_dari(OLD.tanggal);
    DELETE FROM public.munaqasyah_peserta mp
     USING public.munaqasyah_periode p
     WHERE p.id = mp.periode_id AND p.mulai = sm.mulai AND p.selesai = sm.selesai
       AND mp.student_id = OLD.student_id AND mp.juz = OLD.juz AND mp.sumber = 'otomatis' AND NOT mp.diumumkan
       AND NOT EXISTS (SELECT 1 FROM public.tasmi t WHERE t.student_id = OLD.student_id AND t.juz = OLD.juz
                         AND t.nilai <> 'TL' AND t.tanggal BETWEEN sm.mulai AND sm.selesai AND t.id <> OLD.id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  r := NEW;
  IF r.nilai <> 'TL' AND EXISTS (SELECT 1 FROM public.students WHERE id = r.student_id AND aktif) THEN
    SELECT * INTO sm FROM public.semester_dari(r.tanggal);
    INSERT INTO public.munaqasyah_periode (nama, mulai, selesai) VALUES (sm.nama, sm.mulai, sm.selesai)
      ON CONFLICT (mulai, selesai) DO NOTHING;
    SELECT id INTO pid FROM public.munaqasyah_periode WHERE mulai = sm.mulai AND selesai = sm.selesai;
    INSERT INTO public.munaqasyah_peserta (periode_id, student_id, juz, sumber)
      VALUES (pid, r.student_id, r.juz, 'otomatis') ON CONFLICT (periode_id, student_id, juz) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tasmi_sync_munaqasyah() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER t_tasmi_munaqasyah AFTER INSERT OR UPDATE OR DELETE ON public.tasmi
  FOR EACH ROW EXECUTE FUNCTION public.tasmi_sync_munaqasyah();

-- Backfill: Tasmi' recorded before this migration become candidates too.
INSERT INTO public.munaqasyah_periode (nama, mulai, selesai)
  SELECT DISTINCT sm.nama, sm.mulai, sm.selesai FROM public.tasmi t, LATERAL public.semester_dari(t.tanggal) sm
  WHERE t.nilai <> 'TL'
  ON CONFLICT (mulai, selesai) DO NOTHING;
INSERT INTO public.munaqasyah_peserta (periode_id, student_id, juz, sumber)
  SELECT DISTINCT p.id, t.student_id, t.juz, 'otomatis'
  FROM public.tasmi t
  JOIN public.students s ON s.id = t.student_id AND s.aktif
  CROSS JOIN LATERAL public.semester_dari(t.tanggal) sm
  JOIN public.munaqasyah_periode p ON p.mulai = sm.mulai AND p.selesai = sm.selesai
  WHERE t.nilai <> 'TL'
  ON CONFLICT (periode_id, student_id, juz) DO NOTHING;
