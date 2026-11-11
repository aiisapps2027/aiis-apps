import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/aiis/decor";
import { PembayaranForm } from "@/components/aiis/PembayaranForm";
import { TagihanChip } from "@/components/aiis/TagihanChip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/laporan";
import { pembayaranQuery, rekeningQuery, tagihanQuery } from "@/lib/ortu-queries";
import { myStudentQuery } from "@/lib/queries";
import { formatRupiah, JENIS_TAGIHAN_LABEL, tagihanUi, useBuktiUrl } from "@/lib/spp";

export const Route = createFileRoute("/ortu/spp/$id")({ component: SppDetail });

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="break-words text-right text-sm font-medium">{children}</span>
    </div>
  );
}

const copy = (text: string, label: string) => navigator.clipboard?.writeText(text).then(() => toast.success(`${label} disalin`), () => toast.error("Gagal menyalin"));

function SppDetail() {
  const { id } = Route.useParams();
  const { data: tagihan, isLoading } = useQuery(tagihanQuery);
  const { data: pembayaran } = useQuery(pembayaranQuery);
  const { data: rekening } = useQuery(rekeningQuery);
  const { data: student } = useQuery(myStudentQuery);
  const t = tagihan?.find((x) => x.id === id);
  const mine = (pembayaran ?? []).filter((p) => p.tagihan_id === id);
  const last = mine[0];
  const acc = rekening?.find((r) => r.jenjang === student?.jenjang);
  const buktiUrl = useBuktiUrl(last?.bukti_path);

  return (
    <div>
      <ScreenHeader title="Detail Tagihan" />
      <div className="space-y-4 p-4 pb-10">
        {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
        {tagihan && !t && <p className="text-sm text-muted-foreground">Tagihan tidak ditemukan.</p>}
        {t && (
          <>
            <section className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{JENIS_TAGIHAN_LABEL[t.jenis] ?? t.jenis}</p>
                  <h1 className="break-words text-lg font-bold">{t.judul}</h1>
                </div>
                <TagihanChip ui={tagihanUi(t, last)} />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-primary">{formatRupiah(t.nominal)}</p>
              <Line label="Jatuh tempo">{formatTanggal(t.jatuh_tempo)}</Line>
              {t.status === "lunas" && t.dibayar_at && <Line label="Dibayar">{formatTanggal(t.dibayar_at.slice(0, 10))}</Line>}
            </section>

            {t.status === "belum_bayar" && last?.status === "ditolak" && (
              <section className="rounded-2xl bg-destructive/10 p-4 text-sm">
                <p className="font-bold text-destructive">Pembayaran sebelumnya ditolak</p>
                <p className="mt-1">{last.alasan_tolak}</p>
                <p className="mt-1 text-xs text-muted-foreground">Silakan periksa lalu kirim bukti yang benar di bawah.</p>
              </section>
            )}

            {t.status === "menunggu" && last && (
              <section className="rounded-2xl bg-warning-soft p-4 text-sm">
                <p className="font-bold text-warning">Menunggu konfirmasi sekolah</p>
                <p className="mt-1">Bukti transfer {formatTanggal(last.tanggal_transfer)} dari {last.nama_pengirim} ({last.bank_pengirim}) sudah terkirim.</p>
                {buktiUrl && <img src={buktiUrl} alt="Bukti transfer" className="mt-3 max-h-64 rounded-lg object-contain" />}
              </section>
            )}

            {t.status !== "lunas" && (
              <section className="rounded-2xl bg-card p-4 shadow-soft">
                <h2 className="mb-1 font-bold">Transfer ke rekening</h2>
                {acc ? (
                  <>
                    <Line label="Bank">{acc.bank}</Line>
                    <Line label="Atas nama">{acc.atas_nama}</Line>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm text-muted-foreground">No. rekening</p>
                        <p className="font-mono text-xl font-bold tracking-wide text-primary">{acc.nomor}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => copy(acc.nomor, "Nomor rekening")}><Copy className="mr-1 h-4 w-4" /> Salin</Button>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => copy(String(t.nominal), "Nominal")}>Salin nominal ({formatRupiah(t.nominal)})</Button>
                  </>
                ) : <p className="text-sm text-muted-foreground">Data rekening belum tersedia. Hubungi sekolah.</p>}
              </section>
            )}

            {t.status === "belum_bayar" && student && <PembayaranForm tagihanId={t.id} studentId={student.id} defaultNama={student.nama_wali ?? ""} />}

            {mine.length > 0 && (
              <section>
                <h2 className="mb-2 font-bold">Riwayat pengiriman bukti</h2>
                <ul className="divide-y rounded-2xl bg-card shadow-soft">
                  {mine.map((p) => (
                    <li key={p.id} className="px-4 py-3 text-sm">
                      <div className="flex justify-between gap-3"><span className="font-medium">{formatTanggal(p.tanggal_transfer)}</span><span className={p.status === "dikonfirmasi" ? "font-semibold text-success" : p.status === "ditolak" ? "font-semibold text-destructive" : "font-semibold text-warning"}>{p.status === "dikonfirmasi" ? "Dikonfirmasi" : p.status === "ditolak" ? "Ditolak" : "Menunggu"}</span></div>
                      <p className="text-xs text-muted-foreground">{p.nama_pengirim} • {p.bank_pengirim}</p>
                      {p.alasan_tolak && <p className="mt-1 text-xs text-destructive">{p.alasan_tolak}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
