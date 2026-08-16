/**
 * Ürün fotoğrafı dosya adlarının çözümlenmesi — tüm ürün bilgisi DOSYA ADINDAN gelir.
 *
 *   NN - INOX <ÜRÜN ADI> - <NORM(lar)>.png
 *   21 - INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA - DIN 933 - ISO 4017.png
 *
 * `import-urunler.ts` (ürün içe aktarma) ve `import-katalog-cizim.ts` (teknik çizim
 * eşleştirme) aynı çözümlemeyi kullanır — iki yerde ayrı ayrı yazılırsa kaçınılmaz
 * olarak birbirinden ayrışır.
 */
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { titleCaseTr } from "../../src/lib/slugify-tr";

export const SOURCE_DIRS = ["resimler ve açıklamalar"];

export interface ParsedProduct {
  fileNo: number;
  filePath: string;
  name: string; // "INOX Altıköşe Başlı Metrik Diş Tam Paso Cıvata"
  sku: string; // "DIN 933"
  din: string | null;
  iso: string | null;
  globalName: string | null; // norm yoksa "Drop In Anchor"
}

/**
 * Ad ile norm(lar) " - " ile ayrılmıştır; normlar sondadır.
 * Ürün kodu (SKU) global norm kodudur: "DIN 933" → yoksa "ISO 7380" → norm yoksa
 * dosya adındaki global İngilizce ad ("DROP IN ANCHOR").
 */
export function parseFileName(filePath: string): ParsedProduct | null {
  const base = path.basename(filePath, path.extname(filePath));
  const parts = base.split(" - ").map((p) => p.trim());
  if (parts.length < 2) return null;

  const fileNo = Number(parts[0]);
  if (!Number.isFinite(fileNo)) return null;

  let din: string | null = null;
  let iso: string | null = null;
  const nameParts: string[] = [];
  const extraParts: string[] = [];

  for (const part of parts.slice(1)) {
    if (/^DIN\s/i.test(part)) din = part.toUpperCase();
    else if (/^ISO\s/i.test(part)) iso = part.toUpperCase();
    else if (nameParts.length === 0) nameParts.push(part);
    else extraParts.push(part); // "DROP IN ANCHOR" gibi norm olmayan ek ad
  }
  if (nameParts.length === 0) return null;

  const globalName = extraParts.length > 0 ? titleCaseTr(extraParts.join(" ")) : null;
  const sku = din ?? iso ?? extraParts.join(" ").toUpperCase();
  if (!sku) return null;

  return { fileNo, filePath, name: titleCaseTr(nameParts[0]), sku, din, iso, globalName };
}

export async function collectFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const abs = path.join(process.cwd(), dir);
    if (!existsSync(abs)) {
      console.warn(`Klasör bulunamadı, atlanıyor: ${dir}`);
      continue;
    }
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
        files.push(path.join(abs, entry.name));
      }
    }
  }
  return files.sort();
}
