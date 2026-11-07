import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconTile } from "@/components/aiis/decor";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/ustadz/")({ component: UstadzHome });

function UstadzHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["ustadz-home"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: t } = await supabase.from("teachers").select("id, nama").eq("user_id", u.user!.id).maybeSingle();
      const { data: h } = await supabase
        .from("halaqah")
        .select("id, nama, jenjang, students(count)")
        .eq("teacher_id", t?.id ?? "")
        .order("nama");
      return { teacher: t, halaqah: h ?? [] };
    },
  });

  return (
    <div>
      <div className="rounded-b-[2.5rem] bg-hero px-5 pb-10 pt-8 text-primary-foreground lg:mx-8 lg:mt-8 lg:rounded-3xl">
        <p className="text-sm opacity-90">Assalamu'alaikum,</p>
        <h1 className="text-2xl font-bold">{data?.teacher?.nama ?? "Ustadz/Ustadzah"}</h1>
        <p className="mt-1 text-xs opacity-80">Semoga Allah memudahkan setiap langkah mengajar hari ini.</p>
      </div>
      <div className="mx-auto max-w-3xl p-4 lg:px-8">
        <h2 className="mb-3 font-bold">Halaqah Saya</h2>
        {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
        <div className="grid gap-3 sm:grid-cols-2">
          {data?.halaqah.map((h: any) => (
            <Link key={h.id} to="/ustadz/halaqah/$id" params={{ id: h.id }} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
              <IconTile><Users className="h-5 w-5" /></IconTile>
              <div className="flex-1">
                <p className="font-semibold">{h.nama}</p>
                <p className="text-xs text-muted-foreground">{h.jenjang} • {h.students?.[0]?.count ?? 0} santri</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
        {data && data.halaqah.length === 0 && <p className="text-sm text-muted-foreground">Belum ada halaqah yang ditugaskan.</p>}
      </div>
    </div>
  );
}
