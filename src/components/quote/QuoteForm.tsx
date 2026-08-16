"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip, X, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { asset } from "@/lib/asset";
import { QuoteSuccess } from "@/components/quote/QuoteSuccess";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics-client";
import { IS_STATIC } from "@/lib/asset";
import {
  QUALITY_HINTS,
  QUALITY_LABELS,
  QUALITY_OPTIONS,
  QUOTE_UNITS,
} from "@/lib/constants";
import type { z } from "zod";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  quoteSchema,
  type QuoteFormValues,
} from "@/lib/quote-schema";

/** RHF, zod coerce alanları için girdi/çıktı tiplerini ayrı ister. */
type QuoteFormInput = z.input<typeof quoteSchema>;
import { submitQuote } from "@/server/actions/quote";
import { cn } from "@/lib/utils";

export interface PreselectedProduct {
  sku: string;
  name: string;
}

interface QuoteFormProps {
  preselected?: PreselectedProduct | null;
  source?: string;
  /** Ürün detayından seçilerek gelinen paslanmaz kalite sınıfı */
  preselectedQuality?: string;
}

const inputClass =
  "h-11 w-full rounded-md border border-steel-200 bg-white px-3.5 text-[15px] text-steel-900 placeholder:text-steel-400 focus:border-steel-500 focus:outline-none";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-steel-700">
        {label}
        {required && <span className="text-status-overdue"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-status-overdue">{error}</span>}
    </label>
  );
}

export function QuoteForm({
  preselected,
  source = "form",
  preselectedQuality,
}: QuoteFormProps) {
  const [done, setDone] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [productLocked, setProductLocked] = useState(Boolean(preselected));
  // Statik yayında sorgu dizesi sunucuda okunamıyor; ürün ön seçimi tarayıcıda kurulur
  const [staticPreselected, setStaticPreselected] = useState<PreselectedProduct | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const query = useSearchParams();

  // form_open (mount) + form_abandon (gönderilmeden sayfadan ayrılma)
  useEffect(() => {
    track("form_open", { source, sku: preselected?.sku ?? "" });
    const onPageHide = () => {
      if (!submittedRef.current) track("form_abandon", { source });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormInput, unknown, QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      productSku: preselected?.sku ?? "",
      productText: "",
      quantity: 1,
      unit: "adet",
      quality: (QUALITY_OPTIONS as readonly string[]).includes(preselectedQuality ?? "")
        ? (preselectedQuality as (typeof QUALITY_OPTIONS)[number])
        : "A2",
      kvkk: false,
      source,
    },
  });

  // Statik yayında ?urun=SKU&kalite=A4&kaynak=product ürün detayından geliyor.
  // Ürün adı, yayında zaten duran arama indeksinden (search-index.json) çözülür;
  // indeks gelmezse SKU serbest metin alanına düşer — talep yine ürünü taşır.
  useEffect(() => {
    if (!IS_STATIC || preselected) return;
    const sku = query.get("urun");
    const kalite = query.get("kalite");
    const kaynak = query.get("kaynak");
    if (kalite === "A2" || kalite === "A4") setValue("quality", kalite);
    if (kaynak) setValue("source", kaynak === "product" ? "product" : kaynak);
    if (!sku) return;
    let iptal = false;
    fetch(asset("search-index.json"))
      .then((r) => r.json())
      .then((items: { sku: string; name: string }[]) => {
        if (iptal) return;
        const urun = items.find((p) => p.sku === sku);
        if (urun) {
          setStaticPreselected({ sku: urun.sku, name: urun.name });
          setProductLocked(true);
          setValue("productSku", urun.sku);
        } else {
          setValue("productText", sku);
        }
      })
      .catch(() => {
        if (!iptal) setValue("productText", sku);
      });
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0];
    if (!f) {
      setFileName(null);
      return;
    }
    if (f.size > ATTACHMENT_MAX_BYTES) {
      setFileError("Dosya 10 MB'dan büyük olamaz");
      e.target.value = "";
      setFileName(null);
      return;
    }
    if (!ATTACHMENT_TYPES.includes(f.type as (typeof ATTACHMENT_TYPES)[number])) {
      setFileError("Yalnızca fotoğraf veya PDF yükleyebilirsiniz");
      e.target.value = "";
      setFileName(null);
      return;
    }
    setFileName(f.name);
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("company", values.company ?? "");
    fd.set("phone", values.phone);
    fd.set("email", values.email ?? "");
    fd.set("productSku", productLocked ? (values.productSku ?? "") : "");
    fd.set("productText", values.productText ?? "");
    fd.set("quantity", String(values.quantity));
    fd.set("unit", values.unit);
    fd.set("quality", values.quality ?? "");
    fd.set("note", values.note ?? "");
    fd.set("kvkk", String(values.kvkk));
    fd.set("source", values.source ?? source);
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("attachment", file);

    const res = await submitQuote(fd);
    if (res.ok) {
      submittedRef.current = true;
      track("form_submit", { source, sku: values.productSku ?? "" });
      setDone(res.quoteId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setServerError(res.message);
    }
  });

  if (done) {
    return (
      <QuoteSuccess
        kanal={done === "eposta" || done === "whatsapp" ? done : undefined}
      />
    );
  }

  const seciliUrun = preselected ?? staticPreselected;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" {...register("source")} />
      <input type="hidden" {...register("productSku")} />

      {/* Ürün */}
      {productLocked && seciliUrun ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-steel-200 bg-steel-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-steel-900">{seciliUrun.name}</p>
            <p className="font-mono text-xs text-steel-500">{seciliUrun.sku}</p>
          </div>
          <button
            type="button"
            onClick={() => setProductLocked(false)}
            className="shrink-0 text-sm text-steel-500 underline-offset-4 hover:underline"
          >
            Değiştir
          </button>
        </div>
      ) : (
        <Field
          label="Ürün / İhtiyacınız"
          required
          error={errors.productText?.message}
        >
          <input
            type="text"
            placeholder="Ürün adı, kodu veya kısaca ihtiyacınız (örn. 8'lik dübel, 1000 adet)"
            className={inputClass}
            {...register("productText")}
          />
        </Field>
      )}

      {/* Paslanmaz kalite sınıfı — fiyat farkı yarattığı için baştan sorulur */}
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-steel-700">
          Kalite <span className="text-status-overdue">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUALITY_OPTIONS.map((q) => (
            <label
              key={q}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-steel-200 bg-white px-4 py-3 transition-colors has-checked:border-steel-950 has-checked:bg-steel-50"
            >
              <input
                type="radio"
                value={q}
                className="mt-0.5 size-4 shrink-0 accent-steel-950"
                {...register("quality")}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-steel-900">
                  {QUALITY_LABELS[q]}
                </span>
                <span className="block text-xs text-steel-500">{QUALITY_HINTS[q]}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-steel-400">
          Emin değilseniz A2 seçin, ekibimiz kullanım yerinize göre yönlendirsin.
        </p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ad Soyad" required error={errors.name?.message}>
          <input type="text" autoComplete="name" className={inputClass} {...register("name")} />
        </Field>
        <Field label="Firma" error={errors.company?.message}>
          <input
            type="text"
            autoComplete="organization"
            placeholder="Opsiyonel"
            className={inputClass}
            {...register("company")}
          />
        </Field>
        <Field label="Telefon" required error={errors.phone?.message}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0 (5xx) xxx xx xx"
            className={inputClass}
            {...register("phone")}
          />
        </Field>
        <Field label="E-posta" error={errors.email?.message}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            {...register("email")}
          />
        </Field>
        <Field label="Adet" required error={errors.quantity?.message}>
          <input type="number" min={1} className={inputClass} {...register("quantity")} />
        </Field>
        <Field label="Birim" error={errors.unit?.message}>
          <select className={inputClass} {...register("unit")}>
            {QUOTE_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Not" error={errors.note?.message}>
        <textarea
          rows={3}
          placeholder="Teslimat, ölçü, kaplama gibi detaylar… (opsiyonel)"
          className={cn(inputClass, "h-auto py-2.5")}
          {...register("note")}
        />
      </Field>

      {/* Dosya — "Bana bu ürün lazım". Statik yayında sunucu yok, dosya alınamaz. */}
      {!IS_STATIC && (
      <div>
        <span className="mb-1.5 block text-sm font-medium text-steel-700">
          Fotoğraf / Dosya <span className="font-normal text-steel-400">(opsiyonel)</span>
        </span>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-steel-300 bg-steel-50 px-4 py-3.5 text-sm text-steel-500 transition-colors hover:border-steel-500",
            fileName && "border-solid border-steel-400 text-steel-800",
          )}
        >
          <Paperclip className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            {fileName ?? "Ürünün adını bilmiyorsanız fotoğrafını yükleyin — “Bana bu ürün lazım” deyin."}
          </span>
          {fileName && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (fileRef.current) fileRef.current.value = "";
                setFileName(null);
              }}
              className="shrink-0 text-steel-400 hover:text-steel-700"
              aria-label="Dosyayı kaldır"
            >
              <X className="size-4" />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={onFileChange}
          />
        </label>
        {fileError && <p className="mt-1 text-sm text-status-overdue">{fileError}</p>}
      </div>
      )}

      {/* KVKK */}
      <label className="flex items-start gap-3 text-sm text-steel-600">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-steel-950"
          {...register("kvkk")}
        />
        <span>
          <Link href="/kvkk" target="_blank" className="underline underline-offset-4">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni okudum; iletişim bilgilerimin teklif süreci için işlenmesini
          onaylıyorum.
        </span>
      </label>
      {errors.kvkk && <p className="text-sm text-status-overdue">{errors.kvkk.message}</p>}

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
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <Zap className="size-5" aria-hidden />
        )}
        {isSubmitting
          ? IS_STATIC
            ? "Hazırlanıyor…"
            : "Gönderiliyor…"
          : IS_STATIC
            ? "Teklif Talebini E-posta ile Gönder"
            : "Teklif Talebini Gönder"}
      </Button>
      <p className="text-center text-sm text-steel-500">
        {IS_STATIC
          ? "Talebiniz hazır bir e-posta taslağına dönüştürülür — gönderin, 15-30 dakika içinde dönüş yapalım"
          : "Ortalama tamamlama süresi 45 saniye · 15-30 dakika içinde dönüş"}
      </p>
    </form>
  );
}
