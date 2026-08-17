"use client";

import { useCallback, useRef, useState } from "react";
import type MiniSearch from "minisearch";
import { buildVariantIndex, type VariantIndexItem } from "@/lib/variant-search-client";

/**
 * Varyant indeksinin (~6.750 ölçü) TEK yükleyicisi — teklif oluşturucudaki
 * arama kutusu ve ölçü paneli aynı fetch'i paylaşır.
 * İlk etkileşimde (odaklanma / aile kartına tıklama) tembel indirilir;
 * hata olursa yeniden denenebilir. CatalogSearch'teki desenin ortaklaştırılmış hâli.
 */
export interface VariantIndex {
  loading: boolean;
  error: string | null;
  /** Ham liste — aile paneli productSlug ile süzer */
  items: VariantIndexItem[] | null;
  /** MiniSearch motoru — arama kutusu kullanır */
  mini: MiniSearch<VariantIndexItem> | null;
  ensure: () => Promise<void>;
}

export function useVariantIndex(): VariantIndex {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    items: VariantIndexItem[];
    mini: MiniSearch<VariantIndexItem>;
  } | null>(null);
  // Yalnız olay/efekt içinden okunur: eşzamanlı ikinci fetch'i engeller
  const loadPromise = useRef<Promise<void> | null>(null);

  const ensure = useCallback(() => {
    if (loadPromise.current) return loadPromise.current;

    setLoading(true);
    setError(null);
    loadPromise.current = fetch("/api/variant-index")
      .then((r) => {
        if (!r.ok) throw new Error(`variant-index ${r.status}`);
        return r.json();
      })
      .then((items: VariantIndexItem[]) => {
        setData({ items, mini: buildVariantIndex(items) });
      })
      .catch(() => {
        loadPromise.current = null; // tekrar denenebilsin
        setError("Ürün listesi yüklenemedi — bağlantınızı kontrol edip tekrar deneyin");
      })
      .finally(() => setLoading(false));

    return loadPromise.current;
  }, []);

  return { loading, error, items: data?.items ?? null, mini: data?.mini ?? null, ensure };
}
