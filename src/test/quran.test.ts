import { describe, expect, it } from "vitest";
import { SURAH, getSurah, juzOf, validateRange, formatRange } from "@/lib/quran";
import { hitungNilai } from "@/lib/nilai";

describe("surah data", () => {
  it("has 114 surahs and 6236 ayat", () => {
    expect(SURAH).toHaveLength(114);
    expect(SURAH.reduce((n, s) => n + s.ayat, 0)).toBe(6236);
    SURAH.forEach((s, i) => expect(s.no).toBe(i + 1));
  });
  it("knows Al-Jinn has 28 ayat", () => expect(getSurah(72)?.ayat).toBe(28));
});

describe("juzOf", () => {
  it.each([
    [1, 1, 1], [2, 141, 1], [2, 142, 2], [2, 252, 2], [2, 253, 3], [67, 1, 29], [72, 28, 29], [77, 50, 29], [78, 1, 30], [114, 6, 30], [18, 74, 15], [18, 75, 16],
  ])("surah %i ayat %i → juz %i", (s, a, j) => expect(juzOf(s, a)).toBe(j));
});

describe("validateRange", () => {
  const ok = { surahAwal: 72, ayatAwal: 12, surahAkhir: 72, ayatAkhir: 13 };
  it("accepts a valid range", () => expect(validateRange(ok)).toBeNull());
  it("rejects ayat beyond the surah", () => expect(validateRange({ ...ok, ayatAkhir: 29 })).toMatch(/Al-Jinn/));
  it("rejects reversed range", () => expect(validateRange({ ...ok, ayatAwal: 20, ayatAkhir: 10 })).toMatch(/sebelum/));
  it("accepts a range across surahs", () => expect(validateRange({ surahAwal: 67, ayatAwal: 1, surahAkhir: 68, ayatAkhir: 5 })).toBeNull());
  it("formats ranges", () => expect(formatRange(ok)).toBe("Al-Jinn: 12–13"));
});

describe("hitungNilai", () => {
  it.each([[0, "L"], [3, "L"], [4, "L-"], [5, "L-"], [6, "TL"], [20, "TL"]] as const)("%i salah → %s", (n, v) => expect(hitungNilai(n)).toBe(v));
});
