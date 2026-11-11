import { queryOptions } from "@tanstack/react-query";

/** Per-ayat recitation used everywhere: Misyari Rasyid Al-Afasi (equran.id qari "05"). */
export const QARI = "05";
export const BISMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ";

export type Ayat = { n: number; arab: string; latin: string; indo: string; audio: string | null };
export type SurahRef = { no: number; latin: string };
export type SurahDetail = {
  no: number; latin: string; arab: string; arti: string; tempatTurun: string; jumlahAyat: number;
  ayat: Ayat[]; prev: SurahRef | null; next: SurahRef | null;
};

type ApiRef = { nomor: number; namaLatin: string } | false | null;
export type ApiSurah = {
  nomor: number; nama: string; namaLatin: string; jumlahAyat: number; tempatTurun: string; arti: string;
  ayat: { nomorAyat: number; teksArab: string; teksLatin: string; teksIndonesia: string; audio?: Record<string, string> }[];
  suratSebelumnya: ApiRef; suratSelanjutnya: ApiRef;
};

const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
const ref = (r: ApiRef): SurahRef | null => (r ? { no: r.nomor, latin: r.namaLatin } : null);

export function mapSurahDetail(d: ApiSurah): SurahDetail {
  return {
    no: d.nomor, latin: d.namaLatin, arab: d.nama, arti: d.arti, tempatTurun: d.tempatTurun, jumlahAyat: d.jumlahAyat,
    ayat: d.ayat.map((a) => ({ n: a.nomorAyat, arab: a.teksArab, latin: strip(a.teksLatin), indo: strip(a.teksIndonesia), audio: a.audio?.[QARI] ?? null })),
    prev: ref(d.suratSebelumnya),
    next: ref(d.suratSelanjutnya),
  };
}

/** Surah text never changes: cache for the whole session (the API itself sends a 30-day cache header). */
export const surahDetailQuery = (no: number) =>
  queryOptions({
    queryKey: ["quran-surah", no],
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    queryFn: async () => {
      const res = await fetch(`https://equran.id/api/v2/surat/${no}`);
      if (!res.ok) throw new Error("Gagal memuat surah. Periksa koneksi internet.");
      const json = (await res.json()) as { data: ApiSurah };
      return mapSurahDetail(json.data);
    },
  });

// ---------- "terakhir dibaca" (per device, convenience only) ----------
const LAST_KEY = "aiis.quran.terakhir";
export type LastRead = { surah: number; ayat: number };

export function getLastRead(): LastRead | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as LastRead | null;
    return v && Number.isInteger(v.surah) && Number.isInteger(v.ayat) ? v : null;
  } catch {
    return null;
  }
}

export function setLastRead(v: LastRead) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable (private mode): ignore */
  }
}
