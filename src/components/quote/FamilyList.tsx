"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { cn } from "@/lib/utils";
import type { QuoteFamily } from "@/server/catalog";

/**
 * Teklif oluşturucunun ürün listesi — kategori çipleriyle süzülen, alt alta
 * satırlar. Satıra tıklanınca ölçüleri SAĞ sütunun üstünde açılır; sayfa
 * kaymaz, seçili satır çerçeveyle işaretlenir.
 */
export function FamilyList({
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

      <ul className="mt-4 divide-y divide-steel-100 overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card">
        {gorunen.map((f) => {
          const secili = f.sku === selectedSku;
          return (
            <li key={f.sku}>
              <button
                type="button"
                onClick={() => onSelect(f)}
                aria-pressed={secili}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:px-4",
                  secili ? "bg-steel-950 text-steel-50" : "hover:bg-steel-50",
                )}
              >
                <div
                  className={cn(
                    "size-14 shrink-0 overflow-hidden rounded-md border bg-photo",
                    secili ? "border-steel-700" : "border-steel-100",
                  )}
                >
                  <ProductImage
                    basePath={f.image}
                    alt={f.name}
                    sizes="56px"
                    thumb
                    className="size-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p
                    className={cn(
                      "mt-0.5 flex flex-wrap items-center gap-x-2 text-xs",
                      secili ? "text-steel-300" : "text-steel-500",
                    )}
                  >
                    <span className="font-mono">{f.sku}</span>
                    {f.variantCount > 0 && <span>{f.variantCount} ölçü</span>}
                  </p>
                </div>

                <ChevronRight
                  className={cn("size-4 shrink-0", secili ? "text-steel-300" : "text-steel-400")}
                  aria-hidden
                />
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
