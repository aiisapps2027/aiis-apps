import { SURAH, type Surah } from "@/data/surah";

export { SURAH };
export type { Surah };

export const getSurah = (no: number): Surah | undefined => SURAH[no - 1];

/** First [surah, ayat] of each juz (index 0 = juz 1). */
const JUZ_START: readonly (readonly [number, number])[] = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

/** Juz that contains the given surah:ayat (1-30). */
export function juzOf(surah: number, ayat: number): number {
  let juz = 1;
  JUZ_START.forEach(([s, a], i) => {
    if (surah > s || (surah === s && ayat >= a)) juz = i + 1;
  });
  return juz;
}

export type AyatRange = { surahAwal: number; ayatAwal: number; surahAkhir: number; ayatAkhir: number };

/** Returns an Indonesian error message, or null when the range is valid. */
export function validateRange(r: AyatRange): string | null {
  const a = getSurah(r.surahAwal);
  const b = getSurah(r.surahAkhir);
  if (!a || !b) return "Pilih surah";
  if (!Number.isInteger(r.ayatAwal) || r.ayatAwal < 1 || r.ayatAwal > a.ayat) return `Ayat awal ${a.latin}: 1–${a.ayat}`;
  if (!Number.isInteger(r.ayatAkhir) || r.ayatAkhir < 1 || r.ayatAkhir > b.ayat) return `Ayat akhir ${b.latin}: 1–${b.ayat}`;
  if (r.surahAkhir < r.surahAwal || (r.surahAkhir === r.surahAwal && r.ayatAkhir < r.ayatAwal)) return "Ayat akhir tidak boleh sebelum ayat awal";
  return null;
}

export function formatRange(r: AyatRange): string {
  const a = getSurah(r.surahAwal)?.latin ?? `Surah ${r.surahAwal}`;
  const b = getSurah(r.surahAkhir)?.latin ?? `Surah ${r.surahAkhir}`;
  if (r.surahAwal === r.surahAkhir) return r.ayatAwal === r.ayatAkhir ? `${a}: ${r.ayatAwal}` : `${a}: ${r.ayatAwal}–${r.ayatAkhir}`;
  return `${a}: ${r.ayatAwal} – ${b}: ${r.ayatAkhir}`;
}
