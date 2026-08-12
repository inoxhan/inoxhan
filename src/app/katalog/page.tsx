import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürün Kataloğu",
  description: "İnoxhan ürün kataloğu — PDF indirme.",
};

// NOT: Faz 6'da PDF katalog üretimi bağlandığında indirme linki buraya gelecek.
export default function KatalogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        Ürün Kataloğu
      </h1>
      <p className="mt-4 text-lg text-steel-600">
        PDF katalog hazırlanıyor. Yakında buradan indirebileceksiniz.
      </p>
    </div>
  );
}
