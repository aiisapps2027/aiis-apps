import { describe, expect, it } from "vitest";
import { mapSurahDetail, type ApiSurah } from "@/lib/quran-api";
import { hafalAyatInSurah, hafalCountBySurah, rangesFromLaporan } from "@/lib/hafalan";

const api: ApiSurah = {
  nomor: 1, nama: "الفاتحة", namaLatin: "Al-Fatihah", jumlahAyat: 7, tempatTurun: "Mekah", arti: "Pembukaan",
  ayat: [{ nomorAyat: 1, teksArab: "بِسْمِ", teksLatin: "Bismillāh", teksIndonesia: "Dengan nama Allah<sup>1</sup>", audio: { "01": "a.mp3", "05": "afasy.mp3" } }],
  suratSebelumnya: false,
  suratSelanjutnya: { nomor: 2, namaLatin: "Al-Baqarah" },
};

describe("mapSurahDetail", () => {
  it("maps fields, picks the Al-Afasy audio and strips HTML", () => {
    const d = mapSurahDetail(api);
    expect(d).toMatchObject({ no: 1, latin: "Al-Fatihah", jumlahAyat: 7, prev: null, next: { no: 2, latin: "Al-Baqarah" } });
    expect(d.ayat[0]).toEqual({ n: 1, arab: "بِسْمِ", latin: "Bismillāh", indo: "Dengan nama Allah1", audio: "afasy.mp3" });
  });
  it("tolerates a missing audio map", () => {
    const first = api.ayat[0]!;
    const d = mapSurahDetail({ ...api, ayat: [{ nomorAyat: first.nomorAyat, teksArab: first.teksArab, teksLatin: first.teksLatin, teksIndonesia: first.teksIndonesia }] });
    expect(d.ayat[0]!.audio).toBeNull();
  });
});

describe("memorised ayat", () => {
  const row = (p: Partial<Parameters<typeof rangesFromLaporan>[0][number]>) => ({ jenis: "hafalan_baru", nilai: "L", surah_awal: 72, ayat_awal: 1, surah_akhir: 72, ayat_akhir: 5, ...p });
  it("only counts hafalan baru that is not TL", () => {
    const r = rangesFromLaporan([row({}), row({ nilai: "TL", ayat_awal: 6, ayat_akhir: 10 }), row({ jenis: "murojaah", ayat_awal: 11, ayat_akhir: 15 }), row({ nilai: "L-", ayat_awal: 20, ayat_akhir: 21 })]);
    expect([...hafalAyatInSurah(r, 72)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 20, 21]);
  });
  it("splits a range that crosses surahs", () => {
    const r = rangesFromLaporan([row({ surah_awal: 113, ayat_awal: 4, surah_akhir: 114, ayat_akhir: 2 })]);
    expect([...hafalAyatInSurah(r, 113)]).toEqual([4, 5]);
    expect([...hafalAyatInSurah(r, 114)]).toEqual([1, 2]);
    expect(hafalCountBySurah(r)).toEqual(new Map([[113, 2], [114, 2]]));
  });
  it("never goes beyond the surah's last ayat", () => {
    const r = rangesFromLaporan([row({ ayat_awal: 25, ayat_akhir: 40 })]);
    expect(hafalAyatInSurah(r, 72).size).toBe(4);
  });
});
