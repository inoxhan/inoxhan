/**
 * Önceden üretilmiş AVIF/WebP türevlerini (-sm/-md/-lg) <picture> ile servis eder.
 * Türevler import pipeline'ında sharp ile üretilir; next/image optimizasyonuna
 * gerek kalmaz (dosyalar zaten optimize).
 */
const WIDTHS = { sm: 480, md: 960, lg: 1600 } as const;

interface ProductImageProps {
  basePath: string | null; // "media/products/inx-cv-0001"
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

function srcset(basePath: string, ext: "avif" | "webp") {
  return (Object.keys(WIDTHS) as (keyof typeof WIDTHS)[])
    .map((s) => `/${basePath}-${s}.${ext} ${WIDTHS[s]}w`)
    .join(", ");
}

export function ProductImage({
  basePath,
  alt,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  className,
}: ProductImageProps) {
  if (!basePath) {
    return (
      <div
        className={`flex items-center justify-center bg-steel-100 text-xs text-steel-400 ${className ?? ""}`}
      >
        Görsel hazırlanıyor
      </div>
    );
  }

  return (
    <picture>
      <source type="image/avif" srcSet={srcset(basePath, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(basePath, "webp")} sizes={sizes} />
      <img
        src={`/${basePath}-md.webp`}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        width={960}
        height={720}
        className={className}
      />
    </picture>
  );
}
