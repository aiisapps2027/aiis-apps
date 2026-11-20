import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Baby, School, UserCog, Users, Smile, Shapes } from "lucide-react";
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
      const [siswa, pg, k1, k2, sd, ustadz, halaqah] = await Promise.all([
        count("students"), count("students", "PG"), count("students", "K1"), count("students", "K2"), count("students", "SD"), count("teachers"), count("halaqah"),
      ]);
      return { siswa, pg, k1, k2, sd, ustadz, halaqah };
    },
  });
  const cards = [
    { label: "Total Siswa", v: data?.siswa, icon: GraduationCap, to: "/admin/siswa" as const, search: {} },
    { label: "Siswa PG", v: data?.pg, icon: Baby, to: "/admin/siswa" as const, search: { jenjang: "PG" as const } },
    { label: "Siswa K1", v: data?.k1, icon: Smile, to: "/admin/siswa" as const, search: { jenjang: "K1" as const } },
    { label: "Siswa K2", v: data?.k2, icon: Shapes, to: "/admin/siswa" as const, search: { jenjang: "K2" as const } },
    { label: "Siswa SD", v: data?.sd, icon: School, to: "/admin/siswa" as const, search: { jenjang: "SD" as const } },
    { label: "Ustadz/Ustadzah", v: data?.ustadz, icon: UserCog, to: "/admin/ustadz" as const, search: {} },
    { label: "Halaqah", v: data?.halaqah, icon: Users, to: "/admin/halaqah" as const, search: {} },
  ];
  return (
    <div>
      <PageHeader title="Dasbor Admin" subtitle="Ringkasan data sekolah" />
      <div className="space-y-6 p-4 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} search={c.search as never} className="block rounded-2xl bg-card p-4 shadow-soft transition-transform active:scale-[0.98] lg:hover:shadow-md">
              <IconTile className="h-10 w-10"><c.icon className="h-5 w-5" /></IconTile>
              <p className="mt-3 text-3xl font-extrabold text-primary">{c.v ?? "–"}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
