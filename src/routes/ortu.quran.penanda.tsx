import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/queries";
import { penandaQuery } from "@/lib/ortu-queries";
import { getSurah } from "@/lib/quran";

export const Route = createFileRoute("/ortu/quran/penanda")({ component: Penanda });

function Penanda() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(penandaQuery);

  const remove = async (id: string) => {
    const { error } = await supabase.from("penanda_quran").delete().eq("id", id);
    if (error) return void toast.error("Gagal menghapus penanda");
    await qc.invalidateQueries({ queryKey: penandaQuery.queryKey });
    toast.success("Penanda dihapus");
  };

  return (
    <div>
      <ScreenHeader title="Penanda Ayat" />
      <div className="space-y-3 p-4">
        {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
        {data && data.length === 0 && (
          <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Belum ada penanda. Ketuk ikon penanda di samping ayat saat membaca.</p>
        )}
        <ul className="divide-y rounded-2xl bg-card shadow-soft">
          {data?.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <BookmarkCheck className="h-5 w-5 shrink-0 fill-primary text-primary" />
              <Link to="/ortu/quran/$no" params={{ no: String(p.surah) }} search={{ ayat: p.ayat }} className="min-w-0 flex-1">
                <p className="font-semibold">{getSurah(p.surah)?.latin ?? `Surah ${p.surah}`} : {p.ayat}</p>
                <p className="text-xs text-muted-foreground">Ditandai {formatDate(p.created_at)}</p>
              </Link>
              <Button type="button" size="icon" variant="ghost" aria-label="Hapus penanda" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
