"use client";

import { isDemoMode } from "./env";
import { compressImage } from "./image";
import { createClient } from "@/lib/supabase/client";

export interface UploadedPhoto {
  url: string;
  path: string | null;
}

/**
 * Unggah foto momen ke penyimpanan.
 * - Live: kompres lalu unggah ke Supabase Storage bucket `circle-photos`.
 * - Demo: kembalikan data URL hasil kompresi (disimpan di localStorage).
 */
export async function uploadPhoto(
  file: File,
  circleId: string,
  momentId: string
): Promise<UploadedPhoto> {
  const dataUrl = await compressImage(file);

  if (isDemoMode) return { url: dataUrl, path: null };

  const sb = createClient();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${circleId}/${momentId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const blob = await (await fetch(dataUrl)).blob();

  const { error } = await sb.storage
    .from("circle-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from("circle-photos").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Hapus foto dari storage (hanya berlaku di mode live). */
export async function deletePhoto(path: string | null): Promise<void> {
  if (!path || isDemoMode) return;
  const sb = createClient();
  await sb.storage.from("circle-photos").remove([path]);
}
