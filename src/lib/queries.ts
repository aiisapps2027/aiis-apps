import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Parent: own student row (RLS limits to their child) with halaqah + teacher. */
export const myStudentQuery = queryOptions({
  queryKey: ["my-student"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("students")
      .select("*, halaqah(nama, teachers(nama))")
      .eq("user_id", u.user?.id ?? "")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const announcementsQuery = (jenjang?: string) =>
  queryOptions({
    queryKey: ["announcements", jenjang ?? "all"],
    queryFn: async () => {
      let q = supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (jenjang) q = q.in("target", ["semua", jenjang]);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
