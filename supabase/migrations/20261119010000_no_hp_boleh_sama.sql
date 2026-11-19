-- Siblings share one parent phone number: students.no_hp is no longer unique (NISN stays unique).
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_no_hp_key;
