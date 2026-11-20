import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { HARI, sortJadwal, type EskulRow } from "@/lib/eskul";
import { normalizeName } from "@/lib/auth-utils";

type Slot = { hari: string; mulai: string; selesai: string; tempat: string };

export function EskulDialog({ value, existing, onClose, onSaved }: { value: Partial<EskulRow>; existing: EskulRow[]; onClose: () => void; onSaved: () => void }) {
  const [nama, setNama] = useState(value.nama ?? "");
  const [pengajar, setPengajar] = useState(value.pengajar ?? "");
  const [deskripsi, setDeskripsi] = useState(value.deskripsi ?? "");
  const [aktif, setAktif] = useState(value.aktif ?? true);
  const [slots, setSlots] = useState<Slot[]>(sortJadwal(value.eskul_jadwal ?? []).map((j) => ({ hari: String(j.hari), mulai: j.jam_mulai.slice(0, 5), selesai: j.jam_selesai.slice(0, 5), tempat: j.tempat ?? "" })));
  const [busy, setBusy] = useState(false);
  // Suggestions for "Pengajar": all ustadz/ustadzah plus pengajar already used by other eskul (e.g. outside coaches).
  const { data: guru } = useQuery({
    queryKey: ["eskul-saran-pengajar"],
    queryFn: async () => (await supabase.from("teachers").select("nama").eq("aktif", true).order("nama")).data?.map((t) => t.nama) ?? [],
  });
  const [saranBuka, setSaranBuka] = useState(false);
  const saran = [...new Set([...(guru ?? []), ...existing.map((e) => e.pengajar ?? "")].map((n) => n.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  // Only suggest once something is typed; hide when the field already holds exactly a suggestion.
  const ketik = normalizeName(pengajar);
  const cocok = ketik ? saran.filter((n) => normalizeName(n).includes(ketik) && normalizeName(n) !== ketik).slice(0, 5) : [];
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
          <div><Label>Pengajar</Label><Input autoComplete="off" value={pengajar} onChange={(e) => { setPengajar(e.target.value); setSaranBuka(true); }} onBlur={() => setTimeout(() => setSaranBuka(false), 150)} placeholder="Nama pelatih / ustadz / ustadzah" />
            {saranBuka && cocok.length > 0 && (
              <ul className="mt-1 overflow-hidden rounded-xl border bg-card shadow-soft">
                {cocok.map((n) => (
                  <li key={n}>
                    <button type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted active:bg-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPengajar(n); setSaranBuka(false); }}>
                      {n}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div><Label>Keterangan (opsional)</Label><Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
          <div className="space-y-2">
            <Label className="block">Jadwal</Label>
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
