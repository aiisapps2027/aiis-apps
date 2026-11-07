import { createFileRoute } from "@tanstack/react-router";
import { BellOff } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";

export const Route = createFileRoute("/ortu/notifikasi")({ component: Notifikasi });

function Notifikasi() {
  return (
    <div>
      <ScreenHeader title="Notifikasi" back={false} />
      <div className="flex flex-col items-center px-8 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary text-primary">
          <BellOff className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-foreground">Belum ada notifikasi</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pemberitahuan laporan hafalan dan informasi sekolah akan muncul di sini.</p>
      </div>
    </div>
  );
}
