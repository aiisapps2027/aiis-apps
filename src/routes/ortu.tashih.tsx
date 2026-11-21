import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/aiis/decor";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/laporan";
import { getSurah } from "@/lib/quran";
import { jenisLabel, tashihQuery } from "@/lib/tashih";

export const Route = createFileRoute("/ortu/tashih")({ component: TashihPage });

function TashihPage() {
  const { data, isLoading } = useQuery(tashihQuery);
  return (
    <div>
      <ScreenHeader title="Tashih" />
      <div className="space-y-3 p-4 pb-10">
        <p className="text-xs text-muted-foreground">Tashih adalah koreksi bacaan dari ustadz/ustadzah. Bantu ananda mengulang bagian yang masih perlu diperbaiki di rumah.</p>
        {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
        {data?.map((t) => (
          <article key={t.id} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{getSurah(t.surah)?.latin ?? `Surah ${t.surah}`}{t.ayat ? ` ayat ${t.ayat}` : ""}</p>
              <p className="text-xs text-muted-foreground">{formatTanggal(t.tanggal)} • {jenisLabel(t.jenis)}</p>
              {t.catatan && <p className="mt-1 text-sm">{t.catatan}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${t.status === "sudah" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {t.status === "sudah" ? "Sudah benar" : "Perlu diperbaiki"}
            </span>
          </article>
        ))}
        {data && data.length === 0 && <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Belum ada catatan Tashih.</p>}
      </div>
    </div>
  );
}
