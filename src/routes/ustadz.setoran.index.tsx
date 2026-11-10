import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ScreenHeader } from "@/components/aiis/decor";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NilaiBadge } from "@/components/aiis/NilaiBadge";
import { normalizeName } from "@/lib/auth-utils";
import { fetchHalaqahStudents, formatTanggal, isEditableDate, parseSetoranSearch, shiftDate, todayJakarta } from "@/lib/laporan";
import { JENIS_LABEL, JENIS_ORDER, type JenisLaporan, type Nilai } from "@/lib/nilai";

export const Route = createFileRoute("/ustadz/setoran/")({
  validateSearch: parseSetoranSearch,
  component: SetoranList,
});

const SHORT: Record<JenisLaporan, string> = { hafalan_baru: "Baru", sabiq: "Sabiq", murojaah: "Muroj.", tahsin: "Tahsin" };

function SetoranList() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/ustadz/setoran/" });
  const [q, setQ] = useState("");
  const today = todayJakarta();
  const { tanggal } = search;

  const { data: halaqahList, isLoading: loadingH } = useQuery({
    queryKey: ["setoran-halaqah"],
    queryFn: async () => (await supabase.from("halaqah").select("id, nama, jenjang").order("nama")).data ?? [],
  });
  const halaqahId = search.halaqah || halaqahList?.[0]?.id || "";

  const { data: students, isLoading: loadingS } = useQuery({
    queryKey: ["setoran-students", halaqahId],
    enabled: !!halaqahId,
    queryFn: () => fetchHalaqahStudents(halaqahId),
  });

  const { data: laporan } = useQuery({
    queryKey: ["setoran-laporan", halaqahId, tanggal],
    enabled: !!students && students.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laporan_harian")
        .select("student_id, jenis, nilai")
        .eq("tanggal", tanggal)
        .in("student_id", (students ?? []).map((s) => s.id));
      if (error) throw error;
      const map = new Map<string, Partial<Record<JenisLaporan, Nilai>>>();
      for (const r of data ?? []) map.set(r.student_id, { ...map.get(r.student_id), [r.jenis as JenisLaporan]: r.nilai as Nilai });
      return map;
    },
  });

  const setSearch = (patch: Partial<{ tanggal: string; halaqah: string }>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const list = (students ?? []).filter((s) => normalizeName(s.nama).includes(normalizeName(q)));
  const reported = (students ?? []).filter((s) => Object.keys(laporan?.get(s.id) ?? {}).length > 0).length;
  const total = students?.length ?? 0;
  const editable = isEditableDate(tanggal, today);

  return (
    <div>
      <ScreenHeader title="Input Setoran" back={false} />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={halaqahId} onValueChange={(v) => setSearch({ halaqah: v })}>
            <SelectTrigger className="h-11 rounded-xl bg-card"><SelectValue placeholder="Pilih halaqah" /></SelectTrigger>
            <SelectContent>{halaqahList?.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama} ({h.jenjang})</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-xl bg-card p-1">
            <button type="button" aria-label="Hari sebelumnya" disabled={tanggal <= shiftDate(today, -7)} onClick={() => setSearch({ tanggal: shiftDate(tanggal, -1) })} className="rounded-lg p-2 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
            <input
              type="date"
              value={tanggal}
              min={shiftDate(today, -7)}
              max={today}
              onChange={(e) => e.target.value && setSearch({ tanggal: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-center text-sm font-medium outline-none"
            />
            <button type="button" aria-label="Hari berikutnya" disabled={tanggal >= today} onClick={() => setSearch({ tanggal: shiftDate(tanggal, 1) })} className="rounded-lg p-2 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{formatTanggal(tanggal)}</p>
        {!editable && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">Tanggal ini di luar batas input (maksimal 7 hari ke belakang).</p>}

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">Sudah dilaporkan</span>
            <span className="font-bold text-primary">{reported} dari {total} siswa</span>
          </div>
          <Progress value={total ? (reported / total) * 100 : 0} className="h-2.5" />
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama siswa..." value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl bg-card pl-10" />
        </div>

        {(loadingH || loadingS) && <Skeleton className="h-20 w-full rounded-2xl" />}
        {list.map((s) => {
          const st = laporan?.get(s.id) ?? {};
          return (
            <Link
              key={s.id}
              to="/ustadz/setoran/$studentId"
              params={{ studentId: s.id }}
              search={{ tanggal, halaqah: halaqahId }}
              className="block rounded-2xl bg-card p-3 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <Avatar name={s.nama} url={s.foto_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold leading-snug">{s.nama}</p>
                  <p className="text-xs text-muted-foreground">Kelas {s.kelas ?? "-"}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {JENIS_ORDER.map((j) => (
                  <div key={j} title={JENIS_LABEL[j]} className="flex flex-col items-center rounded-lg bg-muted/50 py-1.5">
                    <span className="text-[10px] text-muted-foreground">{SHORT[j]}</span>
                    {st[j] ? <NilaiBadge nilai={st[j]!} className="mt-0.5" /> : <span className="mt-0.5 text-xs text-muted-foreground/60">–</span>}
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
        {halaqahList && halaqahList.length === 0 && <p className="text-sm text-muted-foreground">Belum ada halaqah yang ditugaskan.</p>}
        {students && list.length === 0 && halaqahId && <p className="text-sm text-muted-foreground">Tidak ada siswa.</p>}
      </div>
    </div>
  );
}
