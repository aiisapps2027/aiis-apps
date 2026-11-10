import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Right-side sheet for read-only detail views (full width on phones). */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="bg-primary p-5 text-left text-primary-foreground">
          <SheetTitle className="break-words pr-6 text-lg text-primary-foreground">{title}</SheetTitle>
          {description && <SheetDescription className="text-primary-foreground/80">{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 space-y-4 p-5">{children}</div>
        {footer && <div className="flex flex-wrap gap-2 border-t bg-card p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="break-words text-right text-sm font-medium">{children ?? "-"}</span>
    </div>
  );
}
