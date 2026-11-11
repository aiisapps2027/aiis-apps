import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { NilaiBadge, NilaiPicker } from "@/components/aiis/NilaiBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fetchHalaqahStudents, formatTanggalPendek, friendlyError, isEditableDate, shiftDate, todayJakarta } from "@/lib/laporan";
import { hitungNilai, type Nilai } from "@/lib/nilai";
import { JUZ_LIST } from "@/lib/tasmi";

export const Route = createFileRoute("/ustadz/tasmi")({ component: TasmiUstadz });

function TasmiUstadz() {
  const qc = useQueryClient();
  const today = todayJakarta();
  const [halaqahSel, setHalaqahSel] = useState("");
  const [siswa, setSiswa] = useState("");
  const [juz, setJuz] = useState("");
  const [tanggal, setTanggal] = useState(today);
  const [nilai, setNilai] = useState<Nilai | null>(null);
  const [salah, setSalah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: halaqahList } = useQuery({
    queryKey: ["setoran-halaqah"],
    queryFn: async () => (await supabase.from("halaqah").select("id, nama, jenjang").order("nama")).data ?? [],
  });
  const halaqahId = halaqahSel || halaqahList?.[0]?.id || "";
  const { data: students } = useQuery({ queryKey: ["setoran-students", halaqahId], enabled: !!halaqahId, queryFn: () => fetchHalaqahStudents(halaqahId) });
  const { data: me } = useQuery({
    queryKey: ["my-teacher-id"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      return (await supabase.from("teachers").select("id").eq("user_id", u.user?.id ?? "").maybeSingle()).data?.id ?? null;
    },
  });
  const { data: riwayat, isLoading } = useQuery({
    queryKey: ["tasmi-riwayat", halaqahId],
    enabled: !!halaqahId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasmi")
        .select("*, students!inner(nama, halaqah_id)")
        .eq("students.halaqah_id", halaqahId)
        .gte("tanggal", shiftDate(today, -60))
        .order("tanggal", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const salahNum = salah.trim() === "" ? null : Number(salah);
  const efektif: Nilai | null = salahNum != null && Number.isInteger(salahNum) && salahNum >= 0 ? hitungNilai(salahNum) : nilai;

  const simpan = async () => {
    if (!me) return void toast.error("Akun ustadz tidak ditemukan");
    if (!siswa) return void toast.error("Pilih siswa");
    if (!juz) return void toast.error("Pilih juz");
    if (salahNum != null && (!Number.isInteger(salahNum) || salahNum < 0)) return void toast.error("Jumlah salah harus angka 0 atau lebih");
    if (!efektif) return void toast.error("Pilih nilai (L / L- / TL) atau isi jumlah salah");
    setSaving(true);
    const { error } = await supabase.from("tasmi").insert({
      student_id: siswa,
      teacher_id: me,
      tanggal,
      juz: Number(juz),
      nilai: efektif,
      jumlah_salah: salahNum,
      catatan: catatan.trim() || null,
    });
    setSaving(false);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Tasmi' tersimpan");
    setJuz(""); setNilai(null); setSalah(""); setCatatan("");
    await qc.invalidateQueries({ queryKey: ["tasmi-riwayat"] });
  };

  const hapus = async (id: string, label: string) => {
    if (!confirm(`Hapus Tasmi' ${label}?`)) return;
    const { error } = await supabase.from("tasmi").delete().eq("id", id);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Tasmi' dihapus");
    await qc.invalidateQueries({ queryKey: ["tasmi-riwayat"] });
  };

  return (
    <div>
      <ScreenHeader title="Tasmi'" back={false} />
      <div className="mx-auto max-w-3xl space-y-5 p-4">
        <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
          <h2 className="font-bold">Catat Tasmi' satu juz</h2>
          <p className="text-xs text-muted-foreground">Tasmi' yang lancar (L atau L-) dalam satu semester membuat siswa otomatis masuk daftar calon Munaqasyah.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={halaqahId} onValueChange={(v) => { setHalaqahSel(v); setSiswa(""); }}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Halaqah" /></SelectTrigger>
              <SelectContent>{halaqahList?.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama} ({h.jenjang})</SelectItem>)}</SelectContent>
            </Select>
            <Select value={siswa} onValueChange={setSiswa}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>{students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={juz} onValueChange={setJuz}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pilih juz" /></SelectTrigger>
              <SelectContent>{JUZ_LIST.map((j) => <SelectItem key={j} value={String(j)}>Juz {j}</SelectItem>)}</SelectContent>
            </Select>
            <Input aria-label="Tanggal" type="date" value={tanggal} min={shiftDate(today, -7)} max={today} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div>
            <Label className="mb-1 block">Nilai</Label>
            <NilaiPicker value={salahNum != null ? efektif : nilai} onChange={(v) => { setNilai(v); setSalah(""); }} />
          </div>
          <div>
            <Label>Jumlah salah (opsional)</Label>
            <Input inputMode="numeric" placeholder="kosongkan jika tidak dihitung" value={salah} onChange={(e) => setSalah(e.target.value)} className="mt-1 h-11 rounded-xl" />
          </div>
          <Textarea placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} className="rounded-xl" />
          <Button onClick={simpan} disabled={saving} className="h-12 w-full rounded-xl">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Tasmi'
          </Button>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Tasmi' 60 hari terakhir</h2>
          {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
          {riwayat && riwayat.length === 0 && <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Belum ada Tasmi' di halaqah ini.</p>}
          <ul className="space-y-2">
            {riwayat?.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{r.students.nama}</p>
                  <p className="text-xs text-muted-foreground">{formatTanggalPendek(r.tanggal)} • Juz {r.juz}{r.jumlah_salah != null ? ` • ${r.jumlah_salah} salah` : ""}</p>
                </div>
                <NilaiBadge nilai={r.nilai as Nilai} />
                {isEditableDate(r.tanggal, today) && (
                  <Button size="icon" variant="ghost" aria-label="Hapus" className="text-destructive" onClick={() => hapus(r.id, `${r.students.nama} Juz ${r.juz}`)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
