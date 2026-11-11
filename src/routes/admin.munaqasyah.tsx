import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal, todayJakarta } from "@/lib/laporan";
import { JUZ_LIST, MUNAQASYAH_PENDING_KEY, type PeriodeRow } from "@/lib/tasmi";

export const Route = createFileRoute("/admin/munaqasyah")({ component: AdminMunaqasyah });

const KEY = ["admin-munaqasyah"];

function AdminMunaqasyah() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("munaqasyah_periode").select("*").order("mulai", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="Munaqasyah" subtitle="Siswa yang Tasmi' 1 juz-nya lancar muncul otomatis sebagai calon. Tugas admin: umumkan ke orang tua." />
      <div className="mx-auto max-w-4xl space-y-5 p-4 lg:mx-0 lg:px-8">
        {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
        {data?.length === 0 && (
          <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-soft">
            Belum ada calon. Periode semester dibuat otomatis begitu ustadz memberi nilai L atau L- pada Tasmi' satu juz.
          </p>
        )}
        {data?.map((p) => <PeriodeCard key={p.id} p={p} onChanged={() => void qc.invalidateQueries({ queryKey: KEY })} />)}
      </div>
    </div>
  );
}

type Calon = { id: string; juz: number; sumber: string; diumumkan: boolean; students: { nama: string; kelas: string | null; jenjang: string } | null };

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
        .select("id, juz, sumber, diumumkan, students(nama, kelas, jenjang)")
        .eq("periode_id", p.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Calon[];
    },
  });
  const { data: semuaSiswa } = useQuery({
    queryKey: ["admin-munaqasyah-siswa"],
    queryFn: async () => (await supabase.from("students").select("id, nama, kelas").eq("aktif", true).order("nama")).data ?? [],
  });
  const refreshPeserta = () => Promise.all([qc.invalidateQueries({ queryKey: pesertaKey }), qc.invalidateQueries({ queryKey: [...MUNAQASYAH_PENDING_KEY] })]);

  const pending = (peserta ?? []).filter((x) => !x.diumumkan);
  const terumumkan = (peserta ?? []).filter((x) => x.diumumkan);

  const setUmum = async (ids: string[], umum: boolean, ok: string) => {
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("munaqasyah_peserta").update({ diumumkan: umum }).in("id", ids);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(ok);
    void refreshPeserta();
  };
  const simpanTanggal = async () => {
    setBusy(true);
    const { error } = await supabase.from("munaqasyah_periode").update({ tanggal_pelaksanaan: tgl || null }).eq("id", p.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Tanggal disimpan");
    onChanged();
  };
  const tambah = async () => {
    if (!siswa || !juz) return void toast.error("Pilih siswa dan juz");
    const { error } = await supabase.from("munaqasyah_peserta").insert({ periode_id: p.id, student_id: siswa, juz: Number(juz), sumber: "manual" });
    if (error) return void toast.error(error.code === "23505" ? "Siswa dan juz itu sudah terdaftar" : error.message);
    setSiswa(""); setJuz("");
    void refreshPeserta();
  };
  const keluarkan = async (id: string) => {
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
    void refreshPeserta();
  };

  const Baris = ({ x, aksi }: { x: Calon; aksi: React.ReactNode }) => (
    <li className="flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{x.students?.nama}</p>
        <p className="text-xs text-muted-foreground">Kelas {x.students?.kelas ?? "-"} • {x.students?.jenjang} • Juz {x.juz}{x.sumber === "manual" ? " • manual" : ""}</p>
      </div>
      {aksi}
    </li>
  );

  return (
    <section className="space-y-4 rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-bold">{p.nama}</h2>
          <p className="text-xs text-muted-foreground">Tasmi' dihitung {formatTanggal(p.mulai)} – {formatTanggal(p.selesai)}</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Hapus periode" className="shrink-0 text-destructive" onClick={hapusPeriode}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div>
        <Label>Tanggal pelaksanaan</Label>
        <div className="mt-1 flex max-w-sm gap-2">
          <Input type="date" value={tgl} min={todayJakarta()} onChange={(e) => setTgl(e.target.value)} />
          <Button variant="outline" disabled={busy || tgl === (p.tanggal_pelaksanaan ?? "")} onClick={simpanTanggal}>Simpan</Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Kosong = orang tua melihat "Tanggal menyusul".</p>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            Calon baru, belum diumumkan
            {pending.length > 0 && <span className="rounded-full bg-red-600 px-2 text-[11px] font-bold text-white">{pending.length}</span>}
          </h3>
          <Button size="sm" disabled={busy || pending.length === 0} onClick={() => setUmum(pending.map((x) => x.id), true, `${pending.length} siswa diumumkan ke orang tua`)}>
            <Megaphone className="mr-1 h-4 w-4" /> Umumkan semua ({pending.length})
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {pending.map((x) => (
            <Baris key={x.id} x={x} aksi={
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setUmum([x.id], true, "Diumumkan")}>Umumkan</Button>
                <Button size="icon" variant="ghost" aria-label="Keluarkan dari daftar" onClick={() => keluarkan(x.id)}><X className="h-4 w-4" /></Button>
              </>
            } />
          ))}
          {pending.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Tidak ada calon baru.</li>}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-primary">Sudah diumumkan ({terumumkan.length})</h3>
        <ul className="divide-y rounded-xl border">
          {terumumkan.map((x) => (
            <Baris key={x.id} x={x} aksi={<Button size="sm" variant="ghost" disabled={busy} onClick={() => setUmum([x.id], false, "Ditarik dari pengumuman")}><Undo2 className="mr-1 h-3.5 w-3.5" /> Tarik</Button>} />
          ))}
          {terumumkan.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Belum ada yang diumumkan.</li>}
        </ul>
      </div>

      <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
        <Select value={siswa} onValueChange={setSiswa}>
          <SelectTrigger><SelectValue placeholder="Tambah manual: pilih siswa" /></SelectTrigger>
          <SelectContent>{semuaSiswa?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}{s.kelas ? ` (${s.kelas})` : ""}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={juz} onValueChange={setJuz}>
          <SelectTrigger><SelectValue placeholder="Juz" /></SelectTrigger>
          <SelectContent>{JUZ_LIST.map((j) => <SelectItem key={j} value={String(j)}>Juz {j}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={tambah}>Tambah</Button>
      </div>
    </section>
  );
}
