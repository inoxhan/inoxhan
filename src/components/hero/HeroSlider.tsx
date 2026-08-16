"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { HeroMedia } from "@/components/hero/HeroMedia";
import { useCarousel } from "@/components/home/useCarousel";
import { buttonStyles } from "@/components/ui/Button";
import { HERO_SLIDES, type HeroSlide } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Ana sayfa hero'su — HERO_SLIDES tablosundaki sloganları arka plan medyasıyla
 * birlikte gösterir. Geçiş: ok butonları, noktalar, otomatik, dokunmatik kaydırma,
 * klavye ok tuşları ve yatay fare tekerleği (bkz. useCarousel).
 *
 * Aktif olmayan slaytların medyası mount EDİLMEZ; 3D sahneler arasında geçerken
 * ikinci bir WebGL context açılmaz.
 *
 * `slides` sunucudan geçilir: video dosyası henüz üretilmemiş slaytlar orada
 * poster görseline düşürülüyor (bkz. src/app/page.tsx → heroSlaytlari).
 */
const SLAYT_MS = 7000;

export function HeroSlider({ slides = HERO_SLIDES }: { slides?: HeroSlide[] }) {
  const { index, reduced, goTo, next, prev, ref, containerProps } = useCarousel({
    count: slides.length,
    intervalMs: SLAYT_MS,
  });
  const slide = slides[index];

  return (
    <section
      ref={ref}
      {...containerProps}
      tabIndex={-1}
      aria-roledescription="carousel"
      aria-label="İnoxhan tanıtım slaytları"
      className="relative overflow-hidden bg-steel-950 text-steel-50 focus:outline-none"
    >
      {/* Arka plan medyası — anahtar index olduğu için slayt değişince eskisi sökülür */}
      <div key={index} className="absolute inset-0 animate-[fadeup_0.9s_ease-out]">
        <HeroMedia media={slide.media} priority={index === 0} />
      </div>

      {/* Statik poster katmanı: 3D yüklenene kadar ve mobilde tek görsel dil.
          Görsel/video slaytlarda aynı katman metnin okunmasını sağlayan koyulaştırma olur. */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(139,151,163,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_80%,rgba(74,85,97,0.25),transparent_60%)]" />
        {/* Görsel/video slaytlarda sloganın okunması için soldan koyulaştırma.
            Hafif tutulur — medyanın kendisi de koyu; iki katman üst üste binince
            arka plan tamamen kararıyor. */}
        {slide.media.kind !== "3d" && (
          <div className="absolute inset-0 bg-gradient-to-r from-steel-950 via-steel-950/55 to-steel-950/10" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-steel-950 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-steel-800 bg-steel-950/60 px-4 py-1.5 text-sm text-steel-300 backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-signal" aria-hidden />
          15-30 dakika içinde teklif
        </p>

        {/* Slogan ve alt metin slayt değişince yeniden animasyonlanır (key) */}
        <div key={index} aria-live="polite" aria-atomic="true">
          <h1
            className={cn(
              "font-display mt-8 max-w-4xl text-[clamp(2.4rem,6.4vw,5.2rem)] leading-[1.03] font-bold tracking-tight",
              !reduced && "animate-[fadeup_0.7s_ease-out]",
            )}
          >
            {slide.slogan}
          </h1>
          <p
            className={cn(
              "mt-6 max-w-xl text-lg leading-relaxed text-steel-300 md:text-xl",
              !reduced && "animate-[fadeup_0.9s_ease-out]",
            )}
          >
            {slide.sub}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/teklif?kaynak=hero"
            data-track="quote_button_click"
            data-track-payload='{"where":"hero"}'
            className={buttonStyles({ variant: "metallic", size: "lg" })}
          >
            <Zap className="size-5" aria-hidden />
            TEKLİF AL
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          <Link href="/urunler" className={buttonStyles({ variant: "ghost-dark", size: "lg" })}>
            Ürünleri İncele
          </Link>
        </div>

        {/* Slayt kontrolleri */}
        <div className="mt-12 flex items-center gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Önceki slayt"
              className="flex size-11 items-center justify-center rounded-full border border-steel-700 text-steel-200 transition-colors hover:border-steel-500 hover:bg-steel-800/60"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Sonraki slayt"
              className="flex size-11 items-center justify-center rounded-full border border-steel-700 text-steel-200 transition-colors hover:border-steel-500 hover:bg-steel-800/60"
            >
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.slogan}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}. slayt: ${s.slogan}`}
                aria-current={i === index}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === index ? "w-7 bg-steel-200" : "w-3 bg-steel-600 hover:bg-steel-500",
                )}
              />
            ))}
          </div>
        </div>

        <p className="mt-8 text-sm tracking-wide text-steel-400">
          Hızlı dönüş <span className="mx-1.5 text-steel-700">•</span> Rekabetçi fiyat{" "}
          <span className="mx-1.5 text-steel-700">•</span> Uzman destek
        </p>
      </div>
    </section>
  );
}
