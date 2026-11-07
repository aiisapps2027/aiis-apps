import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { announcementsQuery, formatDate } from "@/lib/queries";

export const Route = createFileRoute("/admin/pengumuman")({ component: AdminPengumuman });

type A = { id?: string; judul: string; isi: string; target: string };

function AdminPengumuman() {
  const qc = useQueryClient();
  const { data } = useQuery(announcementsQuery());
  const [edit, setEdit] = useState<A | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  return (
    <div>
      <PageHeader title="Pengumuman" action={<Button variant="secondary" className="rounded-xl lg:bg-primary lg:text-primary-foreground" onClick={() => setEdit({ judul: "", isi: "", target: "semua" })}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>} />
      <div className="mx-auto max-w-3xl space-y-3 p-4 lg:mx-0 lg:px-8">
        {data?.map((a) => (
          <article key={a.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-semibold">{a.judul}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(a.created_at)} • Untuk: {a.target === "semua" ? "Semua" : a.target}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Ubah" onClick={() => setEdit(a)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Hapus" onClick={async () => {
                if (!confirm("Hapus pengumuman ini?")) return;
                await supabase.from("announcements").delete().eq("id", a.id); refresh();
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{a.isi}</p>
          </article>
        ))}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengumuman.</p>}
      </div>
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? "Ubah" : "Tambah"} Pengumuman</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Judul</Label><Input value={edit.judul} onChange={(e) => setEdit({ ...edit, judul: e.target.value })} /></div>
              <div><Label>Isi</Label><Textarea rows={5} value={edit.isi} onChange={(e) => setEdit({ ...edit, isi: e.target.value })} /></div>
              <div><Label>Ditujukan untuk</Label>
                <Select value={edit.target} onValueChange={(v) => setEdit({ ...edit, target: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua</SelectItem><SelectItem value="TK">TK</SelectItem><SelectItem value="SD">SD</SelectItem></SelectContent></Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={async () => {
                if (!edit.judul.trim()) { toast.error("Judul wajib diisi"); return; }
                const row = { judul: edit.judul.trim(), isi: edit.isi, target: edit.target };
                const { error } = edit.id ? await supabase.from("announcements").update(row).eq("id", edit.id) : await supabase.from("announcements").insert(row);
                if (error) { toast.error(error.message); return; }
                toast.success("Pengumuman disimpan"); setEdit(null); refresh();
              }}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
