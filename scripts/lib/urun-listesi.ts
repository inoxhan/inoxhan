/**
 * Showreel ve yükleme kitinin paylaştığı ürün listesi.
 *
 * Tek sıralama kaynağı: kategori `order` → ürün `name`. Katalog sayfasındaki sırayla
 * aynı, böylece videodaki akış siteyi gezerken görülen sırayı takip ediyor.
 */
import path from "node:path";
import { db } from "../../src/server/db";

export interface Urun {
  /** Dosya adı — `media/products/{slug}` içindeki slug. Klip adı da bu olacak. */
  slug: string;
  sku: string;
  ad: string;
  kategori: string;
  kategoriSira: number;
  /** Ekranda görünecek kısa etiket — norm kodu ya da (normu yoksa) ürün tipi. */
  etiket: string;
  /** public/ altındaki duran fotoğrafın tam yolu. */
  fotograf: string;
}

/**
 * Ekran etiketi. 54 ürünün 51'inde SKU zaten bir DIN/ISO normu, doğrudan yazılır.
 * Kalan 3'ü (Dübeller kategorisinin tamamı) norm taşımıyor — SKU'ları `DROP IN ANCHOR`
 * gibi İngilizce ürün adı. Onlarda Türkçe ada düşülür: `INOX Çakma Dübel` → `ÇAKMA DÜBEL`.
 */
export function etiketle(sku: string, ad: string): string {
  if (/^(DIN|ISO)\s/i.test(sku)) return sku.toUpperCase();
  return ad.replace(/^INOX\s+/i, "").toLocaleUpperCase("tr-TR");
}

export async function urunleriGetir(): Promise<Urun[]> {
  const satirlar = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      images: { where: { isMain: true }, take: 1 },
    },
    orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
  });

  return satirlar
    .filter((p) => p.images[0])
    .map((p) => {
      // basePath "media/products/din-933" → slug "din-933"
      const slug = p.images[0].basePath.split("/").pop()!;
      return {
        slug,
        sku: p.sku,
        ad: p.name,
        kategori: p.category.name,
        kategoriSira: p.category.order,
        etiket: etiketle(p.sku, p.name),
        fotograf: path.join(process.cwd(), "public", `${p.images[0].basePath}-lg.webp`),
      };
    });
}
