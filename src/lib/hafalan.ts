import { ayatIndex, getSurah, juzBounds, type AyatRange } from "@/lib/quran";

export type Interval = [number, number];

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export const toInterval = (r: AyatRange): Interval => [ayatIndex(r.surahAwal, r.ayatAwal), ayatIndex(r.surahAkhir, r.ayatAkhir)];

/** "Juz 30 (An-Naba' – Al-A'la)" → 30; null when the target has no juz number. */
export function parseTargetJuz(target: string | null | undefined): number | null {
  const m = /juz\s*(\d{1,2})/i.exec(target ?? "");
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 30 ? n : null;
}

/** Share of the target juz covered by the given memorised ranges (overlaps counted once). */
export function juzProgress(ranges: AyatRange[], juz: number): { covered: number; total: number; percent: number } {
  const [from, to] = juzBounds(juz);
  const total = to - from + 1;
  let covered = 0;
  for (const [s, e] of mergeIntervals(ranges.map(toInterval))) {
    const lo = Math.max(s, from);
    const hi = Math.min(e, to);
    if (hi >= lo) covered += hi - lo + 1;
  }
  return { covered, total, percent: Math.round((covered / total) * 100) };
}

type LaporanLike = { jenis: string; nilai: string; surah_awal: number | null; ayat_awal: number | null; surah_akhir: number | null; ayat_akhir: number | null };

/** Memorised ranges = "hafalan baru" reports that were not graded TL. */
export function rangesFromLaporan(rows: LaporanLike[]): AyatRange[] {
  return rows
    .filter((r) => r.jenis === "hafalan_baru" && r.nilai !== "TL" && r.surah_awal != null && r.ayat_awal != null)
    .map((r) => ({ surahAwal: r.surah_awal!, ayatAwal: r.ayat_awal!, surahAkhir: r.surah_akhir ?? r.surah_awal!, ayatAkhir: r.ayat_akhir ?? r.ayat_awal! }));
}

/** Ayat numbers of one surah covered by the ranges. */
export function hafalAyatInSurah(ranges: AyatRange[], surah: number): Set<number> {
  const total = getSurah(surah)?.ayat ?? 0;
  const out = new Set<number>();
  for (const r of ranges) {
    if (surah < r.surahAwal || surah > r.surahAkhir) continue;
    const from = surah === r.surahAwal ? r.ayatAwal : 1;
    const to = surah === r.surahAkhir ? r.ayatAkhir : total;
    for (let a = Math.max(1, from); a <= Math.min(total, to); a++) out.add(a);
  }
  return out;
}

/** surah number → count of memorised ayat (only surahs with at least one). */
export function hafalCountBySurah(ranges: AyatRange[]): Map<number, number> {
  const surahs = new Set<number>();
  for (const r of ranges) for (let s = r.surahAwal; s <= r.surahAkhir; s++) surahs.add(s);
  const out = new Map<number, number>();
  for (const s of surahs) {
    const n = hafalAyatInSurah(ranges, s).size;
    if (n) out.set(s, n);
  }
  return out;
}
