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
import { eskulSemuaQuery, HARI, jam, rentangJam, sortJadwal, type EskulRow } from "@/lib/eskul";
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

type Slot = { hari: string; mulai: string; selesai: string; tempat: string };

function EskulDialog({ value, existing, onClose, onSaved }: { value: Partial<EskulRow>; existing: EskulRow[]; onClose: () => void; onSaved: () => void }) {
  const [nama, setNama] = useState(value.nama ?? "");
  const [pengajar, setPengajar] = useState(value.pengajar ?? "");
  const [deskripsi, setDeskripsi] = useState(value.deskripsi ?? "");
  const [aktif, setAktif] = useState(value.aktif ?? true);
  const [slots, setSlots] = useState<Slot[]>(sortJadwal(value.eskul_jadwal ?? []).map((j) => ({ hari: String(j.hari), mulai: j.jam_mulai.slice(0, 5), selesai: j.jam_selesai.slice(0, 5), tempat: j.tempat ?? "" })));
  const [busy, setBusy] = useState(false);
  const setSlot = (i: number, patch: Partial<Slot>) => setSlots((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function save() {
    if (nama.trim().length < 2) return void toast.error("Isi nama eskul");
    if (existing.some((e) => e.id !== value.id && normalizeName(e.nama) === normalizeName(nama))) return void toast.error("Eskul dengan nama itu sudah ada");
    for (const s of slots) {
      if (!s.hari || !s.mulai || !s.selesai) return void toast.error("Lengkapi hari dan jam di setiap jadwal");
      if (s.selesai <= s.mulai) return void toast.error("Jam selesai harus setelah jam mulai");
    }
    setBusy(true);
    try {
      const payload = { nama: nama.trim(), pengajar: pengajar.trim() || null, deskripsi: deskripsi.trim() || null, aktif };
      let id = value.id;
      if (id) {
        const { error } = await supabase.from("eskul").update(payload).eq("id", id);
        if (error) throw error;
        const { error: e2 } = await supabase.from("eskul_jadwal").delete().eq("eskul_id", id);
        if (e2) throw e2;
      } else {
        const { data, error } = await supabase.from("eskul").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (slots.length) {
        const { error } = await supabase.from("eskul_jadwal").insert(
          slots.map((s) => ({ eskul_id: id!, hari: Number(s.hari), jam_mulai: s.mulai, jam_selesai: s.selesai, tempat: s.tempat.trim() || null })),
        );
        if (error) throw error;
      }
      toast.success("Eskul disimpan");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "Eskul dengan nama itu sudah ada" : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{value.id ? "Ubah Eskul" : "Tambah Eskul"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama eskul</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Panahan" /></div>
          <div><Label>Pengajar</Label><Input value={pengajar} onChange={(e) => setPengajar(e.target.value)} placeholder="Nama pelatih / ustadz / ustadzah" /></div>
          <div><Label>Keterangan (opsional)</Label><Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Jadwal</Label>
            {slots.map((s, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2">
                  <Select value={s.hari} onValueChange={(v) => setSlot(i, { hari: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Hari" /></SelectTrigger>
                    <SelectContent>{HARI.slice(1).map((h, k) => <SelectItem key={h} value={String(k + 1)}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="ghost" aria-label="Hapus jadwal" onClick={() => setSlots((x) => x.filter((_, k) => k !== i))}><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="time" value={s.mulai} onChange={(e) => setSlot(i, { mulai: e.target.value })} />
                  <span className="text-sm text-muted-foreground">s/d</span>
                  <Input type="time" value={s.selesai} onChange={(e) => setSlot(i, { selesai: e.target.value })} />
                </div>
                <Input value={s.tempat} onChange={(e) => setSlot(i, { tempat: e.target.value })} placeholder="Tempat (opsional)" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setSlots((x) => [...x, { hari: "", mulai: "15:30", selesai: "16:30", tempat: "" }])}><Plus className="mr-1 h-4 w-4" /> Tambah jadwal</Button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted p-3"><Label>Aktif (tampil di orang tua)</Label><Switch checked={aktif} onCheckedChange={setAktif} /></div>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={save}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
