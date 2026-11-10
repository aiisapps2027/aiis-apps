import { createFileRoute } from "@tanstack/react-router";
import { LaporanRiwayat } from "@/components/aiis/LaporanRiwayat";

export const Route = createFileRoute("/ortu/murojaah")({ component: () => <LaporanRiwayat kind="murojaah" /> });
