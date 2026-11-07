import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
const SIGNED_URL_TTL = 60 * 60; // seconds

/** foto_url stores an object path inside the private bucket (legacy http URLs are passed through). */
export function useAvatarUrl(path: string | null | undefined) {
  const isUrl = !!path && /^https?:\/\//.test(path);
  const { data } = useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path && !isUrl,
    staleTime: (SIGNED_URL_TTL - 300) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, SIGNED_URL_TTL);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return isUrl ? path! : data ?? null;
}

/** Center-crop to a square and re-encode as JPEG so uploads stay small (~30-80 KB). */
export async function compressImage(file: File, size = 512, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Gagal memproses gambar");
  return blob;
}

export type AvatarOwner = { kind: "students" | "teachers"; id: string };

/** Uploads to {kind}/{id}/avatar.jpg (overwrites) and returns the stored path. */
export async function uploadAvatar(owner: AvatarOwner, file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${owner.kind}/${owner.id}/avatar.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw new Error("Gagal mengunggah foto. Coba lagi.");
  return path;
}
