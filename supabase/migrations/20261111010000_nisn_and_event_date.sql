-- Parent login password changes from NIK (16 digits) to NISN (9 digits).
-- The CHECK is NOT VALID on purpose: rows created before this change keep their old 16-digit value
-- until an admin re-enters the NISN (editing a student also resets the login password).
-- New rows and any update to a row are validated.
ALTER TABLE public.students RENAME COLUMN nik TO nisn;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_nik_check;
ALTER TABLE public.students ADD CONSTRAINT students_nisn_check CHECK (nisn ~ '^[0-9]{9}$') NOT VALID;

-- Announcements can carry the date of the event they announce.
ALTER TABLE public.announcements ADD COLUMN tanggal_acara date;
