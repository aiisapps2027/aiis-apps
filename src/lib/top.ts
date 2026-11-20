import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TopRow = { peringkat: number; nama: string; kelas: string | null; jenjang: string; jumlah: number; saya: boolean; mulai: string; selesai: string; pekan: string };

/** Weekly Top 10 by Hafalan Baru stars (computed in the database, same for everyone). */
export const topPekanQuery = queryOptions({
  queryKey: ["top-bintang-pekan"],
  refetchInterval: 5 * 60_000,
  queryFn: async (): Promise<TopRow[]> => {
    const { data, error } = await supabase.rpc("top_bintang_pekan");
    if (error) throw error;
    return (data ?? []) as TopRow[];
  },
});

const tgl = (iso: string, withMonth: boolean) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", withMonth ? { day: "numeric", month: "short" } : { day: "numeric" });

/** "17–23 Nov" or "28 Nov – 4 Des" */
export function rentangPekan(mulai: string, selesai: string): string {
  const samaBulan = mulai.slice(0, 7) === selesai.slice(0, 7);
  return samaBulan ? `${tgl(mulai, false)}–${tgl(selesai, true)}` : `${tgl(mulai, true)} – ${tgl(selesai, true)}`;
}

export const MEDALI = ["🥇", "🥈", "🥉"] as const;
