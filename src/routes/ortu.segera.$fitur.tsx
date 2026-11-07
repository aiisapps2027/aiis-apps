import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/aiis/ComingSoon";
import { featureLabel } from "@/components/aiis/features";

export const Route = createFileRoute("/ortu/segera/$fitur")({ component: SegeraHadir });

function SegeraHadir() {
  const { fitur } = Route.useParams();
  return <ComingSoon title={featureLabel(fitur)} />;
}
