import type { Metadata } from "next";
import { Camera, Info } from "lucide-react";
import { FileQuoteForm } from "@/components/quote/FileQuoteForm";

export const metadata: Metadata = {
  title: "Fotoğraf / Dosya ile Teklif",
  description:
    "Ürünü katalogda bulamadıysanız fotoğrafını veya dosyasını gönderin — ekibimiz ürünü tespit edip fiyat teklifiyle dönsün.",
  alternates: { canonical: "/teklif/dosya" },
};

export default function DosyaTeklifPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <header className="mb-8">
        <h1 className="font-display flex items-center gap-3 text-4xl font-bold tracking-tight text-steel-900">
          <Camera className="size-9 text-steel-400" aria-hidden />
          Fotoğraf / Dosya ile Teklif
        </h1>
        <p className="mt-3 text-lg text-steel-600">
          Ürünü listede bulamadıysanız fotoğrafını veya teknik dosyasını gönderin;
          ekibimiz ürünü tespit edip fiyat teklifiyle dönsün.
        </p>
      </header>

      {/* Öncelik açıklaması — listeli talepler kuyrukta önde */}
      <div className="mb-8 flex gap-3 rounded-lg border border-steel-200 bg-steel-50 p-4 text-sm text-steel-600">
        <Info className="mt-0.5 size-5 shrink-0 text-steel-400" aria-hidden />
        <p>
          Dosyalı taleplerde ürün tespiti gerektiği için{" "}
          <strong>dönüş süresi biraz daha uzun olabilir</strong> —{" "}
          ürünlerini listeleyerek gönderen müşterilerin önceliği vardır. Ürünlerinizi
          biliyorsanız{" "}
          <a href="/teklif/liste" className="underline underline-offset-4">
            listeyle hızlı teklif
          </a>{" "}
          15-30 dakikada sonuçlanır.
        </p>
      </div>

      <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-card md:p-8">
        <FileQuoteForm />
      </div>
    </div>
  );
}
