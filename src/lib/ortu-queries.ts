import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// RLS limits every query below to the signed-in parent's own child.
export const laporanQuery = queryOptions({
  queryKey: ["ortu-laporan"],
  queryFn: async () => {
    const { data, error } = await supabase.from("laporan_harian").select("*").order("tanggal", { ascending: false }).limit(600);
    if (error) throw error;
    return data ?? [];
  },
});

export const catatanQuery = queryOptions({
  queryKey: ["ortu-catatan"],
  queryFn: async () => {
    const { data, error } = await supabase.from("catatan_harian").select("*").order("tanggal", { ascending: false }).limit(300);
    if (error) throw error;
    return data ?? [];
  },
});

export const bintangQuery = queryOptions({
  queryKey: ["ortu-bintang"],
  queryFn: async () => {
    const { data, error } = await supabase.from("bintang").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false }).limit(600);
    if (error) throw error;
    return data ?? [];
  },
});

export const targetQuery = queryOptions({
  queryKey: ["ortu-target"],
  queryFn: async () => {
    const { data, error } = await supabase.from("target_harian").select("*").order("tanggal", { ascending: false }).limit(60);
    if (error) throw error;
    return data ?? [];
  },
});

export const penandaQuery = queryOptions({
  queryKey: ["ortu-penanda"],
  queryFn: async () => {
    const { data, error } = await supabase.from("penanda_quran").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const tagihanQuery = queryOptions({
  queryKey: ["ortu-tagihan"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tagihan").select("*").order("jatuh_tempo", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export const pembayaranQuery = queryOptions({
  queryKey: ["ortu-pembayaran"],
  queryFn: async () => {
    const { data, error } = await supabase.from("pembayaran").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export const rekeningQuery = queryOptions({
  queryKey: ["rekening-sekolah"],
  queryFn: async () => {
    const { data, error } = await supabase.from("rekening_sekolah").select("*");
    if (error) throw error;
    return data ?? [];
  },
});
