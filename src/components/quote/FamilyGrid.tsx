"use client";

import { useMemo, useState } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { cn } from "@/lib/utils";
import type { QuoteFamily } from "@/server/catalog";

/**
 * Teklif oluşturucunun fotoğraflı ürün ızgarası — kategori çipleriyle süzülür.
 * Karta tıklanınca ızgaranın hemen altında o ailenin ölçü paneli açılır
 * (sayfa değişmez); seçili kart çerçeveyle işaretlenir.
 */
export function FamilyGrid({
  families,
  selectedSku,
  onSelect,
}: {
  families: QuoteFamily[];
  selectedSku: string | null;
  onSelect: (family: QuoteFamily) => void;
}) {
  const [kategori, setKategori] = useState<string | null>(null);

  // Kategori listesi ailelerden türetilir — sıra Category.order'dan gelir
  const kategoriler = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const f of families) {
      const mevcut = map.get(f.categorySlug);
      if (mevcut) mevcut.count += 1;
      else map.set(f.categorySlug, { slug: f.categorySlug, name: f.categoryName, count: 1 });
    }
    return [...map.values()];
  }, [families]);

  const gorunen = kategori ? families.filter((f) => f.categorySlug === kategori) : families;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Cip aktif={kategori === null} onClick={() => setKategori(null)}>
          Tümü <span className="text-steel-400">({families.length})</span>
        </Cip>
        {kategoriler.map((k) => (
          <Cip key={k.slug} aktif={kategori === k.slug} onClick={() => setKategori(k.slug)}>
            {k.name} <span className="text-steel-400">({k.count})</span>
          </Cip>
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {gorunen.map((f) => {
          const secili = f.sku === selectedSku;
          return (
            <li key={f.sku}>
              <button
                type="button"
                onClick={() => onSelect(f)}
                aria-pressed={secili}
                className={cn(
                  "group flex w-full flex-col overflow-hidden rounded-lg border bg-white text-left transition-shadow hover:shadow-elevated",
                  secili
                    ? "border-steel-950 ring-2 ring-steel-950"
                    : "border-steel-200 shadow-card",
                )}
              >
                <div className="aspect-[4/3] overflow-hidden bg-photo">
                  <ProductImage
                    basePath={f.image}
                    alt={f.name}
                    sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 22vw"
                    className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <p className="line-clamp-2 text-sm font-medium text-steel-900">{f.name}</p>
                  <p className="mt-1 flex items-center justify-between gap-2 text-xs text-steel-500">
                    <span className="font-mono">{f.sku}</span>
                    {f.variantCount > 0 && <span>{f.variantCount} ölçü</span>}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Cip({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        aktif
          ? "border-steel-950 bg-steel-950 text-steel-50"
          : "border-steel-200 bg-white text-steel-600 hover:border-steel-400",
      )}
    >
      {children}
    </button>
  );
}
