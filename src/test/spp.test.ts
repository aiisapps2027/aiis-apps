import { describe, expect, it } from "vitest";
import { buildSppRows, bulanTahun, formatRupiah, jatuhTempoDari, katalogUntuk, tagihanUi, type Katalog } from "@/lib/spp";

describe("formatting", () => {
  it("formats rupiah with dots", () => {
    expect(formatRupiah(1300000)).toBe("Rp 1.300.000");
    expect(formatRupiah(35000)).toBe("Rp 35.000");
  });
  it("names the month in Indonesian", () => expect(bulanTahun("2026-11-01")).toBe("November 2026"));
  it("sets the due date on the 10th", () => expect(jatuhTempoDari("2026-11")).toBe("2026-11-10"));
});

describe("buildSppRows", () => {
  const students = [{ id: "a", jenjang: "SD" }, { id: "b", jenjang: "TK" }, { id: "c", jenjang: "SD" }];
  it("prices by jenjang and skips students that already have the month", () => {
    const { rows, dilewati } = buildSppRows(students, "2026-12", { SD: 1300000, TK: 750000 }, new Set(["c"]));
    expect(dilewati).toBe(1);
    expect(rows.map((r) => [r.student_id, r.nominal])).toEqual([["a", 1300000], ["b", 750000]]);
    expect(rows[0]).toMatchObject({ jenis: "spp", judul: "SPP Desember 2026", periode: "2026-12-01", jatuh_tempo: "2026-12-10" });
  });
  it("skips a jenjang without a price", () => {
    expect(buildSppRows(students, "2026-12", { SD: 1300000 }, new Set()).rows.map((r) => r.student_id)).toEqual(["a", "c"]);
  });
});

describe("tagihanUi", () => {
  const t = (status: string, due: string) => ({ status, jatuh_tempo: due });
  it("lunas and menunggu win", () => {
    expect(tagihanUi(t("lunas", "2026-01-01"), undefined, "2026-11-12")).toBe("lunas");
    expect(tagihanUi(t("menunggu", "2026-01-01"), undefined, "2026-11-12")).toBe("menunggu");
  });
  it("shows a rejected proof before overdue", () => expect(tagihanUi(t("belum_bayar", "2026-01-01"), { status: "ditolak" }, "2026-11-12")).toBe("ditolak"));
  it("overdue only after the due date", () => {
    expect(tagihanUi(t("belum_bayar", "2026-11-10"), undefined, "2026-11-10")).toBe("belum");
    expect(tagihanUi(t("belum_bayar", "2026-11-10"), undefined, "2026-11-11")).toBe("terlambat");
  });
});

describe("katalogUntuk", () => {
  const k = (nama: string, p: Partial<Katalog>): Katalog => ({ id: nama, jenis: "seragam", nama, jenjang: null, untuk: null, nominal: 1, aktif: true, urutan: 0, created_at: "", ...p });
  const katalog = [k("L-SD", { jenjang: "SD", untuk: "L" }), k("P-SD", { jenjang: "SD", untuk: "P" }), k("Semua", {}), k("TK", { jenjang: "TK" }), k("Mati", { aktif: false })];
  it("matches jenjang and gender, hides inactive", () => {
    expect(katalogUntuk(katalog, { jenjang: "SD", jenis_kelamin: "P" }).map((x) => x.nama)).toEqual(["P-SD", "Semua"]);
    expect(katalogUntuk(katalog, { jenjang: "TK", jenis_kelamin: "L" }).map((x) => x.nama)).toEqual(["Semua", "TK"]);
  });
});
