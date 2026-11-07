import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { requireRole } from "@/lib/session";
import { StaffShell } from "@/components/aiis/StaffShell";

export const Route = createFileRoute("/ustadz")({
  ssr: false,
  beforeLoad: () => requireRole("ustadz"),
  head: () => ({
    meta: [
      { title: "Ustadz — AIIS" },
      { name: "description", content: "Halaqah dan daftar siswa untuk ustadz/ustadzah AIIS." },
      { property: "og:title", content: "Ustadz — AIIS" },
      { property: "og:description", content: "Halaqah dan daftar siswa untuk ustadz/ustadzah AIIS." },
    ],
  }),
  component: () => <StaffShell area="Ustadz / Ustadzah" nav={[{ to: "/ustadz", label: "Halaqah", icon: Home, exact: false }]} />,
});
