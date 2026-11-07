import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { IconTile } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/halaqah")({ component: AdminHalaqah });

type H = { id?: string; nama: string; jenjang: string; teacher_id: string | null };

function AdminHalaqah() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<H | null>(null);
  const { data } = useQuery({
    queryKey: ["admin-halaqah"],
    queryFn: async () => {
      const [h, t, s] = await Promise.all([
        supabase.from("halaqah").select("*").order("nama"),
        supabase.from("teachers").select("id, nama").eq("aktif", true).order("nama"),
        supabase.from("students").select("id, nama, jenjang, kelas, halaqah_id").order("nama"),
      ]);
      return { halaqah: h.data ?? [], teachers: t.data ?? [], students: s.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries();

  return (
    <div>
      <PageHeader title="Halaqah" subtitle={`${data?.halaqah.length ?? 0} halaqah`} action={<Button variant="secondary" className="rounded-xl lg:bg-primary lg:text-primary-foreground" onClick={() => setEdit({ nama: "", jenjang: "SD", teacher_id: null })}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>} />
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:px-8 xl:grid-cols-3">
        {data?.halaqah.map((h) => {
          const n = data.students.filter((s) => s.halaqah_id === h.id).length;
          return (
            <div key={h.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
              <IconTile><Users className="h-5 w-5" /></IconTile>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{h.nama} <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">{h.jenjang}</span></p>
                <p className="truncate text-xs text-muted-foreground">{data.teachers.find((t) => t.id === h.teacher_id)?.nama ?? "Belum ada ustadz"} • {n} siswa</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Ubah" onClick={() => setEdit(h)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Hapus" onClick={async () => {
                if (!confirm(`Hapus ${h.nama}? Siswa akan dilepas dari halaqah ini.`)) return;
                const { error } = await supabase.from("halaqah").delete().eq("id", h.id);
                if (error) toast.error(error.message); else refresh();
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
      </div>
      {edit && data && <HalaqahDialog value={edit} teachers={data.teachers} students={data.students} onClose={() => setEdit(null)} onSaved={refresh} />}
    </div>
  );
}

function HalaqahDialog({ value, teachers, students, onClose, onSaved }: {
  value: H; teachers: { id: string; nama: string }[];
  students: { id: string; nama: string; jenjang: string; kelas: string | null; halaqah_id: string | null }[];
  onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState(value);
  const [sel, setSel] = useState<Set<string>>(new Set(students.filter((s) => value.id && s.halaqah_id === value.id).map((s) => s.id)));
  const [busy, setBusy] = useState(false);
  const NONE = "__none";
  const pool = students.filter((s) => s.jenjang === f.jenjang);

  async function save() {
    if (f.nama.trim().length < 2) { toast.error("Nama halaqah wajib diisi"); return; }
    setBusy(true);
    try {
      const row = { nama: f.nama.trim(), jenjang: f.jenjang, teacher_id: f.teacher_id };
      let id = f.id;
      if (id) {
        const { error } = await supabase.from("halaqah").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("halaqah").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const prev = students.filter((s) => s.halaqah_id === id).map((s) => s.id);
      const removed = prev.filter((x) => !sel.has(x));
      if (removed.length) await supabase.from("students").update({ halaqah_id: null }).in("id", removed);
      if (sel.size) await supabase.from("students").update({ halaqah_id: id }).in("id", [...sel]);
      toast.success("Halaqah disimpan");
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Ubah Halaqah" : "Tambah Halaqah"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama Halaqah</Label><Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Jenjang</Label>
              <Select value={f.jenjang} onValueChange={(v) => setF({ ...f, jenjang: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TK">TK</SelectItem><SelectItem value="SD">SD</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Ustadz</Label>
              <Select value={f.teacher_id ?? NONE} onValueChange={(v) => setF({ ...f, teacher_id: v === NONE ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Belum ada</SelectItem>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Siswa ({sel.size} dipilih)</Label>
            <div className="mt-1 max-h-60 space-y-1 overflow-y-auto rounded-xl border p-2">
              {pool.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox checked={sel.has(s.id)} onCheckedChange={(c) => { const n = new Set(sel); c ? n.add(s.id) : n.delete(s.id); setSel(n); }} />
                  <span className="flex-1">{s.nama}</span>
                  <span className="text-xs text-muted-foreground">{s.kelas}</span>
                </label>
              ))}
              {pool.length === 0 && <p className="p-2 text-xs text-muted-foreground">Belum ada siswa {f.jenjang}.</p>}
            </div>
          </div>
        </div>
        <DialogFooter><Button disabled={busy} onClick={save}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
