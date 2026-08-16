import type { Metadata } from "next";
import Link from "next/link";
import { ProductImage } from "@/components/catalog/ProductImage";
import { buttonStyles } from "@/components/ui/Button";
import { medyaVar } from "@/server/sayfa-medya";

export const metadata: Metadata = {
  title: "İletişim",
  description: "İnoxhan iletişim bilgileri ve hızlı teklif kanalları.",
};

const GORSEL = "media/sayfa/iletisim";

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        İletişim
      </h1>
      <p className="mt-4 text-lg text-steel-600">
        En hızlı dönüş için teklif formunu kullanabilirsiniz — 15-30 dakika
        içinde size ulaşıyoruz.
      </p>
      <div className="mt-8">
        <Link href="/teklif" className={buttonStyles({ variant: "dark", size: "lg" })}>
          Hemen Teklif Al
        </Link>
      </div>
      {medyaVar(GORSEL) && (
        <ProductImage
          basePath={GORSEL}
          alt="Fırçalanmış paslanmaz yüzey üzerinde tek bir cıvata"
          sizes="(max-width: 768px) 100vw, 768px"
          className="mt-12 aspect-[3/2] w-full rounded-lg bg-photo object-cover"
        />
      )}
      {/* İletişim bilgileri (adres, telefon, harita) firma bilgileri geldiğinde eklenecek */}
    </div>
  );
}
