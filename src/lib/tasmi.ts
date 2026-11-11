import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TasmiRow = Database["public"]["Tables"]["tasmi"]["Row"];
export type PeriodeRow = Database["public"]["Tables"]["munaqasyah_periode"]["Row"];
export type PesertaPublik = Database["public"]["Functions"]["munaqasyah_diumumkan"]["Returns"][number];

export const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

// RLS limits this to the signed-in parent's own child.
export const tasmiQuery = queryOptions({
  queryKey: ["ortu-tasmi"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tasmi").select("*").order("tanggal", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export const munaqasyahPesertaQuery = queryOptions({
  queryKey: ["munaqasyah-peserta"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("munaqasyah_diumumkan");
    if (error) throw error;
    return data ?? [];
  },
});

/** Distinct announced periods (newest first) taken from the participant rows. */
export function periodeDari(rows: PesertaPublik[]) {
  const seen = new Map<string, { id: string; nama: string; tanggal: string | null }>();
  for (const r of rows) if (!seen.has(r.periode_id)) seen.set(r.periode_id, { id: r.periode_id, nama: r.periode_nama, tanggal: r.tanggal_pelaksanaan });
  return [...seen.values()];
}

/** Participants of one announced period, grouped per student (a student may take more than one juz). */
export function groupPeserta(rows: PesertaPublik[], periodeId: string) {
  const byStudent = new Map<string, { studentId: string; nama: string; kelas: string | null; jenjang: string; saya: boolean; juz: number[] }>();
  for (const r of rows) {
    if (r.periode_id !== periodeId) continue;
    const cur = byStudent.get(r.student_id);
    if (cur) cur.juz.push(r.juz);
    else byStudent.set(r.student_id, { studentId: r.student_id, nama: r.nama, kelas: r.kelas, jenjang: r.jenjang, saya: r.saya, juz: [r.juz] });
  }
  const out = [...byStudent.values()];
  for (const o of out) o.juz.sort((a, b) => a - b);
  return out;
}

export const juzLabel = (juz: number[]) => `Juz ${juz.join(", ")}`;

export const MUNAQASYAH_PENDING_KEY = ["admin-munaqasyah-pending"] as const;

/** Candidates (from Tasmi') that the admin has not announced yet. */
export async function countCalonBaru(): Promise<number> {
  const { count, error } = await supabase.from("munaqasyah_peserta").select("id", { count: "exact", head: true }).eq("diumumkan", false);
  if (error) throw error;
  return count ?? 0;
}
