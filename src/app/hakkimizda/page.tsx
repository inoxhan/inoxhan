import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  Landmark,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { Reveal } from "@/components/home/Reveal";
import { buttonStyles } from "@/components/ui/Button";
import { asset } from "@/lib/asset";
import { SITE } from "@/lib/constants";
import { medyaVar } from "@/server/sayfa-medya";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    `${SITE.name} — bağlantı elemanlarında 20 yıllık deneyim. Tedarik, ithalat, ` +
    "gümrükleme, depolama, sigorta, lojistik ve uluslararası teslimat tek noktadan.",
};

/** Uçtan uca yönetilen süreç — tanıtım metnindeki hizmet zinciri. */
const SUREC = [
  { icon: Search, title: "Araştırma", desc: "İhtiyacınıza uygun ürünü ve doğru kaynağı buluruz." },
  { icon: PackageCheck, title: "Tedarik", desc: "Bağlantı elemanlarını istenen norm ve kalitede temin ederiz." },
  { icon: Landmark, title: "İthalat & Gümrükleme", desc: "İthalat ve gümrük işlemlerini sizin adınıza yürütürüz." },
  { icon: ShieldCheck, title: "Depolama & Sigorta", desc: "Ürünleriniz güvenli şekilde depolanır ve sigortalanır." },
  { icon: Truck, title: "Lojistik", desc: "Yurt içi ve yurt dışı sevkiyatı planlar, takip ederiz." },
  { icon: FileCheck2, title: "Teslimat", desc: "Gümrüğü tamamlanmış hâlde ya da doğrudan hedef ülkeye teslim." },
];

/** Süreç anlatısını taşıyan soyut kareler — bkz. docs/higgsfield-promptlar.md, C2-C4. */
const KARELER = [
  { ad: "hakkimizda-tedarik", alt: "Türlerine göre ayrılmış paslanmaz bağlantı elemanları" },
  { ad: "hakkimizda-lojistik", alt: "Hareket hâlindeki bağlantı elemanlarının ışık izleri" },
  { ad: "hakkimizda-kalite", alt: "Kumpasla ölçülen paslanmaz cıvata gövdesi" },
];

/** Hero türev genişlikleri (md/lg/xl) — banner tam genişlik basılıyor. */
const BANNER = "media/sayfa/hakkimizda-banner";
const BANNER_WIDTHS = { md: 1280, lg: 1920, xl: 2560 } as const;

function bannerSrcset(ext: "avif" | "webp") {
  return Object.entries(BANNER_WIDTHS)
    .map(([suffix, w]) => `${asset(`${BANNER}-${suffix}.${ext}`)} ${w}w`)
    .join(", ");
}

export default function HakkimizdaPage() {
  const bannerVar = medyaVar(BANNER, "md");
  const kareler = KARELER.filter((k) => medyaVar(`media/sayfa/${k.ad}`));

  return (
    <>
      {/* ── Başlık bandı (koyu) ── */}
      <section className="relative overflow-hidden bg-steel-950">
        {bannerVar && (
          // Dekoratif: başlık metni zaten aynı bilgiyi taşıyor
          <picture>
            <source type="image/avif" srcSet={bannerSrcset("avif")} sizes="100vw" />
            <source type="image/webp" srcSet={bannerSrcset("webp")} sizes="100vw" />
            <img
              src={asset(`${BANNER}-lg.webp`)}
              alt=""
              decoding="async"
              className="absolute inset-0 size-full object-cover opacity-70"
            />
          </picture>
        )}
        {/* Banner varken de kalır: metin solda duruyor, soldan sağa karartma
            okunabilirliği garantiliyor. Bannersız hâlde tek başına arka plan. */}
        <div
          aria-hidden
          className={
            bannerVar
              ? "absolute inset-0 bg-gradient-to-r from-steel-950 via-steel-950/75 to-steel-950/25"
              : "absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_10%,rgba(139,151,163,0.18),transparent_60%)]"
          }
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 md:py-28">
          <Reveal>
            <p className="text-sm tracking-[0.2em] text-steel-400 uppercase">Hakkımızda</p>
            <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-steel-50 md:text-6xl">
              Bağlantılarınız Güçlü,
              <br />
              Ticaretiniz Güvende
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-steel-300">
              {SITE.name}, bağlantı elemanları sektöründeki <strong className="text-steel-100">20 yıllık
              deneyimiyle</strong> müşterilerine kalite, güven ve hız odaklı uluslararası ticaret
              çözümleri sunar.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="divider-inox" />

      {/* ── Uçtan uca süreç ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <h2 className="font-display text-3xl font-bold tracking-tight text-steel-900 md:text-4xl">
            Tedarikten Teslimata, Tüm Süreç Tek Noktada
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-steel-500">
            İhtiyaç duyduğunuz bağlantı elemanlarının tedarikinden ithalatına; gümrük
            işlemlerinden depolama, sigorta ve teslimata kadar tüm süreci sizin adınıza
            yönetiyoruz.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {SUREC.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i * 0.07, 0.3)}>
              <div className="h-full rounded-lg border border-steel-200 bg-white p-6 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-md bg-steel-950 text-signal">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-steel-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-500">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Süreç kareleri (koyu) ── */}
      {kareler.length > 0 && (
        <section className="bg-steel-950">
          <div className="mx-auto grid max-w-7xl gap-px bg-steel-800 sm:grid-cols-3">
            {kareler.map((k, i) => (
              <Reveal key={k.ad} delay={Math.min(i * 0.08, 0.24)}>
                <ProductImage
                  basePath={`media/sayfa/${k.ad}`}
                  alt={k.alt}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="aspect-[3/2] w-full bg-photo object-cover"
                />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Tanıtım metni ── */}
      <section className="border-y border-steel-200 bg-steel-100/60">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-24">
          <Reveal>
            <p className="text-lg leading-relaxed text-steel-700">
              Talebinize göre ürünlerinizi gümrük işlemleri tamamlanmış şekilde teslim ediyor
              veya yürürlükteki mevzuatlara uygun olarak doğrudan istediğiniz ülkeye
              gönderiyoruz.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-steel-700">
              Yasaklı ürünler, yaptırımlar, ambargolar ve ülkelere göre değişen ticaret
              koşulları konusunda gerekli ön araştırmaları gerçekleştiriyor; sürecin güvenli ve
              yasal biçimde ilerlemesi için her operasyonu dikkatle değerlendiriyoruz.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-steel-700">
              {SITE.name} olarak yalnızca ürün tedarik etmiyor, karşılaşabileceğiniz sorunlara
              hızlı ve etkili çözümler üretiyoruz. Güçlü iş bağlantılarımız, sektör tecrübemiz
              ve sonuç odaklı çalışma anlayışımız sayesinde müşterilerimizin zaman, maliyet ve
              operasyon yükünü azaltıyoruz.
            </p>
            <p className="font-display mt-8 text-2xl font-semibold tracking-tight text-steel-900 md:text-3xl">
              Zamanınız değerli. Gerekeni söyleyin, biz sizin için halledelim.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Kurumsal ── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-24">
        <Reveal>
          <h2 className="font-display text-2xl font-bold tracking-tight text-steel-900 md:text-3xl">
            Kurumsal
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-steel-600">
            {SITE.name}, bağlantı elemanları alanında 20 yıllık deneyime sahip, uluslararası
            ticaret çözümleri sunan güvenilir bir iş ortağıdır. Ürün tedariki, ithalat,
            gümrükleme, depolama, sigorta, lojistik ve uluslararası teslimat süreçlerinin
            tamamını müşterileri adına yönetir.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-steel-600">
            Kalite, güven ve hız ilkeleriyle hareket eden {SITE.name}; her müşterinin ihtiyacını
            ayrı ayrı değerlendirir, olası sorunları önceden araştırır ve sürecin her aşamasında
            uygulanabilir çözümler geliştirir. Mevzuatların izin verdiği, yaptırım veya ambargo
            uygulanmayan ülkelere doğrudan gönderim seçenekleri sunar.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-steel-600">
            {SITE.name}, bağlantı elemanlarının tedarikinden teslimatına kadar ihtiyaç duyduğunuz
            her noktada yanınızdadır.
          </p>
        </Reveal>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-steel-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(139,151,163,0.2),transparent_70%)]"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-24">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight text-steel-50 md:text-5xl">
              Siz İhtiyacınızı Söyleyin,
              <br />
              Gerisini Biz Yönetelim.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-steel-400">
              Talebinizi gönderin, 15-30 dakika içinde size özel teklifle dönelim.
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                href="/teklif?kaynak=hero"
                data-track="quote_button_click"
                data-track-payload='{"where":"hakkimizda"}'
                className={buttonStyles({ variant: "metallic", size: "lg" })}
              >
                Hemen Teklif Al
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
