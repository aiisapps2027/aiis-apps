import { describe, expect, it } from "vitest";
import { groupPeserta, juzLabel, type PesertaPublik } from "@/lib/tasmi";

const row = (o: Partial<PesertaPublik>): PesertaPublik => ({ periode_id: "p1", student_id: "s1", nama: "A", kelas: "2B", jenjang: "SD", juz: 30, saya: false, ...o });

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
  it("formats the juz label", () => {
    expect(juzLabel([29, 30])).toBe("Juz 29, 30");
  });
});
