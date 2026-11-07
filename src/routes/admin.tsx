import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, UserCog, Users, Megaphone } from "lucide-react";
import { requireRole } from "@/lib/session";
import { StaffShell } from "@/components/aiis/StaffShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Admin Sekolah — AIIS" },
      { name: "description", content: "Kelola siswa, ustadz, halaqah dan pengumuman AIIS." },
      { property: "og:title", content: "Admin Sekolah — AIIS" },
      { property: "og:description", content: "Kelola siswa, ustadz, halaqah dan pengumuman AIIS." },
    ],
  }),
  component: () => (
    <StaffShell
      area="Admin Sekolah"
      nav={[
        { to: "/admin", label: "Dasbor", icon: LayoutDashboard, exact: true },
        { to: "/admin/siswa", label: "Siswa", icon: GraduationCap },
        { to: "/admin/ustadz", label: "Ustadz", icon: UserCog },
        { to: "/admin/halaqah", label: "Halaqah", icon: Users },
        { to: "/admin/pengumuman", label: "Info", icon: Megaphone },
      ]}
    />
  ),
});
