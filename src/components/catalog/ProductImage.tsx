/**
 * Önceden üretilmiş AVIF/WebP türevlerini (-xs/-sm/-md/-lg) <picture> ile servis eder.
 * Türevler import pipeline'ında sharp ile üretilir; next/image optimizasyonuna
 * gerek kalmaz (dosyalar zaten optimize).
 */
import { asset } from "@/lib/asset";

const WIDTHS = { xs: 160, sm: 480, md: 960, lg: 1600 } as const;
type Boyut = keyof typeof WIDTHS;

/** Küçük kutular için yalnız xs+sm; büyük gösterimlerde xs hiç teklif edilmez. */
const THUMB_BOYUTLARI: Boyut[] = ["xs", "sm"];
const TAM_BOYUTLAR: Boyut[] = ["sm", "md", "lg"];

interface ProductImageProps {
  basePath: string | null; // "media/products/inx-cv-0001"
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /**
   * 40-56 px'lik liste/sepet görselleri. 480 px'lik "sm" türevini o kutulara
   * servis etmek teklif sayfasında yarım MB gereksiz indirme demekti.
   * YALNIZ ürün fotoğrafları için kullanılır (xs türevi orada üretilir:
   * `npm run hazirla:kucuk`).
   */
  thumb?: boolean;
}

function srcset(basePath: string, ext: "avif" | "webp", boyutlar: Boyut[]) {
  return boyutlar.map((s) => `${asset(`${basePath}-${s}.${ext}`)} ${WIDTHS[s]}w`).join(", ");
}

export function ProductImage({
  basePath,
  alt,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  className,
  thumb = false,
}: ProductImageProps) {
  if (!basePath) {
    return (
      <div
        className={`flex items-center justify-center bg-steel-900 text-xs text-steel-500 ${className ?? ""}`}
      >
        Görsel hazırlanıyor
      </div>
    );
  }

  const boyutlar = thumb ? THUMB_BOYUTLARI : TAM_BOYUTLAR;

  return (
    // display:contents — <picture> inline bir kutu oluşturmasın; aksi halde
    // img'in h-full değeri boyutsuz bir ebeveyne göre çözümlenip 0'a düşer.
    <picture className="contents">
      <source type="image/avif" srcSet={srcset(basePath, "avif", boyutlar)} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(basePath, "webp", boyutlar)} sizes={sizes} />
      {/* Oranlar üründen ürüne değişiyor (kare, yatay, dikey) — kutuyu saran
          kapsayıcı oranı belirler, görsel object-contain ile içine yerleşir. */}
      <img
        src={asset(`${basePath}-${thumb ? "xs" : "md"}.webp`)}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
