-- Weekly Top 10: students with the most Hafalan Baru stars (one star per page) this week (Senin–Minggu, Asia/Jakarta).
-- Shown to every signed-in parent, ustadz and admin. Falls back to last week while nobody has a star yet this week.
-- Only name, class, level and star count leave the database (no ids); "saya" marks the signed-in parent's own child.
CREATE INDEX IF NOT EXISTS bintang_tanggal_idx ON public.bintang (tanggal);

CREATE OR REPLACE FUNCTION public.top_bintang_pekan()
RETURNS TABLE (peringkat integer, nama text, kelas text, jenjang text, jumlah integer, saya boolean, mulai date, selesai date, pekan text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  senin date := date_trunc('week', public.jakarta_today()::timestamp)::date;
  m date;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  FOREACH m IN ARRAY ARRAY[senin, senin - 7] LOOP
    RETURN QUERY
      SELECT (row_number() OVER (ORDER BY t.total DESC, t.terakhir, s.nama))::integer,
             s.nama, s.kelas, s.jenjang, t.total::integer,
             (s.id = public.my_student_id()), m, m + 6,
             CASE WHEN m = senin THEN 'ini' ELSE 'lalu' END
      FROM (
        SELECT b.student_id, sum(b.jumlah) AS total, max(b.tanggal) AS terakhir
        FROM public.bintang b
        WHERE b.sumber_tipe = 'halaman' AND b.tanggal BETWEEN m AND m + 6
        GROUP BY b.student_id
      ) t
      JOIN public.students s ON s.id = t.student_id AND s.aktif
      ORDER BY t.total DESC, t.terakhir, s.nama
      LIMIT 10;
    IF FOUND THEN RETURN; END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.top_bintang_pekan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.top_bintang_pekan() TO authenticated, service_role;
