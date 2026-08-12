import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: `${SITE.name} — paslanmaz çelik bağlantı elemanlarında hızlı teklif.`,
};

export default function HakkimizdaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        Hakkımızda
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-steel-600">
        {SITE.name}, paslanmaz çelik bağlantı elemanları alanında faaliyet
        gösterir. Cıvata, somun, vida, rondela, setskur, segman ve dübel
        gruplarında DIN ve ISO normlarına uygun ürünleri A2 (AISI 304) ve A4
        (AISI 316) kalitelerde sunuyoruz.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-steel-600">
        Amacımız basit: ihtiyacınız olan ürünü hızla bulmanız ve uzun fiyat
        araştırmalarıyla vakit kaybetmeden, en geç 1 saat içinde size özel
        rekabetçi bir teklif almanız.
      </p>
    </div>
  );
}
