import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, FileText, MessageCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ImageGallery } from "@/components/catalog/ImageGallery";
import { QualityPicker } from "@/components/catalog/QualityPicker";
import { SpecTable } from "@/components/catalog/SpecTable";
import { SITE } from "@/lib/constants";
import { getProductBySlug } from "@/server/catalog";
import { getSetting } from "@/server/settings";

interface Params {
  kategori: string;
  slug: string;
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
    `${product.name} teknik özellikleri. Fiyat için teklif isteyin — en geç 1 saat içinde dönüş.`;
  const image = product.images[0] ? `/${product.images[0].basePath}-lg.webp` : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/urunler/${product.category.slug}/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(image && { images: [{ url: image, width: 1600, height: 1200 }] }),
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
              En geç 1 saat içinde size dönüş yapıyoruz
            </p>
          </div>

          {product.specs.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-steel-900">
                Teknik Özellikler
              </h2>
              <div className="mt-4 rounded-lg border border-steel-200 bg-white px-5 py-2">
                <SpecTable specs={product.specs} />
              </div>
            </section>
          )}

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
                      href={`/${doc.filePath}`}
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
    </div>
  );
}
