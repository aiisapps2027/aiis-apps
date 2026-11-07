import { useEffect, useState } from "react";
import { Share, PlusSquare, Check, MoreVertical, Download } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const KEY = "aiis-install-dismissed-until";
let deferred: any = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

function platform() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Line/.test(ua);
  return { ios, safari };
}

/** Auto-shows after login unless installed or dismissed in the last 7 days. */
export function InstallPrompt({ open: forced, onOpenChange }: { open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const [auto, setAuto] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    if (forced !== undefined) return;
    if (isStandalone()) return;
    const until = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() > until) {
      const t = setTimeout(() => setAuto(true), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [forced]);
  useEffect(() => {
    const h = () => force((n) => n + 1);
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const open = forced ?? auto;
  const setOpen = (o: boolean) => (onOpenChange ? onOpenChange(o) : setAuto(o));
  const later = () => {
    localStorage.setItem(KEY, String(Date.now() + 7 * 24 * 3600 * 1000));
    setOpen(false);
  };
  const p = typeof window !== "undefined" ? platform() : { ios: false, safari: false };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        <SheetHeader className="items-center text-center">
          <img src={logo} alt="" className="h-14 w-14" />
          <SheetTitle>Pasang Aplikasi AIIS</SheetTitle>
          <SheetDescription>Akses lebih cepat langsung dari layar utama ponsel Ayah/Bunda.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-2">
          {isStandalone() ? (
            <p className="rounded-xl bg-success-soft p-3 text-center text-sm font-medium text-success">Aplikasi sudah terpasang.</p>
          ) : p.ios && !p.safari ? (
            <p className="rounded-xl bg-warning-soft p-3 text-sm text-foreground">
              Untuk memasang di iPhone/iPad, buka halaman ini di <b>Safari</b>, lalu ikuti langkahnya.
            </p>
          ) : p.ios ? (
            <ol className="space-y-2">
              <Step n={1} icon={<Share className="h-5 w-5" />} text="Ketuk ikon Bagikan di bawah layar" />
              <Step n={2} icon={<PlusSquare className="h-5 w-5" />} text="Pilih “Tambah ke Layar Utama”" />
              <Step n={3} icon={<Check className="h-5 w-5" />} text="Ketuk “Tambah” di pojok kanan atas" />
            </ol>
          ) : (
            <>
              {deferred && (
                <Button
                  className="h-12 w-full rounded-xl"
                  onClick={async () => {
                    await deferred.prompt();
                    deferred = null;
                    setOpen(false);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" /> Pasang Sekarang
                </Button>
              )}
              <ol className="space-y-2">
                <Step n={1} icon={<MoreVertical className="h-5 w-5" />} text="Ketuk menu ⋮ di pojok kanan atas browser" />
                <Step n={2} icon={<PlusSquare className="h-5 w-5" />} text="Pilih “Tambahkan ke layar utama”" />
              </ol>
            </>
          )}
          <Button variant="ghost" className="w-full" onClick={later}>Nanti saja</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted p-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
      <span className="text-primary">{icon}</span>
      <span className="text-sm">{text}</span>
    </li>
  );
}
