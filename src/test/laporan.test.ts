import { describe, expect, it } from "vitest";
import { describeMaterial, effectiveNilai, emptySection, emptyTarget, isEditableDate, sectionFromRow, sectionFromTarget, sectionToPayload, shiftDate, targetToPayload, validateMaterial, validateSection, type LaporanRow } from "@/lib/laporan";

const sec = (p: Partial<ReturnType<typeof emptySection>>) => ({ ...emptySection(), on: true, ...p });
const base = { studentId: "s1", teacherId: "t1", tanggal: "2026-11-10" };

describe("dates", () => {
  it("shifts across month boundaries", () => {
    expect(shiftDate("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("allows today and 7 days back only", () => {
    expect(isEditableDate("2026-11-10", "2026-11-10")).toBe(true);
    expect(isEditableDate("2026-11-03", "2026-11-10")).toBe(true);
    expect(isEditableDate("2026-11-02", "2026-11-10")).toBe(false);
    expect(isEditableDate("2026-11-11", "2026-11-10")).toBe(false);
  });
});

describe("effectiveNilai", () => {
  it("uses the tapped grade when no mistake count", () => expect(effectiveNilai({ salah: "", nilai: "L-" })).toBe("L-"));
  it("derives from the mistake count when present", () => {
    expect(effectiveNilai({ salah: "2", nilai: "TL" })).toBe("L");
    expect(effectiveNilai({ salah: "4", nilai: null })).toBe("L-");
    expect(effectiveNilai({ salah: "9", nilai: "L" })).toBe("TL");
  });
  it("is null when nothing is chosen", () => expect(effectiveNilai({ salah: "", nilai: null })).toBeNull());
});

describe("validateSection", () => {
  const ok = sec({ surahAwal: 72, ayatAwal: "12", ayatAkhir: "13", nilai: "L" });
  it("accepts a valid hafalan section", () => expect(validateSection("hafalan_baru", ok)).toBeNull());
  it("requires a grade", () => expect(validateSection("sabiq", { ...ok, nilai: null })).toMatch(/nilai/i));
  it("requires a surah", () => expect(validateSection("murojaah", { ...ok, surahAwal: null })).toMatch(/surah/i));
  it("rejects ayat beyond the surah", () => expect(validateSection("murojaah", { ...ok, ayatAkhir: "29" })).toMatch(/Al-Jinn/));
  it("rejects a bad mistake count", () => expect(validateSection("sabiq", { ...ok, salah: "-1" })).toMatch(/jumlah salah/i));
  it("tahsin needs jilid, halaman optional", () => {
    expect(validateSection("tahsin", sec({ nilai: "L" }))).toMatch(/jilid/i);
    expect(validateSection("tahsin", sec({ nilai: "L", jilid: "2A" }))).toBeNull();
    expect(validateSection("tahsin", sec({ nilai: "L", jilid: "2A", halaman: "abc" }))).toMatch(/halaman/i);
  });
});

describe("sectionToPayload", () => {
  it("builds a hafalan payload with auto juz and no jilid", () => {
    const p = sectionToPayload(base, "hafalan_baru", sec({ surahAwal: 72, ayatAwal: "12", ayatAkhir: "13", nilai: "L" }));
    expect(p).toMatchObject({ jenis: "hafalan_baru", surah_awal: 72, surah_akhir: 72, ayat_awal: 12, ayat_akhir: 13, juz: 29, jumlah_salah: null, nilai: "L", jilid: null });
  });
  it("stores the count and derived grade together", () => {
    const p = sectionToPayload(base, "murojaah", sec({ surahAwal: 67, ayatAwal: "1", ayatAkhir: "5", salah: "4" }));
    expect(p).toMatchObject({ jumlah_salah: 4, nilai: "L-" });
  });
  it("supports ranges across surahs", () => {
    const p = sectionToPayload(base, "murojaah", sec({ surahAwal: 67, ayatAwal: "20", lintas: true, surahAkhir: 68, ayatAkhir: "5", nilai: "L" }));
    expect(p).toMatchObject({ surah_awal: 67, surah_akhir: 68 });
  });
  it("builds a tahsin payload without surah fields", () => {
    const p = sectionToPayload(base, "tahsin", sec({ jilid: " 2A ", halaman: "17", nilai: "L-" }));
    expect(p).toMatchObject({ jenis: "tahsin", jilid: "2A", halaman: 17, surah_awal: null, juz: null, nilai: "L-" });
  });
});

describe("sectionFromRow", () => {
  it("round-trips a saved row", () => {
    const row = { id: "x", jenis: "murojaah", surah_awal: 67, ayat_awal: 1, surah_akhir: 67, ayat_akhir: 5, jumlah_salah: null, nilai: "L", jilid: null, halaman: null, materi: null } as unknown as LaporanRow;
    expect(sectionFromRow(row)).toMatchObject({ on: true, existingId: "x", surahAwal: 67, ayatAwal: "1", ayatAkhir: "5", lintas: false, nilai: "L", salah: "" });
  });
});

describe("targets", () => {
  const t = (p: Partial<ReturnType<typeof emptyTarget>>) => ({ ...emptyTarget(), ...p });
  it("validates material without needing a grade", () => {
    expect(validateMaterial("murojaah", t({ surahAwal: 67, ayatAwal: "1", ayatAkhir: "5" }))).toBeNull();
    expect(validateMaterial("murojaah", t({}))).toMatch(/surah/i);
    expect(validateMaterial("tahsin", t({}))).toMatch(/jilid/i);
  });
  it("describes a target", () => {
    expect(describeMaterial("hafalan_baru", t({ surahAwal: 72, ayatAwal: "12", ayatAkhir: "13" }))).toBe("Al-Jinn: 12–13");
    expect(describeMaterial("tahsin", t({ jilid: "2A", halaman: "17" }))).toBe("Jilid 2A • hal. 17");
    expect(describeMaterial("sabiq", t({}))).toBe("-");
  });
  it("builds payloads without nilai fields", () => {
    const base = { studentId: "s1", teacherId: "t1", tanggal: "2026-11-11" };
    expect(targetToPayload(base, "hafalan_baru", t({ surahAwal: 72, ayatAwal: "14", ayatAkhir: "16", catatan: " pelan " }))).toMatchObject({ jenis: "hafalan_baru", surah_awal: 72, ayat_awal: 14, ayat_akhir: 16, catatan: "pelan", jilid: null });
    expect(targetToPayload(base, "tahsin", t({ jilid: "2A", halaman: "18" }))).toMatchObject({ jenis: "tahsin", jilid: "2A", halaman: 18, surah_awal: null });
  });
  it("pre-fills a report section from a target, leaving the grade empty", () => {
    const sec = sectionFromTarget(t({ surahAwal: 72, ayatAwal: "14", ayatAkhir: "16" }));
    expect(sec).toMatchObject({ on: true, surahAwal: 72, ayatAwal: "14", ayatAkhir: "16", nilai: null, salah: "" });
  });
});
