"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListChecks, ListPlus, Loader2, Mail, Zap } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CustomerInfoFields, inputClass } from "@/components/quote/CustomerInfoFields";
import { FamilyList } from "@/components/quote/FamilyList";
import { FamilySizePanel } from "@/components/quote/FamilySizePanel";
import { QuoteCart } from "@/components/quote/QuoteCart";
import { QuoteSuccess } from "@/components/quote/QuoteSuccess";
import { useQuoteCart } from "@/components/quote/useQuoteCart";
import { useVariantIndex } from "@/components/quote/useVariantIndex";
import { VariantPicker } from "@/components/quote/VariantPicker";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics-client";
import { SITE } from "@/lib/constants";
import {
  MAX_LIST_ITEMS,
  quoteCustomerSchema,
  type QuoteCustomerValues,
} from "@/lib/quote-list-schema";
import { cn } from "@/lib/utils";
import type { VariantIndexItem } from "@/lib/variant-search-client";
import { submitQuoteList } from "@/server/actions/quote-list";
import type { QuoteFamily } from "@/server/catalog";

/**
 * Tek sayfalık teklif oluşturucu: fotoğraflı ürün ızgarası + ölçü paneli +
 * yapışkan liste + iletişim formu. Müşteri sayfadan hiç ayrılmaz.
 * Liste localStorage'da yaşar (useQuoteCart), gönderim submitQuoteList'e gider.
 */
export function QuoteBuilder({
  families,
  initialSku = null,
  initialQuality = null,
}: {
  families: QuoteFamily[];
  /** Ürün detayından ?urun=DIN 933 ile gelindiyse o ailenin paneli açık gelir */
  initialSku?: string | null;
  initialQuality?: string | null;
}) {
  const cart = useQuoteCart();
  const index = useVariantIndex();
  const [query, setQuery] = useState("");
  const [secili, setSecili] = useState<QuoteFamily | null>(
    () => families.find((f) => f.sku === initialSku) ?? null,
  );
  const [freeText, setFreeText] = useState("");
  const [uyari, setUyari] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuoteCustomerValues>({
    resolver: zodResolver(quoteCustomerSchema),
    defaultValues: { kvkk: false },
  });

  const addedCodes = new Set(
    cart.items.map((i) => i.code).filter((c): c is string => Boolean(c)),
  );
  const searching = query.trim().length >= 2;

  function ekle(v: VariantIndexItem, qty = 1) {
    if (cart.items.length >= MAX_LIST_ITEMS && !addedCodes.has(v.code)) {
      setUyari(`Tek talepte en fazla ${MAX_LIST_ITEMS} kalem gönderebilirsiniz.`);
      return;
    }
    setUyari(null);
    cart.addVariant(v, qty);
  }

  function aileSec(family: QuoteFamily) {
    setSecili(family);
    setQuery("");
  }

  function serbestEkle() {
    if (!freeText.trim()) return;
    if (cart.items.length >= MAX_LIST_ITEMS) {
      setUyari(`Tek talepte en fazla ${MAX_LIST_ITEMS} kalem gönderebilirsiniz.`);
      return;
    }
    cart.addFreeText(freeText);
    setFreeText("");
    setUyari(null);
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (cart.items.length === 0) {
      setServerError("Listeye en az bir ürün ekleyin");
      return;
    }

    const fd = new FormData();
    fd.set("company", values.company ?? "");
    fd.set("name", values.name ?? "");
    fd.set("phone", values.phone);
    fd.set("address", values.address);
    fd.set("email", values.email ?? "");
    fd.set("note", values.note ?? "");
    fd.set("kvkk", String(values.kvkk));
    fd.set("source", "liste");
    fd.set(
      "items",
      JSON.stringify(
        cart.items.map((i) => ({
          code: i.code ?? "",
          freeText: i.freeText ?? "",
          quantity: i.qty,
          unit: i.unit,
          // Varyanttan gelen A2/A4 sunucuya taşınır; başka değer şemaya takılmasın
          quality: i.quality === "A2" || i.quality === "A4" ? i.quality : "",
        })),
      ),
    );

    const res = await submitQuoteList(fd);
    if (res.ok) {
      track("form_submit", { source: "liste", items: cart.items.length });
      cart.clear();
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setServerError(res.message);
    }
  });

  if (done) return <QuoteSuccess />;

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
      {/* Sol: arama + ürün listesi + serbest metin.
          min-w-0: sütun içeriğin doğal genişliğine büyümesin (uzun ürün
          açıklamaları mobilde yatay kaydırma yaratıyordu) */}
      <div className="min-w-0">
        <VariantPicker
          query={query}
          onQueryChange={setQuery}
          index={index}
          onAdd={(v) => ekle(v)}
          addedCodes={addedCodes}
        />

        {/* Mobilde ölçü paneli açıkken ürün listesi gizlenir (panel sağ sütunda,
            yani tek sütunlu düzende listenin altında kalıyor) */}
        {!searching && (
          <div className={cn("mt-6", secili && "hidden lg:block")}>
            <FamilyList families={families} selectedSku={secili?.sku ?? null} onSelect={aileSec} />
          </div>
        )}

        {/* Katalogda bulunamayan ihtiyaç — serbest metin kalemi */}
        <div
          className={cn(
            "mt-6 rounded-lg border border-steel-200 bg-steel-50 p-4",
            secili && "hidden lg:block",
          )}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  serbestEkle();
                }
              }}
              placeholder="Listede yok mu? Kendiniz yazın (örn. 8'lik dübel, siyah)"
              className={inputClass}
            />
            <button
              type="button"
              onClick={serbestEkle}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-steel-300 bg-white px-4 text-sm font-medium text-steel-700 hover:border-steel-500"
            >
              <ListPlus className="size-4" aria-hidden />
              Ekle
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-steel-500">
            <Mail className="size-3.5" aria-hidden />
            Aradığınızı bulamadınız mı?{" "}
            <a href={`mailto:${SITE.email}`} className="underline underline-offset-2">
              {SITE.email}
            </a>{" "}
            adresine yazın.
          </p>
        </div>

        {uyari && (
          <p className="mt-3 rounded-md border border-status-pending/30 bg-status-pending/5 px-4 py-3 text-sm text-status-pending">
            {uyari}
          </p>
        )}
      </div>

      {/* Sağ: ölçü paneli (seçiliyken en üstte) + liste + müşteri bilgileri.
          Masaüstünde yapışkan ve kendi içinde kayar — sayfa hiç sıçramaz. */}
      <div
        id="teklif-formu"
        className="min-w-0 space-y-6 scroll-mt-24 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1"
      >
        {/* Ölçü paneli açıkken liste aşağıda kalıyor — tek dokunuşla öne getir */}
        {secili && cart.items.length > 0 && (
          <button
            type="button"
            onClick={() => setSecili(null)}
            className="flex w-full items-center justify-between rounded-lg border border-steel-300 bg-white px-4 py-2.5 text-sm font-medium text-steel-800 shadow-card transition-colors hover:border-steel-500"
          >
            <span className="flex items-center gap-2">
              <ListChecks className="size-4 text-signal" aria-hidden />
              Listem ({cart.items.length} kalem)
            </span>
            <span className="text-steel-500">göster</span>
          </button>
        )}

        {secili && (
          <FamilySizePanel
            key={secili.sku} // aile değişince filtreler sıfırdan kurulsun
            family={secili}
            index={index}
            addedCodes={addedCodes}
            onAdd={ekle}
            onClose={() => setSecili(null)}
            initialQuality={initialQuality}
          />
        )}

        <QuoteCart
          items={cart.items}
          onQty={cart.setQty}
          onUnit={cart.setUnit}
          onRemove={cart.remove}
          onClear={cart.clear}
        />

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-5 rounded-lg border border-steel-200 bg-white p-5 shadow-card"
        >
          <h2 className="font-display text-lg font-semibold text-steel-900">İletişim Bilgileri</h2>
          <CustomerInfoFields register={register} errors={errors} />

          {serverError && (
            <p className="rounded-md border border-status-overdue/30 bg-status-overdue/5 px-4 py-3 text-sm text-status-overdue">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            variant="metallic"
            size="lg"
            className="w-full"
            disabled={isSubmitting || cart.items.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Zap className="size-5" aria-hidden />
            )}
            {isSubmitting
              ? "Gönderiliyor…"
              : `Listeyi Gönder${cart.items.length ? ` (${cart.items.length} kalem)` : ""}`}
          </Button>
          <p className="text-center text-sm text-steel-500">
            15-30 dakika içinde fiyat teklifinizle dönüyoruz
          </p>
        </form>
      </div>

      {/* Mobil: seçim yapılınca alt çubuk — listeye tek dokunuşla iner */}
      {cart.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-steel-200 bg-white/95 px-4 py-3 shadow-elevated backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() =>
              document.getElementById("teklif-formu")?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-steel-950 text-sm font-semibold text-steel-50"
          >
            <Zap className="size-4" aria-hidden />
            Listem ({cart.items.length} kalem) — Bilgileri gir ve gönder
          </button>
        </div>
      )}
    </div>
  );
}
