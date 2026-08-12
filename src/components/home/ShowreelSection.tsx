"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Showreel v1 — video dosyası olmadan sinematik his: Ken Burns + crossfade.
 * Gerçek ürün fotoğrafları içe aktarılınca (Faz 5) kareler otomatik zenginleşir;
 * ileride ffmpeg ile üretilecek gerçek MP4/WebM (v2) aynı bölüme takılır.
 */
export interface ShowreelSlide {
  image: string; // basePath — "-lg.webp" türevi kullanılır
  alt: string;
}

const CAPTIONS = [
  "Aradığın ürüne ulaşmak artık daha hızlı.",
  "Yüzlerce ürün. Teknik bilgi. Uzman destek.",
  "Teklifin 1 Saat İçinde Hazır.",
] as const;

const SLIDE_MS = 4200;

export function ShowreelSection({ slides }: { slides: ShowreelSlide[] }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced || slides.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [reduced, slides.length]);

  if (slides.length === 0) return null;

  const captionIndex = Math.min(
    CAPTIONS.length - 1,
    Math.floor((index / slides.length) * CAPTIONS.length),
  );
  const isFinal = captionIndex === CAPTIONS.length - 1;

  return (
    <section className="relative overflow-hidden bg-steel-950">
      <div className="relative h-[420px] md:h-[540px]">
        {slides.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.image}
            src={`/${s.image}-lg.webp`}
            alt={s.alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-1000",
              i === index ? "opacity-40" : "opacity-0",
              i === index && !reduced && "animate-kenburns",
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-steel-950 via-steel-950/40 to-steel-950/70" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <p
            key={captionIndex}
            className={cn(
              "font-display max-w-3xl text-3xl font-bold tracking-tight text-steel-50 md:text-5xl",
              !reduced && "animate-[fadeup_0.8s_ease-out]",
            )}
          >
            {CAPTIONS[captionIndex]}
          </p>
          {isFinal && (
            <Link
              href="/teklif"
              className={buttonStyles({ variant: "metallic", size: "lg", className: "mt-8" })}
            >
              <Zap className="size-5" aria-hidden />
              HEMEN TEKLİF AL
            </Link>
          )}
        </div>

        {/* ilerleme noktaları */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Kare ${i + 1}`}
              className={cn(
                "h-1 rounded-full transition-all",
                i === index ? "w-6 bg-steel-200" : "w-2.5 bg-steel-600",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
