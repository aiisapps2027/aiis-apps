import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, UserRound } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { Skeleton } from "@/components/ui/skeleton";
import { eskulSayaQuery, HARI, hariJakarta, pengingatEskul, rentangJam, sortJadwal } from "@/lib/eskul";

export const Route = createFileRoute("/ortu/eskul")({ component: EskulPage });

function EskulPage() {
  const { data, isLoading } = useQuery(eskulSayaQuery);
  const hari = hariJakarta();
  const besok = (hari % 7) + 1;
  const pengingat = data ? pengingatEskul(data) : [];
  return (
    <div>
      <ScreenHeader title="Eskul" />
      <div className="space-y-4 p-4 pb-10">
        {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
        {pengingat.length > 0 && (
          <section className="space-y-2 rounded-2xl bg-secondary p-4">
            <h2 className="text-sm font-bold text-primary">Pengingat</h2>
            {pengingat.map((p) => (
              <p key={p.jadwal.id} className="text-sm">
                <span className="font-semibold">{p.kapan === "hari ini" ? "Hari ini" : "Besok"}</span> ananda ada eskul <span className="font-semibold">{p.nama}</span>, pukul {rentangJam(p.jadwal)}
                {p.jadwal.tempat ? ` di ${p.jadwal.tempat}` : ""}.
              </p>
            ))}
          </section>
        )}
        {data?.map((e) => (
          <article key={e.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <h2 className="text-lg font-bold">{e.nama}</h2>
            {e.pengajar && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /> Pengajar: {e.pengajar}</p>
            )}
            {e.deskripsi && <p className="mt-1 text-sm text-muted-foreground">{e.deskripsi}</p>}
            <ul className="mt-3 space-y-2">
              {sortJadwal(e.eskul_jadwal).map((j) => (
                <li key={j.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2">
                  <span className={j.hari === hari ? "w-16 shrink-0 text-sm font-bold text-primary" : "w-16 shrink-0 text-sm font-semibold"}>{HARI[j.hari]}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {rentangJam(j)}</p>
                    {j.tempat && <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {j.tempat}</p>}
                  </div>
                  {j.hari === hari && <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">Hari ini</span>}
                  {j.hari === besok && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">Besok</span>}
                </li>
              ))}
              {e.eskul_jadwal.length === 0 && <li className="text-sm text-muted-foreground">Jadwal belum ditentukan.</li>}
            </ul>
          </article>
        ))}
        {data && data.length === 0 && (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">Ananda belum terdaftar di eskul. Jadwal akan muncul di sini setelah ananda didaftarkan oleh sekolah.</p>
        )}
      </div>
    </div>
  );
}
