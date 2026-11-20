import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Loader2, MapPin, Pencil, Plus, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EskulDialog } from "@/components/aiis/EskulDialog";
import { eskulSemuaQuery, HARI, rentangJam, sortJadwal, type EskulRow } from "@/lib/eskul";
import { normalizeName } from "@/lib/auth-utils";

export const Route = createFileRoute("/admin/eskul")({ component: AdminEskul });

function AdminEskul() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(eskulSemuaQuery);
  const { data: jumlah } = useQuery({
    queryKey: ["eskul-jumlah-peserta"],
    queryFn: async () => {
      const { data } = await supabase.from("eskul_peserta").select("eskul_id");
      const m: Record<string, number> = {};
      for (const r of data ?? []) m[r.eskul_id] = (m[r.eskul_id] ?? 0) + 1;
      return m;
    },
  });
  const [edit, setEdit] = useState<Partial<EskulRow> | null>(null);
  const [peserta, setPeserta] = useState<EskulRow | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: eskulSemuaQuery.queryKey });
    qc.invalidateQueries({ queryKey: ["eskul-jumlah-peserta"] });
  };

  return (
    <div>
      <PageHeader
        title="Eskul"
        subtitle={`${data?.length ?? 0} eskul`}
        action={<Button variant="secondary" className="rounded-xl lg:bg-primary lg:text-primary-foreground" onClick={() => setEdit({ aktif: true, eskul_jadwal: [] })}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>}
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:px-8 xl:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {data?.map((e) => (
          <div key={e.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-lg font-bold">{e.nama}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /> {e.pengajar || "Pengajar belum diisi"}</p>
              </div>
              {!e.aktif && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Nonaktif</span>}
            </div>
            <ul className="mt-3 space-y-1.5">
              {sortJadwal(e.eskul_jadwal).map((j) => (
                <li key={j.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-sm">
                  <span className="w-16 shrink-0 font-semibold">{HARI[j.hari]}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {rentangJam(j)}</span>
                  {j.tempat && <span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /> {j.tempat}</span>}
                </li>
              ))}
              {e.eskul_jadwal.length === 0 && <li className="text-sm text-muted-foreground">Jadwal belum diisi</li>}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setPeserta(e)}><Users className="mr-1 h-4 w-4" /> Peserta ({jumlah?.[e.id] ?? 0})</Button>
              <Button size="icon" variant="ghost" aria-label="Ubah" onClick={() => setEdit(e)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Hapus" onClick={async () => {
                if (!confirm(`Hapus eskul ${e.nama}? Jadwal dan daftar pesertanya ikut terhapus.`)) return;
                const { error } = await supabase.from("eskul").delete().eq("id", e.id);
                if (error) toast.error(error.message); else { toast.success("Eskul dihapus"); refresh(); }
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      {edit && <EskulDialog value={edit} existing={data ?? []} onClose={() => setEdit(null)} onSaved={refresh} />}
      {peserta && <PesertaDialog eskul={peserta} onClose={() => { setPeserta(null); refresh(); }} />}
    </div>
  );
}

function PesertaDialog({ eskul, onClose }: { eskul: EskulRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: siswa } = useQuery({
    queryKey: ["eskul-siswa-semua"],
    queryFn: async () => (await supabase.from("students").select("id, nama, kelas, jenjang").eq("aktif", true).order("nama").limit(1000)).data ?? [],
  });
  const { data: ikut } = useQuery({
    queryKey: ["eskul-peserta", eskul.id],
    queryFn: async () => new Set(((await supabase.from("eskul_peserta").select("student_id").eq("eskul_id", eskul.id)).data ?? []).map((r) => r.student_id)),
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = (siswa ?? []).filter((s) => !q.trim() || normalizeName(s.nama).includes(normalizeName(q)));

  async function toggle(id: string, on: boolean) {
    setBusyId(id);
    const { error } = on
      ? await supabase.from("eskul_peserta").insert({ eskul_id: eskul.id, student_id: id })
      : await supabase.from("eskul_peserta").delete().eq("eskul_id", eskul.id).eq("student_id", id);
    setBusyId(null);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["eskul-peserta", eskul.id] });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Peserta {eskul.nama} ({ikut?.size ?? 0})</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama siswa" className="pl-9" />
        </div>
        <ul className="divide-y">
          {list.map((s) => {
            const on = ikut?.has(s.id) ?? false;
            return (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.nama}</p>
                  <p className="text-xs text-muted-foreground">Kelas {s.kelas ?? "-"} • {s.jenjang}</p>
                </div>
                {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Switch checked={on} onCheckedChange={(v) => toggle(s.id, v)} aria-label={`Ikutkan ${s.nama}`} />}
              </li>
            );
          })}
          {list.length === 0 && <li className="py-3 text-sm text-muted-foreground">Tidak ada siswa yang cocok.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
