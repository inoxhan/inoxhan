import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { CategoryHighlights } from "@/components/home/CategoryHighlights";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Reveal } from "@/components/home/Reveal";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import { TrustMetrics } from "@/components/home/TrustMetrics";
import { HeroSlider } from "@/components/hero/HeroSlider";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { buttonStyles } from "@/components/ui/Button";
import type { ShowreelSlide } from "@/components/home/ShowreelSection";
import { HERO_SLIDES, SHOWREEL_CLIPS, type HeroSlide } from "@/lib/constants";
import { getProducts } from "@/server/catalog";
import { db } from "@/server/db";
import { medyaVar, videoVar } from "@/server/sayfa-medya";
import { getSetting } from "@/server/settings";

// Saatte bir tazele; ayrıca panel CRUD'u revalidatePath("/") ile anında tazeler
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Video slaytı, klibi henüz üretilmemişse poster görseline düşürülür.
 *
 * `<video>` kaynağı bulamayınca zaten poster karesini gösteriyor — yani görüntü
 * doğru çıkıyordu — ama her açılışta iki başarısız (.webm + .mp4) istek atıyordu.
 * `hazirla:hero` posteri yer tutucu olarak ürettiği için düşürülen slayt boş kalmaz.
 */
function heroSlaytlari(): HeroSlide[] {
  return HERO_SLIDES.map((s) =>
    s.media.kind === "video" && !videoVar(s.media.src)
      ? { ...s, media: { kind: "image", src: s.media.poster, srcMobile: s.media.srcMobile } }
      : s,
  );
}

/** Showreel beslemesi: klipler üretildiyse onlar, üretilmediyse kategori fotoğrafları. */
function showreelSlaytlari(kategoriKareleri: ShowreelSlide[]): ShowreelSlide[] {
  const klipler = SHOWREEL_CLIPS.filter((k) => videoVar(k.src)).map(
    (k): ShowreelSlide => ({ kind: "video", src: k.src, alt: k.alt }),
  );

  return klipler.length > 0 ? klipler : kategoriKareleri;
}

/**
 * Kategori kapağı: `npm run hazirla:kategori` bileşik ürettiyse o, yoksa
 * `Category.imagePath`'teki ürün fotoğrafı. Kaynak DB'de hiç değişmediği için
 * `public/media/kategori/` silindiğinde site kendiliğinden eski kapaklara döner.
 */
function kategoriKapagi(slug: string, varsayilan: string | null): string | null {
  const kapak = `media/kategori/${slug}`;
  return medyaVar(kapak) ? kapak : varsayilan;
}

export default async function HomePage() {
  const [categories, productCount, featured, whatsappNumber] = await Promise.all([
    db.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
    db.product.count({ where: { isActive: true } }),
    getProducts({ page: 1 }),
    getSetting("whatsapp_number", process.env.WHATSAPP_NUMBER),
  ]);

  const kategoriKartlari = categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    imagePath: kategoriKapagi(c.slug, c.imagePath),
    count: c._count.products,
  }));

  const slides = showreelSlaytlari(
    kategoriKartlari
      .filter((c) => c.imagePath)
      .map((c): ShowreelSlide => ({ kind: "image", src: c.imagePath!, alt: c.name })),
  );

  return (
    <>
      {/* ── 1. HERO SLIDER (koyu) — slogan + görsel/video slaytları ── */}
      <HeroSlider slides={heroSlaytlari()} />

      <div className="divider-inox" />

      {/* ── 2. NASIL ÇALIŞIYOR (açık) ─────────────────────────────────── */}
      <HowItWorks />

      {/* ── 3. KATEGORİLER (açık) ─────────────────────────────────────── */}
      <CategoryHighlights categories={kategoriKartlari} />

      {/* ── 4. SHOWREEL (koyu) ────────────────────────────────────────── */}
      <ShowreelSection slides={slides} />

      {/* ── 5. GÜVEN METRİKLERİ (açık) ────────────────────────────────── */}
      <TrustMetrics productCount={productCount} />

      {/* ── 6. ÖNE ÇIKAN ÜRÜNLER (açık) ───────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-steel-900 md:text-4xl">
                Öne Çıkan Ürünler
              </h2>
              <p className="mt-3 text-lg text-steel-500">
                Fiyat yok, sürpriz yok — teklif iste, 15-30 dakikada öğren.
              </p>
            </div>
            <Link
              href="/urunler"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-steel-700 underline-offset-4 hover:underline"
            >
              Tümünü gör
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
        <div className="mt-10">
          <ProductGrid products={featured.items.slice(0, 8)} />
        </div>
      </section>

      {/* ── 7. SON CTA (koyu) ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-steel-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(139,151,163,0.2),transparent_70%)]"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 md:py-32">
          <Reveal>
            <h2 className="font-display text-4xl font-bold tracking-tight text-steel-50 md:text-6xl">
              15-30 Dakikada
              <br />
              Fiyatını Öğren.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-steel-400">
              Uzun uzun fiyat araştırma. İhtiyacını gönder, en avantajlı teklifi
              biz hazırlayalım.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/teklif?kaynak=hero"
                data-track="quote_button_click"
                data-track-payload='{"where":"final-cta"}'
                className={buttonStyles({ variant: "metallic", size: "lg" })}
              >
                <Zap className="size-5" aria-hidden />
                Hemen Teklif Al
              </Link>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Merhaba, teklif almak istiyorum.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="whatsapp_click"
                  data-track-payload='{"where":"final-cta"}'
                  className={buttonStyles({ variant: "ghost-dark", size: "lg" })}
                >
                  WhatsApp&apos;tan Yaz
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
