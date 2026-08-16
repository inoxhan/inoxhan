import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Clock, FileText, Maximize2, MessageCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ImageGallery } from "@/components/catalog/ImageGallery";
import { ProductImage } from "@/components/catalog/ProductImage";
import { QualityPicker } from "@/components/catalog/QualityPicker";
import { SpecTable } from "@/components/catalog/SpecTable";
import { asset } from "@/lib/asset";
import { SITE } from "@/lib/constants";
import { getProductBySlug } from "@/server/catalog";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";

interface Params {
  kategori: string;
  slug: string;
}

/** Statik dışa aktarım her ürün sayfasını derlemede üretir; sunucu modunda da ısınma sağlar. */
export async function generateStaticParams(): Promise<Params[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { slug: true, category: { select: { slug: true } } },
  });
  return products.map((p) => ({ kategori: p.category.slug, slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const title = product.seoTitle ?? `${product.name} — ${product.brand?.name ?? ""}`.trim();
  const description =
    product.seoDesc ??
    `${product.name} teknik özellikleri. Fiyat için teklif isteyin — 15-30 dakika içinde dönüş.`;
  // ProductImage satırındaki width/height KAYNAĞIN ölçüsüdür, türevin değil. OG'ye
  // gerçekte servis edilen `-lg` türevinin ölçüsü bildirilir: `IMAGE_VARIANTS.lg` 1600 px'te
  // sınırlıyor, ama `withoutEnlargement` yüzünden daha dar kaynak olduğu gibi kalıyor.
  // Sabit 1600×1200 bildirmek kare (1254×1254) fotoğraflarda önizlemeyi bozuyordu.
  const ana = product.images[0];
  const ogGenislik = ana && ana.width > 0 ? Math.min(1600, ana.width) : 0;
  const ogGorsel =
    ana && ogGenislik > 0
      ? {
          url: asset(`${ana.basePath}-lg.webp`),
          width: ogGenislik,
          height: Math.round((ana.height * ogGenislik) / ana.width),
        }
      : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/urunler/${product.category.slug}/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(ogGorsel && { images: [ogGorsel] }),
    },
  };
}

export default async function UrunDetayPage({ params }: { params: Promise<Params> }) {
  const { kategori, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  // Yanlış kategoriyle gelindiyse kanonik URL'e yönlendir
  if (product.category.slug !== kategori) {
    redirect(`/urunler/${product.category.slug}/${product.slug}`);
  }

  // Marka yoksa " · " ayracı başıboş kalmasın diye dolu parçalar birleştirilir
  const subtitle = [product.brand?.name, product.model].filter(Boolean).join(" · ");
  const useAreas =
    product.useAreas?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  // Katalog PDF'inden çıkarılan görseller — ürün fotoğrafından ayrı, galeride görünmez
  const drawing = product.drawings.find((d) => d.kind === "cizim");
  const dimensionTable = product.drawings.find((d) => d.kind === "tablo");

  const whatsappNumber = await getSetting("whatsapp_number", process.env.WHATSAPP_NUMBER);
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Merhaba, ${product.name} (SKU: ${product.sku}) için teklif almak istiyorum.`,
      )}`
    : null;

  // schema.org yapılandırılmış veri — fiyat/stok alanları BİLİNÇLİ olarak yok
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    ...(product.model && { mpn: product.model }),
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand.name } }),
    ...(product.shortDesc && { description: product.shortDesc }),
    ...(product.images[0] && {
      image: `${SITE.url}/${product.images[0].basePath}-lg.webp`,
    }),
    category: product.category.name,
    url: `${SITE.url}/urunler/${product.category.slug}/${product.slug}`,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Ürünler", item: `${SITE.url}/urunler` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category.name,
        item: `${SITE.url}/urunler/${product.category.slug}`,
      },
      { "@type": "ListItem", position: 4, name: product.name },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: "Ürünler", href: "/urunler" },
          { label: product.category.name, href: `/urunler/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ImageGallery
          images={product.images.map((img) => ({ basePath: img.basePath, alt: img.alt }))}
        />

        <div>
          <p className="font-mono text-sm tracking-wide text-steel-400">{product.sku}</p>
          <h1 className="font-display mt-2 text-3xl leading-tight font-bold tracking-tight text-steel-900 md:text-4xl">
            {product.name}
          </h1>
          {subtitle && <p className="mt-2 text-steel-500">{subtitle}</p>}

          {product.shortDesc && (
            <p className="mt-5 leading-relaxed text-steel-600">{product.shortDesc}</p>
          )}

          <div className="mt-8 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
            <QualityPicker sku={product.sku} />
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                data-track="whatsapp_click"
                data-track-payload={JSON.stringify({ where: "detail", sku: product.sku })}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 font-medium text-[#128C4A] transition-colors hover:bg-[#25D366]/20"
              >
                <MessageCircle className="size-5" aria-hidden />
                WhatsApp&apos;tan Teklif Al
              </a>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-steel-500">
              <Clock className="size-4 text-signal" aria-hidden />
              15-30 dakika içinde size dönüş yapıyoruz
            </p>
          </div>

          {useAreas.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold text-steel-900">
                Kullanım Alanları
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {useAreas.map((area) => (
                  <li
                    key={area}
                    className="rounded-full border border-steel-200 bg-steel-100 px-4 py-1.5 text-sm text-steel-700"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.documents.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold text-steel-900">Dokümanlar</h2>
              <ul className="mt-3 space-y-2">
                {product.documents.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={asset(doc.filePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-steel-700 underline-offset-4 hover:underline"
                    >
                      <FileText className="size-4 text-steel-400" aria-hidden />
                      {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Teknik Özellikler — ızgaranın altında TAM GENİŞLİK. Ölçü tabloları 20 satır ×
          12 sütuna kadar çıkıyor; sağ sütunun ~600 px'ine sığdırıldığında okunmuyor. */}
      {(product.specs.length > 0 || product.drawings.length > 0) && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-steel-900">
            Teknik Özellikler
          </h2>

          {/* items-start: spec kartı çizim kartının boyuna gerilip altında boşluk bırakmasın */}
          <div className="mt-5 grid items-start gap-6 lg:grid-cols-5">
            {product.specs.length > 0 && (
              <div className="rounded-lg border border-steel-200 bg-white px-5 py-2 shadow-card lg:col-span-2">
                <SpecTable specs={product.specs} />
              </div>
            )}

            {drawing && (
              <figure className="rounded-lg border border-steel-200 bg-white p-5 shadow-card lg:col-span-3">
                <ProductImage
                  basePath={drawing.basePath}
                  alt={drawing.alt}
                  sizes="(max-width: 1024px) 92vw, 55vw"
                  className="mx-auto w-full max-w-2xl"
                />
                <figcaption className="mt-3 text-center text-xs text-steel-500">
                  Ölçülendirilmiş teknik çizim · {product.sku}
                </figcaption>
              </figure>
            )}
          </div>

          {dimensionTable && (
            <div className="mt-6 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-base font-semibold text-steel-900">
                  Ölçü Tablosu
                </h3>
                <a
                  href={asset(`${dimensionTable.basePath}-full.webp`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm text-steel-600 underline-offset-4 hover:underline"
                >
                  <Maximize2 className="size-4 text-steel-400" aria-hidden />
                  Büyüt
                </a>
              </div>
              {/* Dar ekranda küçültmek yerine yatay kaydırılır — rakamlar okunur kalsın */}
              <div className="mt-4 overflow-x-auto">
                <ProductImage
                  basePath={dimensionTable.basePath}
                  alt={dimensionTable.alt}
                  sizes="(max-width: 1280px) 1200px, 1200px"
                  className="w-full min-w-[760px]"
                />
              </div>
              <p className="mt-3 text-xs text-steel-500">
                Değerler milimetre cinsindendir. Kaynak: İnoxhan ürün kataloğu.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
