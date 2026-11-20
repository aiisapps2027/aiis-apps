import { describe, expect, it } from "vitest";
import { hariJakarta, jam, pengingatEskul, rentangJam, sortJadwal, type EskulRow } from "@/lib/eskul";

const J = (id: string, hari: number, a: string, b: string) => ({ id, hari, jam_mulai: a, jam_selesai: b, tempat: null });
const eskul: EskulRow[] = [
  { id: "1", nama: "Panahan", pengajar: "Pak Budi", deskripsi: null, aktif: true, eskul_jadwal: [J("a", 3, "15:30:00", "16:30:00")] },
  { id: "2", nama: "Futsal", pengajar: null, deskripsi: null, aktif: true, eskul_jadwal: [J("b", 4, "14:00:00", "15:00:00"), J("c", 3, "13:00:00", "14:00:00")] },
  { id: "3", nama: "Lama", pengajar: null, deskripsi: null, aktif: false, eskul_jadwal: [J("d", 3, "10:00:00", "11:00:00")] },
];

describe("eskul", () => {
  it("formats times", () => {
    expect(jam("15:30:00")).toBe("15.30");
    expect(rentangJam({ jam_mulai: "15:30:00", jam_selesai: "16:30:00" })).toBe("15.30–16.30");
  });
  it("finds the weekday in Asia/Jakarta (UTC evening is already the next day)", () => {
    expect(hariJakarta(new Date("2026-11-18T05:00:00Z"))).toBe(3); // Wednesday
    expect(hariJakarta(new Date("2026-11-18T18:00:00Z"))).toBe(4); // already Thursday 01.00 WIB
    expect(hariJakarta(new Date("2026-11-22T05:00:00Z"))).toBe(7); // Sunday
  });
  it("lists today's and tomorrow's sessions, ignoring inactive eskul", () => {
    const r = pengingatEskul(eskul, new Date("2026-11-18T05:00:00Z")); // Wednesday
    expect(r.map((x) => `${x.nama}:${x.kapan}:${x.jadwal.jam_mulai}`)).toEqual(["Futsal:hari ini:13:00:00", "Panahan:hari ini:15:30:00", "Futsal:besok:14:00:00"]);
  });
  it("wraps Sunday to Monday for tomorrow", () => {
    const e: EskulRow[] = [{ ...eskul[0]!, eskul_jadwal: [J("x", 1, "08:00:00", "09:00:00")] }];
    expect(pengingatEskul(e, new Date("2026-11-22T05:00:00Z"))[0]?.kapan).toBe("besok");
  });
  it("sorts a schedule by day then time", () => {
    expect(sortJadwal(eskul[1]!.eskul_jadwal).map((x) => x.id)).toEqual(["c", "b"]);
  });
});
