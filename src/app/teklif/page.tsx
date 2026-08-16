import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowRight,
  Camera,
  Clock,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { IS_STATIC } from "@/lib/asset";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  title: "Hızlı Teklif Al",
  description:
    "İhtiyacını gönder, 15-30 dakika içinde sana özel rekabetçi teklifini al.",
  alternates: { canonical: "/teklif" },
};

interface SearchParams {
  urun?: string;
  kaynak?: string;
  kalite?: string;
}

export default async function TeklifPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Statik yayında sorgu dizesi sunucuda okunamaz — eski tek formlu akış korunur
  const sp: SearchParams = IS_STATIC ? {} : await searchParams;

  if (IS_STATIC) return <StatikTeklif sp={sp} />;

  // Eski derin bağlantılar (?urun=DIN%20933) yeni hızlı seçiciye taşınır
  if (sp.urun) redirect(`/teklif/liste?din=${encodeURIComponent(sp.urun)}`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900 md:text-5xl">
          Hızlı Teklif Al
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-steel-600">
          Uzun uzun fiyat araştırma — ihtiyacını gönder, en avantajlı teklifi biz
          hazırlayalım. Size uyan yolu seçin:
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Kanal 1 — listeyle hızlı teklif (öncelikli yol) */}
        <Link
          href="/teklif/liste"
          className="group flex flex-col rounded-lg border-2 border-steel-950 bg-white p-7 shadow-card transition-shadow hover:shadow-elevated"
        >
          <span className="flex size-12 items-center justify-center rounded-md bg-steel-950 text-signal">
            <ListChecks className="size-6" aria-hidden />
          </span>
          <h2 className="font-display mt-5 text-2xl font-semibold text-steel-900">
            Ürün Listesiyle Hızlı Teklif
          </h2>
          <p className="mt-2 flex-1 text-steel-600">
            Tüm katalogdan ürünlerinizi DIN kodu veya açıklamayla bulun, tik ile
            listenize ekleyin, tek seferde gönderin.
          </p>
          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-steel-900">
            <Clock className="size-4 text-signal" aria-hidden />
            15-30 dakikada fiyat — öncelikli kuyruk
            <ArrowRight
              className="ml-auto size-5 text-steel-400 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </p>
        </Link>

        {/* Kanal 2 — fotoğraf/dosya */}
        <Link
          href="/teklif/dosya"
          className="group flex flex-col rounded-lg border border-steel-200 bg-white p-7 shadow-card transition-shadow hover:shadow-elevated"
        >
          <span className="flex size-12 items-center justify-center rounded-md bg-steel-100 text-steel-700">
            <Camera className="size-6" aria-hidden />
          </span>
          <h2 className="font-display mt-5 text-2xl font-semibold text-steel-900">
            Fotoğraf / Dosya ile Teklif
          </h2>
          <p className="mt-2 flex-1 text-steel-600">
            Ürünü bulamadıysanız fotoğrafını veya dosyasını gönderin — ekibimiz
            ürünü tespit edip teklif hazırlasın.
          </p>
          <p className="mt-5 flex items-center gap-2 text-sm text-steel-500">
            Dönüş süresi biraz daha uzun olabilir
            <ArrowRight
              className="ml-auto size-5 text-steel-400 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </p>
        </Link>
      </div>

      <ul className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
        <li className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
          <p className="text-sm text-steel-600">
            <strong className="text-steel-900">15-30 Dakika</strong>
            <br />
            Listeli taleplere aynı gün, dakikalar içinde dönüş.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-steel-400" aria-hidden />
          <p className="text-sm text-steel-600">
            <strong className="text-steel-900">Rekabetçi Fiyat</strong>
            <br />
            İhtiyacınıza en uygun, avantajlı teklif.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <Users className="mt-0.5 size-5 shrink-0 text-steel-400" aria-hidden />
          <p className="text-sm text-steel-600">
            <strong className="text-steel-900">Uzman Destek</strong>
            <br />
            Doğru ürünü seçemediyseniz ekibimiz yönlendirir.
          </p>
        </li>
      </ul>
    </div>
  );
}

/** GitHub Pages statik sürümü — sunucu yok; tek formlu eski akış aynen yaşar. */
async function StatikTeklif({ sp }: { sp: SearchParams }) {
  const product = sp.urun
    ? await db.product.findUnique({
        where: { sku: sp.urun },
        select: { sku: true, name: true },
      })
    : null;

  const whatsappNumber = await getSetting("whatsapp_number", process.env.WHATSAPP_NUMBER);
  const waText = product
    ? `Merhaba, ${product.name} (SKU: ${product.sku}) için teklif almak istiyorum.`
    : "Merhaba, teklif almak istiyorum.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[2fr_3fr]">
        {/* Sol: vaat ve güven */}
        <aside>
          <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
            Hızlı Teklif Al
          </h1>
          <p className="mt-3 text-lg text-steel-600">
            Uzun uzun fiyat araştırma. Biz senin için en avantajlı teklifi
            hazırlayalım.
          </p>

          <ul className="mt-8 space-y-5">
            <li className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-steel-950 text-signal">
                <Clock className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-steel-900">15-30 Dakika</p>
                <p className="text-sm text-steel-500">
                  Talebine 15-30 dakika içinde dönüş yapıyoruz.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-steel-950 text-steel-200">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-steel-900">Rekabetçi Fiyat</p>
                <p className="text-sm text-steel-500">
                  İhtiyacına en uygun, avantajlı teklifi hazırlıyoruz.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-steel-950 text-steel-200">
                <Users className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-steel-900">Uzman Destek</p>
                <p className="text-sm text-steel-500">
                  Doğru ürünü seçemediysen ekibimiz yönlendirir.
                </p>
              </div>
            </li>
          </ul>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 px-5 font-medium text-[#128C4A] transition-colors hover:bg-[#25D366]/20"
            >
              <MessageCircle className="size-5" aria-hidden />
              WhatsApp&apos;tan Teklif Al
            </a>
          )}
        </aside>

        {/* Sağ: form */}
        <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-card md:p-8">
          {/* useSearchParams (statik ürün ön seçimi) prerender'da Suspense sınırı ister */}
          <Suspense fallback={null}>
            <QuoteForm
              preselected={product}
              preselectedQuality={sp.kalite}
              source={sp.kaynak === "product" ? "product" : (sp.kaynak ?? "form")}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
