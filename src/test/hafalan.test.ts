import { describe, expect, it } from "vitest";
import { juzProgress, mergeIntervals, parseTargetJuz } from "@/lib/hafalan";
import { TOTAL_AYAT, ayatIndex, juzBounds } from "@/lib/quran";
import { describeLaporan } from "@/lib/laporan";

describe("global ayat index", () => {
  it("starts at 1 and ends at 6236", () => {
    expect(ayatIndex(1, 1)).toBe(1);
    expect(ayatIndex(114, 6)).toBe(TOTAL_AYAT);
    expect(TOTAL_AYAT).toBe(6236);
  });
  it("juz bounds tile the whole Qur'an without gaps", () => {
    let expectedStart = 1;
    for (let j = 1; j <= 30; j++) {
      const [s, e] = juzBounds(j);
      expect(s).toBe(expectedStart);
      expect(e).toBeGreaterThanOrEqual(s);
      expectedStart = e + 1;
    }
    expect(expectedStart).toBe(TOTAL_AYAT + 1);
  });
  it("juz 29 has 431 ayat (Al-Mulk to Al-Mursalat)", () => {
    const [s, e] = juzBounds(29);
    expect(e - s + 1).toBe(431);
  });
});

describe("parseTargetJuz", () => {
  it.each([["Juz 30", 30], ["juz 29 (Al-Mulk – An-Naba)", 29], ["Juz30", 30], ["Juz 31", null], ["Hafal semua", null], [null, null]] as const)("%s → %s", (t, n) => expect(parseTargetJuz(t)).toBe(n));
});

describe("juzProgress", () => {
  const full = (s: number, a1: number, a2: number) => ({ surahAwal: s, ayatAwal: a1, surahAkhir: s, ayatAkhir: a2 });
  it("counts a whole surah inside the juz", () => {
    const p = juzProgress([full(72, 1, 28)], 29);
    expect(p).toMatchObject({ covered: 28, total: 431, percent: 6 });
  });
  it("counts overlapping ranges once", () => {
    expect(juzProgress([full(72, 1, 20), full(72, 10, 28)], 29).covered).toBe(28);
  });
  it("ignores memorisation outside the target juz", () => {
    expect(juzProgress([full(2, 1, 50)], 30).covered).toBe(0);
  });
  it("reaches 100% when the whole juz is covered", () => {
    expect(juzProgress([{ surahAwal: 78, ayatAwal: 1, surahAkhir: 114, ayatAkhir: 6 }], 30).percent).toBe(100);
  });
  it("merges adjacent intervals", () => expect(mergeIntervals([[5, 9], [1, 4], [20, 25]])).toEqual([[1, 9], [20, 25]]));
});

describe("describeLaporan", () => {
  const base = { jenis: "murojaah", surah_awal: 72, ayat_awal: 12, surah_akhir: 72, ayat_akhir: 13, jilid: null, halaman: null, materi: null };
  it("describes a surah range", () => expect(describeLaporan(base)).toBe("Al-Jinn: 12–13"));
  it("describes tahsin by jilid and halaman", () =>
    expect(describeLaporan({ ...base, jenis: "tahsin", surah_awal: null, ayat_awal: null, surah_akhir: null, ayat_akhir: null, jilid: "2A", halaman: 17 })).toBe("Jilid 2A • hal. 17"));
});
