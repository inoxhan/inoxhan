"use server";

import { headers } from "next/headers";
import { normalizePhoneTr } from "@/lib/phone";
import { quoteSchema, validateProductPresence } from "@/lib/quote-schema";
import { postQuoteToCrm } from "@/server/crm-webhook";
import { db } from "@/server/db";
import { sendQuoteNotification } from "@/server/email";
import { rateLimit } from "@/server/rate-limit";
import { saveQuoteAttachment } from "@/server/storage";

export type SubmitQuoteResult =
  | { ok: true; quoteId: string }
  | { ok: false; message: string };

/**
 * Teklif talebi oluşturma — dönüşüm hunisinin kalbi.
 * zod doğrulama → müşteri upsert (telefon anahtar) → talep + kalem →
 * ek dosya → e-posta + CRM bildirimi (hata verse de talep kaydı korunur).
 */
export async function submitQuote(formData: FormData): Promise<SubmitQuoteResult> {
  // Kötüye kullanım koruması: IP başına dakikada 5 talep
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`quote:${ip}`, { capacity: 5, refillPerMinute: 5 })) {
    return {
      ok: false,
      message: "Çok fazla deneme yapıldı — lütfen bir dakika sonra tekrar deneyin",
    };
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    productSku: String(formData.get("productSku") ?? ""),
    productText: String(formData.get("productText") ?? ""),
    quantity: String(formData.get("quantity") ?? "1"),
    unit: String(formData.get("unit") ?? "adet"),
    note: String(formData.get("note") ?? ""),
    kvkk: formData.get("kvkk") === "true" || formData.get("kvkk") === "on",
    source: String(formData.get("source") ?? "form"),
  };

  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Form bilgilerini kontrol edin" };
  }
  const values = parsed.data;

  if (!validateProductPresence(values)) {
    return {
      ok: false,
      message: "Lütfen bir ürün seçin veya ihtiyacınızı kısaca yazın",
    };
  }

  const phone = normalizePhoneTr(values.phone)!;

  // Katalog ürünü mü, serbest metin mi?
  const product = values.productSku
    ? await db.product.findUnique({ where: { sku: values.productSku } })
    : null;
  if (values.productSku && !product) {
    // SKU bozuksa serbest metne düş — talep asla kaybolmasın
    values.productText = values.productText || values.productSku;
  }

  // Ek dosya (opsiyonel)
  let attachmentPath: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const saved = await saveQuoteAttachment(file);
    if (!saved.ok) return { ok: false, message: saved.error };
    attachmentPath = saved.relPath;
  }

  const customer = await db.customer.upsert({
    where: { phone },
    update: {
      name: values.name,
      ...(values.company && { company: values.company }),
      ...(values.email && { email: values.email }),
    },
    create: {
      name: values.name,
      company: values.company || null,
      phone,
      email: values.email || null,
    },
  });

  const quote = await db.quoteRequest.create({
    data: {
      customerId: customer.id,
      status: "YENI",
      note: values.note || null,
      attachmentPath,
      source: values.source || "form",
      items: {
        create: [
          {
            productId: product?.id ?? null,
            freeText: product ? null : values.productText || null,
            quantity: values.quantity,
            unit: values.unit,
          },
        ],
      },
    },
  });

  const itemLabel = product
    ? `${product.name} (${product.sku})`
    : (values.productText ?? "Serbest talep");

  // Bildirimler — başarısız olsalar bile talep kaydı geri alınmaz
  const notification = {
    quoteId: quote.id,
    name: values.name,
    company: values.company || null,
    phone,
    email: values.email || null,
    items: [{ label: itemLabel, quantity: values.quantity, unit: values.unit }],
    note: values.note || null,
    hasAttachment: attachmentPath !== null,
    source: values.source || "form",
  };
  const crmPayload = {
    event: "quote.created" as const,
    quoteId: quote.id,
    createdAt: quote.createdAt.toISOString(),
    customer: {
      name: values.name,
      company: values.company || null,
      phone,
      email: values.email || null,
    },
    items: [
      {
        sku: product?.sku ?? null,
        label: itemLabel,
        quantity: values.quantity,
        unit: values.unit,
      },
    ],
    note: values.note || null,
    source: values.source || "form",
  };

  // Sunucu taraflı analitik — hangi üründen teklif istendi (kişisel veri YOK)
  const results = await Promise.allSettled([
    sendQuoteNotification(notification),
    postQuoteToCrm(crmPayload),
    db.analyticsEvent.create({
      data: {
        type: "product_quote_requested",
        payload: JSON.stringify({
          sku: product?.sku ?? "",
          freeText: product ? "" : (values.productText ?? "").slice(0, 120),
          source: values.source || "form",
        }),
      },
    }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("Teklif bildirimi hatası:", r.reason);
  }

  return { ok: true, quoteId: quote.id };
}
