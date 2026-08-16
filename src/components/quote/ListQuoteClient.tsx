"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CustomerInfoFields, inputClass } from "@/components/quote/CustomerInfoFields";
import { QuoteCart } from "@/components/quote/QuoteCart";
import { QuoteSuccess } from "@/components/quote/QuoteSuccess";
import { useQuoteCart } from "@/components/quote/useQuoteCart";
import { VariantPicker } from "@/components/quote/VariantPicker";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics-client";
import {
  quoteCustomerSchema,
  type QuoteCustomerValues,
} from "@/lib/quote-list-schema";
import { submitQuoteList } from "@/server/actions/quote-list";

/**
 * Hızlı teklif kanalı — tam katalogdan tik ile liste oluştur, gönder,
 * 15-30 dakikada fiyat al. Sepet localStorage'da yaşar (useQuoteCart).
 */
export function ListQuoteClient({ initialQuery = "" }: { initialQuery?: string }) {
  const cart = useQuoteCart();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");

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
          quality: "",
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
      {/* Sol: arama + sonuçlar */}
      <div>
        <VariantPicker
          onAdd={(v) => cart.addVariant(v)}
          addedCodes={addedCodes}
          initialQuery={initialQuery}
        />

        {/* Katalogda bulunamayan ihtiyaç — serbest metin kalemi */}
        <div className="mt-5 flex gap-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cart.addFreeText(freeText);
                setFreeText("");
              }
            }}
            placeholder="Listede yok mu? Serbest metinle ekleyin (örn. 8'lik dübel, siyah)"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => {
              cart.addFreeText(freeText);
              setFreeText("");
            }}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-steel-300 px-4 text-sm font-medium text-steel-700 hover:border-steel-500"
          >
            <ListPlus className="size-4" aria-hidden />
            Ekle
          </button>
        </div>
      </div>

      {/* Sağ: sepet + müşteri bilgileri (masaüstünde yapışkan) */}
      <div className="lg:sticky lg:top-24">
        <QuoteCart
          items={cart.items}
          onQty={cart.setQty}
          onUnit={cart.setUnit}
          onRemove={cart.remove}
          onClear={cart.clear}
        />

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold text-steel-900">
            İletişim Bilgileri
          </h2>
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
    </div>
  );
}
