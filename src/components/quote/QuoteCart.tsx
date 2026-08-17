"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { QtyInput } from "@/components/quote/QtyInput";
import { QUOTE_UNITS } from "@/lib/constants";
import type { CartItem } from "@/components/quote/useQuoteCart";

/**
 * Teklif listesi (sepet) — kalem başına adet/birim düzenleme ve silme.
 * Fiyat alanı bilinçli olarak yok: fiyat, gönderilen listeye verilen tekliftir.
 */
export function QuoteCart({
  items,
  onQty,
  onUnit,
  onRemove,
  onClear,
}: {
  items: CartItem[];
  onQty: (index: number, qty: number) => void;
  onUnit: (index: number, unit: string) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-steel-300 bg-steel-50 px-5 py-8 text-center text-sm text-steel-500">
        Listeniz boş — yukarıdan ürün arayıp ekleyin.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-steel-900">
          Teklif Listesi{" "}
          <span className="text-sm font-normal text-steel-500">({items.length} kalem)</span>
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-steel-500 underline-offset-4 hover:underline"
        >
          Listeyi temizle
        </button>
      </div>

      <ul className="mt-3 divide-y divide-steel-100 rounded-lg border border-steel-200 bg-white shadow-card">
        {items.map((item, i) => (
          <li key={`${item.code ?? item.freeText}-${i}`} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <div className="hidden size-10 shrink-0 overflow-hidden rounded-md border border-steel-100 bg-photo sm:block">
              <ProductImage
                basePath={item.image}
                alt=""
                sizes="40px"
                className="size-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-steel-900">{item.description}</p>
              {item.code && <p className="font-mono text-xs text-steel-500">{item.code}</p>}
            </div>

            {/* Adet: dokunmatik dostu stepper + doğrudan yazım */}
            <div className="flex shrink-0 items-center rounded-md border border-steel-200">
              <button
                type="button"
                onClick={() => onQty(i, item.qty - 1)}
                className="flex size-8 items-center justify-center text-steel-500 hover:text-steel-900"
                aria-label="Adet azalt"
              >
                <Minus className="size-3.5" />
              </button>
              <QtyInput
                value={item.qty}
                onChange={(qty) => onQty(i, qty)}
                ariaLabel={`${item.description} adet`}
                className="h-8 w-14 rounded-none border-x border-y-0 border-steel-200"
              />
              <button
                type="button"
                onClick={() => onQty(i, item.qty + 1)}
                className="flex size-8 items-center justify-center text-steel-500 hover:text-steel-900"
                aria-label="Adet artır"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <select
              value={item.unit}
              onChange={(e) => onUnit(i, e.target.value)}
              className="h-8 shrink-0 rounded-md border border-steel-200 bg-white px-1.5 text-sm text-steel-700 focus:outline-none"
              aria-label="Birim"
            >
              {QUOTE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onRemove(i)}
              className="shrink-0 text-steel-400 hover:text-status-overdue"
              aria-label="Kalemi sil"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
