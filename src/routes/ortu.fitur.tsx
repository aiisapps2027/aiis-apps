import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { FEATURE_GROUPS } from "@/components/aiis/features";

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
                <Link key={f.slug} to="/ortu/segera/$fitur" params={{ fitur: f.slug }} className="flex items-center gap-3 px-4 py-3.5">
                  <f.icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
                  <span className="flex-1 text-sm font-medium">{f.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
