import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { myStudentQuery } from "@/lib/queries";
import { laporanQuery, penandaQuery } from "@/lib/ortu-queries";
import { hafalAyatInSurah, rangesFromLaporan } from "@/lib/hafalan";
import { BISMILLAH, setLastRead, surahDetailQuery, type Ayat, type SurahDetail } from "@/lib/quran-api";

const PREF_KEY = "aiis.quran.tampilan";
type Prefs = { latin: boolean; terjemah: boolean };

function loadPrefs(): Prefs {
  try {
    return { latin: true, terjemah: true, ...(JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return { latin: true, terjemah: true };
  }
}

export function QuranReader({ no, startAyat }: { no: number; startAyat: number | null }) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(surahDetailQuery(no));
  const { data: student } = useQuery(myStudentQuery);
  const { data: laporan } = useQuery({ ...laporanQuery, enabled: !!student });
  const { data: penanda } = useQuery({ ...penandaQuery, enabled: !!student });
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [playing, setPlaying] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [berurutan, setBerurutan] = useState(false);
  const [jump, setJump] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const live = useRef<{ berurutan: boolean; data: SurahDetail | undefined }>({ berurutan, data });
  live.current = { berurutan, data };

  const hafal = useMemo(() => hafalAyatInSurah(rangesFromLaporan(laporan ?? []), no), [laporan, no]);
  const marked = useMemo(() => new Map((penanda ?? []).filter((p) => p.surah === no).map((p) => [p.ayat, p.id])), [penanda, no]);

  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  function playAyat(a: Ayat) {
    const el = audioRef.current;
    if (!el || !a.audio) return void toast.error("Audio ayat ini belum tersedia");
    el.src = a.audio;
    el.dataset["ayat"] = String(a.n);
    setPlaying(a.n);
    setPaused(false);
    el.play().catch(() => setPlaying(null));
    document.getElementById(`ayat-${a.n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setLastRead({ surah: no, ayat: a.n });
  }

  function stop() {
    audioRef.current?.pause();
    setPlaying(null);
    setPaused(false);
  }

  // One audio element per surah; "putar berurutan" continues with the next ayat when one ends.
  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audioRef.current = el;
    el.onended = () => {
      const { berurutan: seq, data: d } = live.current;
      const next = d?.ayat.find((x) => x.n === Number(el.dataset["ayat"]) + 1);
      if (seq && next) playAyat(next);
      else { setPlaying(null); setPaused(false); }
    };
    el.onerror = () => {
      if (!el.getAttribute("src")) return;
      setPlaying(null);
      toast.error("Audio gagal diputar. Periksa koneksi internet.");
    };
    return () => { el.pause(); el.removeAttribute("src"); el.load(); audioRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [no]);

  // Jump to ?ayat=N once the text is there.
  useEffect(() => {
    if (data && startAyat) requestAnimationFrame(() => document.getElementById(`ayat-${startAyat}`)?.scrollIntoView({ block: "start" }));
  }, [data, startAyat]);

  // Remember the ayat in view as "terakhir dibaca".
  useEffect(() => {
    if (!data || typeof IntersectionObserver === "undefined") return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset["ayat"])).sort((a, b) => a - b)[0];
        if (!first) return;
        clearTimeout(t);
        t = setTimeout(() => setLastRead({ surah: no, ayat: first }), 800);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const a of data.ayat) {
      const el = document.getElementById(`ayat-${a.n}`);
      if (el) obs.observe(el);
    }
    return () => { obs.disconnect(); clearTimeout(t); };
  }, [data, no]);

  const toggleMark = useMutation({
    mutationFn: async (n: number) => {
      const id = marked.get(n);
      if (id) {
        const { error: e } = await supabase.from("penanda_quran").delete().eq("id", id);
        if (e) throw e;
        return "removed" as const;
      }
      if (!student) throw new Error("Data siswa belum termuat");
      const { error: e } = await supabase.from("penanda_quran").insert({ student_id: student.id, surah: no, ayat: n });
      if (e) throw e;
      return "added" as const;
    },
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: penandaQuery.queryKey });
      toast.success(r === "added" ? "Ayat ditandai" : "Penanda dihapus");
    },
    onError: () => toast.error("Gagal menyimpan penanda"),
  });

  const goTo = () => {
    const n = Number(jump);
    if (!data || !Number.isInteger(n) || n < 1 || n > data.jumlahAyat) return void toast.error(`Ayat 1–${data?.jumlahAyat ?? ""}`);
    document.getElementById(`ayat-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <ScreenHeader title={data?.latin ?? "Al-Qur'an"} />
      <div className="space-y-4 p-4 pb-28">
        {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
        {error && (
          <div className="rounded-2xl bg-card p-5 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button className="mt-3 rounded-xl" onClick={() => refetch()}>Coba lagi</Button>
          </div>
        )}
        {data && (
          <>
            <section className="rounded-2xl bg-hero p-5 text-center text-primary-foreground">
              <p dir="rtl" lang="ar" className="font-arabic text-3xl">{data.arab}</p>
              <p className="mt-1 font-bold">{data.latin}</p>
              <p className="text-xs opacity-90">{data.arti} • {data.tempatTurun} • {data.jumlahAyat} ayat</p>
              {hafal.size > 0 && <p className="mt-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold">{hafal.size} dari {data.jumlahAyat} ayat sudah dihafal</p>}
            </section>

            <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="flex flex-col items-center gap-1.5"><Switch checked={prefs.latin} onCheckedChange={(v) => setPrefs((p) => ({ ...p, latin: v }))} />Latin</label>
                <label className="flex flex-col items-center gap-1.5"><Switch checked={prefs.terjemah} onCheckedChange={(v) => setPrefs((p) => ({ ...p, terjemah: v }))} />Terjemah</label>
                <label className="flex flex-col items-center gap-1.5"><Switch checked={berurutan} onCheckedChange={setBerurutan} />Putar berurutan</label>
              </div>
              <div className="flex gap-2">
                <Input inputMode="numeric" placeholder={`Ke ayat (1–${data.jumlahAyat})`} value={jump} onChange={(e) => setJump(e.target.value)} onKeyDown={(e) => e.key === "Enter" && goTo()} className="h-10 rounded-xl" />
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={goTo}>Buka</Button>
              </div>
            </section>

            {data.no !== 1 && data.no !== 9 && <p dir="rtl" lang="ar" className="text-center font-arabic text-2xl">{BISMILLAH}</p>}

            <ol className="space-y-3">
              {data.ayat.map((a) => {
                const isHafal = hafal.has(a.n);
                const isMarked = marked.has(a.n);
                const isPlaying = playing === a.n;
                return (
                  <li
                    key={a.n}
                    id={`ayat-${a.n}`}
                    data-ayat={a.n}
                    className={cn("scroll-mt-20 rounded-2xl bg-card p-4 shadow-soft", isHafal && "border-l-4 border-success", isPlaying && "ring-2 ring-primary")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">{a.n}</span>
                      {isHafal && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Sudah dihafal</span>}
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="button" size="icon" variant="ghost"
                          aria-label={isPlaying ? `Hentikan ayat ${a.n}` : `Putar ayat ${a.n}`}
                          onClick={() => (isPlaying ? stop() : playAyat(a))}
                        >
                          {isPlaying ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button" size="icon" variant="ghost"
                          aria-label={isMarked ? `Hapus penanda ayat ${a.n}` : `Tandai ayat ${a.n}`}
                          aria-pressed={isMarked}
                          disabled={toggleMark.isPending}
                          onClick={() => toggleMark.mutate(a.n)}
                        >
                          {isMarked ? <BookmarkCheck className="h-4 w-4 fill-primary text-primary" /> : <Bookmark className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p dir="rtl" lang="ar" className="mt-3 text-right font-arabic text-[1.65rem] leading-[2.4]">{a.arab}</p>
                    {prefs.latin && <p className="mt-2 text-sm italic text-primary/80">{a.latin}</p>}
                    {prefs.terjemah && <p className="mt-1 text-sm text-muted-foreground">{a.indo}</p>}
                  </li>
                );
              })}
            </ol>

            <nav className="flex justify-between gap-2">
              {data.prev ? (
                <Button asChild variant="outline" className="rounded-xl"><Link to="/ortu/quran/$no" params={{ no: String(data.prev.no) }}><ChevronLeft className="mr-1 h-4 w-4" />{data.prev.latin}</Link></Button>
              ) : <span />}
              {data.next && (
                <Button asChild variant="outline" className="rounded-xl"><Link to="/ortu/quran/$no" params={{ no: String(data.next.no) }}>{data.next.latin}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
              )}
            </nav>
          </>
        )}
      </div>

      {playing !== null && (
        <div className="fixed bottom-[4.25rem] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
          <div className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-soft">
            <p className="flex-1 text-sm font-medium">Ayat {playing}{berurutan ? " • berurutan" : ""}</p>
            <button
              type="button"
              aria-label={paused ? "Lanjutkan" : "Jeda"}
              onClick={() => { const el = audioRef.current; if (!el) return; if (el.paused) { void el.play(); setPaused(false); } else { el.pause(); setPaused(true); } }}
              className="rounded-full bg-white/15 p-2"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button type="button" aria-label="Hentikan" onClick={stop} className="rounded-full bg-white/15 p-2"><Square className="h-4 w-4 fill-current" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
