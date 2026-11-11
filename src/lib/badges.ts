import { useQuery } from "@tanstack/react-query";
import { useSppPerlu } from "@/lib/ortu-queries";
import { countMunaqasyahBaru, munaqasyahPesertaQuery } from "@/lib/tasmi";

/** Red bubble count for a parent home tile (0 = no bubble). */
export function useTileBadge(slug: string): number {
  const spp = useSppPerlu();
  const { data } = useQuery({ ...munaqasyahPesertaQuery, enabled: slug === "munaqasyah" });
  if (slug === "spp") return spp;
  if (slug === "munaqasyah") return data ? countMunaqasyahBaru(data) : 0;
  return 0;
}
