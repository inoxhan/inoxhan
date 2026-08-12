import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Ürün görseli işleme — TEK sözleşme: `{basePath}-{sm|md|lg}.{avif|webp}`.
 * Seed, panel CRUD ve Faz 5 içe aktarma hattı aynı fonksiyonu kullanır.
 */
export const IMAGE_VARIANTS = [
  { suffix: "sm", width: 480 },
  { suffix: "md", width: 960 },
  { suffix: "lg", width: 1600 },
] as const;

const PRODUCTS_DIR = path.join(process.cwd(), "public", "media", "products");

export async function processProductImage(
  buf: Buffer,
  baseName: string,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(PRODUCTS_DIR, { recursive: true });
  const src = sharp(buf).rotate();
  const meta = await src.metadata();

  for (const v of IMAGE_VARIANTS) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 55 })
      .toFile(path.join(PRODUCTS_DIR, `${baseName}-${v.suffix}.avif`));
    await resized
      .clone()
      .webp({ quality: 78 })
      .toFile(path.join(PRODUCTS_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/products/${baseName}`,
    width: meta.width ?? 1600,
    height: meta.height ?? 1200,
  };
}
