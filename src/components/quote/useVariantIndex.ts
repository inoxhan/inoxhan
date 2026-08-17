"use client";

import { useCallback, useRef, useState } from "react";
import { aranabilirYap, type AranabilirVaryant } from "@/lib/varyant-filtre";
import type { VariantIndexItem } from "@/lib/variant-search-client";

/**
 * Varyant indeksinin (~6.750 ölçü) TEK yükleyicisi — teklif oluşturucudaki
 * arama kutusu ve ölçü paneli aynı fetch'i paylaşır.
 * İlk etkileşimde (odaklanma / ürün satırına tıklama) tembel indirilir;
 * hata olursa yeniden denenebilir. CatalogSearch'teki desenin ortaklaştırılmış hâli.
 *
 * Liste indirildiği anda arama metinleri bir kez normalize edilir
 * (varyant-filtre.ts) — her tuş vuruşunda yeniden hesaplanmaz.
 */
export interface VariantIndex {
  loading: boolean;
  error: string | null;
  /** Normalize edilmiş arama metniyle zenginleştirilmiş liste */
  items: AranabilirVaryant[] | null;
  ensure: () => Promise<void>;
}

export function useVariantIndex(): VariantIndex {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AranabilirVaryant[] | null>(null);
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
      .then((ham: VariantIndexItem[]) => {
        setItems(aranabilirYap(ham));
      })
      .catch(() => {
        loadPromise.current = null; // tekrar denenebilsin
        setError("Ürün listesi yüklenemedi — bağlantınızı kontrol edip tekrar deneyin");
      })
      .finally(() => setLoading(false));

    return loadPromise.current;
  }, []);

  return { loading, error, items, ensure };
}
