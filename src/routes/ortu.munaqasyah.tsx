import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/laporan";
import { groupPeserta, juzLabel, munaqasyahPesertaQuery, periodeDari } from "@/lib/tasmi";

export const Route = createFileRoute("/ortu/munaqasyah")({ component: MunaqasyahPage });

function MunaqasyahPage() {
  const { data: peserta, isLoading } = useQuery(munaqasyahPesertaQuery);
  const periode = peserta ? periodeDari(peserta) : undefined;
  return (
    <div>
      <ScreenHeader title="Munaqasyah" />
      <div className="space-y-5 p-4 pb-10">
        {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
        {periode?.map((p) => {
          const list = groupPeserta(peserta ?? [], p.id);
          const saya = list.find((x) => x.saya);
          return (
            <section key={p.id} className="space-y-3">
              <div className="rounded-2xl bg-card p-4 shadow-soft">
                <h2 className="font-bold">{p.nama}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {p.tanggal ? formatTanggal(p.tanggal) : "Tanggal pelaksanaan menyusul"}
                </p>
              </div>
              <div className={saya ? "flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-success" : "rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground"}>
                {saya ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="font-bold">Ananda ikut Munaqasyah</p>
                      <p className="text-sm">{juzLabel(saya.juz)}</p>
                    </div>
                  </>
                ) : (
                  "Ananda belum termasuk peserta Munaqasyah kali ini."
                )}
              </div>
              <div className="rounded-2xl bg-card shadow-soft">
                <h3 className="border-b px-4 py-3 text-sm font-bold text-primary">Peserta ({list.length})</h3>
                <ul className="divide-y">
                  {list.map((x) => (
                    <li key={x.studentId} className={x.saya ? "flex items-center gap-3 bg-secondary/60 px-4 py-3" : "flex items-center gap-3 px-4 py-3"}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{x.nama}{x.saya ? " (ananda)" : ""}</p>
                        <p className="text-xs text-muted-foreground">Kelas {x.kelas ?? "-"} • {x.jenjang}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">{juzLabel(x.juz)}</span>
                    </li>
                  ))}
                  {list.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Belum ada peserta.</li>}
                </ul>
              </div>
            </section>
          );
        })}
        {periode && periode.length === 0 && (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Belum ada pengumuman Munaqasyah. Munaqasyah diadakan dua kali setahun dan pesertanya akan diumumkan di sini.</p>
        )}
      </div>
    </div>
  );
}
