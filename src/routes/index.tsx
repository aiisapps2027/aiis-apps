import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import logo from "@/assets/logo.png";
import { MosqueSilhouette, Wave } from "@/components/aiis/decor";
import { getCurrentRole, homeFor } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIIS — Aplikasi Resmi Akhyar International Islamic School" },
      { name: "description", content: "Tahfiz • Tahsin • Akademik • Keuangan. Aplikasi resmi sekolah AIIS untuk orang tua dan ustadz." },
      { property: "og:title", content: "AIIS — Aplikasi Resmi Sekolah" },
      { property: "og:description", content: "Tahfiz • Tahsin • Akademik • Keuangan dalam satu aplikasi." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(async () => {
      const cur = await getCurrentRole();
      navigate({ to: cur?.role ? homeFor(cur.role) : "/login", replace: true });
    }, 1600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center overflow-hidden bg-card px-8 text-center">
      <img src={logo} alt="Logo AIIS" className="h-36 w-36 animate-in fade-in zoom-in-90 duration-700" />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-primary">AIIS</h1>
      <p className="mt-1 font-semibold text-primary">Akhyar International Islamic School</p>
      <p className="mt-6 text-sm font-medium text-foreground">Aplikasi Resmi Sekolah</p>
      <p className="mt-2 text-xs text-muted-foreground">Tahfiz • Tahsin • Akademik • Keuangan</p>
      <MosqueSilhouette className="absolute bottom-16 left-0 w-full opacity-30" />
      <Wave className="absolute bottom-0 left-0 h-28 w-full" />
    </div>
  );
}
