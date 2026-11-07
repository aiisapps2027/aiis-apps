import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, type LucideIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { signOut } from "@/lib/session";
import { InstallPrompt } from "@/components/aiis/InstallPrompt";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

/** Teacher/admin shell: bottom nav on mobile, left sidebar on desktop (lg). */
export function StaffShell({ nav, area }: { nav: NavItem[]; area: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const logout = async () => {
    await signOut(qc);
    navigate({ to: "/login", replace: true });
  };
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src={logo} alt="" className="h-10 w-10 rounded-full bg-card" />
          <div>
            <p className="font-extrabold leading-tight text-sidebar-primary">AIIS</p>
            <p className="text-xs opacity-80">{area}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="h-5 w-5" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent">
          <LogOut className="h-5 w-5" /> Keluar
        </button>
      </aside>
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid border-t bg-card lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length + 1}, minmax(0, 1fr))` }}
      >
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.exact }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground">
          <LogOut className="h-5 w-5" /> Keluar
        </button>
      </nav>
      <InstallPrompt />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 bg-primary px-4 pb-5 pt-6 text-primary-foreground lg:bg-transparent lg:px-8 lg:pt-8 lg:text-foreground">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm opacity-80 lg:text-muted-foreground lg:opacity-100">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
