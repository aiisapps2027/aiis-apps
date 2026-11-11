import { cn } from "@/lib/utils";
import { UI_LABEL, type TagihanUi } from "@/lib/spp";

const TONE: Record<TagihanUi, string> = {
  lunas: "bg-success-soft text-success",
  menunggu: "bg-warning-soft text-warning",
  ditolak: "bg-destructive/10 text-destructive",
  terlambat: "bg-destructive/10 text-destructive",
  belum: "bg-muted text-muted-foreground",
};

export function TagihanChip({ ui, className }: { ui: TagihanUi; className?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[ui], className)}>{UI_LABEL[ui]}</span>;
}
