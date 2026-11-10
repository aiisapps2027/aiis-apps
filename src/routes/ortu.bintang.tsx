import { createFileRoute } from "@tanstack/react-router";
import { BintangPage } from "@/components/aiis/LaporanRiwayat";

export const Route = createFileRoute("/ortu/bintang")({ component: BintangPage });
