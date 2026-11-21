import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const JENIS_TASHIH = [
  { value: "makhraj", label: "Makhraj huruf" },
  { value: "sifat_huruf", label: "Sifat huruf" },
  { value: "tajwid", label: "Hukum tajwid" },
  { value: "mad", label: "Mad / panjang-pendek" },
  { value: "waqaf_ibtida", label: "Waqaf & ibtida" },
  { value: "harakat", label: "Harakat / baris" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export const jenisLabel = (v: string) => JENIS_TASHIH.find((j) => j.value === v)?.label ?? v;

// RLS limits this to the signed-in parent's own child.
export const tashihQuery = queryOptions({
  queryKey: ["ortu-tashih"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tashih").select("*").order("tanggal", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },
});
