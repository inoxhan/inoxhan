import { db } from "@/server/db";

export const PAGE_SIZE = 24;

export interface CatalogFilters {
  categorySlug?: string;
  brandSlug?: string;
  page?: number;
  /** Statik dışa aktarım tüm ürünleri tek sayfada ister — varsayılan PAGE_SIZE. */
  pageSize?: number;
}

/** Katalog ızgarası — sunucu sayfalamalı; 456 ürün asla tek seferde yüklenmez. */
export async function getProducts(filters: CatalogFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? PAGE_SIZE;
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
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
      drawings: { orderBy: { order: "asc" } },
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

  return products.map((p) => {
    const image: string | null = p.images.length > 0 ? p.images[0].basePath : null;
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      model: p.model ?? "",
      brand: p.brand?.name ?? "",
      category: p.category.name,
      categorySlug: p.category.slug,
      image,
      specText: p.specs.map((s) => `${s.key} ${s.value}`).join(" "),
      specs: p.specs.map((s) => ({ key: s.key, value: s.value })),
    };
  });
}

export type SearchIndexItem = Awaited<ReturnType<typeof getSearchIndexData>>[number];

/**
 * Hızlı teklif seçicisi için varyant indeksi (~6.750 hafif satır).
 * Görsel aile (Product) seviyesinde tutulur — 54 aile bir kez çekilip map'lenir,
 * varyant başına join maliyeti ödenmez.
 */
export async function getVariantIndexData() {
  const [variants, aileler] = await Promise.all([
    db.variant.findMany({
      where: { isActive: true },
      select: {
        code: true,
        groupCode: true,
        dinNorm: true,
        description: true,
        quality: true,
        productId: true,
      },
      orderBy: { code: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        category: { select: { slug: true } },
        images: { where: { isMain: true }, take: 1, select: { basePath: true } },
        drawings: { where: { kind: "cizim" }, take: 1, select: { basePath: true } },
      },
    }),
  ]);

  const aileMap = new Map(
    aileler.map((a) => [
      a.id,
      {
        // Fotoğraf yoksa teknik çizim küçük görsel olarak iş görür
        image: a.images[0]?.basePath ?? a.drawings[0]?.basePath ?? null,
        productSlug: a.slug,
        categorySlug: a.category.slug,
      },
    ]),
  );

  return variants.map((v, i) => {
    const aile = v.productId ? aileMap.get(v.productId) : undefined;
    return {
      id: i, // MiniSearch belge kimliği — code @unique ama sayı daha kompakt
      code: v.code,
      groupCode: v.groupCode,
      dinNorm: v.dinNorm,
      description: v.description,
      quality: v.quality,
      image: aile?.image ?? null,
      productSlug: aile?.productSlug ?? null,
      categorySlug: aile?.categorySlug ?? null,
    };
  });
}

export type VariantIndexItem = Awaited<ReturnType<typeof getVariantIndexData>>[number];

/**
 * Teklif oluşturucunun fotoğraflı ürün ızgarası — 54 aile.
 * Ölçüler (Variant) ızgaradan seçilen ailenin altında, istemcideki varyant
 * indeksinden süzülerek gösterilir; burada yalnız aile kartı + ölçü sayısı döner.
 */
export interface QuoteFamily {
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  image: string | null;
  variantCount: number;
}

export async function getQuoteBuilderFamilies(): Promise<QuoteFamily[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      sku: true,
      name: true,
      slug: true,
      category: { select: { slug: true, name: true } },
      images: { where: { isMain: true }, take: 1, select: { basePath: true } },
      drawings: { where: { kind: "cizim" }, take: 1, select: { basePath: true } },
      _count: { select: { variants: { where: { isActive: true } } } },
    },
    orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
  });

  return products.map((p) => ({
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    // Fotoğraf yoksa teknik çizim kart görseli olarak iş görür (varyant indeksiyle aynı ilke)
    image: p.images[0]?.basePath ?? p.drawings[0]?.basePath ?? null,
    variantCount: p._count.variants,
  }));
}
