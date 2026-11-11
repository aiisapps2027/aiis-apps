import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayJakarta } from "@/lib/laporan";
import { pembayaranQuery, tagihanQuery } from "@/lib/ortu-queries";
import { ajukanPembayaran, prepareBukti, uploadBukti } from "@/lib/spp";

/** Parent submits proof of transfer: date, sender bank/name and a photo. The admin confirms afterwards. */
export function PembayaranForm({ tagihanId, studentId, defaultNama }: { tagihanId: string; studentId: string; defaultNama?: string }) {
  const qc = useQueryClient();
  const today = todayJakarta();
  const [tanggal, setTanggal] = useState(today);
  const [bank, setBank] = useState("");
  const [nama, setNama] = useState(defaultNama ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return void toast.error("Pilih foto bukti transfer");
    if (bank.trim().length < 2) return void toast.error("Isi bank pengirim");
    if (nama.trim().length < 2) return void toast.error("Isi nama pengirim");
    setBusy(true);
    try {
      const { blob, hash } = await prepareBukti(file);
      const path = await uploadBukti(studentId, blob);
      await ajukanPembayaran({ tagihanId, tanggal, bank: bank.trim(), nama: nama.trim(), path, hash });
      await Promise.all([qc.invalidateQueries({ queryKey: tagihanQuery.queryKey }), qc.invalidateQueries({ queryKey: pembayaranQuery.queryKey })]);
      toast.success("Bukti terkirim. Menunggu konfirmasi sekolah.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
      <h2 className="font-bold">Sudah transfer? Kirim bukti</h2>
      <div><Label htmlFor="tgl">Tanggal transfer</Label><Input id="tgl" type="date" max={today} value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 h-11 rounded-xl" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="bank">Bank pengirim</Label><Input id="bank" placeholder="mis. BCA" value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 h-11 rounded-xl" required /></div>
        <div><Label htmlFor="nama">Nama pengirim</Label><Input id="nama" placeholder="Nama di rekening" value={nama} onChange={(e) => setNama(e.target.value)} className="mt-1 h-11 rounded-xl" required /></div>
      </div>
      <div>
        <Label htmlFor="bukti">Foto bukti transfer</Label>
        <label htmlFor="bukti" className="mt-1 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
          {preview ? <img src={preview} alt="Pratinjau bukti transfer" className="max-h-56 rounded-lg object-contain" /> : (<><ImagePlus className="h-6 w-6" />Ketuk untuk memilih foto atau tangkapan layar</>)}
        </label>
        <input id="bukti" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} />
      </div>
      <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saya sudah bayar</Button>
      <p className="text-xs text-muted-foreground">Pastikan nominal dan tanggal terlihat jelas di bukti. Status menjadi Lunas setelah dikonfirmasi sekolah.</p>
    </form>
  );
}
