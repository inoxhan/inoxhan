import type { Metadata } from "next";
import { CatalogSearch } from "@/components/catalog/CatalogSearch";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getBrands, getCategories, getProducts } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Ürün Kütüphanesi",
  description:
    "DIN ve ISO normlarında paslanmaz çelik bağlantı elemanları. Aradığınızı bulun, tek tıkla teklif isteyin.",
  alternates: { canonical: "/urunler" },
};

interface SearchParams {
  marka?: string;
  sayfa?: string;
}

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Number(sp.sayfa) || 1;

  const [categories, brands, result] = await Promise.all([
    getCategories(),
    getBrands(),
    getProducts({ brandSlug: sp.marka, page }),
  ]);

  const makeHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.marka) q.set("marka", sp.marka);
    if (p > 1) q.set("sayfa", String(p));
    const qs = q.toString();
    return `/urunler${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900 md:text-5xl">
          Ürün Kütüphanesi
        </h1>
        <p className="mt-3 text-lg text-steel-500">
          {result.total} ürün · DIN / ISO normlarında · A2 ve A4 kalite
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
            activeBrandSlug={sp.marka}
          />
          <ProductGrid products={result.items} />
          <Pagination page={result.page} pageCount={result.pageCount} makeHref={makeHref} />
        </div>
      </CatalogSearch>
    </div>
  );
}
