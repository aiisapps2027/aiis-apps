import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Loader2, Pencil, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ScreenHeader } from "@/components/aiis/decor";
import { MaterialFields } from "@/components/aiis/SetoranForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  describeMaterial, emptyTarget, fetchHalaqahStudents, formatTanggal, parseSetoranSearch, saveTargets, shiftDate, targetFromRow,
  todayJakarta, validateMaterial, type TargetRow, type TargetState,
} from "@/lib/laporan";
import { JENIS_LABEL, JENIS_ORDER, type JenisLaporan } from "@/lib/nilai";

export const Route = createFileRoute("/ustadz/target")({ validateSearch: parseSetoranSearch, component: TargetPage });

type Student = { id: string; nama: string; kelas: string | null; foto_url: string | null };

function TargetPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/ustadz/target" });
  const today = todayJakarta();
  const { tanggal } = search;
  const [jenis, setJenis] = useState<JenisLaporan>("hafalan_baru");

  const { data: halaqahList } = useQuery({
    queryKey: ["setoran-halaqah"],
    queryFn: async () => (await supabase.from("halaqah").select("id, nama, jenjang").order("nama")).data ?? [],
  });
  const halaqahId = search.halaqah || halaqahList?.[0]?.id || "";

  const { data: students, isLoading } = useQuery({ queryKey: ["setoran-students", halaqahId], enabled: !!halaqahId, queryFn: () => fetchHalaqahStudents(halaqahId) });
  const { data: teacherId } = useQuery({
    queryKey: ["my-teacher-id"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      return (await supabase.from("teachers").select("id").eq("user_id", u.user?.id ?? "").maybeSingle()).data?.id ?? null;
    },
  });
  const { data: rows } = useQuery({
    queryKey: ["target-rows", halaqahId, tanggal],
    enabled: !!students && students.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("target_harian").select("*").eq("tanggal", tanggal).in("student_id", (students ?? []).map((s) => s.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  const setSearch = (patch: Partial<{ tanggal: string; halaqah: string }>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <div>
      <ScreenHeader title="Target Harian" back={false} />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={halaqahId} onValueChange={(v) => setSearch({ halaqah: v })}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Pilih halaqah" /></SelectTrigger>
            <SelectContent>{halaqahList?.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama} ({h.jenjang})</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-xl bg-card p-1">
            <button type="button" aria-label="Hari sebelumnya" disabled={tanggal <= today} onClick={() => setSearch({ tanggal: shiftDate(tanggal, -1) })} className="rounded-lg p-2 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
            <input type="date" value={tanggal} min={today} max={shiftDate(today, 14)} onChange={(e) => e.target.value && setSearch({ tanggal: e.target.value })} className="min-w-0 flex-1 bg-transparent text-center text-sm font-medium outline-none" />
            <button type="button" aria-label="Hari berikutnya" disabled={tanggal >= shiftDate(today, 14)} onClick={() => setSearch({ tanggal: shiftDate(tanggal, 1) })} className="rounded-lg p-2 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{formatTanggal(tanggal)}</p>

        <div className="grid grid-cols-4 gap-1 rounded-xl bg-card p-1">
          {JENIS_ORDER.map((j) => (
            <button key={j} type="button" onClick={() => setJenis(j)} className={`rounded-lg px-1 py-2 text-xs font-medium ${jenis === j ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{JENIS_LABEL[j]}</button>
          ))}
        </div>

        {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
        {students && rows && teacherId && (
          <TargetEditor key={`${halaqahId}-${tanggal}-${jenis}`} students={students} rows={rows} tanggal={tanggal} jenis={jenis} teacherId={teacherId} halaqahId={halaqahId} />
        )}
        {students && students.length === 0 && <p className="text-sm text-muted-foreground">Belum ada siswa di halaqah ini.</p>}
      </div>
    </div>
  );
}

function TargetEditor({ students, rows, tanggal, jenis, teacherId, halaqahId }: { students: Student[]; rows: TargetRow[]; tanggal: string; jenis: JenisLaporan; teacherId: string; halaqahId: string }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, TargetState | null>>(() =>
    Object.fromEntries(students.map((s) => { const r = rows.find((x) => x.student_id === s.id && x.jenis === jenis); return [s.id, r ? targetFromRow(r) : null]; })),
  );
  const [bulk, setBulk] = useState<TargetState>(emptyTarget);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyAll = () => {
    const err = validateMaterial(jenis, bulk);
    if (err) return void toast.error(err);
    setDrafts(Object.fromEntries(students.map((s) => [s.id, { ...bulk, existingId: drafts[s.id]?.existingId ?? null }])));
    toast.success("Diterapkan ke semua siswa. Tekan Simpan untuk menyimpan.");
  };

  const copyYesterday = async () => {
    const { data, error } = await supabase.from("target_harian").select("*").eq("tanggal", shiftDate(tanggal, -1)).eq("jenis", jenis).in("student_id", students.map((s) => s.id));
    if (error) return void toast.error(error.message);
    if (!data?.length) return void toast.error("Tidak ada target kemarin untuk disalin");
    setDrafts(Object.fromEntries(students.map((s) => { const r = data.find((x) => x.student_id === s.id); return [s.id, r ? { ...targetFromRow(r), existingId: drafts[s.id]?.existingId ?? null } : drafts[s.id] ?? null]; })));
    toast.success(`Disalin dari ${formatTanggal(shiftDate(tanggal, -1))}. Tekan Simpan untuk menyimpan.`);
  };

  const saveAll = async () => {
    for (const s of students) {
      const d = drafts[s.id];
      const err = d ? validateMaterial(jenis, d) : null;
      if (err) return void toast.error(`${s.nama}: ${err}`);
    }
    setBusy(true);
    try {
      await saveTargets({ teacherId, tanggal, jenis, drafts });
      await Promise.all([qc.invalidateQueries({ queryKey: ["target-rows"] }), qc.invalidateQueries({ queryKey: ["setoran-form"] })]);
      toast.success("Target tersimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const filled = Object.values(drafts).filter(Boolean).length;
  const editingStudent = students.find((s) => s.id === editing);

  return (
    <div className="space-y-4 pb-28">
      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Target untuk semua siswa</h2>
          <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={copyYesterday}><Copy className="mr-1 h-4 w-4" /> Salin kemarin</Button>
        </div>
        <MaterialFields jenis={jenis} s={bulk} onChange={(p) => setBulk((b) => ({ ...b, ...p }))} />
        <Button type="button" className="h-11 w-full rounded-xl" onClick={applyAll}><Wand2 className="mr-2 h-4 w-4" /> Terapkan ke semua siswa</Button>
        <p className="text-xs text-muted-foreground">Setelah diterapkan, target tiap siswa masih bisa diubah satu per satu di bawah.</p>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Per siswa ({filled} dari {students.length} punya target)</h2>
        <ul className="divide-y rounded-2xl bg-card shadow-soft">
          {students.map((s) => {
            const d = drafts[s.id];
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={s.nama} url={s.foto_url} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{s.nama}</p>
                  <p className={`break-words text-xs ${d ? "text-primary" : "text-muted-foreground"}`}>{d ? describeMaterial(jenis, d) : "Belum ada target"}</p>
                </div>
                <Button type="button" size="icon" variant="ghost" aria-label={`Ubah target ${s.nama}`} onClick={() => setEditing(s.id)}><Pencil className="h-4 w-4" /></Button>
                {d && <Button type="button" size="icon" variant="ghost" aria-label={`Hapus target ${s.nama}`} onClick={() => setDrafts((p) => ({ ...p, [s.id]: null }))}><X className="h-4 w-4 text-destructive" /></Button>}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="fixed inset-x-0 bottom-[3.9rem] z-20 border-t bg-card/95 p-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto max-w-3xl"><Button disabled={busy} onClick={saveAll} className="h-12 w-full rounded-xl">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan target</Button></div>
      </div>

      {editingStudent && (
        <StudentTargetDialog
          key={editingStudent.id}
          name={editingStudent.nama}
          jenis={jenis}
          value={drafts[editingStudent.id] ?? emptyTarget()}
          onClose={() => setEditing(null)}
          onSave={(t) => { setDrafts((p) => ({ ...p, [editingStudent.id]: { ...t, existingId: p[editingStudent.id]?.existingId ?? null } })); setEditing(null); }}
        />
      )}
    </div>
  );
}

function StudentTargetDialog({ name, jenis, value, onClose, onSave }: { name: string; jenis: JenisLaporan; value: TargetState; onClose: () => void; onSave: (t: TargetState) => void }) {
  const [t, setT] = useState(value);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="break-words">Target {JENIS_LABEL[jenis]} — {name}</DialogTitle></DialogHeader>
        <MaterialFields jenis={jenis} s={t} onChange={(p) => setT((x) => ({ ...x, ...p }))} />
        <div><Label>Catatan (opsional)</Label><Input value={t.catatan} onChange={(e) => setT({ ...t, catatan: e.target.value })} className="mt-1 rounded-xl" /></div>
        <DialogFooter>
          <Button onClick={() => { const err = validateMaterial(jenis, t); if (err) return void toast.error(err); onSave(t); }}>Pakai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
