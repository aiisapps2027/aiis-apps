import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todayJakarta } from "@/lib/laporan";

export type Tagihan = Database["public"]["Tables"]["tagihan"]["Row"];
export type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];
export type Rekening = Database["public"]["Tables"]["rekening_sekolah"]["Row"];
export type Katalog = Database["public"]["Tables"]["katalog_tagihan"]["Row"];

export const JATUH_TEMPO_HARI = 10;
export const BUCKET_BUKTI = "bukti-transfer";

export const JENIS_TAGIHAN_LABEL: Record<string, string> = { spp: "SPP", buku_jurnal: "Buku Jurnal", seragam: "Seragam", lainnya: "Lainnya" };

export const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** "2026-11-01" → "November 2026" */
export const bulanTahun = (iso: string) => new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

/** First day of the month for a "YYYY-MM" value. */
export const periodeDari = (ym: string) => `${ym}-01`;
export const jatuhTempoDari = (ym: string, hari = JATUH_TEMPO_HARI) => `${ym}-${String(hari).padStart(2, "0")}`;

export type TagihanUi = "lunas" | "menunggu" | "ditolak" | "terlambat" | "belum";

/** What the parent should see: a rejected proof or an overdue date matters more than the raw status. */
export function tagihanUi(t: Pick<Tagihan, "status" | "jatuh_tempo">, last: Pick<Pembayaran, "status"> | undefined, today = todayJakarta()): TagihanUi {
  if (t.status === "lunas") return "lunas";
  if (t.status === "menunggu") return "menunggu";
  if (last?.status === "ditolak") return "ditolak";
  return t.jatuh_tempo < today ? "terlambat" : "belum";
}

export const UI_LABEL: Record<TagihanUi, string> = { lunas: "Lunas", menunggu: "Menunggu konfirmasi", ditolak: "Ditolak", terlambat: "Terlambat", belum: "Belum dibayar" };

type StudentLite = { id: string; jenjang: string };

/** One SPP invoice per active student for the month; students that already have one are skipped. */
export function buildSppRows(
  students: StudentLite[],
  ym: string,
  nominal: Record<string, number>,
  existingStudentIds: Set<string>,
  hari = JATUH_TEMPO_HARI,
) {
  const judul = `SPP ${bulanTahun(periodeDari(ym))}`;
  const rows: Database["public"]["Tables"]["tagihan"]["Insert"][] = [];
  let dilewati = 0;
  for (const s of students) {
    const n = nominal[s.jenjang];
    if (!n || n <= 0) continue;
    if (existingStudentIds.has(s.id)) { dilewati++; continue; }
    rows.push({ student_id: s.id, jenis: "spp", judul, periode: periodeDari(ym), nominal: n, jatuh_tempo: jatuhTempoDari(ym, hari) });
  }
  return { rows, dilewati };
}

/** Seragam are sold per gender; other items apply to everyone of the right jenjang. */
export function katalogUntuk(katalog: Katalog[], student: { jenjang: string; jenis_kelamin: string }) {
  return katalog.filter((k) => k.aktif && (!k.jenjang || k.jenjang === student.jenjang) && (!k.untuk || k.untuk === student.jenis_kelamin));
}

// ---------- proof of transfer ----------
export async function sha256Hex(file: Blob): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const buf = await file.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/** Shrinks a phone screenshot/photo to at most 1200px (JPEG, ~100-150 KB) to save storage. */
export async function prepareBukti(file: File, maxSide = 1200, quality = 0.7): Promise<{ blob: Blob; hash: string | null }> {
  if (!file.type.startsWith("image/")) throw new Error("Bukti harus berupa foto atau tangkapan layar");
  if (file.size > 15 * 1024 * 1024) throw new Error("Ukuran foto terlalu besar (maks. 15 MB)");
  const hash = await sha256Hex(file);
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Gagal memproses foto");
  return { blob, hash };
}

export async function uploadBukti(studentId: string, blob: Blob): Promise<string> {
  const path = `${studentId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET_BUKTI).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error("Gagal mengunggah bukti. Coba lagi.");
  return path;
}

export async function ajukanPembayaran(i: { tagihanId: string; tanggal: string; bank: string; nama: string; path: string; hash: string | null }) {
  const { error } = await supabase.rpc("ajukan_pembayaran", { _tagihan: i.tagihanId, _tanggal: i.tanggal, _bank: i.bank, _nama: i.nama, _bukti_path: i.path, _hash: i.hash ?? "" });
  if (error) throw new Error(error.message || "Gagal mengirim pembayaran");
}

export function useBuktiUrl(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["bukti-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET_BUKTI).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return data ?? null;
}

/** Number of payments waiting for the admin (drives the red badge on the SPP menu). */
export async function countMenunggu(): Promise<number> {
  const { count, error } = await supabase.from("pembayaran").select("id", { count: "exact", head: true }).eq("status", "menunggu");
  if (error) throw error;
  return count ?? 0;
}
export const MENUNGGU_KEY = ["admin-spp-menunggu"] as const;

/** Another payment with the same amount and transfer date is worth a second look before confirming. */
export function adaKembar(p: Pick<Pembayaran, "id" | "nominal" | "tanggal_transfer">, semua: Pick<Pembayaran, "id" | "nominal" | "tanggal_transfer" | "status">[]) {
  return semua.some((x) => x.id !== p.id && x.nominal === p.nominal && x.tanggal_transfer === p.tanggal_transfer && x.status !== "ditolak");
}
