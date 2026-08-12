import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "İletişim",
  description: "İnoxhan iletişim bilgileri ve hızlı teklif kanalları.",
};

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        İletişim
      </h1>
      <p className="mt-4 text-lg text-steel-600">
        En hızlı dönüş için teklif formunu kullanabilirsiniz — en geç 1 saat
        içinde size ulaşıyoruz.
      </p>
      <div className="mt-8">
        <Link href="/teklif" className={buttonStyles({ variant: "dark", size: "lg" })}>
          Hemen Teklif Al
        </Link>
      </div>
      {/* İletişim bilgileri (adres, telefon, harita) firma bilgileri geldiğinde eklenecek */}
    </div>
  );
}
