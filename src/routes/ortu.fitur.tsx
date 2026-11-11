import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { FEATURE_GROUPS, type Feature } from "@/components/aiis/features";
import { useTileBadge } from "@/lib/badges";

export const Route = createFileRoute("/ortu/fitur")({ component: SemuaFitur });

function SemuaFitur() {
  return (
    <div>
      <ScreenHeader title="Semua Fitur" />
      <div className="space-y-5 p-4">
        {FEATURE_GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-2 text-sm font-bold text-primary">{g.title}</h2>
            <div className="divide-y rounded-2xl bg-card shadow-soft">
              {g.items.map((f) => (
                <FiturRow key={f.slug} f={f} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FiturRow({ f }: { f: Feature }) {
  const badge = useTileBadge(f.slug);
  return (
    <Link to={f.to ?? "/ortu/segera/$fitur"} params={{ fitur: f.slug }} className="flex items-center gap-3 px-4 py-3.5">
      <f.icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
      <span className="flex-1 text-sm font-medium">{f.label}</span>
      {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{badge}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
