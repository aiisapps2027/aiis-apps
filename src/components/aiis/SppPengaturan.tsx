import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatRupiah, JENIS_TAGIHAN_LABEL, type Katalog, type Rekening } from "@/lib/spp";

function RekeningCard({ r, onSaved }: { r: Rekening; onSaved: () => void }) {
  const [f, setF] = useState({ bank: r.bank, nomor: r.nomor, atas_nama: r.atas_nama });
  const [busy, setBusy] = useState(false);
  const dirty = f.bank !== r.bank || f.nomor !== r.nomor || f.atas_nama !== r.atas_nama;
  return (
    <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
      <h3 className="font-bold">Rekening {r.jenjang}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Bank</Label><Input value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} /></div>
        <div><Label>No. rekening</Label><Input inputMode="numeric" value={f.nomor} onChange={(e) => setF({ ...f, nomor: e.target.value.replace(/\s/g, "") })} /></div>
        <div className="col-span-2"><Label>Atas nama</Label><Input value={f.atas_nama} onChange={(e) => setF({ ...f, atas_nama: e.target.value })} /></div>
      </div>
      <Button disabled={!dirty || busy || f.bank.trim().length < 2 || f.nomor.length < 5 || f.atas_nama.trim().length < 2} onClick={async () => {
        setBusy(true);
        const { error } = await supabase.from("rekening_sekolah").update({ bank: f.bank.trim(), nomor: f.nomor, atas_nama: f.atas_nama.trim(), updated_at: new Date().toISOString() }).eq("jenjang", r.jenjang);
        setBusy(false);
        if (error) return void toast.error(error.message);
        toast.success(`Rekening ${r.jenjang} disimpan`);
        onSaved();
      }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
    </section>
  );
}

function KatalogRow({ k, onSaved }: { k: Katalog; onSaved: () => void }) {
  const [nominal, setNominal] = useState(String(k.nominal));
  const save = async (patch: Partial<Katalog>) => {
    const { error } = await supabase.from("katalog_tagihan").update(patch).eq("id", k.id);
    if (error) return void toast.error(error.message);
    toast.success("Tersimpan");
    onSaved();
  };
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{k.nama}</p>
        <p className="text-xs text-muted-foreground">{JENIS_TAGIHAN_LABEL[k.jenis] ?? k.jenis}{k.jenjang ? ` • ${k.jenjang}` : ""}{k.untuk ? ` • ${k.untuk === "L" ? "Ikhwan" : "Akhwat"}` : ""}</p>
      </div>
      <Input aria-label={`Harga ${k.nama}`} inputMode="numeric" value={nominal} onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))} onBlur={() => Number(nominal) > 0 && Number(nominal) !== k.nominal ? save({ nominal: Number(nominal) }) : setNominal(String(k.nominal))} className="h-9 w-28 text-right" />
      <Switch aria-label={`Aktif ${k.nama}`} checked={k.aktif} onCheckedChange={(v) => save({ aktif: v })} />
    </li>
  );
}

export function SppPengaturan() {
  const qc = useQueryClient();
  const { data: rek } = useQuery({ queryKey: ["admin-rekening"], queryFn: async () => (await supabase.from("rekening_sekolah").select("*").order("jenjang")).data ?? [] });
  const { data: kat } = useQuery({ queryKey: ["admin-katalog"], queryFn: async () => (await supabase.from("katalog_tagihan").select("*").order("urutan")).data ?? [] });
  const refreshRek = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-rekening"] }), qc.invalidateQueries({ queryKey: ["rekening-sekolah"] })]);
  const refreshKat = () => qc.invalidateQueries({ queryKey: ["admin-katalog"] });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">{rek?.map((r) => <RekeningCard key={r.jenjang + r.nomor} r={r} onSaved={() => void refreshRek()} />)}</div>
      <section>
        <h3 className="mb-1 font-bold">Daftar harga</h3>
        <p className="mb-2 text-xs text-muted-foreground">Mengubah harga di sini tidak mengubah tagihan yang sudah dibuat. Harga SPP di sini menjadi isian awal saat membuat tagihan SPP bulanan.</p>
        <ul className="divide-y rounded-2xl bg-card shadow-soft">{kat?.map((k) => <KatalogRow key={k.id + k.nominal} k={k} onSaved={() => void refreshKat()} />)}</ul>
        {kat && <p className="mt-2 text-xs text-muted-foreground">Contoh: {kat[0] ? `${kat[0].nama} ${formatRupiah(kat[0].nominal)}` : ""}</p>}
      </section>
    </div>
  );
}
