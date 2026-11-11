import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/aiis/decor";
import { NilaiBadge } from "@/components/aiis/NilaiBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/laporan";
import type { Nilai } from "@/lib/nilai";
import { tasmiQuery } from "@/lib/tasmi";

export const Route = createFileRoute("/ortu/tasmi")({ component: TasmiPage });

function TasmiPage() {
  const { data, isLoading } = useQuery(tasmiQuery);
  return (
    <div>
      <ScreenHeader title="Tasmi'" />
      <div className="space-y-3 p-4 pb-10">
        <p className="text-xs text-muted-foreground">Tasmi' adalah setoran satu juz penuh di hadapan ustadz/ustadzah. Tasmi' yang lancar di satu semester membuat ananda masuk daftar calon Munaqasyah.</p>
        {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
        {data?.map((t) => (
          <article key={t.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Juz {t.juz}</p>
              <p className="text-xs text-muted-foreground">{formatTanggal(t.tanggal)}{t.jumlah_salah != null ? ` • ${t.jumlah_salah} salah` : ""}</p>
              {t.catatan && <p className="mt-1 text-sm">{t.catatan}</p>}
            </div>
            <NilaiBadge nilai={t.nilai as Nilai} />
          </article>
        ))}
        {data && data.length === 0 && <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Belum ada Tasmi' yang tercatat.</p>}
      </div>
    </div>
  );
}
