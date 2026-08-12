import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { Reveal } from "@/components/home/Reveal";

interface CategoryCard {
  name: string;
  slug: string;
  imagePath: string | null;
  count: number;
}

export function CategoryHighlights({ categories }: { categories: CategoryCard[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-steel-900 md:text-4xl">
              Kategoriler
            </h2>
            <p className="mt-3 text-lg text-steel-500">
              Aradığını bul, tek tıkla fiyat sor.
            </p>
          </div>
          <Link
            href="/urunler"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-steel-700 underline-offset-4 hover:underline"
          >
            Tüm ürünler
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {categories.map((c, i) => (
          <Reveal key={c.slug} delay={Math.min(i * 0.07, 0.3)}>
            <Link
              href={`/urunler/${c.slug}`}
              className="group relative block overflow-hidden rounded-lg border border-steel-200 bg-steel-900 shadow-card"
            >
              <ProductImage
                basePath={c.imagePath}
                alt={c.name}
                sizes="(max-width: 768px) 50vw, 33vw"
                className="aspect-[4/3] w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-[1.05] group-hover:opacity-100"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-steel-950/90 to-transparent p-4 md:p-5">
                <p className="font-display text-lg font-semibold text-steel-50 md:text-xl">
                  {c.name}
                </p>
                <p className="text-sm text-steel-300">{c.count} ürün</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
