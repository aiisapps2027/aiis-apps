import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ScreenHeader } from "@/components/aiis/decor";
import { Input } from "@/components/ui/input";
import { normalizeName } from "@/lib/auth-utils";

export const Route = createFileRoute("/ustadz/halaqah/$id")({ component: HalaqahDetail });

function HalaqahDetail() {
  const { id } = Route.useParams();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["ustadz-halaqah", id],
    queryFn: async () => {
      const [{ data: h }, { data: s }] = await Promise.all([
        supabase.from("halaqah").select("nama, jenjang").eq("id", id).maybeSingle(),
        supabase.from("students").select("id, nama, kelas, foto_url, aktif").eq("halaqah_id", id).order("nama"),
      ]);
      return { h, s: s ?? [] };
    },
  });
  const list = (data?.s ?? []).filter((s) => normalizeName(s.nama).includes(normalizeName(q)));

  return (
    <div>
      <ScreenHeader title={data?.h?.nama ?? "Halaqah"} />
      <div className="mx-auto max-w-3xl space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama santri..." value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl bg-card pl-10" />
        </div>
        {list.map((s) => (
          <Link key={s.id} to="/ustadz/siswa/$id" params={{ id: s.id }} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
            <Avatar name={s.nama} url={s.foto_url} size={44} />
            <div className="flex-1">
              <p className="font-semibold">{s.nama}</p>
              <p className="text-xs text-muted-foreground">Kelas {s.kelas ?? "-"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        {data && list.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada santri.</p>}
      </div>
    </div>
  );
}
