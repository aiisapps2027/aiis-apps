import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fetchHalaqahStudents, formatTanggalPendek, friendlyError, isEditableDate, shiftDate, todayJakarta } from "@/lib/laporan";
import { SURAH, getSurah } from "@/lib/quran";
import { JENIS_TASHIH, jenisLabel } from "@/lib/tashih";

export const Route = createFileRoute("/ustadz/tashih")({ component: TashihUstadz });

function TashihUstadz() {
  const qc = useQueryClient();
  const today = todayJakarta();
  const [halaqahSel, setHalaqahSel] = useState("");
  const [siswa, setSiswa] = useState("");
  const [surah, setSurah] = useState("");
  const [ayat, setAyat] = useState("");
  const [jenis, setJenis] = useState("");
  const [tanggal, setTanggal] = useState(today);
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
    queryKey: ["tashih-riwayat", halaqahId],
    enabled: !!halaqahId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tashih")
        .select("*, students!inner(nama, halaqah_id)")
        .eq("students.halaqah_id", halaqahId)
        .gte("tanggal", shiftDate(today, -60))
        .order("tanggal", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const simpan = async () => {
    if (!me) return void toast.error("Akun ustadz tidak ditemukan");
    if (!siswa) return void toast.error("Pilih siswa");
    if (!surah) return void toast.error("Pilih surah");
    if (!jenis) return void toast.error("Pilih jenis kesalahan");
    const ayatNum = ayat.trim() === "" ? null : Number(ayat);
    const maks = getSurah(Number(surah))?.ayat ?? 0;
    if (ayatNum != null && (!Number.isInteger(ayatNum) || ayatNum < 1 || ayatNum > maks)) return void toast.error(`Ayat harus 1–${maks}`);
    setSaving(true);
    const { error } = await supabase.from("tashih").insert({
      student_id: siswa, teacher_id: me, tanggal, surah: Number(surah), ayat: ayatNum, jenis, catatan: catatan.trim() || null,
    });
    setSaving(false);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Tashih tersimpan");
    setAyat(""); setJenis(""); setCatatan("");
    await qc.invalidateQueries({ queryKey: ["tashih-riwayat"] });
  };

  const tandai = async (id: string, status: "perlu" | "sudah") => {
    const { error } = await supabase.from("tashih").update({ status }).eq("id", id);
    if (error) return void toast.error(friendlyError(error));
    await qc.invalidateQueries({ queryKey: ["tashih-riwayat"] });
  };

  const hapus = async (id: string, label: string) => {
    if (!confirm(`Hapus Tashih ${label}?`)) return;
    const { error } = await supabase.from("tashih").delete().eq("id", id);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Tashih dihapus");
    await qc.invalidateQueries({ queryKey: ["tashih-riwayat"] });
  };

  return (
    <div>
      <ScreenHeader title="Tashih" back={false} />
      <div className="mx-auto max-w-3xl space-y-5 p-4">
        <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
          <h2 className="font-bold">Catat koreksi bacaan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={halaqahId} onValueChange={(v) => { setHalaqahSel(v); setSiswa(""); }}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Halaqah" /></SelectTrigger>
              <SelectContent>{halaqahList?.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama} ({h.jenjang})</SelectItem>)}</SelectContent>
            </Select>
            <Select value={siswa} onValueChange={setSiswa}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>{students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={surah} onValueChange={setSurah}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pilih surah" /></SelectTrigger>
              <SelectContent>{SURAH.map((s) => <SelectItem key={s.no} value={String(s.no)}>{s.no}. {s.latin}</SelectItem>)}</SelectContent>
            </Select>
            <Input inputMode="numeric" placeholder="Ayat (opsional)" value={ayat} onChange={(e) => setAyat(e.target.value)} className="h-11 rounded-xl" />
            <Select value={jenis} onValueChange={setJenis}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Jenis kesalahan" /></SelectTrigger>
              <SelectContent>{JENIS_TASHIH.map((j) => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input aria-label="Tanggal" type="date" value={tanggal} min={shiftDate(today, -7)} max={today} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <Textarea placeholder="Catatan, mis. huruf ح dibaca ه (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} className="rounded-xl" />
          <Button onClick={simpan} disabled={saving} className="h-12 w-full rounded-xl">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Tashih
          </Button>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Tashih 60 hari terakhir</h2>
          {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
          {riwayat && riwayat.length === 0 && <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Belum ada Tashih di halaqah ini.</p>}
          <ul className="space-y-2">
            {riwayat?.map((r) => {
              const nama = `${getSurah(r.surah)?.latin ?? r.surah}${r.ayat ? `:${r.ayat}` : ""}`;
              return (
                <li key={r.id} className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-soft">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{r.students.nama}</p>
                    <p className="text-xs text-muted-foreground">{formatTanggalPendek(r.tanggal)} • {nama} • {jenisLabel(r.jenis)}</p>
                    {r.catatan && <p className="mt-0.5 text-xs">{r.catatan}</p>}
                  </div>
                  <Button size="sm" variant={r.status === "sudah" ? "secondary" : "outline"} className="shrink-0 rounded-full" onClick={() => tandai(r.id, r.status === "sudah" ? "perlu" : "sudah")}>
                    {r.status === "sudah" ? "Sudah benar" : "Tandai benar"}
                  </Button>
                  {isEditableDate(r.tanggal, today) && (
                    <Button size="icon" variant="ghost" aria-label="Hapus" className="text-destructive" onClick={() => hapus(r.id, `${r.students.nama} ${nama}`)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
