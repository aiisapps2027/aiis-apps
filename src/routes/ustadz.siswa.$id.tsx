import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ScreenHeader } from "@/components/aiis/decor";

export const Route = createFileRoute("/ustadz/siswa/$id")({ component: SiswaDetail });

function SiswaDetail() {
  const { id } = Route.useParams();
  const { data: s } = useQuery({
    queryKey: ["ustadz-siswa", id],
    queryFn: async () => (await supabase.from("students").select("*, halaqah(nama)").eq("id", id).maybeSingle()).data,
  });
  const rows: [string, string | null | undefined][] = [
    ["NIS", s?.nis],
    ["Jenjang", s?.jenjang],
    ["Kelas", s?.kelas],
    ["Halaqah", (s?.halaqah as any)?.nama],
    ["Jenis Kelamin", s?.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"],
    ["Target Hafalan", s?.target_hafalan],
    ["Nama Wali", s?.nama_wali],
  ];
  return (
    <div>
      <ScreenHeader title="Profil Siswa" />
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft">
          <Avatar name={s?.nama ?? "?"} url={s?.foto_url} size={64} />
          <p className="text-lg font-bold">{s?.nama}</p>
        </div>
        <dl className="divide-y rounded-2xl bg-card shadow-soft">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold">{v || "-"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
