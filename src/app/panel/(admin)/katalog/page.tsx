export default function PanelKatalogPage() {
  return (
    <div>
      <h1 className="font-display mb-4 text-2xl font-bold text-steel-900">PDF Katalog</h1>
      {/* Faz 6: Playwright ile A4 PDF üretimi ve indirme burada tetiklenecek */}
      <p className="rounded-lg border border-steel-200 bg-white p-6 text-sm text-steel-500">
        Katalog üretimi Faz 6&apos;da bağlanacak: tüm aktif ürünlerden kapaklı, QR kodlu,
        kategorilere ayrılmış A4 PDF üretilecek.
      </p>
    </div>
  );
}
