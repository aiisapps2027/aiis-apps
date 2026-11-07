import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_EMAIL,
  generateKode,
  isValidNik,
  isValidPhone,
  normalizePhone,
  ortuEmail,
  ustadzEmail,
} from "@/lib/auth-utils";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Akses ditolak");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function createAuthUser(admin: any, email: string, password: string, role: "ortu" | "ustadz") {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(error.message.includes("already") ? "Akun login sudah ada" : error.message);
  const uid = data.user.id as string;
  await admin.from("user_roles").insert({ user_id: uid, role });
  return uid;
}

const studentSchema = z.object({
  nis: z.string().trim().max(30).optional().default(""),
  nama: z.string().trim().min(2).max(100),
  nik: z.string().trim().refine(isValidNik, "NIK harus 16 digit"),
  no_hp: z.string().trim().refine(isValidPhone, "No. HP tidak valid"),
  jenjang: z.enum(["TK", "SD"]),
  kelas: z.string().trim().max(10).optional().default(""),
  jenis_kelamin: z.enum(["L", "P"]).default("L"),
  nama_wali: z.string().trim().max(100).optional().default(""),
  target_hafalan: z.string().trim().max(50).optional().default(""),
  halaqah_id: z.string().uuid().nullable().optional(),
});
export type StudentInput = z.infer<typeof studentSchema>;

async function insertStudent(admin: any, s: StudentInput) {
  const phone = normalizePhone(s.no_hp);
  const uid = await createAuthUser(admin, ortuEmail(phone), s.nik, "ortu");
  const { error } = await admin.from("students").insert({
    ...s,
    no_hp: phone,
    nis: s.nis || null,
    halaqah_id: s.halaqah_id || null,
    user_id: uid,
  });
  if (error) {
    await admin.auth.admin.deleteUser(uid);
    throw new Error(error.message.includes("duplicate") ? "NIK atau No. HP sudah terdaftar" : error.message);
  }
}

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => studentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    await insertStudent(admin, data);
    return { ok: true };
  });

export const importStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rows: unknown[] }) => ({ rows: z.array(z.unknown()).max(500).parse(d.rows) }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const results: { row: number; ok: boolean; error?: string }[] = [];
    for (let i = 0; i < data.rows.length; i++) {
      try {
        await insertStudent(admin, studentSchema.parse(data.rows[i]));
        results.push({ row: i + 1, ok: true });
      } catch (e: any) {
        results.push({ row: i + 1, ok: false, error: e?.issues?.[0]?.message ?? e.message });
      }
    }
    return { results };
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    studentSchema.extend({ id: z.string().uuid(), aktif: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { id, ...rest } = data;
    const phone = normalizePhone(rest.no_hp);
    const { data: cur } = await admin.from("students").select("user_id").eq("id", id).single();
    const { error } = await admin
      .from("students")
      .update({ ...rest, no_hp: phone, nis: rest.nis || null, halaqah_id: rest.halaqah_id || null })
      .eq("id", id);
    if (error) throw new Error(error.message.includes("duplicate") ? "NIK atau No. HP sudah terdaftar" : error.message);
    if (cur?.user_id) {
      await admin.auth.admin.updateUserById(cur.user_id, {
        email: ortuEmail(phone),
        password: rest.nik,
        email_confirm: true,
        ban_duration: rest.aktif ? "none" : "876000h",
      });
    }
    return { ok: true };
  });

/** Reset parent login: re-create the auth user if missing and set password = NIK. */
export const resetStudentLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { data: s } = await admin.from("students").select("*").eq("id", data.id).single();
    if (!s) throw new Error("Siswa tidak ditemukan");
    if (s.user_id) {
      const { error } = await admin.auth.admin.updateUserById(s.user_id, {
        email: ortuEmail(s.no_hp),
        password: s.nik,
        email_confirm: true,
        ban_duration: "none",
      });
      if (!error) return { ok: true };
    }
    const uid = await createAuthUser(admin, ortuEmail(s.no_hp), s.nik, "ortu");
    await admin.from("students").update({ user_id: uid }).eq("id", s.id);
    return { ok: true };
  });

const teacherSchema = z.object({
  nama: z.string().trim().min(2).max(100),
  no_hp: z.string().trim().max(20).optional().default(""),
  jenis_kelamin: z.enum(["L", "P"]).default("L"),
});

export const createTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => teacherSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const kode = generateKode();
    const uid = await createAuthUser(admin, ustadzEmail(kode), kode, "ustadz");
    const { error } = await admin.from("teachers").insert({
      ...data,
      no_hp: data.no_hp ? normalizePhone(data.no_hp) : null,
      kode,
      user_id: uid,
    });
    if (error) {
      await admin.auth.admin.deleteUser(uid);
      throw new Error(error.message);
    }
    return { kode };
  });

export const updateTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => teacherSchema.extend({ id: z.string().uuid(), aktif: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { id, ...rest } = data;
    const { data: t, error } = await admin
      .from("teachers")
      .update({ ...rest, no_hp: rest.no_hp ? normalizePhone(rest.no_hp) : null })
      .eq("id", id)
      .select("user_id")
      .single();
    if (error) throw new Error(error.message);
    if (t?.user_id) {
      await admin.auth.admin.updateUserById(t.user_id, { ban_duration: rest.aktif ? "none" : "876000h" });
    }
    return { ok: true };
  });

export const regenerateTeacherKode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { data: t } = await admin.from("teachers").select("*").eq("id", data.id).single();
    if (!t) throw new Error("Ustadz tidak ditemukan");
    const kode = generateKode();
    let uid = t.user_id as string | null;
    if (uid) {
      const { error } = await admin.auth.admin.updateUserById(uid, {
        email: ustadzEmail(kode),
        password: kode,
        email_confirm: true,
      });
      if (error) uid = null;
    }
    if (!uid) uid = await createAuthUser(admin, ustadzEmail(kode), kode, "ustadz");
    await admin.from("teachers").update({ kode, user_id: uid }).eq("id", t.id);
    return { kode };
  });

export const deletePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: "students" | "teachers"; id: string }) => ({
    table: z.enum(["students", "teachers"]).parse(d.table),
    id: z.string().uuid().parse(d.id),
  }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { data: row } = await admin.from(data.table).select("user_id").eq("id", data.id).single();
    await admin.from(data.table).delete().eq("id", data.id);
    if (row?.user_id) await admin.auth.admin.deleteUser(row.user_id);
    return { ok: true };
  });

/** One-time admin setup: only works while no admin exists, and only for the school admin email. */
export const setupAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) =>
    z.object({ email: z.string().email(), password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.email.trim().toLowerCase() !== ADMIN_EMAIL) throw new Error("Email admin tidak dikenali");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Admin sudah dibuat. Silakan masuk.");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").insert({ user_id: u.user.id, role: "admin" });
    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

/** Fill sample data (3 ustadz, 4 halaqah, 8 siswa) when the school has no students yet. */
export const seedDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const { count } = await admin.from("students").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("Data siswa sudah ada");
    const teachers = [
      { nama: "Ust. Rizal Hakim", jenis_kelamin: "L", no_hp: "6281200000001" },
      { nama: "Ustzh. Aisyah Rahmawati", jenis_kelamin: "P", no_hp: "6281200000002" },
      { nama: "Ust. Hamzah Firdaus", jenis_kelamin: "L", no_hp: "6281200000003" },
    ];
    const tIds: string[] = [];
    const kodes: { nama: string; kode: string }[] = [];
    for (const t of teachers) {
      const kode = generateKode();
      const uid = await createAuthUser(admin, ustadzEmail(kode), kode, "ustadz");
      const { data } = await admin.from("teachers").insert({ ...t, kode, user_id: uid }).select("id").single();
      tIds.push((data as any).id);
      kodes.push({ nama: t.nama, kode });
    }
    const hal: any[] = [
      { nama: "Halaqah Al-Fatih", jenjang: "SD", teacher_id: tIds[0] },
      { nama: "Halaqah Az-Zahra", jenjang: "SD", teacher_id: tIds[1] },
      { nama: "Halaqah Al-Furqan", jenjang: "SD", teacher_id: tIds[2] },
      { nama: "Halaqah Bintang Kecil", jenjang: "TK", teacher_id: tIds[1] },
    ];
    const { data: hRows } = await admin.from("halaqah").insert(hal).select("id");
    const h = (hRows ?? []).map((r: any) => r.id);
    const students: StudentInput[] = [
      ["Ahmad Fadli", "SD", "3A", "L", h[0], "Juz 30", "Budi Santoso"],
      ["Muhammad Ilham Akbar", "SD", "3A", "L", h[0], "Juz 30", "Rudi Hartono"],
      ["Fatimah Azzahra", "SD", "4B", "P", h[1], "Juz 29", "Hendra Wijaya"],
      ["Khadijah Nur Aini", "SD", "4B", "P", h[1], "Juz 29", "Agus Salim"],
      ["Umar Abdullah", "SD", "5A", "L", h[2], "Juz 28", "Taufik Hidayat"],
      ["Zaid Al-Ghifari", "SD", "5A", "L", h[2], "Juz 28", "Yusuf Maulana"],
      ["Aisyah Humaira", "TK", "TK B", "P", h[3], "Juz 30 (An-Naba' – Al-A'la)", "Rahmat Hidayat"],
      ["Hasan Al-Banna", "TK", "TK A", "L", h[3], "Juz 30 (An-Nas – Al-Fil)", "Fajar Nugroho"],
    ].map(([nama, jenjang, kelas, jk, halaqah_id, target, wali], i) => ({
      nis: `2026${String(i + 1).padStart(3, "0")}`,
      nama: nama as string,
      nik: `3201${String(10000000 + i * 1111).padStart(8, "0")}0${i + 1}${i}`.slice(0, 16).padEnd(16, "0"),
      no_hp: `62812345678${i + 1}`,
      jenjang: jenjang as "TK" | "SD",
      kelas: kelas as string,
      jenis_kelamin: jk as "L" | "P",
      halaqah_id: halaqah_id as string,
      target_hafalan: target as string,
      nama_wali: wali as string,
    }));
    for (const s of students) await insertStudent(admin, s);
    await admin.from("announcements").insert([
      { judul: "Selamat Datang di Aplikasi AIIS", isi: "Pantau hafalan dan perkembangan ananda langsung dari ponsel Ayah/Bunda.", target: "semua" },
      { judul: "Munaqasyah Juz 30", isi: "Munaqasyah Juz 30 untuk kelas 3 akan dilaksanakan pekan depan, mohon ananda dibantu murojaah di rumah.", target: "SD" },
    ]);
    return { kodes, students: students.map((s) => ({ nama: s.nama, no_hp: s.no_hp, nik: s.nik })) };
  });
