import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { QuoteBuilder } from "@/components/quote/QuoteBuilder";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { IS_STATIC } from "@/lib/asset";
import { getQuoteBuilderFamilies } from "@/server/catalog";
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

  const families = await getQuoteBuilderFamilies();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6 md:py-14 lg:pb-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900 md:text-5xl">
          Teklif Oluştur
        </h1>
        <p className="mt-3 text-lg text-steel-600">
          Ürünlerinizi fotoğraflarıyla seçin, ölçüsünü ve adedini girin, listenizi
          tek seferde gönderin — 15-30 dakika içinde fiyatınızla dönüyoruz.
        </p>
      </header>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel-600">
        <li className="flex items-center gap-2">
          <Clock className="size-4 text-signal" aria-hidden />
          15-30 dakikada dönüş
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-steel-400" aria-hidden />
          Rekabetçi fiyat
        </li>
        <li className="flex items-center gap-2">
          <Users className="size-4 text-steel-400" aria-hidden />
          Doğru ürünü seçemediyseniz ekibimiz yönlendirir
        </li>
      </ul>

      <div className="mt-8">
        <QuoteBuilder
          families={families}
          initialSku={sp.urun ?? null}
          initialQuality={sp.kalite ?? null}
        />
      </div>
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
