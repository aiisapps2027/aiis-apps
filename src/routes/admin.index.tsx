import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { GraduationCap, Baby, School, UserCog, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { IconTile } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { seedDemo } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

const count = async (t: "students" | "teachers" | "halaqah", jenjang?: string) => {
  let q = supabase.from(t).select("id", { count: "exact", head: true });
  if (jenjang) q = q.eq("jenjang", jenjang);
  return (await q).count ?? 0;
};

function AdminHome() {
  const qc = useQueryClient();
  const seed = useServerFn(seedDemo);
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState<Awaited<ReturnType<typeof seedDemo>> | null>(null);
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
        {data?.siswa === 0 && !seeded && (
          <div className="rounded-2xl border border-dashed bg-card p-5">
            <p className="font-semibold">Belum ada data</p>
            <p className="mt-1 text-sm text-muted-foreground">Isi data contoh (3 ustadz, 4 halaqah, 8 siswa) untuk mencoba aplikasi.</p>
            <Button
              className="mt-3 rounded-xl"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setSeeded(await seed());
                  qc.invalidateQueries();
                  toast.success("Data contoh berhasil dibuat");
                } catch (e: any) {
                  toast.error(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Isi Data Contoh
            </Button>
          </div>
        )}
        {seeded && (
          <div className="rounded-2xl bg-card p-5 text-sm shadow-soft">
            <p className="mb-2 font-semibold">Info login data contoh (simpan baik-baik):</p>
            <p className="font-medium">Ustadz (Nama + Kode):</p>
            <ul className="mb-2 list-disc pl-5">{seeded.kodes.map((k) => <li key={k.kode}>{k.nama} — <b>{k.kode}</b></li>)}</ul>
            <p className="font-medium">Orang Tua (Nama Murid + No. HP + NIK):</p>
            <ul className="list-disc pl-5">{seeded.students.map((s) => <li key={s.nik}>{s.nama} — {s.no_hp} — {s.nik}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
