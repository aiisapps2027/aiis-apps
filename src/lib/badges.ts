import { useQuery } from "@tanstack/react-query";
import { useSppPerlu } from "@/lib/ortu-queries";
import { eskulSayaQuery, pengingatEskul } from "@/lib/eskul";
import { countMunaqasyahBaru, munaqasyahPesertaQuery } from "@/lib/tasmi";

/** Red bubble count for a parent home tile (0 = no bubble). */
export function useTileBadge(slug: string): number {
  const spp = useSppPerlu();
  const { data } = useQuery({ ...munaqasyahPesertaQuery, enabled: slug === "munaqasyah" });
  const { data: eskul } = useQuery({ ...eskulSayaQuery, enabled: slug === "eskul" });
  if (slug === "spp") return spp;
  if (slug === "eskul") return eskul ? pengingatEskul(eskul).length : 0;
  if (slug === "munaqasyah") return data ? countMunaqasyahBaru(data) : 0;
  return 0;
}
