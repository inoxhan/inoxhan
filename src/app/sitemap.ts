import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { db } from "@/server/db";

// Statik dışa aktarım (output: export) metadata rotalarında bunu açıkça ister
export const dynamic = "force-static";
// Ürün eklenince/değişince en geç 1 saat içinde sitemap tazelenir
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { products: { some: { isActive: true } } } }),
    db.product.findMany({
      where: { isActive: true },
      include: { category: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/urunler`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/teklif`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/katalog`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/hakkimizda`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/iletisim`, changeFrequency: "yearly", priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...categories.map((c) => ({
      url: `${SITE.url}/urunler/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${SITE.url}/urunler/${p.category.slug}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
