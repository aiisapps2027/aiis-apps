import { ayatIndex, juzBounds, type AyatRange } from "@/lib/quran";

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
