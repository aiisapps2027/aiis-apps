import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setTeacherKode } from "@/lib/admin.functions";
import { isValidKode, normalizeKode } from "@/lib/auth-utils";

export const Route = createFileRoute("/ustadz/profil")({ component: ProfilUstadz });

function ProfilUstadz() {
  const qc = useQueryClient();
  const setKode = useServerFn(setTeacherKode);
  const [baru, setBaru] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: t } = useQuery({
    queryKey: ["my-teacher-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      return (await supabase.from("teachers").select("id, nama, no_hp, kode, jenis_kelamin").eq("user_id", u.user?.id ?? "").maybeSingle()).data;
    },
  });

  const simpan = async () => {
    if (!isValidKode(baru)) return void toast.error("Kode harus 6–12 huruf/angka (tanpa spasi)");
    if (!confirm("Ganti kode? Kode lama tidak bisa dipakai lagi untuk masuk.")) return;
    setBusy(true);
    try {
      const r = await setKode({ data: { kode: baru } });
      // the login email is derived from the code, so refresh the session under the new identity
      await supabase.auth.signInWithPassword({ email: `${r.kode.toLowerCase()}@ustadz.aiis.app`, password: r.kode });
      toast.success("Kode berhasil diganti");
      setBaru("");
      await qc.invalidateQueries({ queryKey: ["my-teacher-profile"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <ScreenHeader title="Profil" back={false} />
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-lg font-bold">{t?.nama ?? "…"}</p>
          <p className="text-xs text-muted-foreground">{t?.jenis_kelamin === "P" ? "Ustadzah" : "Ustadz"}{t?.no_hp ? ` • ${t.no_hp}` : ""}</p>
        </section>
        <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Kode Pengajar</p>
              <p className="font-mono text-lg font-bold tracking-widest text-primary">{t?.kode ?? "…"}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label="Salin kode" onClick={() => { if (t?.kode) { navigator.clipboard.writeText(t.kode); toast.success("Kode disalin"); } }}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Kode ini dipakai untuk masuk. Jangan dibagikan ke orang lain.</p>
          <Input placeholder="Kode baru (6–12 huruf/angka)" value={baru} maxLength={12} onChange={(e) => setBaru(normalizeKode(e.target.value))} className="h-11 rounded-xl font-mono tracking-widest" />
          <Button onClick={simpan} disabled={busy || !baru} className="h-11 w-full rounded-xl">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ganti Kode</Button>
        </section>
      </div>
    </div>
  );
}
