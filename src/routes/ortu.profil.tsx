import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserCheck, Target, GraduationCap, Download, LogOut, ChevronRight, School } from "lucide-react";
import { ScreenHeader } from "@/components/aiis/decor";
import { AvatarUploader } from "@/components/aiis/AvatarUploader";
import { supabase } from "@/integrations/supabase/client";
import { InstallPrompt } from "@/components/aiis/InstallPrompt";
import { Progress } from "@/components/ui/progress";
import { myStudentQuery } from "@/lib/queries";
import { signOut } from "@/lib/session";

export const Route = createFileRoute("/ortu/profil")({ component: Profil });

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Profil() {
  const { data: s } = useQuery(myStudentQuery);
  const [install, setInstall] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const h = s?.halaqah as any;

  return (
    <div>
      <ScreenHeader title="Profil Siswa" back={false} />
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft">
          {s ? (
            <AvatarUploader
              name={s.nama}
              path={s.foto_url}
              owner={{ kind: "students", id: s.id }}
              onUploaded={async (path) => {
                const { error } = await supabase.rpc("set_my_student_photo", { _path: path });
                if (error) throw error;
                await qc.invalidateQueries({ queryKey: ["my-student"] });
                await qc.invalidateQueries({ queryKey: ["avatar-url"] });
              }}
            />
          ) : (
            <div className="h-[68px] w-[68px] rounded-full bg-secondary" />
          )}
          <div>
            <p className="text-lg font-bold">{s?.nama}</p>
            <p className="text-sm text-muted-foreground">Kelas {s?.kelas ?? "-"}</p>
          </div>
        </div>
        <div className="divide-y rounded-2xl bg-card shadow-soft">
          <Row icon={<School className="h-5 w-5" />} label="Jenjang" value={s?.jenjang ?? "-"} />
          <Row icon={<GraduationCap className="h-5 w-5" />} label="Halaqah" value={h?.nama ?? "-"} />
          <Row icon={<UserCheck className="h-5 w-5" />} label="Guru Pembimbing" value={h?.teachers?.nama ?? "-"} />
          <Row icon={<Target className="h-5 w-5" />} label="Target Hafalan" value={s?.target_hafalan ?? "-"} />
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">Progres Hafalan</span>
            <span className="font-bold text-primary">0%</span>
          </div>
          <Progress value={0} className="h-2.5" />
          <p className="mt-2 text-xs text-muted-foreground">Progres akan tampil setelah laporan harian mulai diisi ustadz.</p>
        </div>
        <div className="divide-y rounded-2xl bg-card shadow-soft">
          <button onClick={() => setInstall(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <Download className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-medium">Pasang Aplikasi</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={async () => {
              await signOut(qc);
              navigate({ to: "/login", replace: true });
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="flex-1 text-sm font-medium">Keluar</span>
          </button>
        </div>
      </div>
      <InstallPrompt open={install} onOpenChange={setInstall} />
    </div>
  );
}
