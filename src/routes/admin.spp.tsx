import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/aiis/StaffShell";
import { SppKonfirmasi } from "@/components/aiis/SppKonfirmasi";
import { SppPengaturan } from "@/components/aiis/SppPengaturan";
import { SppTagihan } from "@/components/aiis/SppTagihan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countMenunggu, MENUNGGU_KEY } from "@/lib/spp";

export const Route = createFileRoute("/admin/spp")({ component: AdminSpp });

function AdminSpp() {
  const { data: menunggu } = useQuery({ queryKey: [...MENUNGGU_KEY], queryFn: countMenunggu, refetchInterval: 30_000 });
  return (
    <div>
      <PageHeader title="SPP & Tagihan" subtitle="Tagihan, konfirmasi pembayaran, dan pengaturan rekening" />
      <div className="mx-auto max-w-4xl p-4 lg:mx-0 lg:px-8">
        <Tabs defaultValue="konfirmasi">
          <TabsList className="mb-4 grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="konfirmasi">Konfirmasi{menunggu ? ` (${menunggu})` : ""}</TabsTrigger>
            <TabsTrigger value="tagihan">Tagihan</TabsTrigger>
            <TabsTrigger value="pengaturan">Pengaturan</TabsTrigger>
          </TabsList>
          <TabsContent value="konfirmasi"><SppKonfirmasi /></TabsContent>
          <TabsContent value="tagihan"><SppTagihan /></TabsContent>
          <TabsContent value="pengaturan"><SppPengaturan /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
