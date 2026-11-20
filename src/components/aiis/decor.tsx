import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAvatarUrl } from "@/lib/avatar";

export function Wave({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 60 C 100 10, 220 110, 400 40 V120 H0z" className="fill-brand-soft/60" />
      <path d="M0 85 C 120 40, 260 120, 400 70 V120 H0z" className="fill-brand" />
      <path d="M0 105 C 140 75, 260 125, 400 95 V120 H0z" className="fill-primary" />
    </svg>
  );
}

export function ScreenHeader({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-primary px-4 py-4 text-primary-foreground">
      {back && (
        <button aria-label="Kembali" onClick={() => router.history.back()} className="-ml-1 rounded-full p-1 hover:bg-primary-foreground/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {right}
    </header>
  );
}

export function StatusChip({ status }: { status: "selesai" | "lunas" | "menunggu" | "belum" | "aktif" | "nonaktif" }) {
  const map = {
    selesai: ["Selesai", "bg-success-soft text-success"],
    lunas: ["Lunas", "bg-success-soft text-success"],
    aktif: ["Aktif", "bg-success-soft text-success"],
    menunggu: ["Menunggu", "bg-warning-soft text-warning"],
    belum: ["Belum Mulai", "bg-muted text-muted-foreground"],
    nonaktif: ["Nonaktif", "bg-muted text-muted-foreground"],
  } as const;
  const [label, cls] = map[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{label}</span>;
}

export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary", className)}>
      {children}
    </div>
  );
}

export function Avatar({ name, url, size = 56 }: { name: string; url?: string | null | undefined; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const src = useAvatarUrl(url);
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-card" />
  ) : (
    <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-secondary font-bold text-primary ring-2 ring-card">
      {initials}
    </div>
  );
}
