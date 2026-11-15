-- Hafalan Baru stars now follow "jumlah halaman": the teacher may type how many pages were set (0.5, 1, 1.5, ...).
-- When left empty the amount is estimated from the ayat range using the mushaf page map.
-- Stars = floor(total pages of all non-TL Hafalan Baru reports of a student); fractions accumulate across reports.

ALTER TABLE public.laporan_harian
  ADD COLUMN jumlah_halaman numeric(4,1) CHECK (jumlah_halaman > 0 AND jumlah_halaman <= 20);

-- Estimated pages of an ayat range: sum over mushaf pages of the share of that page's ayat covered by the range.
CREATE OR REPLACE FUNCTION public.halaman_perkiraan(_sa smallint, _aa smallint, _sb smallint, _ab smallint)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  WITH r AS (
    SELECT q1.offset_ayat + _aa AS a, q2.offset_ayat + _ab AS b
    FROM public.quran_surah q1, public.quran_surah q2 WHERE q1.surah = _sa AND q2.surah = _sb
  )
  SELECT COALESCE(sum((least(h.idx_akhir, r.b) - greatest(h.idx_awal, r.a) + 1)::numeric / (h.idx_akhir - h.idx_awal + 1)), 0)
  FROM r JOIN public.mushaf_halaman h ON h.idx_awal <= r.b AND h.idx_akhir >= r.a
$$;
REVOKE EXECUTE ON FUNCTION public.halaman_perkiraan(smallint, smallint, smallint, smallint) FROM PUBLIC, anon, authenticated;

-- Star number n (1, 2, 3, ...) and the date of the report that completed it.
CREATE OR REPLACE FUNCTION public.halaman_bintang(_student uuid)
RETURNS TABLE (n integer, tanggal date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT l.tanggal,
           sum(COALESCE(l.jumlah_halaman, public.halaman_perkiraan(l.surah_awal, l.ayat_awal, l.surah_akhir, l.ayat_akhir)))
             OVER (ORDER BY l.tanggal, l.created_at, l.id) AS c
    FROM public.laporan_harian l
    WHERE l.student_id = _student AND l.jenis = 'hafalan_baru' AND l.nilai <> 'TL'
  )
  SELECT g.n, (SELECT min(r.tanggal) FROM r WHERE floor(r.c + 0.05) >= g.n)
  FROM generate_series(1, (SELECT COALESCE(floor(max(c) + 0.05), 0)::int FROM r)) AS g(n)
$$;
REVOKE EXECUTE ON FUNCTION public.halaman_bintang(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_bintang_halaman(_student uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.bintang b
   WHERE b.student_id = _student AND b.sumber_tipe = 'halaman'
     AND NOT EXISTS (SELECT 1 FROM public.halaman_bintang(_student) s WHERE md5(_student::text || ':halaman:' || s.n)::uuid = b.sumber_id);

  INSERT INTO public.bintang (student_id, jumlah, sumber_tipe, sumber_id, keterangan, tanggal)
  SELECT _student, 1, 'halaman', md5(_student::text || ':halaman:' || s.n)::uuid, 'Hafalan halaman ke-' || s.n, s.tanggal
  FROM public.halaman_bintang(_student) s
  ON CONFLICT (sumber_tipe, sumber_id) DO UPDATE SET tanggal = EXCLUDED.tanggal, keterangan = EXCLUDED.keterangan;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_bintang_halaman(uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION public.halaman_selesai(uuid);

-- Existing stars are test data only: start from zero.
DELETE FROM public.bintang;
