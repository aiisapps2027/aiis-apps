import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/aiis/decor";
import { uploadAvatar, type AvatarOwner } from "@/lib/avatar";

/** Avatar with a camera button. `onUploaded` receives the new storage path and must persist it. */
export function AvatarUploader({
  name,
  path,
  owner,
  size = 68,
  onUploaded,
}: {
  name: string;
  path: string | null | undefined;
  owner: AvatarOwner;
  size?: number;
  onUploaded: (path: string) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const p = await uploadAvatar(owner, file);
      await onUploaded(p);
      toast.success("Foto berhasil diperbarui");
    } catch (err: any) {
      toast.error(err.message ?? "Gagal memperbarui foto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Avatar name={name} url={path} size={size} />
      <button
        type="button"
        aria-label="Ganti foto"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
    </div>
  );
}
