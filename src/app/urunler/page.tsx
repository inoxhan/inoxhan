import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürünler",
  description: "Hırdavat ve bağlantı elemanları ürün kütüphanesi.",
};

// NOT: Faz 1'de arama + filtre + ürün ızgarasıyla gerçek katalog buraya gelecek.
export default function UrunlerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        Ürün Kütüphanesi
      </h1>
      <p className="mt-4 text-lg text-steel-600">Katalog hazırlanıyor.</p>
    </div>
  );
}
