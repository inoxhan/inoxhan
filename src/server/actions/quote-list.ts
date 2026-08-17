"use server";

import { headers } from "next/headers";
import { normalizePhoneTr } from "@/lib/phone";
import { quoteListSchema } from "@/lib/quote-list-schema";
import { postQuoteToCrm } from "@/server/crm-webhook";
import { db } from "@/server/db";
import { sendQuoteNotification } from "@/server/email";
import { rateLimit } from "@/server/rate-limit";

export type SubmitQuoteListResult =
  | { ok: true; quoteId: string }
  | { ok: false; message: string };

/**
 * Teklif oluşturucu gönderimi ("liste" kaynağı): ızgaradan/aramadan seçilen
 * varyant kodları + katalogda bulunamayan ihtiyaçlar için serbest metin kalemleri.
 * Dosya/fotoğraf kanalı kaldırıldı — ürününü bulamayan müşteri e-posta atar.
 *
 * Not: submitQuote (tek ürün) bilinçli olarak AYRI bırakıldı — statik derleme
 * o modülü quote-static ile takas ediyor (next.config.ts resolveAlias) ve imza
 * uyumu istiyor. Bu aksiyon yalnız sunucu sürümünde yaşar.
 */
export async function submitQuoteList(formData: FormData): Promise<SubmitQuoteListResult> {
  // Kötüye kullanım koruması: IP başına dakikada 5 talep (bellek içi —
  // serverless'ta instance-başına; kabul edilen kısıt)
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`quote:${ip}`, { capacity: 5, refillPerMinute: 5 })) {
    return {
      ok: false,
      message: "Çok fazla deneme yapıldı — lütfen bir dakika sonra tekrar deneyin",
    };
  }

  let itemsRaw: unknown;
  try {
    itemsRaw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, message: "Liste okunamadı — sayfayı yenileyip tekrar deneyin" };
  }

  const parsed = quoteListSchema.safeParse({
    company: String(formData.get("company") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    email: String(formData.get("email") ?? ""),
    note: String(formData.get("note") ?? ""),
    kvkk: formData.get("kvkk") === "true" || formData.get("kvkk") === "on",
    source: String(formData.get("source") ?? "liste"),
    items: itemsRaw,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Form bilgilerini kontrol edin" };
  }
  const values = parsed.data;
  const phone = normalizePhoneTr(values.phone)!;

  // Varyant kodları tek sorguda çözülür; çözülemeyen kod serbest metne düşer —
  // talep asla kaybolmasın (quote.ts ile aynı ilke)
  const kodlar = values.items.map((i) => i.code?.trim()).filter((c): c is string => Boolean(c));
  const variants = kodlar.length
    ? await db.variant.findMany({
        where: { code: { in: kodlar } },
        select: { id: true, code: true, description: true, productId: true },
      })
    : [];
  const variantMap = new Map(variants.map((v) => [v.code, v]));

  // Ad boşsa firma adı müşteri adı olarak kullanılır (Customer.name zorunlu)
  const gorunenAd = values.name?.trim() || values.company?.trim() || "";

  const customer = await db.customer.upsert({
    where: { phone },
    update: {
      name: gorunenAd,
      address: values.address,
      ...(values.company && { company: values.company }),
      ...(values.email && { email: values.email }),
    },
    create: {
      name: gorunenAd,
      company: values.company || null,
      phone,
      email: values.email || null,
      address: values.address,
    },
  });

  const quote = await db.quoteRequest.create({
    data: {
      customerId: customer.id,
      status: "YENI",
      note: values.note || null,
      source: values.source,
      items: {
        create: values.items.map((item, i) => {
          const variant = item.code ? variantMap.get(item.code.trim()) : undefined;
          return {
            variantId: variant?.id ?? null,
            productId: variant?.productId ?? null,
            freeText: variant ? null : (item.freeText?.trim() || item.code?.trim() || null),
            quantity: item.quantity,
            unit: item.unit,
            quality: item.quality || null,
            order: i,
          };
        }),
      },
    },
  });

  const etiketler = values.items.map((item) => {
    const variant = item.code ? variantMap.get(item.code.trim()) : undefined;
    return {
      label: variant
        ? `${variant.code} — ${variant.description}`
        : (item.freeText?.trim() || item.code?.trim() || "Serbest talep"),
      quantity: item.quantity,
      unit: item.unit,
      quality: item.quality || null,
      sku: variant?.code ?? null,
    };
  });

  // Bildirimler — başarısız olsalar bile talep kaydı geri alınmaz
  const results = await Promise.allSettled([
    sendQuoteNotification({
      quoteId: quote.id,
      name: gorunenAd,
      company: values.company || null,
      phone,
      email: values.email || null,
      address: values.address,
      items: etiketler,
      note: values.note || null,
      hasAttachment: false,
      source: values.source,
    }),
    postQuoteToCrm({
      event: "quote.created",
      quoteId: quote.id,
      createdAt: quote.createdAt.toISOString(),
      customer: {
        name: gorunenAd,
        company: values.company || null,
        phone,
        email: values.email || null,
      },
      items: etiketler.map(({ sku, label, quantity, unit, quality }) => ({
        sku,
        label,
        quantity,
        unit,
        quality,
      })),
      note: values.note || null,
      source: values.source,
    }),
    // Sunucu taraflı analitik — kişisel veri YOK
    db.analyticsEvent.create({
      data: {
        type: "quote_list_submitted",
        payload: JSON.stringify({
          source: values.source,
          itemCount: values.items.length,
          codes: etiketler.map((e) => e.sku).filter(Boolean).slice(0, 30),
        }),
      },
    }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("Teklif bildirimi hatası:", r.reason);
  }

  return { ok: true, quoteId: quote.id };
}
