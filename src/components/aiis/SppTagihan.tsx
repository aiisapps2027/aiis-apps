import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TagihanChip } from "@/components/aiis/TagihanChip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeName } from "@/lib/auth-utils";
import { formatTanggal, shiftDate, todayJakarta } from "@/lib/laporan";
import { buildSppRows, formatRupiah, JENIS_TAGIHAN_LABEL, katalogUntuk, MENUNGGU_KEY, tagihanUi, type Katalog, type Tagihan } from "@/lib/spp";

const ALL = "__all";
type StudentRow = { id: string; nama: string; kelas: string | null; jenjang: string; jenis_kelamin: string };

const insertChunks = async (rows: object[]) => {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("tagihan").insert(rows.slice(i, i + 200) as never);
    if (error) throw error;
  }
};

export function SppTagihan() {
  const qc = useQueryClient();
  const [status, setStatus] = useState(ALL);
  const [jenjang, setJenjang] = useState(ALL);
  const [jenis, setJenis] = useState(ALL);
  const [q, setQ] = useState("");
  const [buat, setBuat] = useState(false);
  const [edit, setEdit] = useState<(Tagihan & { students: { nama: string } }) | null>(null);
  const today = todayJakarta();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tagihan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tagihan").select("*, students(nama, kelas, jenjang)").order("jatuh_tempo", { ascending: false }).limit(600);
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-tagihan"] }), qc.invalidateQueries({ queryKey: [...MENUNGGU_KEY] })]);

  const list = (data ?? []).filter((t) => {
    const ui = tagihanUi(t, undefined, today);
    return (status === ALL || (status === "terlambat" ? ui === "terlambat" : t.status === status)) &&
      (jenjang === ALL || t.students.jenjang === jenjang) &&
      (jenis === ALL || t.jenis === jenis) &&
      (!q.trim() || normalizeName(t.students.nama).includes(normalizeName(q)));
  });
  const totalBelum = list.filter((t) => t.status !== "lunas").reduce((n, t) => n + t.nominal, 0);

  async function lunasTunai(t: Tagihan & { students: { nama: string } }) {
    if (!confirm(`Tandai ${t.judul} (${t.students.nama}) sebagai LUNAS tanpa bukti transfer, misalnya dibayar tunai?`)) return;
    const { error } = await supabase.from("tagihan").update({ status: "lunas", dibayar_at: new Date().toISOString(), catatan: "Dibayar tunai / dicatat admin" }).eq("id", t.id);
    if (error) return void toast.error(error.message);
    toast.success("Ditandai lunas");
    await refresh();
  }
  async function hapus(t: Tagihan & { students: { nama: string } }) {
    if (!confirm(`Hapus tagihan ${t.judul} untuk ${t.students.nama}?`)) return;
    const { error } = await supabase.from("tagihan").delete().eq("id", t.id);
    if (error) return void toast.error(error.message);
    toast.success("Tagihan dihapus");
    await refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[11rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama siswa" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl bg-card pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40 rounded-xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Semua status</SelectItem><SelectItem value="belum_bayar">Belum dibayar</SelectItem><SelectItem value="terlambat">Terlambat</SelectItem><SelectItem value="menunggu">Menunggu</SelectItem><SelectItem value="lunas">Lunas</SelectItem></SelectContent></Select>
        <Select value={jenjang} onValueChange={setJenjang}><SelectTrigger className="w-28 rounded-xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>TK + SD</SelectItem><SelectItem value="TK">TK</SelectItem><SelectItem value="SD">SD</SelectItem></SelectContent></Select>
        <Select value={jenis} onValueChange={setJenis}><SelectTrigger className="w-36 rounded-xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Semua jenis</SelectItem>{Object.entries(JENIS_TAGIHAN_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Button className="rounded-xl" onClick={() => setBuat(true)}><Plus className="mr-1 h-4 w-4" /> Buat tagihan</Button>
      </div>
      {data && <p className="text-xs text-muted-foreground">{list.length} tagihan • belum lunas {formatRupiah(totalBelum)}</p>}
      {isLoading && <Skeleton className="h-24 w-full rounded-2xl" />}
      {data && list.length === 0 && <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Tidak ada tagihan pada filter ini.</p>}
      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id} className="rounded-2xl bg-card p-3 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{t.students.nama} <span className="text-xs font-normal text-muted-foreground">{t.students.jenjang} • {t.students.kelas ?? "-"}</span></p>
                <p className="break-words text-sm">{t.judul}</p>
                <p className="text-xs text-muted-foreground">Jatuh tempo {formatTanggal(t.jatuh_tempo)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatRupiah(t.nominal)}</p>
                <TagihanChip ui={tagihanUi(t, undefined, today)} className="mt-0.5" />
              </div>
            </div>
            {t.status !== "lunas" && (
              <div className="mt-2 flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => lunasTunai(t)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Lunas (tunai)</Button>
                <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setEdit(t)}><Pencil className="mr-1 h-3.5 w-3.5" />Ubah</Button>
                <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => hapus(t)}><Trash2 className="mr-1 h-3.5 w-3.5" />Hapus</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {buat && <BuatTagihan onClose={() => setBuat(false)} onDone={() => { setBuat(false); void refresh(); }} />}
      {edit && <UbahTagihan t={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void refresh(); }} />}
    </div>
  );
}

function UbahTagihan({ t, onClose, onDone }: { t: Tagihan & { students: { nama: string } }; onClose: () => void; onDone: () => void }) {
  const [nominal, setNominal] = useState(String(t.nominal));
  const [tempo, setTempo] = useState(t.jatuh_tempo);
  const [catatan, setCatatan] = useState(t.catatan ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="break-words">Ubah {t.judul} — {t.students.nama}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nominal (Rp)</Label><Input inputMode="numeric" value={nominal} onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))} /></div>
          <div><Label>Jatuh tempo</Label><Input type="date" value={tempo} onChange={(e) => setTempo(e.target.value)} /></div>
          <div><Label>Catatan (mis. potongan / beasiswa)</Label><Input value={catatan} onChange={(e) => setCatatan(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button disabled={busy || !Number(nominal)} onClick={async () => {
            setBusy(true);
            const { error } = await supabase.from("tagihan").update({ nominal: Number(nominal), jatuh_tempo: tempo, catatan: catatan.trim() || null }).eq("id", t.id);
            setBusy(false);
            if (error) return void toast.error(error.message);
            toast.success("Tagihan diperbarui");
            onDone();
          }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BuatTagihan({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"spp" | "lain">("spp");
  const { data: katalog } = useQuery({ queryKey: ["admin-katalog"], queryFn: async () => (await supabase.from("katalog_tagihan").select("*").order("urutan")).data ?? [] });
  const { data: siswa } = useQuery({ queryKey: ["admin-tagihan-siswa"], queryFn: async () => ((await supabase.from("students").select("id, nama, kelas, jenjang, jenis_kelamin").eq("aktif", true).order("nama")).data ?? []) as StudentRow[] });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Buat tagihan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {([["spp", "SPP bulanan"], ["lain", "Buku / seragam / lainnya"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === k ? "bg-card shadow-soft" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {mode === "spp" ? <SppBulanan katalog={katalog ?? []} siswa={siswa ?? []} onDone={onDone} /> : <TagihanLain katalog={katalog ?? []} siswa={siswa ?? []} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

function SppBulanan({ katalog, siswa, onDone }: { katalog: Katalog[]; siswa: StudentRow[]; onDone: () => void }) {
  const harga = (j: string) => String(katalog.find((k) => k.jenis === "spp" && k.jenjang === j && k.aktif)?.nominal ?? "");
  const [ym, setYm] = useState(todayJakarta().slice(0, 7));
  const [tk, setTk] = useState<string | null>(null);
  const [sd, setSd] = useState<string | null>(null);
  const [scope, setScope] = useState(ALL);
  const [busy, setBusy] = useState(false);
  const nTk = tk ?? harga("TK");
  const nSd = sd ?? harga("SD");
  const target = siswa.filter((s) => scope === ALL || s.jenjang === scope);

  async function go() {
    if (!/^\d{4}-\d{2}$/.test(ym)) return void toast.error("Pilih bulan");
    setBusy(true);
    try {
      const { data: ada, error } = await supabase.from("tagihan").select("student_id").eq("jenis", "spp").eq("periode", `${ym}-01`);
      if (error) throw error;
      const { rows, dilewati } = buildSppRows(target, ym, { TK: Number(nTk), SD: Number(nSd) }, new Set((ada ?? []).map((a) => a.student_id)));
      if (!rows.length) { toast.info(`Tidak ada tagihan baru (${dilewati} siswa sudah punya SPP bulan ini)`); return; }
      await insertChunks(rows);
      toast.success(`${rows.length} tagihan SPP dibuat${dilewati ? `, ${dilewati} dilewati (sudah ada)` : ""}`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat tagihan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Bulan</Label><Input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></div>
        <div><Label>Untuk</Label>
          <Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Semua siswa aktif</SelectItem><SelectItem value="TK">TK saja</SelectItem><SelectItem value="SD">SD saja</SelectItem></SelectContent></Select>
        </div>
        <div><Label>SPP TK (Rp)</Label><Input inputMode="numeric" value={nTk} onChange={(e) => setTk(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label>SPP SD (Rp)</Label><Input inputMode="numeric" value={nSd} onChange={(e) => setSd(e.target.value.replace(/\D/g, ""))} /></div>
      </div>
      <p className="text-xs text-muted-foreground">Jatuh tempo tanggal 10. {target.length} siswa aktif akan ditagih; yang sudah punya SPP bulan itu dilewati. Potongan per siswa bisa diubah setelah dibuat.</p>
      <DialogFooter><Button disabled={busy || !target.length} onClick={go}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat tagihan SPP</Button></DialogFooter>
    </div>
  );
}

function TagihanLain({ katalog, siswa, onDone }: { katalog: Katalog[]; siswa: StudentRow[]; onDone: () => void }) {
  const items = katalog.filter((k) => k.aktif && k.jenis !== "spp");
  const [itemId, setItemId] = useState<string>("manual");
  const item = items.find((k) => k.id === itemId);
  const [judul, setJudul] = useState("");
  const [nominal, setNominal] = useState<string | null>(null);
  const [tempo, setTempo] = useState(shiftDate(todayJakarta(), 14));
  const [q, setQ] = useState("");
  const [semua, setSemua] = useState(false);
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const kandidat = useMemo(() => siswa.filter((s) => (semua || !item || katalogUntuk([item], s).length > 0) && (!q.trim() || normalizeName(s.nama).includes(normalizeName(q)))), [siswa, item, semua, q]);
  const nom = nominal ?? String(item?.nominal ?? "");
  const toggle = (id: string) => setPilih((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function go() {
    const title = item?.nama ?? judul.trim();
    if (!title) return void toast.error("Isi nama tagihan");
    if (!Number(nom)) return void toast.error("Isi nominal");
    if (!pilih.size) return void toast.error("Pilih minimal satu siswa");
    setBusy(true);
    try {
      await insertChunks([...pilih].map((id) => ({ student_id: id, jenis: item?.jenis ?? "lainnya", judul: title, nominal: Number(nom), jatuh_tempo: tempo })));
      toast.success(`${pilih.size} tagihan dibuat`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat tagihan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div><Label>Jenis tagihan</Label>
        <Select value={itemId} onValueChange={(v) => { setItemId(v); setNominal(null); setPilih(new Set()); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="manual">Lainnya (isi manual)</SelectItem>{items.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama} — {formatRupiah(k.nominal)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {!item && <div><Label>Nama tagihan</Label><Input placeholder="mis. Uang kegiatan" value={judul} onChange={(e) => setJudul(e.target.value)} /></div>}
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nominal (Rp)</Label><Input inputMode="numeric" value={nom} onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label>Jatuh tempo</Label><Input type="date" value={tempo} onChange={(e) => setTempo(e.target.value)} /></div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Siswa ({pilih.size} dipilih)</Label>
          {item && <label className="flex items-center gap-2 text-xs"><Checkbox checked={semua} onCheckedChange={(v) => setSemua(v === true)} />Tampilkan semua siswa</label>}
        </div>
        <Input placeholder="Cari nama siswa" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-56 divide-y overflow-y-auto rounded-xl border">
          {kandidat.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
              <Checkbox checked={pilih.has(s.id)} onCheckedChange={() => toggle(s.id)} />
              <span className="min-w-0 flex-1 break-words">{s.nama}</span>
              <span className="text-xs text-muted-foreground">{s.jenjang} • {s.kelas ?? "-"} • {s.jenis_kelamin === "P" ? "Akhwat" : "Ikhwan"}</span>
            </label>
          ))}
          {kandidat.length === 0 && <p className="p-3 text-sm text-muted-foreground">Tidak ada siswa yang cocok.</p>}
        </div>
        {kandidat.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setPilih(new Set(kandidat.map((s) => s.id)))}>Pilih semua yang tampil</Button>}
      </div>
      <DialogFooter><Button disabled={busy} onClick={go}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat tagihan</Button></DialogFooter>
    </div>
  );
}
