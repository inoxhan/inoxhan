import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { ListQuoteClient } from "@/components/quote/ListQuoteClient";

export const metadata: Metadata = {
  title: "Ürün Listesiyle Hızlı Teklif",
  description:
    "Tüm katalogdan ürünlerinizi DIN koduyla seçin, listenizi gönderin — 15-30 dakikada fiyat teklifinizi alın.",
  alternates: { canonical: "/teklif/liste" },
};

interface SearchParams {
  din?: string;
}

export default async function ListeTeklifPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Ürün detayından "Teklif Al" ile gelindiyse arama o DIN ile açılır
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
          Ürün Listesiyle Hızlı Teklif
        </h1>
        <p className="mt-3 flex items-center gap-2 text-lg text-steel-600">
          <Clock className="size-5 text-signal" aria-hidden />
          Ürünlerinizi seçin, listenizi gönderin — <strong>15-30 dakikada</strong> fiyatınız hazır.
        </p>
      </header>
      <ListQuoteClient initialQuery={sp.din ?? ""} />
    </div>
  );
}
