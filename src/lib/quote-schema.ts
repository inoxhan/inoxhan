import { z } from "zod";
import { normalizePhoneTr } from "@/lib/phone";
import { QUOTE_UNITS } from "@/lib/constants";

/**
 * Teklif formu doğrulama şeması — istemcide (RHF) ve sunucuda (server action)
 * AYNI şema kullanılır; tek doğruluk kaynağı.
 */
export const quoteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ad Soyad en az 2 karakter olmalı")
    .max(120, "Ad Soyad çok uzun"),
  company: z.string().trim().max(160, "Firma adı çok uzun").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePhoneTr(v) !== null, {
      message: "Geçerli bir telefon numarası girin (örn. 0 5xx xxx xx xx)",
    }),
  email: z.email("Geçerli bir e-posta adresi girin").max(160),
  // Katalogdan gelindiyse SKU dolu olur; serbest metin ihtiyaç da yazılabilir.
  productSku: z.string().trim().max(60).optional().or(z.literal("")),
  productText: z.string().trim().max(300, "Ürün açıklaması çok uzun").optional().or(z.literal("")),
  quantity: z.coerce.number().int("Adet tam sayı olmalı").min(1, "Adet en az 1 olmalı").max(1_000_000),
  unit: z.enum(QUOTE_UNITS),
  note: z.string().trim().max(2000, "Not çok uzun").optional().or(z.literal("")),
  kvkk: z.boolean().refine((v) => v === true, {
    message: "Devam etmek için KVKK metnini onaylamanız gerekir",
  }),
  source: z.string().trim().max(30).optional().or(z.literal("")),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

/** Ürün bilgisi tamamen boşsa reddet — ya SKU ya serbest metin gerekli. */
export function validateProductPresence(values: Pick<QuoteFormValues, "productSku" | "productText">) {
  return Boolean(values.productSku?.trim() || values.productText?.trim());
}

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "application/pdf",
] as const;
