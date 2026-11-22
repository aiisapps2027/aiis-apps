import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Home, History, Target, Trophy, Volume2, ClipboardCheck, PenLine, User } from "lucide-react";
import { requireRole } from "@/lib/session";
import { StaffShell } from "@/components/aiis/StaffShell";

const PENILAIAN = { nama: "Penilaian", icon: ClipboardCheck };

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
    { to: "/ustadz/target", label: "Target", icon: Target, exact: false, grup: PENILAIAN },
    { to: "/ustadz/tasmi", label: "Tasmi'", icon: Volume2, exact: false, grup: PENILAIAN },
    { to: "/ustadz/tashih", label: "Tashih", icon: PenLine, exact: false, grup: PENILAIAN },
    { to: "/ustadz/eskul", label: "Eskul", icon: Trophy, exact: false },
    { to: "/ustadz/profil", label: "Profil", icon: User, exact: false },
    { to: "/ustadz/riwayat", label: "Riwayat", icon: History, exact: false, grup: PENILAIAN },
  ]} />,
});
