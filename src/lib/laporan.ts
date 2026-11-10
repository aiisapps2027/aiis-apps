import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { hitungNilai, JENIS_ORDER, type JenisLaporan, type Nilai } from "@/lib/nilai";
import { juzOf, validateRange } from "@/lib/quran";

export type LaporanRow = Database["public"]["Tables"]["laporan_harian"]["Row"];
export type CatatanRow = Database["public"]["Tables"]["catatan_harian"]["Row"];

// ---------- dates (Asia/Jakarta, matching the database's 7-day edit window) ----------
export const todayJakarta = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const isEditableDate = (iso: string, today = todayJakarta()) => iso <= today && iso >= shiftDate(today, -7);

export const formatTanggal = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ---------- form state for one section (hafalan baru / sabiq / murojaah / tahsin) ----------
export type SectionState = {
  on: boolean;
  existingId: string | null;
  surahAwal: number | null;
  ayatAwal: string;
  lintas: boolean;
  surahAkhir: number | null;
  ayatAkhir: string;
  salah: string;
  nilai: Nilai | null;
  jilid: string;
  halaman: string;
  materi: string;
};

export const emptySection = (): SectionState => ({
  on: false, existingId: null, surahAwal: null, ayatAwal: "", lintas: false, surahAkhir: null, ayatAkhir: "",
  salah: "", nilai: null, jilid: "", halaman: "", materi: "",
});

export function sectionFromRow(r: LaporanRow): SectionState {
  return {
    on: true,
    existingId: r.id,
    surahAwal: r.surah_awal,
    ayatAwal: r.ayat_awal?.toString() ?? "",
    lintas: r.surah_akhir !== null && r.surah_akhir !== r.surah_awal,
    surahAkhir: r.surah_akhir,
    ayatAkhir: r.ayat_akhir?.toString() ?? "",
    salah: r.jumlah_salah?.toString() ?? "",
    nilai: r.nilai as Nilai,
    jilid: r.jilid ?? "",
    halaman: r.halaman?.toString() ?? "",
    materi: r.materi ?? "",
  };
}

/** Grade shown in the form: derived from a typed mistake count when present, else the tapped L / L- / TL. */
export function effectiveNilai(s: Pick<SectionState, "salah" | "nilai">): Nilai | null {
  if (s.salah.trim() !== "" && Number.isInteger(Number(s.salah)) && Number(s.salah) >= 0) return hitungNilai(Number(s.salah));
  return s.nilai;
}

/** Returns an Indonesian error message, or null when the section can be saved. */
export function validateSection(jenis: JenisLaporan, s: SectionState): string | null {
  if (s.salah.trim() !== "" && (!Number.isInteger(Number(s.salah)) || Number(s.salah) < 0 || Number(s.salah) > 999)) {
    return "Jumlah salah harus angka 0 atau lebih";
  }
  if (!effectiveNilai(s)) return "Pilih nilai (L / L- / TL)";
  if (jenis === "tahsin") {
    if (!s.jilid.trim()) return "Isi jilid";
    if (s.halaman.trim() !== "" && (!Number.isInteger(Number(s.halaman)) || Number(s.halaman) < 1)) return "Halaman harus angka";
    return null;
  }
  if (!s.surahAwal) return "Pilih surah";
  return validateRange(rangeOf(s));
}

function rangeOf(s: SectionState) {
  const surahAwal = s.surahAwal ?? 0;
  return {
    surahAwal,
    ayatAwal: Number(s.ayatAwal),
    surahAkhir: s.lintas && s.surahAkhir ? s.surahAkhir : surahAwal,
    ayatAkhir: Number(s.ayatAkhir),
  };
}

export type LaporanInsert = Database["public"]["Tables"]["laporan_harian"]["Insert"];

export function sectionToPayload(
  base: { studentId: string; teacherId: string; tanggal: string },
  jenis: JenisLaporan,
  s: SectionState,
): LaporanInsert {
  const nilai = effectiveNilai(s);
  if (!nilai) throw new Error("Nilai belum dipilih");
  const common = {
    student_id: base.studentId,
    teacher_id: base.teacherId,
    tanggal: base.tanggal,
    jenis,
    jumlah_salah: s.salah.trim() === "" ? null : Number(s.salah),
    nilai,
  };
  if (jenis === "tahsin") {
    return {
      ...common,
      jilid: s.jilid.trim(),
      halaman: s.halaman.trim() === "" ? null : Number(s.halaman),
      materi: s.materi.trim() || null,
      surah_awal: null, ayat_awal: null, surah_akhir: null, ayat_akhir: null, juz: null,
    };
  }
  const r = rangeOf(s);
  return {
    ...common,
    surah_awal: r.surahAwal, ayat_awal: r.ayatAwal, surah_akhir: r.surahAkhir, ayat_akhir: r.ayatAkhir,
    juz: juzOf(r.surahAwal, r.ayatAwal),
    jilid: null, halaman: null, materi: null,
  };
}

export function friendlyError(e: { code?: string; message?: string }): string {
  if (e.code === "42501") return "Tidak diizinkan: tanggal lebih dari 7 hari lalu, atau siswa bukan di halaqah Anda.";
  if (e.code === "23505") return "Data hari itu sudah ada. Muat ulang halaman lalu coba lagi.";
  return e.message ?? "Gagal menyimpan";
}

export type SaveInput = {
  studentId: string;
  teacherId: string;
  tanggal: string;
  sections: Record<JenisLaporan, SectionState>;
  kegiatan: string;
  catatan: string;
  hadCatatan: boolean;
};

/** Upserts enabled sections, deletes sections that were switched off, and syncs the day note. Throws a friendly Error. */
export async function saveLaporan(input: SaveInput): Promise<void> {
  const base = { studentId: input.studentId, teacherId: input.teacherId, tanggal: input.tanggal };
  for (const jenis of JENIS_ORDER) {
    const s = input.sections[jenis];
    if (s.on) {
      const { error } = await supabase
        .from("laporan_harian")
        .upsert(sectionToPayload(base, jenis, s), { onConflict: "student_id,tanggal,jenis" });
      if (error) throw new Error(friendlyError(error));
    } else if (s.existingId) {
      const { error } = await supabase.from("laporan_harian").delete().eq("id", s.existingId);
      if (error) throw new Error(friendlyError(error));
    }
  }
  const kegiatan = input.kegiatan.trim();
  const catatan = input.catatan.trim();
  if (kegiatan || catatan) {
    const { error } = await supabase.from("catatan_harian").upsert(
      { student_id: input.studentId, teacher_id: input.teacherId, tanggal: input.tanggal, kegiatan: kegiatan || null, catatan: catatan || null },
      { onConflict: "student_id,tanggal" },
    );
    if (error) throw new Error(friendlyError(error));
  } else if (input.hadCatatan) {
    const { error } = await supabase.from("catatan_harian").delete().eq("student_id", input.studentId).eq("tanggal", input.tanggal);
    if (error) throw new Error(friendlyError(error));
  }
}

// ---------- shared route/query helpers for the teacher input screens ----------
export type SetoranSearch = { tanggal: string; halaqah: string };

export function parseSetoranSearch(s: Record<string, unknown>): SetoranSearch {
  const tanggal = s["tanggal"];
  const halaqah = s["halaqah"];
  return {
    tanggal: typeof tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? tanggal : todayJakarta(),
    halaqah: typeof halaqah === "string" ? halaqah : "",
  };
}

export async function fetchHalaqahStudents(halaqahId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("id, nama, kelas, foto_url")
    .eq("halaqah_id", halaqahId)
    .eq("aktif", true)
    .order("nama");
  if (error) throw error;
  return data ?? [];
}
