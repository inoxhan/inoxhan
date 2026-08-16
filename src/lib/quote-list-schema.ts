import { z } from "zod";
import { normalizePhoneTr } from "@/lib/phone";
import { QUALITY_OPTIONS, QUOTE_UNITS } from "@/lib/constants";

/**
 * İki kanallı teklif sisteminin ortak şeması — istemcide (RHF) ve sunucuda
 * (submitQuoteList) AYNI şema kullanılır; quote-schema.ts ile aynı ilke.
 *
 * Kanal "liste": items ürün varyantı kodlarıyla dolu gelir.
 * Kanal "dosya": items kısa açıklamalı tek serbest kalem olabilir; en az bir
 * dosya zorunluluğu form katmanında denetlenir (dosyalar ayrı yüklenir).
 */

/** Sepet kalemi — varyant kodu YA DA serbest metin taşır. */
export const quoteListItemSchema = z
  .object({
    code: z.string().trim().max(40).optional().or(z.literal("")),
    freeText: z.string().trim().max(300, "Kalem açıklaması çok uzun").optional().or(z.literal("")),
    quantity: z.coerce
      .number()
      .int("Adet tam sayı olmalı")
      .min(1, "Adet en az 1 olmalı")
      .max(1_000_000),
    unit: z.enum(QUOTE_UNITS),
    quality: z.enum(QUALITY_OPTIONS).optional().or(z.literal("")),
  })
  .refine((v) => Boolean(v.code?.trim() || v.freeText?.trim()), {
    message: "Kalemde ürün kodu veya açıklama olmalı",
  });

export const MAX_LIST_ITEMS = 100;

/** Müşteri alanları — istemci formu (RHF) yalnız bunları doğrular; items sepetten gelir. */
const musteriAlanlari = {
  company: z.string().trim().max(160, "Firma adı çok uzun").optional().or(z.literal("")),
  name: z.string().trim().max(120, "Ad Soyad çok uzun").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePhoneTr(v) !== null, {
      message: "Geçerli bir telefon numarası girin (örn. 0 5xx xxx xx xx)",
    }),
  address: z
    .string()
    .trim()
    .min(10, "Kargo için açık adres girin")
    .max(500, "Adres çok uzun"),
  email: z.email("Geçerli bir e-posta adresi girin").max(160).optional().or(z.literal("")),
  note: z.string().trim().max(2000, "Not çok uzun").optional().or(z.literal("")),
  kvkk: z.boolean().refine((v) => v === true, {
    message: "Devam etmek için KVKK metnini onaylamanız gerekir",
  }),
};

const firmaVeyaAd = {
  check: (v: { company?: string; name?: string }) =>
    Boolean(v.company?.trim() || v.name?.trim()),
  params: {
    message: "Firma adı veya Ad Soyad'dan en az biri gerekli",
    path: ["company"] as (string | number)[],
  },
};

export const quoteCustomerSchema = z
  .object(musteriAlanlari)
  .refine(firmaVeyaAd.check, firmaVeyaAd.params);

export const quoteListSchema = z
  .object({
    ...musteriAlanlari,
    source: z.enum(["liste", "dosya"]),
    items: z
      .array(quoteListItemSchema)
      .min(1, "Listeye en az bir ürün ekleyin")
      .max(MAX_LIST_ITEMS, `Tek talepte en fazla ${MAX_LIST_ITEMS} kalem gönderilebilir`),
  })
  .refine(firmaVeyaAd.check, firmaVeyaAd.params);

export type QuoteCustomerValues = z.infer<typeof quoteCustomerSchema>;
export type QuoteListValues = z.infer<typeof quoteListSchema>;
export type QuoteListItem = z.infer<typeof quoteListItemSchema>;
