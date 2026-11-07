import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Home, BookMarked, Bell, User } from "lucide-react";
import { requireRole } from "@/lib/session";
import { InstallPrompt } from "@/components/aiis/InstallPrompt";

export const Route = createFileRoute("/ortu")({
  ssr: false,
  beforeLoad: () => requireRole("ortu"),
  head: () => ({
    meta: [
      { title: "Beranda Orang Tua — AIIS" },
      { name: "description", content: "Pantau hafalan dan perkembangan ananda." },
      { property: "og:title", content: "Beranda Orang Tua — AIIS" },
      { property: "og:description", content: "Pantau hafalan dan perkembangan ananda." },
    ],
  }),
  component: OrtuLayout,
});

const NAV = [
  { to: "/ortu", label: "Beranda", icon: Home, exact: true },
  { to: "/ortu/hafalan", label: "Hafalan", icon: BookMarked },
  { to: "/ortu/notifikasi", label: "Notifikasi", icon: Bell },
  { to: "/ortu/profil", label: "Profil", icon: User },
] as const;

function OrtuLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-20 shadow-soft">
      <Outlet />
      <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t bg-card">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: "exact" in n }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
      <InstallPrompt />
    </div>
  );
}
