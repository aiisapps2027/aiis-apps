-- Proof images are deleted from storage after a retention period; the payment record stays.
ALTER TABLE public.pembayaran ALTER COLUMN bukti_path DROP NOT NULL;
