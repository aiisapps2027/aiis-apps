import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Baby, School, UserCog, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { IconTile } from "@/components/aiis/decor";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

const count = async (t: "students" | "teachers" | "halaqah", jenjang?: string) => {
  let q: any = supabase.from(t).select("id", { count: "exact", head: true });
  if (jenjang) q = q.eq("jenjang", jenjang);
  return (await q).count ?? 0;
};

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [siswa, tk, sd, ustadz, halaqah] = await Promise.all([
        count("students"), count("students", "TK"), count("students", "SD"), count("teachers"), count("halaqah"),
      ]);
      return { siswa, tk, sd, ustadz, halaqah };
    },
  });
  const cards = [
    { label: "Total Siswa", v: data?.siswa, icon: GraduationCap },
    { label: "Siswa TK", v: data?.tk, icon: Baby },
    { label: "Siswa SD", v: data?.sd, icon: School },
    { label: "Ustadz/Ustadzah", v: data?.ustadz, icon: UserCog },
    { label: "Halaqah", v: data?.halaqah, icon: Users },
  ];
  return (
    <div>
      <PageHeader title="Dasbor Admin" subtitle="Ringkasan data sekolah" />
      <div className="space-y-6 p-4 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl bg-card p-4 shadow-soft">
              <IconTile className="h-10 w-10"><c.icon className="h-5 w-5" /></IconTile>
              <p className="mt-3 text-3xl font-extrabold text-primary">{c.v ?? "–"}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
