import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/aiis/ComingSoon";

export const Route = createFileRoute("/ortu/hafalan")({ component: () => <ComingSoon title="Hafalan" back={false} /> });
