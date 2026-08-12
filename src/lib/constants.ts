/** Site geneli sabitler — tek doğruluk kaynağı. */

export const SITE = {
  name: "İnoxhan",
  legalName: "İnoxhan Hırdavat",
  tagline: "İhtiyacını gönder, en geç 1 saat içinde teklifini al.",
  description:
    "Hırdavat ve bağlantı elemanlarında yüzlerce ürün. İhtiyacını gönder, en geç 1 saat içinde sana özel rekabetçi teklifini al.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** A/B test edilebilir slogan seçenekleri — hero'da SLOGANS[activeSlogan] kullanılır. */
export const SLOGANS = [
  "Fiyat Aramakla Zaman Kaybetme.",
  "Fiyat Arama. Teklif Al.",
  "Aradığın Ürün. Doğru Fiyat. 1 Saat İçinde.",
  "Dakikalar İçinde Talep Oluştur. 1 Saat İçinde Teklifini Al.",
  "Sen Ürünü Seç. En Avantajlı Teklifi Biz Bulalım.",
  "Fiyat Araştırmasına Son. Teklifin 1 Saat İçinde Hazır.",
  "Ne Lazım Olduğunu Söyle. Fiyatını Biz Çözelim.",
] as const;

export const QUOTE_STATUSES = ["YENI", "BEKLEYEN", "CEVAPLANAN"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  YENI: "Yeni",
  BEKLEYEN: "Bekleyen",
  CEVAPLANAN: "Cevaplanan",
};

/** SLA eşikleri (dakika) — panelde renk eskalasyonu. */
export const SLA = { warnAfterMin: 45, breachAfterMin: 60 } as const;

export const QUOTE_UNITS = ["adet", "kutu", "paket", "metre", "kg"] as const;

export const EVENT_TYPES = [
  "quote_button_click",
  "form_open",
  "form_submit",
  "form_abandon",
  "whatsapp_click",
  "product_quote_requested",
  "category_view",
  "search_query",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Teklif kaynakları — hangi noktadan forma gelindi. */
export const QUOTE_SOURCES = ["form", "product", "hero", "floating"] as const;
