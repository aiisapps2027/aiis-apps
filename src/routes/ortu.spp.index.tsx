import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Wallet } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { TagihanChip } from "@/components/aiis/TagihanChip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/laporan";
import { pembayaranQuery, tagihanQuery } from "@/lib/ortu-queries";
import { formatRupiah, tagihanUi, type Pembayaran, type Tagihan } from "@/lib/spp";

export const Route = createFileRoute("/ortu/spp/")({ component: SppList });

function Row({ t, last }: { t: Tagihan; last: Pembayaran | undefined }) {
  const ui = tagihanUi(t, last);
  return (
    <li>
      <Link to="/ortu/spp/$id" params={{ id: t.id }} className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold">{t.judul}</p>
          <p className="text-xs text-muted-foreground">{ui === "lunas" && t.dibayar_at ? `Dibayar ${formatTanggal(t.dibayar_at.slice(0, 10))}` : `Jatuh tempo ${formatTanggal(t.jatuh_tempo)}`}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{formatRupiah(t.nominal)}</p>
          <TagihanChip ui={ui} className="mt-0.5" />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function SppList() {
  const { data: tagihan, isLoading } = useQuery(tagihanQuery);
  const { data: pembayaran } = useQuery(pembayaranQuery);
  const lastOf = (id: string) => pembayaran?.find((p) => p.tagihan_id === id);
  const belum = (tagihan ?? []).filter((t) => t.status === "belum_bayar").sort((a, b) => a.jatuh_tempo.localeCompare(b.jatuh_tempo));
  const menunggu = (tagihan ?? []).filter((t) => t.status === "menunggu");
  const lunas = (tagihan ?? []).filter((t) => t.status === "lunas");
  const total = belum.reduce((n, t) => n + t.nominal, 0);

  const Section = ({ title, items }: { title: string; items: Tagihan[] }) =>
    items.length ? (
      <section>
        <h2 className="mb-2 font-bold">{title}</h2>
        <ul className="divide-y rounded-2xl bg-card shadow-soft">{items.map((t) => <Row key={t.id} t={t} last={lastOf(t.id)} />)}</ul>
      </section>
    ) : null;

  return (
    <div>
      <ScreenHeader title="SPP & Tagihan" />
      <div className="space-y-4 p-4">
        {isLoading && <Skeleton className="h-28 w-full rounded-2xl" />}
        {tagihan && (
          <section className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-soft">
            <Wallet className="h-10 w-10 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total yang perlu dibayar</p>
              <p className="text-2xl font-extrabold text-primary">{formatRupiah(total)}</p>
              <p className="text-xs text-muted-foreground">{belum.length} tagihan</p>
            </div>
          </section>
        )}
        {tagihan && tagihan.length === 0 && <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Belum ada tagihan.</p>}
        <Section title="Perlu dibayar" items={belum} />
        <Section title="Menunggu konfirmasi" items={menunggu} />
        <Section title="Riwayat pembayaran" items={lunas} />
      </div>
    </div>
  );
}
