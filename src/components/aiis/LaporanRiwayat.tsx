import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { NilaiBadge } from "@/components/aiis/NilaiBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulanLabel, describeLaporan, formatTanggal, formatTanggalPendek, todayJakarta } from "@/lib/laporan";
import { JENIS_LABEL, type JenisLaporan, type Nilai } from "@/lib/nilai";
import { bintangQuery, catatanQuery, laporanQuery } from "@/lib/ortu-queries";

export type Kind = "tahfiz" | "murojaah" | "tahsin";

const KINDS: Record<Kind, { title: string; jenis: JenisLaporan[] }> = {
  tahfiz: { title: "Tahfiz Harian", jenis: ["hafalan_baru", "sabiq"] },
  murojaah: { title: "Murojaah Harian", jenis: ["murojaah"] },
  tahsin: { title: "Tahsin Harian", jenis: ["tahsin"] },
};

const ALL = "__all";

export function LaporanRiwayat({ kind }: { kind: Kind }) {
  const cfg = KINDS[kind];
  const { data, isLoading } = useQuery(laporanQuery);
  const { data: catatan } = useQuery(catatanQuery);
  const [jenis, setJenis] = useState<JenisLaporan>(cfg.jenis[0]!);
  const [bulan, setBulan] = useState(ALL);

  const rows = (data ?? []).filter((r) => r.jenis === jenis);
  const months = [...new Set(rows.map((r) => r.tanggal.slice(0, 7)))];
  const list = rows.filter((r) => bulan === ALL || r.tanggal.startsWith(bulan));
  const latest = rows[0];
  const note = latest ? catatan?.find((c) => c.tanggal === latest.tanggal) : undefined;
  const today = todayJakarta();

  return (
    <div>
      <ScreenHeader title={cfg.title} />
      <div className="space-y-4 p-4">
        {cfg.jenis.length > 1 && (
          <div className="flex gap-1 rounded-xl bg-card p-1">
            {cfg.jenis.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => { setJenis(j); setBulan(ALL); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${jenis === j ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {JENIS_LABEL[j]}
              </button>
            ))}
          </div>
        )}

        {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}

        {!isLoading && !latest && (
          <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Belum ada laporan {JENIS_LABEL[jenis]}.</p>
        )}

        {latest && (
          <section className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{latest.tanggal === today ? "Hari ini" : "Terbaru"} • {formatTanggal(latest.tanggal)}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="break-words text-lg font-bold">{describeLaporan(latest)}</p>
              <NilaiBadge nilai={latest.nilai as Nilai} className="text-sm" />
            </div>
            {latest.jumlah_salah != null && <p className="mt-1 text-xs text-muted-foreground">{latest.jumlah_salah} kesalahan</p>}
            {note?.catatan && (
              <div className="mt-3 rounded-xl bg-secondary p-3">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Catatan guru</p>
                <p className="mt-0.5 text-sm">{note.catatan}</p>
              </div>
            )}
          </section>
        )}

        {rows.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">Riwayat</h2>
              {months.length > 1 && (
                <Select value={bulan} onValueChange={setBulan}>
                  <SelectTrigger className="h-9 w-44 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua bulan</SelectItem>
                    {months.map((m) => <SelectItem key={m} value={m}>{bulanLabel(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <ul className="divide-y rounded-2xl bg-card shadow-soft">
              {list.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">{formatTanggalPendek(r.tanggal)}</span>
                  <span className="min-w-0 flex-1 break-words text-sm font-medium">{describeLaporan(r)}</span>
                  <NilaiBadge nilai={r.nilai as Nilai} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function BintangPage() {
  const { data, isLoading } = useQuery(bintangQuery);
  const total = (data ?? []).reduce((n, b) => n + b.jumlah, 0);
  return (
    <div>
      <ScreenHeader title="Bintang Ananda" />
      <div className="space-y-4 p-4">
        <section className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-soft">
          <Star className="h-14 w-14 fill-yellow-400 text-yellow-400" />
          <div>
            <p className="text-sm text-muted-foreground">Total Bintang</p>
            <p className="text-4xl font-extrabold text-primary">{isLoading ? "–" : total}</p>
          </div>
        </section>
        <p className="text-xs text-muted-foreground">Ananda mendapat 1 bintang setiap setoran bernilai L (lancar).</p>
        <section>
          <h2 className="mb-2 font-bold">Riwayat Bintang</h2>
          {data && data.length === 0 && <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Belum ada bintang.</p>}
          <ul className="divide-y rounded-2xl bg-card shadow-soft">
            {(data ?? []).map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <Star className="h-5 w-5 shrink-0 fill-yellow-400 text-yellow-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{b.keterangan}</p>
                  <p className="text-xs text-muted-foreground">{formatTanggal(b.tanggal)}</p>
                </div>
                <span className="font-bold text-success">+{b.jumlah}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
