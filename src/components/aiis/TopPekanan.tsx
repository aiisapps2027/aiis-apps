import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Star, Trophy } from "lucide-react";
import { MEDALI, rentangPekan, topPekanQuery, type TopRow } from "@/lib/top";

function Baris({ r }: { r: TopRow }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${r.saya ? "bg-secondary/70" : ""}`}>
      <span className="w-7 shrink-0 text-center text-sm font-bold text-muted-foreground">{r.peringkat}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{r.nama}{r.saya ? " (ananda)" : ""}</p>
        <p className="text-[11px] text-muted-foreground">Kelas {r.kelas ?? "-"} • {r.jenjang}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {r.jumlah}</span>
    </li>
  );
}

/** "Top 10 Pekan Ini" card for the parent, ustadz and admin home screens. */
export function TopPekanan({ className = "" }: { className?: string }) {
  const { data } = useQuery(topPekanQuery);
  const [buka, setBuka] = useState(false);
  if (!data) return null;
  const top3 = data.slice(0, 3);
  const sisa = data.slice(3);
  const info = data[0];
  return (
    <section className={`overflow-hidden rounded-2xl bg-card shadow-soft ${className}`}>
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-50 px-4 py-3">
        <Trophy className="h-5 w-5 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-foreground">Top 10 {info?.pekan === "lalu" ? "Pekan Lalu" : "Pekan Ini"}</h2>
          <p className="text-[11px] text-muted-foreground">{info ? `${rentangPekan(info.mulai, info.selesai)} • bintang hafalan baru` : "Bintang hafalan baru"}</p>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Belum ada bintang pekan ini. Setiap 1 halaman hafalan baru (nilai L / L-) = 1 bintang.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 px-3 pt-3">
            {top3.map((r) => (
              <div key={r.peringkat} className={`flex flex-col items-center rounded-xl px-1.5 py-2.5 text-center ${r.saya ? "bg-secondary ring-2 ring-primary/40" : "bg-muted/50"}`}>
                <span className="text-2xl leading-none">{MEDALI[r.peringkat - 1]}</span>
                <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-tight">{r.nama}</p>
                <p className="text-[10px] text-muted-foreground">{r.kelas ?? r.jenjang}</p>
                <span className="mt-1 flex items-center gap-0.5 text-sm font-bold text-primary"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {r.jumlah}</span>
              </div>
            ))}
          </div>
          {sisa.length > 0 && (
            <>
              {buka && <ul className="mt-2 divide-y border-t">{sisa.map((r) => <Baris key={r.peringkat} r={r} />)}</ul>}
              <button type="button" onClick={() => setBuka((v) => !v)} className="flex w-full items-center justify-center gap-1 py-2.5 text-xs font-semibold text-primary">
                {buka ? "Tutup" : `Lihat peringkat 4–${data.length}`}
                <ChevronDown className={`h-4 w-4 transition-transform ${buka ? "rotate-180" : ""}`} />
              </button>
            </>
          )}
          {sisa.length === 0 && <div className="h-3" />}
        </>
      )}
    </section>
  );
}
