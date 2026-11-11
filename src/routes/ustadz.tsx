import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Home, History, Target, Volume2 } from "lucide-react";
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
  component: () => <StaffShell area="Ustadz / Ustadzah" nav={[
    { to: "/ustadz", label: "Halaqah", icon: Home, exact: true },
    { to: "/ustadz/setoran", label: "Setoran", icon: ClipboardList, exact: false },
    { to: "/ustadz/target", label: "Target", icon: Target, exact: false },
    { to: "/ustadz/tasmi", label: "Tasmi'", icon: Volume2, exact: false },
    { to: "/ustadz/riwayat", label: "Riwayat", icon: History, exact: false },
  ]} />,
});
