import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "./ortu.segera.$fitur";

export const Route = createFileRoute("/ortu/hafalan")({ component: () => <ComingSoon title="Hafalan" back={false} /> });
