import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: `${SITE.name} — hırdavat ve bağlantı elemanlarında hızlı teklif.`,
};

export default function HakkimizdaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        Hakkımızda
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-steel-600">
        {SITE.name}, hırdavat ve bağlantı elemanları alanında faaliyet gösterir.
        Amacımız basit: ihtiyacınız olan ürünü hızla bulmanız ve uzun fiyat
        araştırmalarıyla vakit kaybetmeden, en geç 1 saat içinde size özel
        rekabetçi bir teklif almanız.
      </p>
    </div>
  );
}
