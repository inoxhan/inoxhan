"use client";

import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import type { VariantIndex } from "@/components/quote/useVariantIndex";
import { filtreleVaryantlar } from "@/lib/varyant-filtre";
import { searchVariants, yedekIndeks, type VariantIndexItem } from "@/lib/variant-search-client";

/**
 * Teklif oluşturucunun arama kutusu — tam katalog (~6.750 ölçü varyantı).
 * Yazılan her kelime birebir aranır, sonuç kademeli daralır:
 * "din 933" → yalnız DIN 933, ardından "8" → yalnız 8'likler.
 * Hiç eşleşme çıkmazsa yazım hatası toleranslı yedek aramaya düşülür.
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
  const { items, ensure, loading, error } = index;
  const searching = query.trim().length >= 2;

  const birincil = useMemo(
    () =>
      searching && items
        ? filtreleVaryantlar(items, query)
        : { items: [], capSuzuldu: false, toplam: 0 },
    [searching, items, query],
  );

  // Yalnız birebir eşleşme yoksa: yazım hatası toleranslı arama
  const yedek = useMemo(
    () =>
      searching && items && birincil.toplam === 0
        ? searchVariants(yedekIndeks(items), query.trim())
        : [],
    [searching, items, birincil.toplam, query],
  );

  const results: VariantIndexItem[] = birincil.toplam > 0 ? birincil.items : yedek;
  const yedekten = birincil.toplam === 0 && yedek.length > 0;

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
          placeholder="DIN kodu, ölçü veya açıklama yazın… (örn. 933 8)"
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
            {yedekten ? (
              <>
                Tam eşleşme yok — <strong className="text-steel-900">benzer {results.length}</strong>{" "}
                sonuç
              </>
            ) : (
              <>
                <strong className="text-steel-900">{birincil.toplam}</strong> sonuç
                {birincil.toplam === 0 && !loading
                  ? " — farklı bir yazımla deneyin ya da aşağıdaki listeden seçin"
                  : birincil.toplam > results.length
                    ? ` — ilk ${results.length} tanesi gösteriliyor, ölçü ekleyerek daraltın (örn. 933 8)`
                    : ""}
              </>
            )}
            {birincil.capSuzuldu && (
              <span className="ml-1 text-steel-400">
                · çap eşleşmesi gösteriliyor; uzunluk için ölçüyü birlikte yazın (örn. 8x40)
              </span>
            )}
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
                      thumb
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
