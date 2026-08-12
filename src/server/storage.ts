import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ATTACHMENT_MAX_BYTES } from "@/lib/quote-schema";

/**
 * Özel dosya depolama katmanı — teklif ekleri public/ DIŞINDA tutulur ve
 * yalnızca panel oturumuyla (/api/files) servis edilir.
 * VPS'te yerel disk; ileride S3 gerekirse yalnız bu dosya değişir.
 */
const STORAGE_ROOT = path.join(process.cwd(), "storage");
const UPLOAD_DIR = path.join(STORAGE_ROOT, "uploads");

export type SaveResult = { ok: true; relPath: string } | { ok: false; error: string };

export async function saveQuoteAttachment(file: File): Promise<SaveResult> {
  if (file.size === 0) return { ok: false, error: "Dosya boş" };
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: "Dosya 10 MB'dan büyük olamaz" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;

  // PDF: magic byte kontrolü ile olduğu gibi kaydet
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    const rel = path.posix.join("uploads", `${id}.pdf`);
    await writeFile(path.join(STORAGE_ROOT, rel), buf);
    return { ok: true, relPath: rel };
  }

  // Görsel: sharp ile yeniden kodla (metadata temizlenir, bozuk dosya reddedilir)
  try {
    const rel = path.posix.join("uploads", `${id}.webp`);
    await sharp(buf)
      .rotate() // EXIF yönünü uygula
      .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(STORAGE_ROOT, rel));
    return { ok: true, relPath: rel };
  } catch {
    return { ok: false, error: "Dosya görsel veya PDF olmalı" };
  }
}

/** Panel için ek dosyayı okur (auth kontrolü çağıran katmanda). */
export async function readStoredFile(relPath: string): Promise<Buffer | null> {
  // path traversal koruması
  const safe = path.normalize(relPath).replace(/^([.][.][/\\])+/, "");
  const abs = path.join(STORAGE_ROOT, safe);
  if (!abs.startsWith(STORAGE_ROOT)) return null;
  try {
    return await readFile(abs);
  } catch {
    return null;
  }
}
