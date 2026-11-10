import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { NilaiBadge } from "@/components/aiis/NilaiBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { describeLaporan, formatTanggal } from "@/lib/laporan";
import { JENIS_LABEL, JENIS_ORDER, type JenisLaporan, type Nilai } from "@/lib/nilai";
import { catatanQuery, laporanQuery } from "@/lib/ortu-queries";

export const Route = createFileRoute("/ortu/hafalan")({ component: Hafalan });

const PAGE = 14;

function Hafalan() {
  const qc = useQueryClient();
  const { data: laporan, isLoading } = useQuery(laporanQuery);
  const { data: catatan } = useQuery(catatanQuery);
  const [shown, setShown] = useState(PAGE);

  const ack = useMutation({
    mutationFn: async (tanggal: string) => {
      const { error } = await supabase.rpc("tandai_diketahui", { _tanggal: tanggal });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: catatanQuery.queryKey });
      toast.success("Terima kasih, ditandai sudah dibaca");
    },
    onError: () => toast.error("Gagal menandai. Coba lagi."),
  });

  const dates = [...new Set([...(laporan ?? []).map((r) => r.tanggal), ...(catatan ?? []).map((c) => c.tanggal)])].sort().reverse();

  return (
    <div>
      <ScreenHeader title="Hafalan" back={false} />
      <div className="space-y-4 p-4">
        {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
        {!isLoading && dates.length === 0 && (
          <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Belum ada laporan. Laporan harian dari ustadz akan tampil di sini.</p>
        )}
        {dates.slice(0, shown).map((d) => {
          const rows = JENIS_ORDER.map((j) => (laporan ?? []).find((r) => r.tanggal === d && r.jenis === j)).filter((r) => !!r);
          const note = catatan?.find((c) => c.tanggal === d);
          return (
            <section key={d} className="rounded-2xl bg-card p-4 shadow-soft">
              <p className="text-sm font-bold">{formatTanggal(d)}</p>
              {rows.length > 0 && (
                <ul className="mt-2 divide-y">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{JENIS_LABEL[r.jenis as JenisLaporan]}</p>
                        <p className="break-words text-sm font-medium">{describeLaporan(r)}</p>
                      </div>
                      <NilaiBadge nilai={r.nilai as Nilai} />
                    </li>
                  ))}
                </ul>
              )}
              {note?.kegiatan && <p className="mt-2 text-xs text-muted-foreground">Kegiatan: {note.kegiatan}</p>}
              {note?.catatan && (
                <div className="mt-2 rounded-xl bg-secondary p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Catatan guru</p>
                  <p className="mt-0.5 text-sm">{note.catatan}</p>
                </div>
              )}
              {note && (
                <div className="mt-3">
                  {note.diketahui_ortu_at ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Sudah dibaca</p>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-lg" disabled={ack.isPending} onClick={() => ack.mutate(d)}>Tandai sudah dibaca</Button>
                  )}
                </div>
              )}
            </section>
          );
        })}
        {dates.length > shown && <Button variant="outline" className="w-full rounded-xl" onClick={() => setShown((n) => n + PAGE)}>Tampilkan lebih banyak</Button>}
      </div>
    </div>
  );
}
