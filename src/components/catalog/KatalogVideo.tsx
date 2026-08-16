"use client";

import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Katalog sayfası başlık bandının arka plan videosu — 54 ürünlük duvar üstünde
 * yavaş süzülme (`npm run hazirla:katalog-video`).
 *
 * Hero'daki HeroVideo ile aynı ilke: `useMediaQuery` sunucuda ve ilk boyamada `false`
 * döner, herkes önce poster karesini görür; masaüstü hidrasyondan sonra videoya geçer.
 * Mobil videoyu hiç indirmez — arka plan süsü için hücresel veri harcanmaz.
 */
const POSTER = "media/video/katalog-duvar-poster";
const VIDEO = "media/video/katalog-duvar";
const WIDTHS = { sm: 480, md: 960, lg: 1600 } as const;

function srcset(ext: "avif" | "webp") {
  return Object.entries(WIDTHS)
    .map(([suffix, w]) => `/${POSTER}-${suffix}.${ext} ${w}w`)
    .join(", ");
}

export function KatalogVideo() {
  const wide = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (!wide || reducedMotion) {
    return (
      // Dekoratif arka plan — başlık metni bilgiyi zaten taşıyor
      <picture>
        <source type="image/avif" srcSet={srcset("avif")} sizes="100vw" />
        <source type="image/webp" srcSet={srcset("webp")} sizes="100vw" />
        <img
          src={`/${POSTER}-lg.webp`}
          alt=""
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
    );
  }

  return (
    <video
      // Otomatik oynayan arka plan videosu: sessiz + inline zorunlu (iOS)
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={`/${POSTER}-lg.webp`}
      aria-hidden
      className="absolute inset-0 size-full object-cover"
    >
      {/* WebM önce: destekleyen tarayıcıda tipik olarak ~%30 küçük */}
      <source src={`/${VIDEO}.webm`} type="video/webm" />
      <source src={`/${VIDEO}.mp4`} type="video/mp4" />
    </video>
  );
}
