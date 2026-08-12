"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type MiniSearch from "minisearch";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  buildSearchIndex,
  searchProducts,
  type SearchIndexItem,
} from "@/lib/search-client";

/**
 * Katalog arama kabuğu: yazmaya başlayınca sunucu ızgarasını (children)
 * istemci tarafı toleranslı arama sonuçlarıyla değiştirir.
 * İndeks ilk odaklanmada /api/search-index'ten tembel yüklenir.
 */
export function CatalogSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const miniRef = useRef<MiniSearch<SearchIndexItem> | null>(null);
  const loadPromise = useRef<Promise<void> | null>(null);

  function ensureIndex() {
    if (miniRef.current || loadPromise.current) return loadPromise.current;
    setLoading(true);
    loadPromise.current = fetch("/api/search-index")
      .then((r) => r.json())
      .then((items: SearchIndexItem[]) => {
        miniRef.current = buildSearchIndex(items);
      })
      .finally(() => setLoading(false));
    return loadPromise.current;
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    Promise.resolve(ensureIndex()).then(() => {
      if (!cancelled && miniRef.current) {
        setResults(searchProducts(miniRef.current, q));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const searching = query.trim().length >= 2;

  return (
    <div>
      <div className="relative mx-auto max-w-2xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-steel-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={ensureIndex}
          placeholder="Hangi ürünü arıyorsunuz? Ad, marka, model veya ürün kodu…"
          aria-label="Ürün ara"
          className="h-14 w-full rounded-lg border border-steel-200 bg-white pr-12 pl-12 text-[15px] text-steel-900 shadow-card transition-colors placeholder:text-steel-400 focus:border-steel-500 focus:outline-none"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-steel-400" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-steel-400 hover:text-steel-700"
            aria-label="Aramayı temizle"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {searching ? (
        <div className="mt-10">
          <p className="text-sm text-steel-500">
            <strong className="text-steel-900">{results.length}</strong> sonuç
            bulundu{results.length === 0 ? " — farklı bir yazımla deneyin" : ""}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <ProductCard
                key={r.id}
                product={{
                  sku: r.sku,
                  name: r.name,
                  slug: r.slug,
                  brand: r.brand,
                  model: r.model,
                  categorySlug: r.categorySlug,
                  image: r.image,
                  specs: r.specs,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10">{children}</div>
      )}
    </div>
  );
}
