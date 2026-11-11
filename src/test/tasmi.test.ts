import { describe, expect, it } from "vitest";
import { countMunaqasyahBaru, groupPeserta, juzLabel, periodeDari, periodeSignature, type PesertaPublik } from "@/lib/tasmi";

const row = (o: Partial<PesertaPublik>): PesertaPublik => ({ periode_id: "p1", periode_nama: "Semester Ganjil", mulai: "2026-07-01", tanggal_pelaksanaan: null, student_id: "s1", nama: "A", kelas: "2B", jenjang: "SD", juz: 30, saya: false, ...o });

describe("groupPeserta", () => {
  it("merges several juz of one student and sorts them", () => {
    const out = groupPeserta([row({ juz: 30 }), row({ juz: 29 }), row({ student_id: "s2", nama: "B" })], "p1");
    expect(out).toHaveLength(2);
    expect(out[0]!.juz).toEqual([29, 30]);
  });
  it("ignores other periods and keeps the 'saya' flag", () => {
    const out = groupPeserta([row({ periode_id: "p2" }), row({ student_id: "s3", saya: true })], "p1");
    expect(out).toHaveLength(1);
    expect(out[0]!.saya).toBe(true);
  });
  it("lists each announced period once", () => {
    const out = periodeDari([row({}), row({ student_id: "s2" }), row({ periode_id: "p2", periode_nama: "Genap", tanggal_pelaksanaan: "2027-05-01" })]);
    expect(out.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(out[1]!.tanggal).toBe("2027-05-01");
  });
  it("formats the juz label", () => {
    expect(juzLabel([29, 30])).toBe("Juz 29, 30");
  });

  describe("countMunaqasyahBaru", () => {
    const rows = [row({}), row({ student_id: "s2" })];
    it("counts an announced period that was never opened", () => {
      expect(countMunaqasyahBaru(rows, {})).toBe(1);
    });
    it("is zero once opened, and returns when participants or the date change", () => {
      const seen = { p1: periodeSignature(rows, "p1") };
      expect(countMunaqasyahBaru(rows, seen)).toBe(0);
      expect(countMunaqasyahBaru([...rows, row({ student_id: "s3" })], seen)).toBe(1);
      expect(countMunaqasyahBaru(rows.map((r) => ({ ...r, tanggal_pelaksanaan: "2026-12-01" })), seen)).toBe(1);
    });
    it("is zero when nothing is announced", () => {
      expect(countMunaqasyahBaru([], {})).toBe(0);
    });
  });
});
