import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Loader2, MapPin, Pencil, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { EskulDialog } from "@/components/aiis/EskulDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { eskulSemuaQuery, HARI, rentangJam, sortJadwal, type EskulRow } from "@/lib/eskul";
import { fetchHalaqahStudents } from "@/lib/laporan";

export const Route = createFileRoute("/ustadz/eskul")({ component: EskulUstadz });

function EskulUstadz() {
  const qc = useQueryClient();
  const { data: eskulList, isLoading } = useQuery(eskulSemuaQuery);
  const aktif = (eskulList ?? []).filter((e) => e.aktif);
  const [eskulSel, setEskulSel] = useState("");
  const [halaqahSel, setHalaqahSel] = useState("");
  const eskul = aktif.find((e) => e.id === eskulSel) ?? aktif[0];

  const { data: halaqahList } = useQuery({
    queryKey: ["setoran-halaqah"],
    queryFn: async () => (await supabase.from("halaqah").select("id, nama, jenjang").order("nama")).data ?? [],
  });
  const halaqahId = halaqahSel || halaqahList?.[0]?.id || "";
  const { data: students } = useQuery({ queryKey: ["setoran-students", halaqahId], enabled: !!halaqahId, queryFn: () => fetchHalaqahStudents(halaqahId) });
  const { data: ikut } = useQuery({
    queryKey: ["eskul-peserta-ustadz", eskul?.id],
    enabled: !!eskul,
    queryFn: async () => new Set(((await supabase.from("eskul_peserta").select("student_id").eq("eskul_id", eskul!.id)).data ?? []).map((r) => r.student_id)),
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<EskulRow> | null>(null);

  async function toggle(studentId: string, on: boolean) {
    if (!eskul) return;
    setBusyId(studentId);
    const { error } = on
      ? await supabase.from("eskul_peserta").insert({ eskul_id: eskul.id, student_id: studentId })
      : await supabase.from("eskul_peserta").delete().eq("eskul_id", eskul.id).eq("student_id", studentId);
    setBusyId(null);
    if (error) return void toast.error("Gagal menyimpan. Coba lagi.");
    qc.invalidateQueries({ queryKey: ["eskul-peserta-ustadz", eskul.id] });
  }

  return (
    <div>
      <ScreenHeader title="Eskul" />
      <div className="space-y-4 p-4 pb-10">
        {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
        <Button className="w-full rounded-xl" variant="outline" onClick={() => setEdit({ aktif: true, eskul_jadwal: [] })}><Plus className="mr-1 h-4 w-4" /> Tambah eskul</Button>
        {aktif.length === 0 && !isLoading && <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Belum ada eskul. Tambahkan eskul dan jadwalnya.</p>}
        {eskul && (
          <>
            <Select value={eskul.id} onValueChange={setEskulSel}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{aktif.map((e) => <SelectItem key={e.id} value={e.id}>{e.nama}</SelectItem>)}</SelectContent>
            </Select>
            <section className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">{eskul.nama}</h2>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setEdit(eskul)}><Pencil className="mr-1 h-4 w-4" /> Ubah</Button>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /> {eskul.pengajar || "Pengajar belum diisi"}</p>
              <ul className="mt-3 space-y-1.5">
                {sortJadwal(eskul.eskul_jadwal).map((j) => (
                  <li key={j.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-sm">
                    <span className="w-16 shrink-0 font-semibold">{HARI[j.hari]}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {rentangJam(j)}</span>
                    {j.tempat && <span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /> {j.tempat}</span>}
                  </li>
                ))}
                {eskul.eskul_jadwal.length === 0 && <li className="text-sm text-muted-foreground">Jadwal belum diisi. Tekan Ubah untuk menambah.</li>}
              </ul>
            </section>

            <section className="rounded-2xl bg-card p-4 shadow-soft">
              <h3 className="font-bold">Murid saya yang ikut {eskul.nama}</h3>
              <p className="text-xs text-muted-foreground">Nyalakan untuk mengikutkan murid. Jadwal dan pengingat eskul tampil otomatis di aplikasi orang tua.</p>
              {(halaqahList?.length ?? 0) > 1 && (
                <Select value={halaqahId} onValueChange={setHalaqahSel}>
                  <SelectTrigger className="mt-3 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{halaqahList!.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <ul className="mt-2 divide-y">
                {(students ?? []).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.nama}</p>
                      <p className="text-xs text-muted-foreground">Kelas {s.kelas ?? "-"}</p>
                    </div>
                    {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Switch checked={ikut?.has(s.id) ?? false} onCheckedChange={(v) => toggle(s.id, v)} aria-label={`Ikutkan ${s.nama}`} />}
                  </li>
                ))}
                {students && students.length === 0 && <li className="py-3 text-sm text-muted-foreground">Belum ada murid di halaqah ini.</li>}
              </ul>
            </section>
          </>
        )}
      </div>
      {edit && <EskulDialog value={edit} existing={eskulList ?? []} onClose={() => setEdit(null)} onSaved={() => qc.invalidateQueries({ queryKey: eskulSemuaQuery.queryKey })} />}
    </div>
  );
}
