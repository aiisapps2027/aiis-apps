import { createFileRoute } from "@tanstack/react-router";
import { QuranReader } from "@/components/aiis/QuranReader";
import { ComingSoon } from "@/components/aiis/ComingSoon";

export const Route = createFileRoute("/ortu/quran/$no")({
  validateSearch: (s: Record<string, unknown>): { ayat?: number } => {
    const n = Number(s["ayat"]);
    return Number.isInteger(n) && n >= 1 ? { ayat: n } : {};
  },
  component: Reader,
});

function Reader() {
  const { no } = Route.useParams();
  const { ayat } = Route.useSearch();
  const n = Number(no);
  if (!Number.isInteger(n) || n < 1 || n > 114) return <ComingSoon title="Surah tidak ditemukan" />;
  return <QuranReader key={n} no={n} startAyat={ayat ?? null} />;
}
