import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setupAdmin } from "@/lib/admin.functions";
import { ADMIN_EMAIL } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Buat Akun Admin — AIIS" },
      { name: "description", content: "Pengaturan awal akun admin sekolah AIIS." },
      { property: "og:title", content: "Buat Akun Admin — AIIS" },
      { property: "og:description", content: "Pengaturan awal akun admin sekolah AIIS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const run = useServerFn(setupAdmin);
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-card px-6">
      <img src={logo} alt="" className="mx-auto h-20 w-20" />
      <h1 className="mt-4 text-center text-xl font-bold text-primary">Buat Akun Admin</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Hanya bisa dilakukan sekali, untuk email {ADMIN_EMAIL}.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw !== pw2) { toast.error("Kata sandi tidak sama"); return; }
          setBusy(true);
          try {
            await run({ data: { email: ADMIN_EMAIL, password: pw } });
            await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pw });
            toast.success("Akun admin berhasil dibuat");
            navigate({ to: "/admin", replace: true });
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input value={ADMIN_EMAIL} disabled className="h-12 rounded-xl" />
        <Input type="password" placeholder="Kata sandi (min. 8 karakter)" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="h-12 rounded-xl" required />
        <Input type="password" placeholder="Ulangi kata sandi" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-12 rounded-xl" required />
        <Button disabled={busy} className="h-12 w-full rounded-xl">Buat Akun</Button>
        <p className="text-center text-xs"><Link to="/login" className="text-brand">Kembali ke halaman masuk</Link></p>
      </form>
    </div>
  );
}
