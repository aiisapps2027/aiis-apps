-- Per the school: stars only for Al-Qur'an Hafalan Baru (1 star per page). Tahsin, Sabiq and Murojaah earn none.
CREATE OR REPLACE FUNCTION public.laporan_sync_bintang()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.jenis = 'hafalan_baru' THEN PERFORM public.sync_bintang_halaman(OLD.student_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.jenis = 'hafalan_baru' THEN
    PERFORM public.sync_bintang_halaman(NEW.student_id);
    IF TG_OP = 'UPDATE' AND OLD.student_id <> NEW.student_id THEN PERFORM public.sync_bintang_halaman(OLD.student_id); END IF;
  END IF;
  RETURN NEW;
END $$;

DELETE FROM public.bintang WHERE sumber_tipe = 'laporan';
