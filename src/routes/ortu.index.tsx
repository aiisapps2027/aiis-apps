import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, LayoutGrid, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, IconTile } from "@/components/aiis/decor";
import { DASHBOARD_FEATURES } from "@/components/aiis/features";
import { announcementsQuery, formatDate, myStudentQuery } from "@/lib/queries";
import { signOut } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/ortu/")({ component: Dashboard });

function Dashboard() {
  const { data: s, isLoading } = useQuery(myStudentQuery);
  const { data: ann } = useQuery({ ...announcementsQuery(s?.jenjang), enabled: !!s });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const h = s?.halaqah as any;

  return (
    <div>
      <div className="relative rounded-b-[2.5rem] bg-hero px-5 pb-20 pt-8 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-90">Assalamu'alaikum,</p>
            <h1 className="text-2xl font-bold">Ayah/Bunda</h1>
            <p className="mt-1 max-w-[16rem] text-xs opacity-80">Semoga hari ini penuh keberkahan untuk ananda kita.</p>
          </div>
          <button
            aria-label="Keluar"
            className="rounded-full bg-primary-foreground/15 p-2"
            onClick={async () => {
              await signOut(qc);
              navigate({ to: "/login", replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="-mt-14 px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
          {isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : s ? (
            <>
              <Avatar name={s.nama} url={s.foto_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-foreground">{s.nama}</p>
                <p className="text-xs text-muted-foreground">Kelas {s.kelas ?? "-"} • {s.jenjang}</p>
                <p className="truncate text-xs text-muted-foreground">{h?.nama ?? "Belum ada halaqah"}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Data siswa tidak ditemukan.</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-y-5 rounded-2xl bg-card p-4 shadow-soft">
          {DASHBOARD_FEATURES.map((f) => (
            <Link
              key={f.slug}
              to={f.to ?? "/ortu/segera/$fitur"}
              params={{ fitur: f.slug }}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <IconTile><f.icon className="h-5 w-5" strokeWidth={1.8} /></IconTile>
              <span className="text-xs font-medium text-foreground">{f.label}</span>
            </Link>
          ))}
          <Link to="/ortu/fitur" className="flex flex-col items-center gap-1.5 text-center">
            <IconTile className="bg-primary text-primary-foreground"><LayoutGrid className="h-5 w-5" /></IconTile>
            <span className="text-xs font-medium text-foreground">Semua</span>
          </Link>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 font-bold text-foreground">Pengumuman Terbaru</h2>
          <div className="space-y-3">
            {(ann ?? []).slice(0, 3).map((a) => (
              <article key={a.id} className="flex gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <IconTile className="h-10 w-10 shrink-0"><Megaphone className="h-4 w-4" /></IconTile>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{a.judul}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{a.isi}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(a.created_at)}</p>
                </div>
              </article>
            ))}
            {ann && ann.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengumuman.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
