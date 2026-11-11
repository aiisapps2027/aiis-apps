import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, GraduationCap, UserCog, Users, Megaphone, Wallet, ClipboardCheck } from "lucide-react";
import { countMenunggu, MENUNGGU_KEY } from "@/lib/spp";
import { countCalonBaru, MUNAQASYAH_PENDING_KEY } from "@/lib/tasmi";
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
  component: AdminLayout,
});

function AdminLayout() {
  const { data: menunggu } = useQuery({ queryKey: [...MENUNGGU_KEY], queryFn: countMenunggu, refetchInterval: 30_000 });
  const { data: calon } = useQuery({ queryKey: [...MUNAQASYAH_PENDING_KEY], queryFn: countCalonBaru, refetchInterval: 30_000 });
  return (
    <StaffShell
      area="Admin Sekolah"
      nav={[
        { to: "/admin", label: "Dasbor", icon: LayoutDashboard, exact: true },
        { to: "/admin/siswa", label: "Siswa", icon: GraduationCap },
        { to: "/admin/ustadz", label: "Ustadz", icon: UserCog },
        { to: "/admin/halaqah", label: "Halaqah", icon: Users },
        { to: "/admin/spp", label: "SPP", icon: Wallet, ...(menunggu ? { badge: menunggu } : {}) },
        { to: "/admin/munaqasyah", label: "Munaqasyah", icon: ClipboardCheck, ...(calon ? { badge: calon } : {}) },
        { to: "/admin/pengumuman", label: "Info", icon: Megaphone },
      ]}
    />
  );
}
