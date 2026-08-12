import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";
import type { CatalogProduct } from "@/server/catalog";

export function toCardData(p: CatalogProduct): ProductCardData {
  return {
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    brand: p.brand?.name ?? "",
    model: p.model ?? "",
    categorySlug: p.category.slug,
    image: p.images[0]?.basePath ?? null,
    specs: p.specs.map((s) => ({ key: s.key, value: s.value })),
  };
}

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-steel-200 bg-white p-10 text-center text-steel-500">
        Bu filtrelerle eşleşen ürün bulunamadı.
      </p>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={toCardData(p)} />
      ))}
    </div>
  );
}
