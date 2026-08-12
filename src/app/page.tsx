import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { SLOGANS } from "@/lib/constants";

// NOT: Bu, Faz 0 iskelet ana sayfasıdır. Faz 4'te 3D hero, showreel ve
// tam bölüm akışıyla değiştirilecek.
export default function HomePage() {
  return (
    <>
      <section className="bg-steel-950 text-steel-50">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-24 sm:px-6 md:py-36">
          <p className="inline-flex items-center gap-2 rounded-full border border-steel-800 px-4 py-1.5 text-sm text-steel-300">
            <span className="size-1.5 rounded-full bg-signal" aria-hidden />
            En geç 1 saat içinde teklif
          </p>
          <h1 className="font-display max-w-3xl text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] font-bold tracking-tight">
            {SLOGANS[0]}
          </h1>
          <p className="max-w-xl text-lg text-steel-300">
            İhtiyacını bize gönder. En geç 1 saat içerisinde sana özel
            teklifini hazırlayalım.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/teklif" className={buttonStyles({ variant: "metallic", size: "lg" })}>
              <Zap className="size-5" aria-hidden />
              TEKLİF AL
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/urunler" className={buttonStyles({ variant: "ghost-dark", size: "lg" })}>
              Ürünleri İncele
            </Link>
          </div>
          <p className="text-sm text-steel-400">
            Hızlı dönüş • Rekabetçi fiyat • Uzman destek
          </p>
        </div>
      </section>

      <div className="divider-inox" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-steel-900">
          Nasıl Çalışıyor?
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["01", "Ürününü Bul", "Katalogdan ürünü seç veya ihtiyacını yaz."],
            ["02", "Teklif İste", "İletişim bilgilerini bırak."],
            ["03", "Teklifini Al", "Ekibimiz en geç 1 saat içerisinde dönüş yapsın."],
          ].map(([no, title, desc]) => (
            <div key={no} className="rounded-lg border border-steel-200 bg-white p-8 shadow-card">
              <p className="font-mono text-sm text-steel-400">{no}</p>
              <h3 className="font-display mt-2 text-xl font-semibold text-steel-900">{title}</h3>
              <p className="mt-2 text-steel-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
