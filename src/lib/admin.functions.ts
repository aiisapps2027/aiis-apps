import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateKode,
  isValidNisn,
  NISN_LENGTH,
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
  nisn: z.string().trim().refine(isValidNisn, `NISN harus ${NISN_LENGTH} digit`),
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
  const uid = await createAuthUser(admin, ortuEmail(phone), s.nisn, "ortu");
  const { error } = await admin.from("students").insert({
    ...s,
    no_hp: phone,
    nis: s.nis || null,
    halaqah_id: s.halaqah_id || null,
    user_id: uid,
  });
  if (error) {
    await admin.auth.admin.deleteUser(uid);
    throw new Error(error.message.includes("duplicate") ? "NISN atau No. HP sudah terdaftar" : error.message);
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
    if (error) throw new Error(error.message.includes("duplicate") ? "NISN atau No. HP sudah terdaftar" : error.message);
    if (cur?.user_id) {
      await admin.auth.admin.updateUserById(cur.user_id, {
        email: ortuEmail(phone),
        password: rest.nisn,
        email_confirm: true,
        ban_duration: rest.aktif ? "none" : "876000h",
      });
    }
    return { ok: true };
  });

/** Reset parent login: re-create the auth user if missing and set password = NISN. */
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
        password: s.nisn,
        email_confirm: true,
        ban_duration: "none",
      });
      if (!error) return { ok: true };
    }
    const uid = await createAuthUser(admin, ortuEmail(s.no_hp), s.nisn, "ortu");
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
