import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hızlı Teklif Al",
  description:
    "İhtiyacını gönder, en geç 1 saat içinde sana özel rekabetçi teklifini al.",
};

// NOT: Faz 2'de gerçek teklif formu (RHF + zod + dosya yükleme) buraya gelecek.
export default function TeklifPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        Hızlı Teklif Al
      </h1>
      <p className="mt-4 text-lg text-steel-600">
        Teklif formu hazırlanıyor. Çok yakında buradan 60 saniyede talep
        oluşturabileceksiniz.
      </p>
    </div>
  );
}
