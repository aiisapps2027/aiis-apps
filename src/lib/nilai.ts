export type Nilai = "L" | "L-" | "TL";
export type JenisLaporan = "hafalan_baru" | "sabiq" | "murojaah" | "tahsin";

/** Must match the Postgres function hitung_nilai(): 0-3 → L, 4-5 → L-, 6+ → TL. */
export function hitungNilai(jumlahSalah: number): Nilai {
  if (jumlahSalah <= 3) return "L";
  if (jumlahSalah <= 5) return "L-";
  return "TL";
}

export const NILAI_LABEL: Record<Nilai, string> = { L: "Lancar", "L-": "Lancar minus", TL: "Tidak lancar" };

export const JENIS_LABEL: Record<JenisLaporan, string> = {
  hafalan_baru: "Hafalan Baru",
  sabiq: "Sabiq",
  murojaah: "Murojaah",
  tahsin: "Tahsin",
};

export const JENIS_ORDER: readonly JenisLaporan[] = ["hafalan_baru", "sabiq", "murojaah", "tahsin"];
