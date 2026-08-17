"use client";

import { useEffect, useState } from "react";
import { Hero3D } from "@/components/hero/Hero3D";
import { asset } from "@/lib/asset";
import type { HeroMedia as HeroMediaType } from "@/lib/constants";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Bir hero slaytının arka plan katmanı. YALNIZ aktif slayt mount edilir —
 * aynı anda birden fazla WebGL context açılmasın diye slayt değişince canvas sökülür.
 *
 * Türevler `npm run hazirla:medya` / `npm run hazirla:video` ile üretilir:
 *   public/media/hero/{src}-{md|lg|xl}.{avif|webp}         →  1280 / 1920 / 2560 px
 *   public/media/hero/{srcMobile}-{sm|md|lg}.{avif|webp}   →   720 / 1080 / 1440 px (2:3)
 *   public/media/video/{src}.{webm|mp4} + {poster}-*       →  hero videosu
 */
const HERO_WIDTHS = { md: 1280, lg: 1920, xl: 2560 } as const;

/**
 * Mobil dikey türev genişlikleri. Yatay hero, dar ekranda `object-cover` ile ortadan
 * kırpılıyor; kompozisyon gereği sağa yaslanmış özne kadraj dışında kalıyordu.
 */
const HERO_MOBIL_WIDTHS = { sm: 720, md: 1080, lg: 1440 } as const;

function srcset(basePath: string, ext: "avif" | "webp", widths: Record<string, number>) {
  return Object.entries(widths)
    .map(([suffix, w]) => `${asset(`${basePath}-${suffix}.${ext}`)} ${w}w`)
    .join(", ");
}

/**
 * Hero arka plan görseli. `srcMobile` verilmişse 768px altında dikey türev servis edilir —
 * `<source media>` sırası önemli, tarayıcı ilk eşleşeni alır, dar ekran kuralı önce gelmeli.
 */
function HeroPicture({
  src,
  srcMobile,
  priority,
}: {
  src: string;
  srcMobile?: string;
  priority: boolean;
}) {
  return (
    // alt="" zaten dekoratif işaretliyor; <picture> ARIA niteliklerini desteklemiyor
    <picture>
      {srcMobile && (
        <>
          <source
            media="(max-width: 767px)"
            type="image/avif"
            srcSet={srcset(srcMobile, "avif", HERO_MOBIL_WIDTHS)}
            sizes="100vw"
          />
          <source
            media="(max-width: 767px)"
            type="image/webp"
            srcSet={srcset(srcMobile, "webp", HERO_MOBIL_WIDTHS)}
            sizes="100vw"
          />
        </>
      )}
      <source type="image/avif" srcSet={srcset(src, "avif", HERO_WIDTHS)} sizes="100vw" />
      <source type="image/webp" srcSet={srcset(src, "webp", HERO_WIDTHS)} sizes="100vw" />
      <img
        src={asset(`${src}-lg.webp`)}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
    </picture>
  );
}

/**
 * Hero videosu — yalnız geniş ekranda, hareket azaltma tercihi yokken ve sayfa
 * boşa çıktıktan SONRA yüklenir.
 *
 * `useMediaQuery` sunucuda ve ilk boyamada `false` döner: herkes önce poster karesini
 * görür, masaüstü hidrasyondan sonra videoya geçer. Mobil videoyu HİÇ indirmez —
 * birkaç MB'lik arka plan videosu hücresel bağlantıda ödenecek bir bedel değil.
 *
 * Gecikmeli mount: video ~800 KB ve sayfayla aynı anda inince açılış takılıyordu.
 * Poster hemen görünür, video tarayıcı boşa çıkınca (requestIdleCallback) devreye
 * girer. Veri tasarrufu/yavaş bağlantıda hiç yüklenmez.
 */
function HeroVideo({
  media,
  priority,
}: {
  media: Extract<HeroMediaType, { kind: "video" }>;
  priority: boolean;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [videoyaGec, setVideoyaGec] = useState(false);

  useEffect(() => {
    if (!wide || reducedMotion) return;

    const baglanti = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (baglanti?.saveData || /2g/.test(baglanti?.effectiveType ?? "")) return;

    const idle = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (idle) {
      const id = idle(() => setVideoyaGec(true), { timeout: 3000 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setVideoyaGec(true), 1500);
    return () => clearTimeout(t);
  }, [wide, reducedMotion]);

  if (!wide || reducedMotion || !videoyaGec) {
    return <HeroPicture src={media.poster} srcMobile={media.srcMobile} priority={priority} />;
  }

  return (
    <video
      // Otomatik oynayan arka plan videosu: sessiz + inline zorunlu (iOS)
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={asset(`${media.poster}-lg.webp`)}
      aria-hidden
      className="absolute inset-0 size-full object-cover"
    >
      {/* WebM önce: destekleyen tarayıcıda tipik olarak ~%30 küçük */}
      <source src={asset(`${media.src}.webm`)} type="video/webm" />
      <source src={asset(`${media.src}.mp4`)} type="video/mp4" />
    </video>
  );
}

export function HeroMedia({ media, priority }: { media: HeroMediaType; priority: boolean }) {
  if (media.kind === "3d") return <Hero3D scene={media.scene} />;
  if (media.kind === "video") return <HeroVideo media={media} priority={priority} />;
  return <HeroPicture src={media.src} srcMobile={media.srcMobile} priority={priority} />;
}
