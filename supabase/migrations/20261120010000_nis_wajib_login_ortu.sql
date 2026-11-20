-- Parent login password is now the NIS (digits, 6-15), so NIS is required and unique.
ALTER TABLE public.students ALTER COLUMN nis SET NOT NULL;
ALTER TABLE public.students ADD CONSTRAINT students_nis_check CHECK (nis ~ '^[0-9]{6,15}$');
ALTER TABLE public.students ADD CONSTRAINT students_nis_key UNIQUE (nis);
