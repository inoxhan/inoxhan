"use client";

import { useCallback, useEffect, useState } from "react";
import type { VariantIndexItem } from "@/lib/variant-search-client";

/**
 * Hızlı teklif sepeti — localStorage'da yaşar, sekme kapansa da liste kaybolmaz.
 * Aynı varyant ikinci kez eklenirse adetler birleşir. Bozuk/eski veri sessizce
 * sıfırlanır (anahtar sürümlü); kalem sınırı formun MAX_LIST_ITEMS'ından yüksek
 * tutulmaz.
 */
const STORAGE_KEY = "inoxhan-sepet-v1";
const MAX_ITEMS = 100;

export interface CartItem {
  /** Varyant kodu; serbest metin kaleminde null */
  code: string | null;
  freeText: string | null;
  description: string;
  dinNorm: string | null;
  quality: string | null;
  image: string | null;
  qty: number;
  unit: string;
}

function oku(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is CartItem =>
          typeof i === "object" && i !== null && typeof (i as CartItem).qty === "number",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function useQuoteCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  // İlk boyamada sunucu/istemci uyumu için boş başla, mount'ta oku
  useEffect(() => {
    setItems(oku());
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage dolu/kapalı — sepet yalnız bellekte yaşar, akış bozulmaz
    }
  }, []);

  const addVariant = useCallback(
    (v: VariantIndexItem, qty = 1) => {
      let sonuc: "eklendi" | "birlesti" | "dolu" = "eklendi";
      setItems((mevcut) => {
        const i = mevcut.findIndex((m) => m.code === v.code);
        let next: CartItem[];
        if (i >= 0) {
          next = mevcut.map((m, j) => (j === i ? { ...m, qty: m.qty + qty } : m));
          sonuc = "birlesti";
        } else if (mevcut.length >= MAX_ITEMS) {
          sonuc = "dolu";
          return mevcut;
        } else {
          next = [
            ...mevcut,
            {
              code: v.code,
              freeText: null,
              description: v.description,
              dinNorm: v.dinNorm,
              quality: v.quality,
              image: v.image,
              qty,
              unit: "adet",
            },
          ];
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      return sonuc;
    },
    [],
  );

  const addFreeText = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || items.length >= MAX_ITEMS) return;
      persist([
        ...items,
        {
          code: null,
          freeText: t,
          description: t,
          dinNorm: null,
          quality: null,
          image: null,
          qty: 1,
          unit: "adet",
        },
      ]);
    },
    [items, persist],
  );

  const setQty = useCallback(
    (index: number, qty: number) => {
      persist(items.map((m, i) => (i === index ? { ...m, qty: Math.max(1, qty) } : m)));
    },
    [items, persist],
  );

  const setUnit = useCallback(
    (index: number, unit: string) => {
      persist(items.map((m, i) => (i === index ? { ...m, unit } : m)));
    },
    [items, persist],
  );

  const remove = useCallback(
    (index: number) => {
      persist(items.filter((_, i) => i !== index));
    },
    [items, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { items, addVariant, addFreeText, setQty, setUnit, remove, clear };
}
