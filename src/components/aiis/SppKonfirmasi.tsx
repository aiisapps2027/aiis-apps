import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatTanggal } from "@/lib/laporan";
import { adaKembar, formatRupiah, JENIS_TAGIHAN_LABEL, MENUNGGU_KEY, useBuktiUrl } from "@/lib/spp";

function Bukti({ path, onOpen }: { path: string | null; onOpen: (url: string) => void }) {
  const url = useBuktiUrl(path);
  if (!path) return <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted p-1 text-center text-[10px] text-muted-foreground">Bukti sudah dihapus</div>;
  if (!url) return <div className="h-24 w-24 animate-pulse rounded-lg bg-muted" />;
  return (
    <button type="button" onClick={() => onOpen(url)} aria-label="Perbesar bukti transfer" className="shrink-0">
      <img src={url} alt="Bukti transfer" className="h-24 w-24 rounded-lg border object-cover" />
    </button>
  );
}

export function SppKonfirmasi() {
  const qc = useQueryClient();
  const [zoom, setZoom] = useState<string | null>(null);
  const [tolak, setTolak] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-spp-menunggu-list"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembayaran")
        .select("*, tagihan(judul, jenis, jatuh_tempo), students(nama, kelas, jenjang)")
        .eq("status", "menunggu")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: recent } = useQuery({
    queryKey: ["admin-spp-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("pembayaran").select("id, nominal, tanggal_transfer, status").in("status", ["menunggu", "dikonfirmasi"]).order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-spp-menunggu-list"] }), qc.invalidateQueries({ queryKey: [...MENUNGGU_KEY] }), qc.invalidateQueries({ queryKey: ["admin-tagihan"] })]);

  async function putuskan(id: string, setuju: boolean, alasanTolak?: string) {
    setBusy(id);
    const { error } = await supabase.rpc("putuskan_pembayaran", { _id: id, _setuju: setuju, ...(alasanTolak ? { _alasan: alasanTolak } : {}) });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(setuju ? "Pembayaran dikonfirmasi: Lunas" : "Pembayaran ditolak");
    setTolak(null);
    setAlasan("");
    await refresh();
  }

  return (
    <div className="space-y-3">
      {isLoading && <Skeleton className="h-28 w-full rounded-2xl" />}
      {data && data.length === 0 && <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">Tidak ada pembayaran yang menunggu konfirmasi.</p>}
      {data?.map((p) => {
        const kembar = adaKembar(p, recent ?? []);
        return (
          <article key={p.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex gap-3">
              <Bukti path={p.bukti_path} onOpen={setZoom} />
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{p.students.nama} <span className="text-xs font-normal text-muted-foreground">{p.students.jenjang} • {p.students.kelas ?? "-"}</span></p>
                <p className="break-words text-sm">{p.tagihan.judul} <span className="text-xs text-muted-foreground">({JENIS_TAGIHAN_LABEL[p.tagihan.jenis] ?? p.tagihan.jenis})</span></p>
                <p className="mt-1 text-xl font-extrabold text-primary">{formatRupiah(p.nominal)}</p>
                <p className="text-xs text-muted-foreground">Transfer {formatTanggal(p.tanggal_transfer)}</p>
                <p className="text-xs text-muted-foreground">Dari {p.nama_pengirim} • {p.bank_pengirim}</p>
              </div>
            </div>
            {kembar && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft p-2.5 text-xs text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Ada pembayaran lain dengan nominal dan tanggal transfer yang sama. Cocokkan nama pengirim di mutasi rekening.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Cocokkan nominal, tanggal, dan nama pengirim dengan mutasi rekening sekolah sebelum mengonfirmasi.</p>
            <div className="mt-3 flex gap-2">
              <Button className="h-11 flex-1 rounded-xl" disabled={busy === p.id} onClick={() => putuskan(p.id, true)}>{busy === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Konfirmasi</Button>
              <Button variant="outline" className="h-11 flex-1 rounded-xl text-destructive" disabled={busy === p.id} onClick={() => { setTolak(p.id); setAlasan(""); }}><X className="mr-2 h-4 w-4" />Tolak</Button>
            </div>
          </article>
        );
      })}

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-auto p-2">
          <DialogHeader className="sr-only"><DialogTitle>Bukti transfer</DialogTitle></DialogHeader>
          {zoom && <img src={zoom} alt="Bukti transfer" className="mx-auto max-h-[85vh] object-contain" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tolak} onOpenChange={(o) => !o && setTolak(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tolak pembayaran</DialogTitle></DialogHeader>
          <Textarea rows={3} placeholder="Alasan (akan terlihat oleh orang tua), mis. nominal tidak sesuai" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          <DialogFooter><Button variant="destructive" disabled={alasan.trim().length < 3 || busy === tolak} onClick={() => tolak && putuskan(tolak, false, alasan.trim())}>Tolak pembayaran</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
