import { createFileRoute } from "@tanstack/react-router";
import { LaporanRiwayat } from "@/components/aiis/LaporanRiwayat";

export const Route = createFileRoute("/ortu/tahfiz")({ component: () => <LaporanRiwayat kind="tahfiz" /> });
