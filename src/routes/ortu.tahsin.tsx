import { createFileRoute } from "@tanstack/react-router";
import { LaporanRiwayat } from "@/components/aiis/LaporanRiwayat";

export const Route = createFileRoute("/ortu/tahsin")({ component: () => <LaporanRiwayat kind="tahsin" /> });
