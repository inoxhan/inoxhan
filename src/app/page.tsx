import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { CategoryHighlights } from "@/components/home/CategoryHighlights";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Reveal } from "@/components/home/Reveal";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import { TrustMetrics } from "@/components/home/TrustMetrics";
import { Hero3D } from "@/components/hero/Hero3D";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { buttonStyles } from "@/components/ui/Button";
import { SLOGANS } from "@/lib/constants";
import { getProducts } from "@/server/catalog";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";

// Saatte bir tazele; ayrıca panel CRUD'u revalidatePath("/") ile anında tazeler
export const revalidate = 3600;

export default async function HomePage() {
  const [categories, productCount, featured, sloganSetting, whatsappNumber] =
    await Promise.all([
      db.category.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      }),
      db.product.count({ where: { isActive: true } }),
      getProducts({ page: 1 }),
      getSetting("hero_slogan", "0"),
      getSetting("whatsapp_number", process.env.WHATSAPP_NUMBER),
    ]);

  const sloganIndex = Math.min(SLOGANS.length - 1, Math.max(0, Number(sloganSetting) || 0));
  const slides = categories
    .filter((c) => c.imagePath)
    .map((c) => ({ image: c.imagePath!, alt: c.name }));

  return (
    <>
      {/* ── 1. 3D HERO (koyu) ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-steel-950 text-steel-50">
        {/* Statik poster katmanı — 3D yüklenene kadar ve mobilde tek görsel dil */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(139,151,163,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_80%,rgba(74,85,97,0.25),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-steel-950 to-transparent" />
        </div>

        <Hero3D />

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-steel-800 bg-steel-950/60 px-4 py-1.5 text-sm text-steel-300 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-signal" aria-hidden />
            En geç 1 saat içinde teklif
          </p>

          <h1 className="font-display mt-8 max-w-4xl text-[clamp(2.6rem,7vw,5.5rem)] leading-[1.02] font-bold tracking-tight">
            {SLOGANS[sloganIndex]}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-steel-300 md:text-xl">
            İhtiyacını bize gönder. En geç <strong className="text-steel-100">1 saat</strong>{" "}
            içerisinde sana özel teklifini hazırlayalım.
          </p>

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

          <p className="mt-8 text-sm tracking-wide text-steel-400">
            Hızlı dönüş <span className="mx-1.5 text-steel-700">•</span> Rekabetçi fiyat{" "}
            <span className="mx-1.5 text-steel-700">•</span> Uzman destek
          </p>
        </div>
      </section>

      <div className="divider-inox" />

      {/* ── 2. NASIL ÇALIŞIYOR (açık) ─────────────────────────────────── */}
      <HowItWorks />

      {/* ── 3. KATEGORİLER (açık) ─────────────────────────────────────── */}
      <CategoryHighlights
        categories={categories.map((c) => ({
          name: c.name,
          slug: c.slug,
          imagePath: c.imagePath,
          count: c._count.products,
        }))}
      />

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
                Fiyat yok, sürpriz yok — teklif iste, 1 saatte öğren.
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
              1 Saat İçinde
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
