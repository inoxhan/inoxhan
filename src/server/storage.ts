import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ATTACHMENT_MAX_BYTES } from "@/lib/quote-schema";

/**
 * Özel dosya depolama katmanı — teklif ekleri public/ DIŞINDA tutulur ve
 * yalnızca panel oturumuyla (/api/files) servis edilir.
 *
 * İki arka uç, aynı `uploads/...` relPath sözleşmesi:
 *  - Yerel disk (dev / VPS): storage/uploads
 *  - Vercel Blob (BLOB_READ_WRITE_TOKEN doluysa): kalıcı disk olmayan
 *    serverless ortam. Blob URL'leri tahmin edilemez sonek taşır; panel
 *    erişimi yine /api/files oturum kapısından geçer.
 */
const STORAGE_ROOT = path.join(process.cwd(), "storage");
const UPLOAD_DIR = path.join(STORAGE_ROOT, "uploads");

function blobAktif(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type SaveResult = { ok: true; relPath: string } | { ok: false; error: string };

async function yaz(rel: string, buf: Buffer): Promise<string> {
  if (blobAktif()) {
    const { put } = await import("@vercel/blob");
    const sonuc = await put(rel, buf, { access: "public", addRandomSuffix: true });
    return sonuc.pathname; // "uploads/xxx-rastgele.webp" — DB'ye bu yazılır
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(STORAGE_ROOT, rel), buf);
  return rel;
}

export async function saveQuoteAttachment(file: File): Promise<SaveResult> {
  if (file.size === 0) return { ok: false, error: "Dosya boş" };
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: "Dosya 10 MB'dan büyük olamaz" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;

  // PDF: magic byte kontrolü ile olduğu gibi kaydet
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    const relPath = await yaz(path.posix.join("uploads", `${id}.pdf`), buf);
    return { ok: true, relPath };
  }

  // Görsel: sharp ile yeniden kodla (metadata temizlenir, bozuk dosya reddedilir)
  try {
    const islenmis = await sharp(buf)
      .rotate() // EXIF yönünü uygula
      .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const relPath = await yaz(path.posix.join("uploads", `${id}.webp`), islenmis);
    return { ok: true, relPath };
  } catch {
    return { ok: false, error: "Dosya görsel veya PDF olmalı" };
  }
}

/** relPath'i STORAGE_ROOT dışına çıkamayacak hâle getirir; çıkıyorsa null. */
function guvenliYol(relPath: string): { safe: string; abs: string } | null {
  const safe = path.normalize(relPath).replace(/^([.][.][/\\])+/, "");
  const abs = path.join(STORAGE_ROOT, safe);
  return abs.startsWith(STORAGE_ROOT) ? { safe, abs } : null;
}

/**
 * Teklif eki siler — panelden kalıcı silme sırasında çağrılır.
 *
 * Dosya kaybı talebin silinmesini engellememeli: her iki arka uçta da hata
 * yutulur. Kalan yetim dosya, silinemeyen bir talepten daha az zararlı.
 */
export async function deleteStoredFile(relPath: string): Promise<void> {
  const yol = guvenliYol(relPath);
  if (!yol) return;

  if (blobAktif()) {
    try {
      const { del, head } = await import("@vercel/blob");
      // del() blob URL'i ister; DB'de pathname tutuluyor, önce URL'e çeviriyoruz
      const meta = await head(yol.safe.replace(/\\/g, "/"));
      await del(meta.url);
      return;
    } catch {
      // Blob'da yok ya da silinemedi — diskte olabilir, aşağıda denenir
    }
  }
  try {
    await unlink(yol.abs);
  } catch {
    // Zaten yok
  }
}

/** Panel için ek dosyayı okur (auth kontrolü çağıran katmanda). */
export async function readStoredFile(relPath: string): Promise<Buffer | null> {
  const yol = guvenliYol(relPath);
  if (!yol) return null;
  const { safe, abs } = yol;
  try {
    return await readFile(abs);
  } catch {
    // Diskte yok — Blob'da olabilir (Vercel'de ya da client-upload ile gelen dosya)
    if (!blobAktif()) return null;
    try {
      const { head } = await import("@vercel/blob");
      const meta = await head(safe.replace(/\\/g, "/"));
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
}
