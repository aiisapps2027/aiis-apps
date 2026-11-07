import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Copy, RefreshCw, Pencil, Trash2, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { Avatar, StatusChip } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeacher, deletePerson, regenerateTeacherKode, updateTeacher } from "@/lib/admin.functions";
import { normalizePhone } from "@/lib/auth-utils";

export const Route = createFileRoute("/admin/ustadz")({ component: AdminUstadz });

type Teacher = { id: string; nama: string; kode: string; no_hp: string | null; jenis_kelamin: string; aktif: boolean; foto_url: string | null };

function waLink(t: Teacher) {
  const url = typeof window !== "undefined" ? window.location.origin + "/login" : "";
  const msg = `Assalamu'alaikum ${t.nama}.\n\nBerikut info login aplikasi AIIS:\nNama: ${t.nama}\nKode Pengajar: ${t.kode}\n\nBuka ${url} lalu pilih "Masuk sebagai Ustadz".`;
  const phone = t.no_hp ? normalizePhone(t.no_hp) : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function AdminUstadz() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Teacher> | null>(null);
  const regen = useServerFn(regenerateTeacherKode);
  const del = useServerFn(deletePerson);
  const { data } = useQuery({
    queryKey: ["admin-ustadz"],
    queryFn: async () => ((await supabase.from("teachers").select("*").order("nama")).data ?? []) as Teacher[],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-ustadz"] });

  return (
    <div>
      <PageHeader
        title="Ustadz / Ustadzah"
        subtitle={`${data?.length ?? 0} pengajar`}
        action={<Button variant="secondary" className="rounded-xl lg:bg-primary lg:text-primary-foreground" onClick={() => setEdit({ jenis_kelamin: "L", aktif: true })}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>}
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:px-8 xl:grid-cols-3">
        {data?.map((t) => (
          <div key={t.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <Avatar name={t.nama} url={t.foto_url} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.nama}</p>
                <p className="text-xs text-muted-foreground">{t.no_hp ?? "Tanpa No. HP"}</p>
              </div>
              <StatusChip status={t.aktif ? "aktif" : "nonaktif"} />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Kode Pengajar</p>
                <p className="font-mono text-lg font-bold tracking-widest text-primary">{t.kode}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Salin kode" onClick={() => { navigator.clipboard.writeText(t.kode); toast.success("Kode disalin"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild className="rounded-lg">
                <a href={waLink(t)} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" /> Kirim via WhatsApp</a>
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm("Buat kode baru? Kode lama tidak bisa dipakai lagi.")) return;
                try { const r = await regen({ data: { id: t.id } }); toast.success(`Kode baru: ${r.kode}`); refresh(); } catch (e: any) { toast.error(e.message); }
              }}><RefreshCw className="mr-1 h-4 w-4" /> Kode baru</Button>
              <Button size="icon" variant="ghost" aria-label="Ubah" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Hapus" onClick={async () => {
                if (!confirm(`Hapus ${t.nama}?`)) return;
                try { await del({ data: { table: "teachers", id: t.id } }); refresh(); } catch (e: any) { toast.error(e.message); }
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      {edit && <TeacherDialog value={edit} onClose={() => setEdit(null)} onSaved={refresh} />}
    </div>
  );
}

function TeacherDialog({ value, onClose, onSaved }: { value: Partial<Teacher>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(value);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createTeacher);
  const update = useServerFn(updateTeacher);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Ubah Ustadz" : "Tambah Ustadz"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama (mis. Ust. Rizal)</Label><Input value={f.nama ?? ""} onChange={(e) => setF({ ...f, nama: e.target.value })} /></div>
          <div><Label>No. HP / WhatsApp</Label><Input inputMode="tel" value={f.no_hp ?? ""} onChange={(e) => setF({ ...f, no_hp: e.target.value })} /></div>
          <div><Label>Jenis Kelamin</Label>
            <Select value={f.jenis_kelamin} onValueChange={(v) => setF({ ...f, jenis_kelamin: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="L">Ustadz (Laki-laki)</SelectItem><SelectItem value="P">Ustadzah (Perempuan)</SelectItem></SelectContent></Select>
          </div>
          {f.id && <div className="flex items-center justify-between rounded-xl bg-muted p-3"><Label>Aktif</Label><Switch checked={f.aktif ?? true} onCheckedChange={(v) => setF({ ...f, aktif: v })} /></div>}
          {!f.id && <p className="text-xs text-muted-foreground">Kode pengajar 8 karakter akan dibuat otomatis.</p>}
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            const payload = { nama: f.nama ?? "", no_hp: f.no_hp ?? "", jenis_kelamin: (f.jenis_kelamin ?? "L") as "L" | "P" };
            try {
              if (f.id) await update({ data: { ...payload, id: f.id, aktif: f.aktif ?? true } });
              else { const r = await create({ data: payload }); toast.success(`Kode pengajar: ${r.kode}`); }
              onSaved(); onClose();
            } catch (e: any) { toast.error(e?.message?.startsWith("[") ? "Nama minimal 2 huruf" : e.message); }
            finally { setBusy(false); }
          }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
