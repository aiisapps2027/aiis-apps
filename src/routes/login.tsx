import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { User, Phone, IdCard, KeyRound, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MosqueSilhouette, Wave } from "@/components/aiis/decor";
import { supabase } from "@/integrations/supabase/client";
import { namesMatch, ortuEmail, ustadzEmail } from "@/lib/auth-utils";
import { getCurrentRole, homeFor } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — AIIS" },
      { name: "description", content: "Masuk ke aplikasi AIIS sebagai orang tua, ustadz atau admin sekolah." },
      { property: "og:title", content: "Masuk — AIIS" },
      { property: "og:description", content: "Login aplikasi resmi Akhyar International Islamic School." },
    ],
  }),
  component: LoginPage,
});

type Mode = "ortu" | "ustadz" | "admin";
const GENERIC = "Data tidak cocok. Hubungi pihak sekolah.";

function Field({ icon, ...props }: { icon: React.ReactNode } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <Input {...props} className="h-12 rounded-xl bg-card pl-11" />
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("ortu");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ nama: "", hp: "", nisn: "", kode: "", email: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "ortu") {
        const { error } = await supabase.auth.signInWithPassword({ email: ortuEmail(f.hp), password: f.nisn.trim() });
        if (error) throw new Error(GENERIC);
        const { data: s } = await supabase.from("students").select("nama").limit(1).maybeSingle();
        if (!s || !namesMatch(s.nama, f.nama)) {
          await supabase.auth.signOut();
          throw new Error(GENERIC);
        }
      } else if (mode === "ustadz") {
        const kode = f.kode.trim().toUpperCase();
        const { error } = await supabase.auth.signInWithPassword({ email: ustadzEmail(kode), password: kode });
        if (error) throw new Error(GENERIC);
        const { data: t } = await supabase.from("teachers").select("nama").limit(1).maybeSingle();
        const stripped = (n: string) => n.replace(/^(ust\.?|ustz\.?|ustzh\.?|ustadz|ustadzah)\s+/i, "");
        if (!t || !(namesMatch(t.nama, f.nama) || namesMatch(stripped(t.nama), stripped(f.nama)))) {
          await supabase.auth.signOut();
          throw new Error(GENERIC);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw new Error("Email atau kata sandi salah.");
      }
      const cur = await getCurrentRole();
      if (!cur?.role || cur.role !== mode) {
        await supabase.auth.signOut();
        throw new Error(GENERIC);
      }
      navigate({ to: homeFor(cur.role), replace: true });
    } catch (err: any) {
      toast.error(err.message ?? GENERIC);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "ortu" ? "Login Orang Tua" : mode === "ustadz" ? "Login Ustadz / Ustadzah" : "Login Admin";

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-card px-6 pb-40 pt-12">
      <div className="flex flex-col items-center text-center">
        <img src={logo} alt="Logo AIIS" className="h-24 w-24" />
        <h1 className="mt-3 text-3xl font-extrabold text-primary">AIIS</h1>
        <p className="text-sm font-semibold text-primary">Akhyar International Islamic School</p>
      </div>

      <form onSubmit={submit} className="relative z-10 mt-8 space-y-3">
        <h2 className="mb-1 text-lg font-bold text-foreground">{title}</h2>
        {mode === "ortu" && (
          <>
            <Field icon={<User className="h-4 w-4" />} placeholder="Nama Murid" value={f.nama} onChange={set("nama")} required autoComplete="off" />
            <Field icon={<Phone className="h-4 w-4" />} placeholder="No. HP (contoh 0812...)" inputMode="tel" value={f.hp} onChange={set("hp")} required />
            <Field icon={<IdCard className="h-4 w-4" />} placeholder="NISN Murid (9 digit)" inputMode="numeric" type="password" value={f.nisn} onChange={set("nisn")} required />
          </>
        )}
        {mode === "ustadz" && (
          <>
            <Field icon={<User className="h-4 w-4" />} placeholder="Nama Ustadz / Ustadzah" value={f.nama} onChange={set("nama")} required />
            <Field icon={<KeyRound className="h-4 w-4" />} placeholder="Kode Pengajar" value={f.kode} onChange={set("kode")} className="uppercase" required autoCapitalize="characters" />
          </>
        )}
        {mode === "admin" && (
          <>
            <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
            <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Kata sandi" value={f.password} onChange={set("password")} required />
          </>
        )}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base font-semibold">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Masuk
        </Button>

        <div className="flex justify-center gap-4 pt-2 text-xs font-medium text-brand">
          {mode !== "ortu" && <button type="button" onClick={() => setMode("ortu")}>Masuk sebagai Orang Tua</button>}
          {mode !== "ustadz" && <button type="button" onClick={() => setMode("ustadz")}>Masuk sebagai Ustadz</button>}
          {mode !== "admin" && <button type="button" onClick={() => setMode("admin")}>Masuk sebagai Admin</button>}
        </div>
        <p className="pt-2 text-center text-xs text-muted-foreground">Belum punya akun? Hubungi sekolah</p>
      </form>

      <MosqueSilhouette className="absolute bottom-14 left-0 w-full opacity-25" />
      <Wave className="absolute bottom-0 left-0 h-24 w-full" />
    </div>
  );
}
