import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/aiis/decor";
import { SetoranForm } from "@/components/aiis/SetoranForm";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHalaqahStudents, parseSetoranSearch } from "@/lib/laporan";

export const Route = createFileRoute("/ustadz/setoran/$studentId")({
  validateSearch: parseSetoranSearch,
  component: SetoranPage,
});

function SetoranPage() {
  const { studentId } = Route.useParams();
  const { tanggal, halaqah } = Route.useSearch();

  const { data, isLoading } = useQuery({
    queryKey: ["setoran-form", studentId, tanggal],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const [stu, lap, cat, teacher] = await Promise.all([
        supabase.from("students").select("id, nama, kelas, foto_url, halaqah_id").eq("id", studentId).maybeSingle(),
        supabase.from("laporan_harian").select("*").eq("student_id", studentId).eq("tanggal", tanggal),
        supabase.from("catatan_harian").select("*").eq("student_id", studentId).eq("tanggal", tanggal).maybeSingle(),
        supabase.from("teachers").select("id").eq("user_id", u.user?.id ?? "").maybeSingle(),
      ]);
      if (stu.error) throw stu.error;
      if (lap.error) throw lap.error;
      return { student: stu.data, laporan: lap.data ?? [], catatan: cat.data, teacherId: teacher.data?.id ?? null };
    },
  });

  const halaqahId = halaqah || data?.student?.halaqah_id || "";
  const { data: siblings } = useQuery({
    queryKey: ["setoran-students", halaqahId],
    enabled: !!halaqahId,
    queryFn: () => fetchHalaqahStudents(halaqahId),
  });
  const idx = siblings?.findIndex((s) => s.id === studentId) ?? -1;
  const next = idx >= 0 ? siblings?.[idx + 1] ?? null : null;

  return (
    <div>
      <ScreenHeader title="Input Setoran" />
      <div className="mx-auto max-w-2xl p-4">
        {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
        {data && !data.student && <p className="text-sm text-muted-foreground">Siswa tidak ditemukan atau bukan di halaqah Anda.</p>}
        {data?.student && (
          <SetoranForm
            key={`${studentId}-${tanggal}`}
            student={data.student}
            tanggal={tanggal}
            halaqahId={halaqahId}
            teacherId={data.teacherId}
            initial={data.laporan}
            catatanRow={data.catatan}
            next={next ?? null}
          />
        )}
      </div>
    </div>
  );
}
