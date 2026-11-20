import { grupJenjang } from "@/lib/jenjang";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Parent: own student row (RLS limits to their child) with halaqah + teacher name (via a narrow function: parents must never read the teachers table). */
export const myStudentQuery = queryOptions({
  queryKey: ["my-student"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("students")
      .select("*, halaqah(nama)")
      .eq("user_id", u.user?.id ?? "")
      .maybeSingle();
    if (error) throw error;
    if (!data) return data;
    const { data: guru } = await supabase.rpc("guru_pembimbing");
    return { ...data, halaqah: data.halaqah ? { ...data.halaqah, teachers: guru ? { nama: guru } : null } : null };
  },
});

export const announcementsQuery = (jenjang?: string) =>
  queryOptions({
    queryKey: ["announcements", jenjang ?? "all"],
    queryFn: async () => {
      let q = supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (jenjang) q = q.in("target", ["semua", jenjang, grupJenjang(jenjang)]);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
