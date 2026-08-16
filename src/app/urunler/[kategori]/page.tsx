import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/AnalyticsListener";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CatalogSearch } from "@/components/catalog/CatalogSearch";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import {
  getBrands,
  getCategories,
  getCategoryBySlug,
  getProducts,
} from "@/server/catalog";

interface Params {
  kategori: string;
}
interface SearchParams {
  marka?: string;
  sayfa?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { kategori } = await params;
  const category = await getCategoryBySlug(kategori);
  if (!category) return {};
  return {
    title: `${category.name}`,
    description: `${category.name} kategorisindeki ürünler — teknik özellikleriyle inceleyin, 15-30 dakika içinde teklif alın.`,
    alternates: { canonical: `/urunler/${category.slug}` },
  };
}

export default async function KategoriPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { kategori } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(kategori);
  if (!category) notFound();

  const page = Number(sp.sayfa) || 1;
  const [categories, brands, result] = await Promise.all([
    getCategories(),
    getBrands(),
    getProducts({ categorySlug: kategori, brandSlug: sp.marka, page }),
  ]);

  const makeHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.marka) q.set("marka", sp.marka);
    if (p > 1) q.set("sayfa", String(p));
    const qs = q.toString();
    return `/urunler/${kategori}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <TrackOnMount type="category_view" payload={{ category: category.slug }} />
      <Breadcrumbs
        items={[{ label: "Ürünler", href: "/urunler" }, { label: category.name }]}
      />

      <header className="mt-6 mb-10">
        <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
          {category.name}
        </h1>
        <p className="mt-2 text-lg text-steel-500">
          {result.total} ürün · Teknik özellikleriyle inceleyin, tek tıkla teklif isteyin
        </p>
      </header>

      <CatalogSearch>
        <div className="space-y-8">
          <FilterPanel
            categories={categories.map((c) => ({
              name: c.name,
              slug: c.slug,
              count: c._count.products,
            }))}
            brands={brands.map((b) => ({
              name: b.name,
              slug: b.slug,
              count: b._count.products,
            }))}
            activeCategorySlug={kategori}
            activeBrandSlug={sp.marka}
          />
          <ProductGrid products={result.items} />
          <Pagination page={result.page} pageCount={result.pageCount} makeHref={makeHref} />
        </div>
      </CatalogSearch>
    </div>
  );
}
