"use client";

import { ArrowLeft, Check, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { QtyInput } from "@/components/quote/QtyInput";
import type { VariantIndex } from "@/components/quote/useVariantIndex";
import { QUALITY_LABELS, QUALITY_OPTIONS } from "@/lib/constants";
import { onEkiAt, ortakOnEk } from "@/lib/ortak-onek";
import { cn } from "@/lib/utils";
import type { VariantIndexItem } from "@/lib/variant-search-client";
import { filtreleVaryantlar } from "@/lib/varyant-filtre";
import type { QuoteFamily } from "@/server/catalog";

/** Tek seferde basılan azami satır — kalabalık ailelerde filtreye yönlendirir. */
const MAX_SATIR = 200;

/**
 * Izgaradan seçilen ailenin ölçü listesi — sayfa değişmeden ızgaranın altında açılır.
 * Veri, arama kutusuyla paylaşılan varyant indeksinden productSlug ile süzülür.
 */
export function FamilySizePanel({
  family,
  index,
  addedCodes,
  onAdd,
  onClose,
  initialQuality = null,
}: {
  family: QuoteFamily;
  index: VariantIndex;
  addedCodes: Set<string>;
  onAdd: (v: VariantIndexItem, qty: number) => void;
  onClose: () => void;
  initialQuality?: string | null;
}) {
  const [filtre, setFiltre] = useState("");
  const [kalite, setKalite] = useState<string | null>(initialQuality);
  const { items, loading, error, ensure } = index;

  useEffect(() => {
    void ensure();
  }, [ensure]);

  // Not: aile değişince filtrelerin sıfırlanması, QuoteBuilder'daki
  // key={family.sku} ile bileşen yeniden kurularak sağlanır.
  const olculer = useMemo(
    () => (items ?? []).filter((v) => v.productSlug === family.slug),
    [items, family.slug],
  );

  const kaliteler = useMemo(
    () => QUALITY_OPTIONS.filter((q) => olculer.some((v) => v.quality === q)),
    [olculer],
  );

  // Filtreden bağımsız hesaplanır ki süzerken satır etiketi değişmesin
  const onEk = useMemo(() => ortakOnEk(olculer.map((v) => v.description)), [olculer]);

  // Arama kutusuyla AYNI eşleştirme: panelde "8" yazınca M18 değil M8 kalır
  const sonuc = useMemo(() => {
    const kaliteliler = kalite ? olculer.filter((v) => v.quality === kalite) : olculer;
    if (!filtre.trim()) {
      return { items: kaliteliler.slice(0, MAX_SATIR), capSuzuldu: false, toplam: kaliteliler.length };
    }
    return filtreleVaryantlar(kaliteliler, filtre, MAX_SATIR);
  }, [olculer, filtre, kalite]);
  const gorunen = sonuc.items;

  return (
    <section
      id="olcu-paneli"
      className="rounded-lg border-2 border-steel-950 bg-white p-4 shadow-elevated"
    >
      {/* Mobilde ürün listesi gizlendiği için geri dönüş yolu burada durmalı */}
      <button
        type="button"
        onClick={onClose}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-steel-500 hover:text-steel-900 lg:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tüm ürünler
      </button>

      <header className="flex items-start gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-md border border-steel-100 bg-photo">
          <ProductImage
            basePath={family.image}
            alt=""
            sizes="56px"
            thumb
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-steel-900">{family.name}</h3>
          <p className="text-sm text-steel-500">
            <span className="font-mono">{family.sku}</span>
            {olculer.length > 0 && ` — ${olculer.length} ölçü`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden shrink-0 rounded-md p-1.5 text-steel-400 hover:bg-steel-50 hover:text-steel-700 lg:block"
          aria-label="Ölçü panelini kapat"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel-400"
            aria-hidden
          />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Ölçü ara (örn. M8x40)"
            aria-label={`${family.name} içinde ölçü ara`}
            className="h-10 w-full rounded-md border border-steel-200 bg-white pr-3 pl-9 text-sm text-steel-900 placeholder:text-steel-400 focus:border-steel-500 focus:outline-none"
          />
        </div>
        {kaliteler.length > 1 && (
          <div className="flex gap-1.5">
            <KaliteCip aktif={kalite === null} onClick={() => setKalite(null)}>
              Tümü
            </KaliteCip>
            {kaliteler.map((q) => (
              <KaliteCip key={q} aktif={kalite === q} onClick={() => setKalite(q)}>
                {QUALITY_LABELS[q]}
              </KaliteCip>
            ))}
          </div>
        )}
      </div>

      {loading && !items && (
        <p className="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-steel-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Ölçüler yükleniyor…
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-status-overdue/30 bg-status-overdue/5 px-4 py-3 text-sm text-status-overdue">
          {error}
        </p>
      )}

      {items && olculer.length === 0 && (
        <p className="mt-4 rounded-md border border-dashed border-steel-300 bg-steel-50 px-4 py-4 text-sm text-steel-600">
          Bu ürünün ölçüleri henüz listeye eklenmedi. İhtiyacınızı yukarıdaki arama
          kutusundan ya da aşağıdaki serbest metin satırından yazarak gönderebilirsiniz.
        </p>
      )}

      {items && olculer.length > 0 && (
        <>
          <ul className="mt-3 max-h-[40vh] divide-y divide-steel-100 overflow-y-auto rounded-md border border-steel-200">
            {gorunen.map((v) => (
              <SizeRow
                key={v.code}
                variant={v}
                etiket={onEkiAt(v.description, onEk)}
                added={addedCodes.has(v.code)}
                onAdd={(qty) => onAdd(v, qty)}
              />
            ))}
            {gorunen.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-steel-500">
                Bu filtreyle ölçü bulunamadı.
              </li>
            )}
          </ul>
          {(sonuc.toplam > gorunen.length || sonuc.capSuzuldu) && (
            <p className="mt-2 text-xs text-steel-500">
              {sonuc.toplam > gorunen.length &&
                `${sonuc.toplam} ölçüden ilk ${gorunen.length} tanesi gösteriliyor — aramayla daraltın. `}
              {sonuc.capSuzuldu && "Çap eşleşmesi gösteriliyor; uzunluk için 8x40 gibi yazın."}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function SizeRow({
  variant,
  etiket,
  added,
  onAdd,
}: {
  variant: VariantIndexItem;
  /** Ortak ön ek atılmış kısa ad ("M8x40 A2") */
  etiket: string;
  added: boolean;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);

  return (
    <li className="flex items-center gap-2 bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words text-steel-900" title={variant.description}>
          {etiket}
        </p>
        <p className="font-mono text-xs text-steel-500">{variant.code}</p>
      </div>
      <QtyInput value={qty} onChange={setQty} ariaLabel={`${variant.code} adet`} />
      <button
        type="button"
        onClick={() => onAdd(qty)}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
          added
            ? "border border-status-answered/40 bg-status-answered/10 text-status-answered"
            : "bg-steel-950 text-steel-50 hover:bg-steel-800",
        )}
        aria-label={added ? `${variant.code} listede — adet ekle` : `${variant.code} listeye ekle`}
      >
        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
        {added ? "Listede" : "Ekle"}
      </button>
    </li>
  );
}

function KaliteCip({
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
        "h-10 rounded-md border px-3 text-sm font-medium transition-colors",
        aktif
          ? "border-steel-950 bg-steel-950 text-steel-50"
          : "border-steel-200 bg-white text-steel-600 hover:border-steel-400",
      )}
    >
      {children}
    </button>
  );
}
