/** Site geneli sabitler — tek doğruluk kaynağı. */

export const SITE = {
  name: "İnoxhan",
  legalName: "İnoxhan",
  tagline: "İhtiyacını gönder, 15-30 dakika içinde teklifini al.",
  description:
    "Paslanmaz çelik bağlantı elemanları — cıvata, somun, vida, rondela, dübel. DIN ve ISO normlarında A2/A4 kalite. 20 yıllık deneyimle tedarik, ithalat, gümrükleme ve uluslararası teslimat. İhtiyacını gönder, 15-30 dakika içinde sana özel rekabetçi teklifini al.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "info@inoxhan.com",
} as const;

/**
 * Ana sayfa hero slaytları — slogan + arka plan medyası. HeroSlider sırayla gösterir.
 *
 * TÜM alanlar uzantısız `basePath`'tir; uzantı ve boyut ekini HeroMedia bileşeni ekler.
 *
 * `media.kind`:
 *   "3d"    → prosedürel three.js sahnesi (HeroScene içindeki kompozisyon adı).
 *             Ana sayfada artık kullanılmıyor; bileşenler duruyor, slayt tablosuna
 *             tek satır yazarak geri alınabilir.
 *   "image" → public/media/hero/{src}-{md|lg|xl}.{avif|webp}
 *   "video" → public/media/video/{src}.{webm|mp4} + {poster}-{md|lg|xl}.{avif|webp}
 *
 * `srcMobile` (opsiyonel, 2:3 dikey türev): 768px altında bunun türevleri servis edilir.
 * Yatay kadraj dar ekranda ortadan kırpıldığı için sağa yaslanmış özne kayboluyordu.
 * Video slaytlarında mobil videoyu hiç indirmez, doğrudan bu görseli gösterir.
 *
 * Yeni slayt eklemek: dosyayı `import/higgsfield/` altına at, `npm run hazirla:medya`
 * (video ise `hazirla:video`) çalıştır, buraya tek satır yaz.
 * Prompt paketi ve dosya adlandırma sözleşmesi: docs/higgsfield-promptlar.md
 */
export type HeroMedia =
  | { kind: "3d"; scene: "asili" | "vitrin" | "akis" }
  | { kind: "image"; src: string; srcMobile?: string }
  | { kind: "video"; src: string; poster: string; srcMobile?: string };

export interface HeroSlide {
  slogan: string;
  sub: string;
  media: HeroMedia;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    slogan: "Liste Fiyatından Almaktan Sıkılmadın mı?",
    sub: "İhtiyacını gönder, sana özel fiyatı 15-30 dakikada öğren.",
    media: {
      kind: "video",
      src: "media/video/01-asili",
      poster: "media/video/01-asili-poster",
      srcMobile: "media/hero/01-asili-mobil",
    },
  },
  {
    slogan: "Güçlü Bağlantılar, Güvenli Ticaret.",
    sub: "20 yıllık deneyimle tedarikten teslimata, tüm süreç tek elden.",
    media: { kind: "image", src: "media/hero/02-kilit", srcMobile: "media/hero/02-kilit-mobil" },
  },
  {
    slogan: "Tedarikten Teslimata, Tüm Süreç Tek Noktada.",
    sub: "İthalat, gümrükleme, depolama, sigorta ve lojistiği biz yönetelim.",
    media: { kind: "image", src: "media/hero/03-yiv", srcMobile: "media/hero/03-yiv-mobil" },
  },
  {
    slogan: "20 Yıllık Deneyimle Sınırları Aşan Çözümler.",
    sub: "DIN ve ISO normlarında paslanmaz bağlantı elemanları, A2 ve A4 kalite.",
    media: { kind: "image", src: "media/hero/04-akis", srcMobile: "media/hero/04-akis-mobil" },
  },
  {
    slogan: "Siz İhtiyacınızı Söyleyin, Gerisini İnoxhan'a Bırakın.",
    sub: "Zamanınız değerli. Gerekeni söyleyin, biz sizin için halledelim.",
    media: { kind: "image", src: "media/hero/05-yuzey", srcMobile: "media/hero/05-yuzey-mobil" },
  },
];

/**
 * Ana sayfa Showreel klipleri — sıra `ShowreelSection` içindeki yazılarla eşleşir.
 * Türevler: public/media/video/{src}.{webm|mp4} + {poster}-{sm|md|lg}.{avif|webp}
 */
export const SHOWREEL_CLIPS = [
  { src: "media/video/01-hizli", alt: "Karanlıktan çıkan paslanmaz bağlantı elemanları" },
  { src: "media/video/02-kapsam", alt: "Sıralar hâlinde dizilmiş çeşitli bağlantı elemanları" },
  { src: "media/video/03-teklif", alt: "Tek bir paslanmaz cıvatanın yakın çekimi" },
] as const;

export const QUOTE_STATUSES = ["YENI", "BEKLEYEN", "CEVAPLANAN"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  YENI: "Yeni",
  BEKLEYEN: "Bekleyen",
  CEVAPLANAN: "Cevaplanan",
};

/** SLA eşikleri (dakika) — panelde renk eskalasyonu. Müşteriye verilen 15-30 dk vaadiyle aynı. */
export const SLA = { warnAfterMin: 15, breachAfterMin: 30 } as const;

export const QUOTE_UNITS = ["adet", "kutu", "paket", "metre", "kg"] as const;

/** Paslanmaz çelik kalite sınıfları — tüm ürünler her iki kalitede temin edilir. */
export const QUALITY_OPTIONS = ["A2", "A4"] as const;
export type Quality = (typeof QUALITY_OPTIONS)[number];

export const QUALITY_LABELS: Record<Quality, string> = {
  A2: "A2 (AISI 304)",
  A4: "A4 (AISI 316)",
};

export const QUALITY_HINTS: Record<Quality, string> = {
  A2: "İç mekân ve genel kullanım",
  A4: "Deniz suyu ve kimyasal ortam",
};

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
