CREATE TYPE public.app_role AS ENUM ('admin','ustadz','ortu');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  nama text NOT NULL,
  kode text NOT NULL UNIQUE,
  no_hp text,
  jenis_kelamin text NOT NULL DEFAULT 'L' CHECK (jenis_kelamin IN ('L','P')),
  foto_url text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.halaqah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  jenjang text NOT NULL CHECK (jenjang IN ('TK','SD')),
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  nis text,
  nama text NOT NULL,
  nik text NOT NULL UNIQUE CHECK (nik ~ '^[0-9]{16}$'),
  no_hp text NOT NULL UNIQUE,
  jenjang text NOT NULL CHECK (jenjang IN ('TK','SD')),
  kelas text,
  halaqah_id uuid REFERENCES public.halaqah(id) ON DELETE SET NULL,
  jenis_kelamin text NOT NULL DEFAULT 'L' CHECK (jenis_kelamin IN ('L','P')),
  foto_url text,
  target_hafalan text,
  nama_wali text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  isi text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT 'semua' CHECK (target IN ('semua','TK','SD')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers, public.halaqah, public.students, public.announcements TO authenticated;
GRANT ALL ON public.teachers, public.halaqah, public.students, public.announcements TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halaqah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER t_teachers_upd BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_halaqah_upd BEFORE UPDATE ON public.halaqah FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_students_upd BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_ann_upd BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.my_teacher_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid() LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.my_student_halaqah_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT halaqah_id FROM public.students WHERE user_id = auth.uid() LIMIT 1
$$;

-- teachers
CREATE POLICY "Admin manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teacher reads self" ON public.teachers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Parent reads child teacher" ON public.teachers FOR SELECT TO authenticated USING (id IN (SELECT teacher_id FROM public.halaqah WHERE id = public.my_student_halaqah_id()));

-- halaqah
CREATE POLICY "Admin manage halaqah" ON public.halaqah FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teacher reads own halaqah" ON public.halaqah FOR SELECT TO authenticated USING (teacher_id = public.my_teacher_id());
CREATE POLICY "Parent reads child halaqah" ON public.halaqah FOR SELECT TO authenticated USING (id = public.my_student_halaqah_id());

-- students
CREATE POLICY "Admin manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Parent reads own student" ON public.students FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teacher reads halaqah students" ON public.students FOR SELECT TO authenticated USING (halaqah_id IN (SELECT id FROM public.halaqah WHERE teacher_id = public.my_teacher_id()));

-- announcements
CREATE POLICY "Signed in read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- avatars storage policies (bucket created separately)
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Admin write avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND public.has_role(auth.uid(),'admin'));