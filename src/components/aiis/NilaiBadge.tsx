import { cn } from "@/lib/utils";
import { NILAI_LABEL, type Nilai } from "@/lib/nilai";

const TONE: Record<Nilai, { soft: string; solid: string }> = {
  L: { soft: "bg-success-soft text-success", solid: "bg-success text-white border-success" },
  "L-": { soft: "bg-warning-soft text-warning", solid: "bg-warning text-white border-warning" },
  TL: { soft: "bg-destructive/10 text-destructive", solid: "bg-destructive text-white border-destructive" },
};

export function NilaiBadge({ nilai, className }: { nilai: Nilai; className?: string }) {
  return (
    <span title={NILAI_LABEL[nilai]} className={cn("inline-flex min-w-8 justify-center rounded-full px-2.5 py-0.5 text-xs font-bold", TONE[nilai].soft, className)}>
      {nilai}
    </span>
  );
}

/** Three large tap targets: L / L- / TL. Tapping the selected one again clears it. */
export function NilaiPicker({ value, onChange }: { value: Nilai | null; onChange: (v: Nilai | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Nilai" className="grid grid-cols-3 gap-2">
      {(["L", "L-", "TL"] as const).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : n)}
            className={cn(
              "flex h-14 flex-col items-center justify-center rounded-xl border-2 text-lg font-extrabold transition-colors",
              active ? TONE[n].solid : "border-border bg-card text-muted-foreground",
            )}
          >
            {n}
            <span className="text-[10px] font-medium opacity-90">{NILAI_LABEL[n]}</span>
          </button>
        );
      })}
    </div>
  );
}
