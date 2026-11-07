import { Hourglass } from "lucide-react";
import { ScreenHeader, MosqueSilhouette } from "@/components/aiis/decor";

export function ComingSoon({ title, back = true }: { title: string; back?: boolean }) {
  return (
    <div>
      <ScreenHeader title={title} back={back} />
      <div className="flex flex-col items-center px-8 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary text-primary">
          <Hourglass className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-primary">Segera Hadir</h2>
        <p className="mt-2 text-sm text-muted-foreground">Fitur {title} sedang kami siapkan. Insya Allah segera dapat digunakan.</p>
        <MosqueSilhouette className="mt-10 w-56 opacity-40" />
      </div>
    </div>
  );
}

