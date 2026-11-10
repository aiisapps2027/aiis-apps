import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { NilaiBadge } from "@/components/aiis/NilaiBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { describeLaporan, fetchHalaqahStudents, formatTanggalPendek, friendlyError, isEditableDate, shiftDate, todayJakarta } from "@/lib/laporan";
import { JENIS_LABEL, JENIS_ORDER, type JenisLaporan, type Nilai } from "@/lib/nilai";

export const Route = createFileRoute("/ustadz/riwayat")({ component: Riwayat });

const ALL = "__all";

function Riwayat() {
  const qc = useQueryClient();
  const today = todayJakarta();
  const [halaqahSel, setHalaqahSel] = useState("");
  const [siswa, setSiswa] = useState(ALL);
  const [jenis, setJenis] = useState<string>(ALL);
  const [dari, setDari] = useState(shiftDate(today, -7));
  const [sampai, setSampai] = useState(today);

  const { data: halaqahList } = useQuery({
    queryKey: ["setoran-halaqah"],
    queryFn: async () => (await supabase.from("halaqah").select("id, nama, jenjang").order("nama")).data ?? [],
  });
  const halaqahId = halaqahSel || halaqahList?.[0]?.id || "";
  const { data: students } = useQuery({ queryKey: ["setoran-students", halaqahId], enabled: !!halaqahId, queryFn: () => fetchHalaqahStudents(halaqahId) });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["riwayat", halaqahId, siswa, jenis, dari, sampai],
    enabled: !!halaqahId,
    queryFn: async () => {
      let q = supabase
        .from("laporan_harian")
        .select("*, students!inner(nama, halaqah_id)")
        .eq("students.halaqah_id", halaqahId)
        .gte("tanggal", dari)
        .lte("tanggal", sampai)
        .order("tanggal", { ascending: false })
        .limit(300);
      if (siswa !== ALL) q = q.eq("student_id", siswa);
      if (jenis !== ALL) q = q.eq("jenis", jenis);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = async (id: string, label: string) => {
    if (!confirm(`Hapus ${label}? Bintangnya (jika ada) ikut dihapus.`)) return;
    const { error } = await supabase.from("laporan_harian").delete().eq("id", id);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Laporan dihapus");
    await Promise.all([qc.invalidateQueries({ queryKey: ["riwayat"] }), qc.invalidateQueries({ queryKey: ["setoran-laporan"] })]);
  };

  return (
    <div>
      <ScreenHeader title="Riwayat Setoran" back={false} />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={halaqahId} onValueChange={(v) => { setHalaqahSel(v); setSiswa(ALL); }}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Halaqah" /></SelectTrigger>
            <SelectContent>{halaqahList?.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama} ({h.jenjang})</SelectItem>)}</SelectContent>
          </Select>
          <Select value={siswa} onValueChange={setSiswa}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua siswa</SelectItem>{students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={jenis} onValueChange={setJenis}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua jenis</SelectItem>{JENIS_ORDER.map((j) => <SelectItem key={j} value={j}>{JENIS_LABEL[j]}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-xl bg-card px-3">
            <input aria-label="Dari tanggal" type="date" value={dari} max={sampai} onChange={(e) => e.target.value && setDari(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
            <span className="text-muted-foreground">–</span>
            <input aria-label="Sampai tanggal" type="date" value={sampai} min={dari} onChange={(e) => e.target.value && setSampai(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
          </div>
        </div>

        {isLoading && <Skeleton className="h-24 w-full rounded-2xl" />}
        {rows && rows.length === 0 && <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Tidak ada laporan pada filter ini.</p>}
        {rows && rows.length > 0 && <p className="text-xs text-muted-foreground">{rows.length} laporan</p>}
        <ul className="space-y-2">
          {rows?.map((r) => {
            const editable = isEditableDate(r.tanggal, today);
            const nama = r.students.nama;
            return (
              <li key={r.id} className="rounded-2xl bg-card p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{nama}</p>
                    <p className="text-xs text-muted-foreground">{formatTanggalPendek(r.tanggal)} • {JENIS_LABEL[r.jenis as JenisLaporan]}</p>
                    <p className="mt-1 break-words text-sm">{describeLaporan(r)}</p>
                  </div>
                  <NilaiBadge nilai={r.nilai as Nilai} />
                </div>
                {editable ? (
                  <div className="mt-2 flex gap-2">
                    <Button asChild size="sm" variant="outline" className="rounded-lg">
                      <Link to="/ustadz/setoran/$studentId" params={{ studentId: r.student_id }} search={{ tanggal: r.tanggal, halaqah: halaqahId }}><Pencil className="mr-1 h-3.5 w-3.5" /> Ubah</Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => remove(r.id, `${JENIS_LABEL[r.jenis as JenisLaporan]} ${nama}`)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">Lebih dari 7 hari, tidak bisa diubah.</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
