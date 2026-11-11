import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bookmark, BookOpen, ChevronRight, Search } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { Input } from "@/components/ui/input";
import { myStudentQuery } from "@/lib/queries";
import { laporanQuery, penandaQuery } from "@/lib/ortu-queries";
import { hafalCountBySurah, rangesFromLaporan } from "@/lib/hafalan";
import { getLastRead } from "@/lib/quran-api";
import { SURAH, getSurah } from "@/lib/quran";

export const Route = createFileRoute("/ortu/quran/")({ component: QuranList });

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");

function QuranList() {
  const [q, setQ] = useState("");
  const [last] = useState(getLastRead);
  const { data: student } = useQuery(myStudentQuery);
  const { data: laporan } = useQuery({ ...laporanQuery, enabled: !!student });
  const { data: penanda } = useQuery({ ...penandaQuery, enabled: !!student });
  const counts = useMemo(() => hafalCountBySurah(rangesFromLaporan(laporan ?? [])), [laporan]);
  const list = SURAH.filter((s) => !q.trim() || String(s.no) === q.trim() || norm(s.latin).includes(norm(q)));
  const lastSurah = last ? getSurah(last.surah) : undefined;

  return (
    <div>
      <ScreenHeader title="Al-Qur'an Digital" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {last && lastSurah ? (
            <Link to="/ortu/quran/$no" params={{ no: String(last.surah) }} search={{ ayat: last.ayat }} className="rounded-2xl bg-hero p-4 text-primary-foreground shadow-soft">
              <BookOpen className="h-5 w-5" />
              <p className="mt-2 text-xs opacity-90">Lanjutkan membaca</p>
              <p className="font-bold leading-tight">{lastSurah.latin}</p>
              <p className="text-xs opacity-90">Ayat {last.ayat}</p>
            </Link>
          ) : (
            <Link to="/ortu/quran/$no" params={{ no: "1" }} className="rounded-2xl bg-hero p-4 text-primary-foreground shadow-soft">
              <BookOpen className="h-5 w-5" />
              <p className="mt-2 text-xs opacity-90">Mulai membaca</p>
              <p className="font-bold leading-tight">Al-Fatihah</p>
            </Link>
          )}
          <Link to="/ortu/quran/penanda" className="rounded-2xl bg-card p-4 shadow-soft">
            <Bookmark className="h-5 w-5 text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Penanda ayat</p>
            <p className="font-bold leading-tight">{penanda?.length ?? 0} ayat</p>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari surah (nama atau nomor)" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl bg-card pl-10" />
        </div>

        <ul className="divide-y rounded-2xl bg-card shadow-soft">
          {list.map((s) => {
            const h = counts.get(s.no);
            return (
              <li key={s.no}>
                <Link to="/ortu/quran/$no" params={{ no: String(s.no) }} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-bold text-primary">{s.no}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.latin}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.ayat} ayat{h ? <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 font-semibold text-success">{h} dihafal</span> : null}
                    </p>
                  </div>
                  <span dir="rtl" lang="ar" className="font-arabic text-xl text-primary">{s.arab}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
          {list.length === 0 && <li className="p-4 text-sm text-muted-foreground">Surah tidak ditemukan.</li>}
        </ul>
      </div>
    </div>
  );
}
