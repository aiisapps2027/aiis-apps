-- School levels are PG, K1, K2 and SD (TK is split in three). Existing TK students/halaqah become K1; admin corrects them afterwards.
-- Bank accounts and the fee catalogue (rekening_sekolah, katalog_tagihan) stay keyed by 'TK' / 'SD': PG, K1 and K2 share the TK price list.
ALTER TABLE public.students DROP CONSTRAINT students_jenjang_check;
ALTER TABLE public.halaqah DROP CONSTRAINT halaqah_jenjang_check;
ALTER TABLE public.announcements DROP CONSTRAINT announcements_target_check;

UPDATE public.students SET jenjang = 'K1' WHERE jenjang = 'TK';
UPDATE public.halaqah SET jenjang = 'K1' WHERE jenjang = 'TK';

ALTER TABLE public.students ADD CONSTRAINT students_jenjang_check CHECK (jenjang IN ('PG','K1','K2','SD'));
ALTER TABLE public.halaqah ADD CONSTRAINT halaqah_jenjang_check CHECK (jenjang IN ('PG','K1','K2','SD'));
-- 'TK' stays a valid announcement target meaning all of PG, K1 and K2
ALTER TABLE public.announcements ADD CONSTRAINT announcements_target_check CHECK (target IN ('semua','TK','PG','K1','K2','SD'));
