import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calculator, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatTanggal, todayJakarta } from "@/lib/laporan";
import { JUZ_LIST, type PeriodeRow } from "@/lib/tasmi";

export const Route = createFileRoute("/admin/munaqasyah")({ component: AdminMunaqasyah });

const KEY = ["admin-munaqasyah"];

function AdminMunaqasyah() {
  const qc = useQueryClient();
  const [buka, setBuka] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("munaqasyah_periode").select("*").order("mulai", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  return (
    <div>
      <PageHeader
        title="Munaqasyah"
        subtitle="Diadakan dua kali setahun. Calon dihitung dari Tasmi' ustadz, lalu diumumkan ke orang tua."
        action={<Button className="rounded-xl" onClick={() => setBuka(true)}><Plus className="mr-1 h-4 w-4" /> Periode baru</Button>}
      />
      <div className="mx-auto max-w-4xl space-y-5 p-4 lg:mx-0 lg:px-8">
        {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
        {data?.length === 0 && <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-soft">Belum ada periode. Buat satu periode per semester (misalnya "Munaqasyah Semester Ganjil 2026/2027").</p>}
        {data?.map((p) => <PeriodeCard key={p.id} p={p} onChanged={() => void refresh()} />)}
      </div>
      <PeriodeBaru open={buka} onClose={() => setBuka(false)} onSaved={() => void refresh()} />
    </div>
  );
}

function PeriodeBaru({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nama, setNama] = useState("");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [saving, setSaving] = useState(false);
  const simpan = async () => {
    if (nama.trim().length < 3) return void toast.error("Isi nama periode");
    if (!mulai || !selesai) return void toast.error("Isi awal dan akhir semester");
    if (selesai < mulai) return void toast.error("Akhir semester tidak boleh sebelum awal");
    setSaving(true);
    const { error } = await supabase.from("munaqasyah_periode").insert({ nama: nama.trim(), mulai, selesai });
    setSaving(false);
    if (error) return void toast.error(error.message);
    toast.success("Periode dibuat");
    setNama(""); setMulai(""); setSelesai("");
    onSaved();
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Periode Munaqasyah baru</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Munaqasyah Semester Ganjil 2026/2027" maxLength={100} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Awal semester</Label><Input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className="mt-1" /></div>
            <div><Label>Akhir semester</Label><Input type="date" value={selesai} min={mulai} onChange={(e) => setSelesai(e.target.value)} className="mt-1" /></div>
          </div>
          <p className="text-xs text-muted-foreground">Tasmi' yang lancar pada rentang tanggal ini menjadi dasar calon peserta. Tanggal pelaksanaan bisa diisi nanti.</p>
        </div>
        <DialogFooter><Button onClick={simpan} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodeCard({ p, onChanged }: { p: PeriodeRow; onChanged: () => void }) {
  const qc = useQueryClient();
  const [tgl, setTgl] = useState(p.tanggal_pelaksanaan ?? "");
  const [busy, setBusy] = useState(false);
  const [siswa, setSiswa] = useState("");
  const [juz, setJuz] = useState("");
  const pesertaKey = ["admin-munaqasyah-peserta", p.id];

  const { data: peserta } = useQuery({
    queryKey: pesertaKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("munaqasyah_peserta")
        .select("id, juz, sumber, students(nama, kelas, jenjang)")
        .eq("periode_id", p.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: semuaSiswa } = useQuery({
    queryKey: ["admin-munaqasyah-siswa"],
    queryFn: async () => (await supabase.from("students").select("id, nama, kelas").eq("aktif", true).order("nama")).data ?? [],
  });
  const refreshPeserta = () => qc.invalidateQueries({ queryKey: pesertaKey });

  const update = async (patch: Partial<Pick<PeriodeRow, "tanggal_pelaksanaan" | "diumumkan">>, ok: string) => {
    setBusy(true);
    const { error } = await supabase.from("munaqasyah_periode").update(patch).eq("id", p.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(ok);
    onChanged();
  };
  const hitung = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("hitung_calon_munaqasyah", { _periode: p.id });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(data ? `${data} calon baru ditambahkan` : "Tidak ada calon baru");
    void refreshPeserta();
  };
  const tambah = async () => {
    if (!siswa || !juz) return void toast.error("Pilih siswa dan juz");
    const { error } = await supabase.from("munaqasyah_peserta").insert({ periode_id: p.id, student_id: siswa, juz: Number(juz), sumber: "manual" });
    if (error) return void toast.error(error.code === "23505" ? "Siswa dan juz itu sudah terdaftar" : error.message);
    setSiswa(""); setJuz("");
    void refreshPeserta();
  };
  const hapusPeserta = async (id: string) => {
    const { error } = await supabase.from("munaqasyah_peserta").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    void refreshPeserta();
  };
  const hapusPeriode = async () => {
    if (!confirm(`Hapus periode "${p.nama}" beserta daftar pesertanya?`)) return;
    const { error } = await supabase.from("munaqasyah_periode").delete().eq("id", p.id);
    if (error) return void toast.error(error.message);
    toast.success("Periode dihapus");
    onChanged();
  };

  return (
    <section className="space-y-4 rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-bold">{p.nama}</h2>
          <p className="text-xs text-muted-foreground">Dasar Tasmi': {formatTanggal(p.mulai)} – {formatTanggal(p.selesai)}</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Hapus periode" className="shrink-0 text-destructive" onClick={hapusPeriode}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Tanggal pelaksanaan</Label>
          <div className="mt-1 flex gap-2">
            <Input type="date" value={tgl} min={todayJakarta()} onChange={(e) => setTgl(e.target.value)} />
            <Button variant="outline" disabled={busy || tgl === (p.tanggal_pelaksanaan ?? "")} onClick={() => update({ tanggal_pelaksanaan: tgl || null }, "Tanggal disimpan")}>Simpan</Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Kosong = orang tua melihat "Tanggal menyusul".</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
          <div>
            <p className="text-sm font-semibold">Umumkan ke orang tua</p>
            <p className="text-xs text-muted-foreground">{p.diumumkan ? "Daftar peserta terlihat orang tua" : "Masih draf, belum terlihat"}</p>
          </div>
          <Switch checked={p.diumumkan} disabled={busy} onCheckedChange={(v) => update({ diumumkan: v }, v ? "Diumumkan" : "Ditarik kembali")} aria-label="Umumkan" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-primary">Peserta ({peserta?.length ?? 0})</h3>
          <Button size="sm" variant="outline" disabled={busy} onClick={hitung}><Calculator className="mr-1 h-4 w-4" /> Hitung calon dari Tasmi'</Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {peserta?.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{x.students?.nama}</p>
                <p className="text-xs text-muted-foreground">Kelas {x.students?.kelas ?? "-"} • {x.students?.jenjang} • Juz {x.juz} • {x.sumber === "manual" ? "manual" : "dari Tasmi'"}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Keluarkan dari daftar" onClick={() => hapusPeserta(x.id)}><X className="h-4 w-4" /></Button>
            </li>
          ))}
          {peserta?.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Belum ada peserta. Tekan "Hitung calon dari Tasmi'".</li>}
        </ul>
        <div className="mt-3 grid grid-cols-[1fr_6rem_auto] gap-2">
          <Select value={siswa} onValueChange={setSiswa}>
            <SelectTrigger><SelectValue placeholder="Tambah manual: pilih siswa" /></SelectTrigger>
            <SelectContent>{semuaSiswa?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}{s.kelas ? ` (${s.kelas})` : ""}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={juz} onValueChange={setJuz}>
            <SelectTrigger><SelectValue placeholder="Juz" /></SelectTrigger>
            <SelectContent>{JUZ_LIST.map((j) => <SelectItem key={j} value={String(j)}>Juz {j}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={tambah}>Tambah</Button>
        </div>
      </div>
    </section>
  );
}
