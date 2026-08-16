import type { Metadata } from "next";
import { Clock, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = {
  title: "Hızlı Teklif Al",
  description:
    "İhtiyacını gönder, 15-30 dakika içinde sana özel rekabetçi teklifini al.",
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
  const sp = await searchParams;

  // Üründen gelindiyse formda önceden seçili gelsin — müşteri tekrar yazmasın
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
          <QuoteForm
            preselected={product}
            preselectedQuality={sp.kalite}
            source={sp.kaynak === "product" ? "product" : (sp.kaynak ?? "form")}
          />
        </div>
      </div>
    </div>
  );
}
