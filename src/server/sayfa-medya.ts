import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Türev üretilmiş mi? (`public/{basePath}-{suffix}.webp`)
 *
 * Medya hattı aşamalı besleniyor: prompt paketindeki 24 varlık tek seferde değil,
 * parça parça üretiliyor. Sayfalar henüz gelmemiş görsele `<img>` basmasın diye
 * her yerleşim noktası önce buradan soruyor. Kontrol istek başına değil,
 * sayfanın `revalidate` penceresinde bir kez çalışır.
 *
 * WebP üzerinden bakılır: AVIF ile birlikte üretilir ama `<img>` fallback'i her
 * zaman WebP, yani asıl varlığı belirleyen dosya bu.
 */
export function medyaVar(basePath: string, suffix = "lg"): boolean {
  return existsSync(path.join(process.cwd(), "public", `${basePath}-${suffix}.webp`));
}

/** Video hattının her zaman yazdığı dosya MP4 — WebM bazı ffmpeg derlemelerinde atlanabiliyor. */
export function videoVar(basePath: string): boolean {
  return existsSync(path.join(process.cwd(), "public", `${basePath}.mp4`));
}
