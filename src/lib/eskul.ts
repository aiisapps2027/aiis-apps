import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export type EskulJadwal = { id: string; hari: number; jam_mulai: string; jam_selesai: string; tempat: string | null };
export type EskulRow = { id: string; nama: string; pengajar: string | null; deskripsi: string | null; aktif: boolean; eskul_jadwal: EskulJadwal[] };

/** "15:30:00" -> "15.30" */
export const jam = (t: string) => t.slice(0, 5).replace(":", ".");
export const rentangJam = (j: Pick<EskulJadwal, "jam_mulai" | "jam_selesai">) => `${jam(j.jam_mulai)}–${jam(j.jam_selesai)}`;

/** Day of week in Asia/Jakarta: 1 = Senin ... 7 = Minggu. */
export function hariJakarta(d: Date = new Date()): number {
  const w = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Jakarta" });
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[w] ?? 1;
}

export type Pengingat = { eskulId: string; nama: string; pengajar: string | null; kapan: "hari ini" | "besok"; jadwal: EskulJadwal };

/** Sessions happening today or tomorrow (Asia/Jakarta), earliest first. */
export function pengingatEskul(list: EskulRow[], now: Date = new Date()): Pengingat[] {
  const hari = hariJakarta(now);
  const besok = (hari % 7) + 1;
  const out: Pengingat[] = [];
  for (const e of list) {
    if (!e.aktif) continue;
    for (const j of e.eskul_jadwal) {
      if (j.hari === hari) out.push({ eskulId: e.id, nama: e.nama, pengajar: e.pengajar, kapan: "hari ini", jadwal: j });
      else if (j.hari === besok) out.push({ eskulId: e.id, nama: e.nama, pengajar: e.pengajar, kapan: "besok", jadwal: j });
    }
  }
  return out.sort((a, b) => (a.kapan === b.kapan ? a.jadwal.jam_mulai.localeCompare(b.jadwal.jam_mulai) : a.kapan === "hari ini" ? -1 : 1));
}

export const sortJadwal = (j: EskulJadwal[]) => [...j].sort((a, b) => a.hari - b.hari || a.jam_mulai.localeCompare(b.jam_mulai));

/** Eskul of the signed-in parent's child (row level security already limits the rows). */
export const eskulSayaQuery = queryOptions({
  queryKey: ["ortu-eskul"],
  refetchInterval: 5 * 60_000,
  queryFn: async (): Promise<EskulRow[]> => {
    const { data, error } = await supabase
      .from("eskul")
      .select("id, nama, pengajar, deskripsi, aktif, eskul_jadwal(id, hari, jam_mulai, jam_selesai, tempat)")
      .eq("aktif", true)
      .order("nama");
    if (error) throw error;
    return (data ?? []) as EskulRow[];
  },
});

/** Every eskul with its schedule (admin and ustadz). */
export const eskulSemuaQuery = queryOptions({
  queryKey: ["eskul-semua"],
  queryFn: async (): Promise<EskulRow[]> => {
    const { data, error } = await supabase
      .from("eskul")
      .select("id, nama, pengajar, deskripsi, aktif, eskul_jadwal(id, hari, jam_mulai, jam_selesai, tempat)")
      .order("nama");
    if (error) throw error;
    return (data ?? []) as EskulRow[];
  },
});
