import { db } from "@/server/db";

export const PAGE_SIZE = 24;

export interface CatalogFilters {
  categorySlug?: string;
  brandSlug?: string;
  page?: number;
}

/** Katalog ızgarası — sunucu sayfalamalı; 456 ürün asla tek seferde yüklenmez. */
export async function getProducts(filters: CatalogFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    isActive: true,
    ...(filters.categorySlug && { category: { slug: filters.categorySlug } }),
    ...(filters.brandSlug && { brand: { slug: filters.brandSlug } }),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        images: { where: { isMain: true }, take: 1 },
        specs: { orderBy: { order: "asc" }, take: 4 },
      },
      orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type CatalogProduct = Awaited<ReturnType<typeof getProducts>>["items"][number];

export async function getCategories() {
  return db.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
}

export async function getBrands() {
  return db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findUnique({ where: { slug } });
}

export async function getProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brand: true,
      images: { orderBy: [{ isMain: "desc" }, { order: "asc" }] },
      specs: { orderBy: { order: "asc" } },
      documents: true,
    },
  });
}

/** MiniSearch istemci indeksi için hafif ürün listesi. */
export async function getSearchIndexData() {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      brand: true,
      images: { where: { isMain: true }, take: 1 },
      specs: { orderBy: { order: "asc" }, take: 3 },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    model: p.model ?? "",
    brand: p.brand?.name ?? "",
    category: p.category.name,
    categorySlug: p.category.slug,
    image: p.images[0]?.basePath ?? null,
    specText: p.specs.map((s) => `${s.key} ${s.value}`).join(" "),
    specs: p.specs.map((s) => ({ key: s.key, value: s.value })),
  }));
}

export type SearchIndexItem = Awaited<ReturnType<typeof getSearchIndexData>>[number];
