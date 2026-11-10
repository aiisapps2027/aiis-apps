import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { op: "upsert" | "delete"; table: string; payload?: unknown; opts?: unknown; eq: [string, unknown][] };
const calls: Call[] = [];
let failOn: { table: string; code: string } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const result = () => ({ error: failOn && failOn.table === table ? { code: failOn.code, message: "db" } : null });
      return {
        upsert: (payload: unknown, opts: unknown) => {
          calls.push({ op: "upsert", table, payload, opts, eq: [] });
          return Promise.resolve(result());
        },
        delete: () => {
          const call: Call = { op: "delete", table, eq: [] };
          calls.push(call);
          const chain = {
            eq: (c: string, v: unknown) => (call.eq.push([c, v]), chain),
            in: (c: string, v: unknown) => (call.eq.push([`${c}[]`, v]), chain),
            then: (res: (v: unknown) => unknown) => res(result()),
          };
          return chain;
        },
      };
    },
  },
}));

import { emptySection, emptyTarget, saveLaporan, saveTargets, type SaveInput, type SectionState, type TargetState } from "@/lib/laporan";
import { JENIS_ORDER, type JenisLaporan } from "@/lib/nilai";

const sections = (over: Partial<Record<JenisLaporan, Partial<SectionState>>> = {}) =>
  Object.fromEntries(JENIS_ORDER.map((j) => [j, { ...emptySection(), ...over[j] }])) as SaveInput["sections"];

const input = (over: Partial<SaveInput> = {}): SaveInput => ({
  studentId: "s1", teacherId: "t1", tanggal: "2026-11-10", sections: sections(), kegiatan: "", catatan: "", hadCatatan: false, ...over,
});

const hafalan: Partial<SectionState> = { on: true, surahAwal: 72, ayatAwal: "12", ayatAkhir: "13", nilai: "L" };

beforeEach(() => { calls.length = 0; failOn = null; });

describe("saveLaporan", () => {
  it("upserts only the enabled sections, keyed by student/day/jenis", async () => {
    await saveLaporan(input({ sections: sections({ hafalan_baru: hafalan, tahsin: { on: true, jilid: "2A", halaman: "17", nilai: "L-" } }) }));
    const ups = calls.filter((c) => c.op === "upsert" && c.table === "laporan_harian");
    expect(ups).toHaveLength(2);
    expect(ups[0]!.opts).toEqual({ onConflict: "student_id,tanggal,jenis" });
    expect(ups[0]!.payload).toMatchObject({ student_id: "s1", teacher_id: "t1", tanggal: "2026-11-10", jenis: "hafalan_baru", juz: 29, nilai: "L" });
    expect(ups[1]!.payload).toMatchObject({ jenis: "tahsin", jilid: "2A", halaman: 17, nilai: "L-" });
    expect(calls.some((c) => c.table === "catatan_harian")).toBe(false);
  });

  it("deletes a section that was switched off after being saved", async () => {
    await saveLaporan(input({ sections: sections({ sabiq: { on: false, existingId: "row-9" } }) }));
    expect(calls).toEqual([{ op: "delete", table: "laporan_harian", eq: [["id", "row-9"]] }]);
  });

  it("saves the day note, and removes it when cleared", async () => {
    await saveLaporan(input({ kegiatan: " Senam ", catatan: "Baik" }));
    expect(calls[0]).toMatchObject({ op: "upsert", table: "catatan_harian", payload: { kegiatan: "Senam", catatan: "Baik" }, opts: { onConflict: "student_id,tanggal" } });
    calls.length = 0;
    await saveLaporan(input({ hadCatatan: true }));
    expect(calls).toEqual([{ op: "delete", table: "catatan_harian", eq: [["student_id", "s1"], ["tanggal", "2026-11-10"]] }]);
  });

  it("turns a row-level-security rejection into a clear message", async () => {
    failOn = { table: "laporan_harian", code: "42501" };
    await expect(saveLaporan(input({ sections: sections({ hafalan_baru: hafalan }) }))).rejects.toThrow(/7 hari|halaqah/);
  });
});

describe("saveTargets", () => {
  const tgt = (p: Partial<TargetState>): TargetState => ({ ...emptyTarget(), ...p });
  it("upserts all drafted students in one call and clears the rest in one call", async () => {
    await saveTargets({
      teacherId: "t1", tanggal: "2026-11-11", jenis: "hafalan_baru",
      drafts: {
        a: tgt({ surahAwal: 72, ayatAwal: "14", ayatAkhir: "16" }),
        b: tgt({ surahAwal: 72, ayatAwal: "14", ayatAkhir: "16" }),
        c: null,
      },
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ op: "upsert", table: "target_harian", opts: { onConflict: "student_id,tanggal,jenis" } });
    expect((calls[0]!.payload as unknown[]).map((p) => (p as { student_id: string }).student_id)).toEqual(["a", "b"]);
    expect(calls[1]).toEqual({ op: "delete", table: "target_harian", eq: [["student_id[]", ["c"]], ["tanggal", "2026-11-11"], ["jenis", "hafalan_baru"]] });
  });
  it("does nothing when there is nothing to save", async () => {
    await saveTargets({ teacherId: "t1", tanggal: "2026-11-11", jenis: "sabiq", drafts: {} });
    expect(calls).toHaveLength(0);
  });
});
