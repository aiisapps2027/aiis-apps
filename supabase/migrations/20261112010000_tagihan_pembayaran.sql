-- Billing: invoices (tagihan) per student, bank-transfer payments with proof, admin confirmation.
-- No virtual accounts and no unique-amount codes: the parent picks their child's invoice and uploads proof;
-- the admin checks the bank statement and confirms or rejects. Status changes go through security-definer RPCs.

-- ---------- bank accounts per jenjang ----------
CREATE TABLE public.rekening_sekolah (
  jenjang text PRIMARY KEY CHECK (jenjang IN ('TK','SD')),
  bank text NOT NULL,
  nomor text NOT NULL,
  atas_nama text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.rekening_sekolah (jenjang, bank, nomor, atas_nama) VALUES
  ('TK', 'BSI', '7309898987', 'Pra Akhyar Usia Dini'),
  ('SD', 'BSI', '76003333334', 'Akhyar International Islamic School');

-- ---------- price catalogue ----------
CREATE TABLE public.katalog_tagihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis text NOT NULL CHECK (jenis IN ('spp','buku_jurnal','seragam','lainnya')),
  nama text NOT NULL,
  jenjang text CHECK (jenjang IN ('TK','SD')),
  untuk text CHECK (untuk IN ('L','P')),
  nominal integer NOT NULL CHECK (nominal > 0),
  aktif boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.katalog_tagihan (jenis, nama, jenjang, untuk, nominal, urutan) VALUES
  ('spp', 'SPP TK', 'TK', NULL, 750000, 1),
  ('spp', 'SPP SD', 'SD', NULL, 1300000, 2),
  ('buku_jurnal', 'Buku Jurnal', NULL, NULL, 35000, 3),
  ('seragam', 'SD - Seragam Merah Putih Lengkap - Ikhwan', 'SD', 'L', 218000, 10),
  ('seragam', 'SD - Seragam Merah Putih Lengkap - Akhwat', 'SD', 'P', 247000, 11),
  ('seragam', 'SD - Seragam Batik Lengkap - Ikhwan', 'SD', 'L', 235000, 12),
  ('seragam', 'SD - Seragam Batik Lengkap - Akhwat', 'SD', 'P', 258000, 13),
  ('seragam', 'SD - Seragam Olahraga Lengkap - Ikhwan', 'SD', 'L', 166000, 14),
  ('seragam', 'SD - Seragam Olahraga Lengkap - Akhwat', 'SD', 'P', 253000, 15),
  ('seragam', 'SD - Seragam Rompi Biru Lengkap - Ikhwan', 'SD', 'L', 247000, 16),
  ('seragam', 'SD - Seragam Rompi Biru Lengkap - Akhwat', 'SD', 'P', 247000, 17),
  ('seragam', 'SD - Seragam Field Trip', 'SD', NULL, 92000, 18);

-- ---------- tagihan ----------
CREATE TABLE public.tagihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  jenis text NOT NULL CHECK (jenis IN ('spp','buku_jurnal','seragam','lainnya')),
  judul text NOT NULL,
  periode date,
  nominal integer NOT NULL CHECK (nominal > 0),
  jatuh_tempo date NOT NULL,
  status text NOT NULL DEFAULT 'belum_bayar' CHECK (status IN ('belum_bayar','menunggu','lunas')),
  dibayar_at timestamptz,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jenis <> 'spp' OR periode IS NOT NULL)
);
CREATE UNIQUE INDEX tagihan_spp_per_bulan ON public.tagihan (student_id, periode) WHERE jenis = 'spp';
CREATE INDEX tagihan_student_idx ON public.tagihan (student_id, jatuh_tempo DESC);
CREATE INDEX tagihan_status_idx ON public.tagihan (status, jatuh_tempo);
CREATE TRIGGER t_tagihan_upd BEFORE UPDATE ON public.tagihan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- pembayaran (one submission = proof of transfer) ----------
CREATE TABLE public.pembayaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_id uuid NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  nominal integer NOT NULL CHECK (nominal > 0),
  tanggal_transfer date NOT NULL,
  bank_pengirim text NOT NULL,
  nama_pengirim text NOT NULL,
  bukti_path text NOT NULL,
  bukti_hash text,
  status text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','dikonfirmasi','ditolak')),
  alasan_tolak text,
  diputuskan_at timestamptz,
  diputuskan_oleh uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pembayaran_satu_menunggu ON public.pembayaran (tagihan_id) WHERE status = 'menunggu';
-- the same proof image cannot back two payments (a rejected one frees it)
CREATE UNIQUE INDEX pembayaran_bukti_unik ON public.pembayaran (bukti_hash) WHERE bukti_hash IS NOT NULL AND status <> 'ditolak';
CREATE INDEX pembayaran_status_idx ON public.pembayaran (status, created_at DESC);
CREATE INDEX pembayaran_student_idx ON public.pembayaran (student_id, created_at DESC);

-- ---------- RPCs ----------
CREATE OR REPLACE FUNCTION public.ajukan_pembayaran(_tagihan uuid, _tanggal date, _bank text, _nama text, _bukti_path text, _hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid := public.my_student_id(); t public.tagihan; pid uuid;
BEGIN
  IF sid IS NULL THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  SELECT * INTO t FROM public.tagihan WHERE id = _tagihan AND student_id = sid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tagihan tidak ditemukan'; END IF;
  IF t.status = 'lunas' THEN RAISE EXCEPTION 'Tagihan ini sudah lunas'; END IF;
  IF t.status = 'menunggu' THEN RAISE EXCEPTION 'Pembayaran sedang menunggu konfirmasi'; END IF;
  IF _tanggal IS NULL OR _tanggal > public.jakarta_today() OR _tanggal < public.jakarta_today() - 90 THEN RAISE EXCEPTION 'Tanggal transfer tidak valid'; END IF;
  IF length(btrim(coalesce(_bank, ''))) < 2 OR length(btrim(coalesce(_nama, ''))) < 2 THEN RAISE EXCEPTION 'Isi bank dan nama pengirim'; END IF;
  IF _bukti_path IS NULL OR _bukti_path NOT LIKE sid::text || '/%' THEN RAISE EXCEPTION 'Bukti transfer tidak valid'; END IF;
  BEGIN
    INSERT INTO public.pembayaran (tagihan_id, student_id, nominal, tanggal_transfer, bank_pengirim, nama_pengirim, bukti_path, bukti_hash)
    VALUES (t.id, sid, t.nominal, _tanggal, btrim(_bank), btrim(_nama), _bukti_path, NULLIF(_hash, ''))
    RETURNING id INTO pid;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Bukti transfer ini sudah pernah dipakai';
  END;
  UPDATE public.tagihan SET status = 'menunggu' WHERE id = t.id;
  RETURN pid;
END $$;
REVOKE EXECUTE ON FUNCTION public.ajukan_pembayaran(uuid, date, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajukan_pembayaran(uuid, date, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.putuskan_pembayaran(_id uuid, _setuju boolean, _alasan text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pembayaran;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  SELECT * INTO p FROM public.pembayaran WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan'; END IF;
  IF p.status <> 'menunggu' THEN RAISE EXCEPTION 'Pembayaran ini sudah diputuskan'; END IF;
  IF _setuju THEN
    UPDATE public.pembayaran SET status = 'dikonfirmasi', diputuskan_at = now(), diputuskan_oleh = auth.uid() WHERE id = p.id;
    UPDATE public.tagihan SET status = 'lunas', dibayar_at = now() WHERE id = p.tagihan_id;
  ELSE
    IF length(btrim(coalesce(_alasan, ''))) < 3 THEN RAISE EXCEPTION 'Isi alasan penolakan'; END IF;
    UPDATE public.pembayaran SET status = 'ditolak', alasan_tolak = btrim(_alasan), diputuskan_at = now(), diputuskan_oleh = auth.uid() WHERE id = p.id;
    UPDATE public.tagihan SET status = 'belum_bayar' WHERE id = p.tagihan_id;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.putuskan_pembayaran(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.putuskan_pembayaran(uuid, boolean, text) TO authenticated;

-- ---------- grants + RLS ----------
GRANT SELECT ON public.rekening_sekolah, public.katalog_tagihan, public.pembayaran TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rekening_sekolah, public.katalog_tagihan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tagihan TO authenticated;
GRANT ALL ON public.rekening_sekolah, public.katalog_tagihan, public.tagihan, public.pembayaran TO service_role;
ALTER TABLE public.rekening_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.katalog_tagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in read rekening" ON public.rekening_sekolah FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage rekening" ON public.rekening_sekolah FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Signed in read katalog" ON public.katalog_tagihan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage katalog" ON public.katalog_tagihan FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage tagihan" ON public.tagihan FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own tagihan" ON public.tagihan FOR SELECT TO authenticated USING (student_id = public.my_student_id());
CREATE POLICY "Admin reads pembayaran" ON public.pembayaran FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parent reads own pembayaran" ON public.pembayaran FOR SELECT TO authenticated USING (student_id = public.my_student_id());

-- ---------- private bucket for proofs: parents add to their child's folder, nobody edits or deletes ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bukti-transfer', 'bukti-transfer', false, 3145728, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 3145728, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

CREATE POLICY "Bukti read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'bukti-transfer' AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = public.my_student_id()::text)
);
CREATE POLICY "Bukti insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'bukti-transfer' AND (storage.foldername(name))[1] = public.my_student_id()::text
);
