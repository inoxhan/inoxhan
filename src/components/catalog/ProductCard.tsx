import Link from "next/link";
import { Zap } from "lucide-react";
import { ProductImage } from "@/components/catalog/ProductImage";

/** Karta gereken sade veri — hem RSC (Prisma) hem istemci (arama indeksi) besleyebilir. */
export interface ProductCardData {
  sku: string;
  name: string;
  slug: string;
  brand: string;
  model: string;
  categorySlug: string;
  image: string | null;
  specs: { key: string; value: string }[];
}

/**
 * Premium ürün kartı — FİYAT YOK; aksiyonlar "Detayları Gör" + "Teklif İste".
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const detailHref = `/urunler/${product.categorySlug}/${product.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card transition-shadow hover:shadow-elevated">
      <Link href={detailHref} className="relative block aspect-[4/3] overflow-hidden bg-steel-100">
        <ProductImage
          basePath={product.image}
          alt={product.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-xs tracking-wide text-steel-400">{product.sku}</p>
        <Link href={detailHref}>
          <h3 className="font-display mt-1 line-clamp-2 text-[17px] leading-snug font-semibold text-steel-900 group-hover:underline">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-steel-500">
          {product.brand}
          {product.model ? ` · ${product.model}` : ""}
        </p>

        {product.specs.length > 0 && (
          <dl className="mt-3 space-y-1 border-t border-steel-100 pt-3 text-sm">
            {product.specs.slice(0, 3).map((s) => (
              <div key={s.key + s.value} className="flex justify-between gap-3">
                <dt className="text-steel-400">{s.key}</dt>
                <dd className="text-right font-medium text-steel-700">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex gap-2 pt-5">
          <Link
            href={detailHref}
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-steel-300 text-sm font-medium text-steel-700 transition-colors hover:border-steel-500 hover:bg-steel-50"
          >
            Detayları Gör
          </Link>
          <Link
            href={`/teklif?urun=${encodeURIComponent(product.sku)}`}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-steel-950 text-sm font-medium text-steel-50 transition-colors hover:bg-steel-800"
          >
            <Zap className="size-4" aria-hidden />
            Teklif İste
          </Link>
        </div>
      </div>
    </article>
  );
}
