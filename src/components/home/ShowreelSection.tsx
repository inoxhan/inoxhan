"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { useCarousel } from "@/components/home/useCarousel";
import { asset } from "@/lib/asset";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Showreel — sinematik ara bölüm.
 *
 * v2: gerçek MP4/WebM klipler (`npm run hazirla:video`). Klipler henüz üretilmemişse
 * ana sayfa kategori fotoğraflarını Ken Burns + crossfade ile gösteren v1'e düşer,
 * böylece bölüm hiçbir aşamada boş kalmaz.
 */
export type ShowreelSlide =
  /** basePath — "-lg.webp" türevi kullanılır */
  | { kind: "image"; src: string; alt: string }
  /** basePath — "{src}.{webm|mp4}" ve "{src}-poster-lg.webp" kullanılır */
  | { kind: "video"; src: string; alt: string };

const CAPTIONS = [
  "Aradığın ürüne ulaşmak artık daha hızlı.",
  "Yüzlerce ürün. Teknik bilgi. Uzman destek.",
  "Teklifin 15-30 Dakikada Hazır.",
] as const;

/**
 * Klip süreleriyle hizalı: Higgsfield klipleri 8 sn (`hazirla:video`), montaj ~6.6 sn
 * (`hazirla:showreel`). Uzun olana göre ayarlı — kısa klip `loop` ile başa sarıyor,
 * ama slayt klipten önce dönerse son saniyeler hiç görünmüyor. Still kareler daha
 * çabuk sıkıyor.
 */
const KLIP_MS = 8400;
const KARE_MS = 4200;

export function ShowreelSection({ slides }: { slides: ShowreelSlide[] }) {
  const videoVar = slides.some((s) => s.kind === "video");

  // Otomatik geçiş, ok tuşları, dokunmatik kaydırma ve reduced-motion HeroSlider ile ortak
  const { index, reduced, goTo, next, prev, ref, containerProps } = useCarousel({
    count: slides.length,
    intervalMs: videoVar ? KLIP_MS : KARE_MS,
  });

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [gorunurde, setGorunurde] = useState(false);

  // `useCarousel` görünürlük izlemiyor — otomatik geçiş bölüm ekran dışındayken de
  // dönüyor. Klipler `preload="none"` olduğu için indirme YALNIZ play() ile başlıyor;
  // bu gözlemci olmadan showreel videoları, kullanıcı oraya hiç gelmeden iniyordu.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setGorunurde(e.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  // Yalnız aktif klip oynar. Hepsi birden `autoPlay` olsaydı üç video aynı anda
  // çözülürdü — mobilde pil ve CPU açısından bedeli görünür.
  useEffect(() => {
    for (const [i, v] of videoRefs.current.entries()) {
      if (!v) continue;
      if (i === index && !reduced && gorunurde) void v.play().catch(() => {});
      else v.pause();
    }
  }, [index, reduced, gorunurde]);

  if (slides.length === 0) return null;

  const captionIndex = Math.min(
    CAPTIONS.length - 1,
    Math.floor((index / slides.length) * CAPTIONS.length),
  );
  const isFinal = captionIndex === CAPTIONS.length - 1;

  return (
    <section
      ref={ref}
      {...containerProps}
      tabIndex={-1}
      aria-roledescription="carousel"
      aria-label="Ürün kareleri"
      className="relative overflow-hidden bg-steel-950 focus:outline-none"
    >
      {/* Klip modunda zemin SAF SİYAH: klipler `object-contain` ile basılıyor ve kendi
          zeminleri de saf siyah — steel-950 kalsaydı kenarlarda görünür bir sınır olurdu. */}
      <div className={cn("relative h-[420px] md:h-[540px]", videoVar && "bg-black")}>
        {slides.map((s, i) => {
          const gorunur = i === index;
          const ortak = cn(
            "absolute inset-0 size-full transition-opacity duration-1000",
            gorunur ? "opacity-100" : "opacity-0",
          );

          // Hareket azaltma tercihinde video hiç oynatılmaz; poster karesi kalır.
          if (s.kind === "video" && !reduced) {
            return (
              <video
                key={s.src}
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                muted
                loop
                playsInline
                // Bölüm katlamanın ALTINDA — sayfa açılışında hiçbir klip inmemeli.
                // İndirme yukarıdaki gözlemci play() çağırdığında başlar.
                preload="none"
                poster={asset(`${s.src}-poster-lg.webp`)}
                aria-label={s.alt}
                // `cover` DEĞİL: bölüm 2.67:1, klip 16:9 → alt kenar kırpılıp norm kodu
                // etiketleri kayboluyordu, mobilde de duvarın yalnız orta %52'si kalıyordu.
                // Zemin saf siyah olduğu için `contain` boşlukları görünmüyor.
                className={cn(ortak, "object-contain")}
              >
                {/* WebM önce: destekleyen tarayıcıda tipik olarak ~%30 küçük */}
                <source src={asset(`${s.src}.webm`)} type="video/webm" />
                <source src={asset(`${s.src}.mp4`)} type="video/mp4" />
              </video>
            );
          }

          // Ürün fotoğrafları kare ve stüdyo zeminli — `object-cover` ürünü kırpar,
          // bu yüzden still karelerde `contain` kalıyor. Klipler tam kadraj dolduruyor.
          const src = asset(s.kind === "video" ? `${s.src}-poster-lg.webp` : `${s.src}-lg.webp`);
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.src}
              src={src}
              alt={s.alt}
              loading="lazy"
              decoding="async"
              className={cn(
                ortak,
                s.kind === "video" ? "object-contain" : "object-contain p-6 md:p-10",
                gorunur && !reduced && s.kind === "image" && "animate-kenburns",
              )}
            />
          );
        })}
        {/* Fotoğraflar zaten siyah zeminli — overlay hafif tutulur, metnin
            okunabilirliğini asıl sağlayan aşağıdaki gölge.
            Klip modunda daha da hafif: klipler kendi karartmasını taşıyor ve tam
            karartma 54 ürünlük duvarı soluklaştırıyordu. */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t",
            videoVar
              ? "from-steel-950/60 via-transparent to-steel-950/25"
              : "from-steel-950 via-steel-950/20 to-steel-950/45",
          )}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <p
            key={captionIndex}
            className={cn(
              "font-display max-w-3xl text-3xl font-bold tracking-tight text-steel-50 md:text-5xl",
              "[text-shadow:0_2px_28px_rgba(0,0,0,0.95),0_1px_4px_rgba(0,0,0,0.9)]",
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

        {/* ileri / geri — kenarlarda dikey ortalı */}
        <button
          type="button"
          onClick={prev}
          aria-label="Önceki kare"
          className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-steel-700 bg-steel-950/50 text-steel-200 backdrop-blur transition-colors hover:border-steel-500 hover:bg-steel-800/70 md:left-6"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Sonraki kare"
          className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-steel-700 bg-steel-950/50 text-steel-200 backdrop-blur transition-colors hover:border-steel-500 hover:bg-steel-800/70 md:right-6"
        >
          <ArrowRight className="size-5" aria-hidden />
        </button>

        {/* ilerleme noktaları */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Kare ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-1 rounded-full transition-all",
                i === index ? "w-6 bg-steel-200" : "w-2.5 bg-steel-600 hover:bg-steel-500",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
