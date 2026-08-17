"use client";

import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import type { VariantIndex } from "@/components/quote/useVariantIndex";
import { searchVariants, type VariantIndexItem } from "@/lib/variant-search-client";

/**
 * Teklif oluşturucunun arama kutusu — tam katalog (~6.750 ölçü varyantı)
 * DIN kodu, ölçü ve açıklamayla aranır. DIN kodunu bilen müşteri ızgaraya
 * hiç inmeden kalemini ekler. İndeks useVariantIndex ile paylaşılır.
 */
export function VariantPicker({
  query,
  onQueryChange,
  index,
  onAdd,
  addedCodes,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  index: VariantIndex;
  onAdd: (v: VariantIndexItem) => void;
  /** Sepetteki kodlar — satırda "eklendi" durumu gösterilir */
  addedCodes: Set<string>;
}) {
  const { mini, ensure, loading, error } = index;
  const searching = query.trim().length >= 2;

  // İndeks hazır olunca sonuçlar doğrudan türetilir — ayrı state tutulmaz
  const results = useMemo<VariantIndexItem[]>(
    () => (searching && mini ? searchVariants(mini, query.trim()) : []),
    [searching, mini, query],
  );

  // Yazmaya başlandığında indeks arka planda yüklenir (odaklanma da tetikler)
  useEffect(() => {
    if (searching) void ensure();
  }, [searching, ensure]);

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-steel-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => void ensure()}
          placeholder="DIN kodu, ölçü veya açıklama yazın… (örn. DIN 933 M8x40 A2)"
          aria-label="Ürün ara"
          className="h-13 w-full rounded-lg border border-steel-200 bg-white pr-12 pl-12 text-[15px] text-steel-900 shadow-card transition-colors placeholder:text-steel-400 focus:border-steel-500 focus:outline-none"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-steel-400" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-steel-400 hover:text-steel-700"
            aria-label="Aramayı temizle"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {error && searching && (
        <p className="mt-3 rounded-md border border-status-overdue/30 bg-status-overdue/5 px-4 py-3 text-sm text-status-overdue">
          {error}
        </p>
      )}

      {searching && !error && (
        <div className="mt-4">
          <p className="text-sm text-steel-500">
            <strong className="text-steel-900">{results.length}</strong> sonuç
            {results.length === 0 && !loading
              ? " — farklı bir yazımla deneyin ya da aşağıdaki ürünlerden seçin"
              : results.length >= 50
                ? " gösteriliyor — ölçü ekleyerek daraltın"
                : ""}
          </p>
          <ul className="mt-3 divide-y divide-steel-100 rounded-lg border border-steel-200 bg-white shadow-card">
            {results.map((v) => {
              const added = addedCodes.has(v.code);
              return (
                <li key={v.code} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md border border-steel-100 bg-photo">
                    <ProductImage
                      basePath={v.image}
                      alt=""
                      sizes="48px"
                      className="size-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-steel-900">
                      {v.description}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-steel-500">
                      <span className="font-mono">{v.code}</span>
                      {v.dinNorm && (
                        <span className="rounded-full border border-steel-200 bg-steel-50 px-2 py-px">
                          {v.dinNorm}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(v)}
                    className={
                      added
                        ? "flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-status-answered/40 bg-status-answered/10 px-3 text-sm font-medium text-status-answered"
                        : "flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-steel-950 px-3 text-sm font-medium text-steel-50 transition-colors hover:bg-steel-800"
                    }
                    aria-label={added ? `${v.code} listede — adet artır` : `${v.code} listeye ekle`}
                  >
                    {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                    {added ? "Listede" : "Ekle"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
