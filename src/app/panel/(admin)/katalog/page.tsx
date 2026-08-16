import { Download, FileWarning } from "lucide-react";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { CatalogGenerator } from "@/components/panel/CatalogGenerator";
import { getCatalogStatus, getLatestCatalogFile } from "@/server/catalog-pdf";

function fmtSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default async function PanelKatalogPage() {
  const [status, latest] = await Promise.all([getCatalogStatus(), getLatestCatalogFile()]);
  const running = status.state === "running";

  return (
    <div className="max-w-2xl">
      {running && <AutoRefresh intervalMs={5000} />}
      <h1 className="font-display mb-2 text-2xl font-bold text-steel-900">PDF Katalog</h1>
      <p className="mb-8 text-sm text-steel-500">
        Tüm aktif ürünlerden kapaklı, kategorilere ayrılmış, QR kodlu A4 katalog üretir.
        Üretim ürün sayısına göre 1-2 dakika sürebilir.
      </p>

      <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-card">
        {process.env.VERCEL ? (
          // Playwright (Chromium) serverless'ta çalışmaz — üretim lokalde yapılır
          <p className="rounded-md border border-steel-200 bg-steel-50 p-4 text-sm text-steel-600">
            PDF üretimi bu sunucuda çalışmaz. Lokal ortamda{" "}
            <code className="font-mono text-steel-900">npm run katalog:render</code>{" "}
            ile üretip dosyayı <code className="font-mono text-steel-900">public/katalog.pdf</code>{" "}
            olarak commit edin — site /katalog sayfası onu sunar.
          </p>
        ) : (
          <CatalogGenerator running={running} />
        )}

        {status.state === "error" && (
          <p className="mt-4 flex items-start gap-2 rounded-md border border-status-overdue/30 bg-status-overdue/5 p-3 text-sm text-status-overdue">
            <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
            Üretim hatası: {status.error}
          </p>
        )}

        {latest && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-steel-100 pt-5">
            <div>
              <p className="font-medium text-steel-900">{latest.file}</p>
              <p className="text-sm text-steel-500">
                {latest.mtime.toLocaleString("tr-TR")} · {fmtSize(latest.sizeBytes)}
              </p>
            </div>
            <a
              href="/api/katalog.pdf"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-steel-300 px-4 text-sm font-medium text-steel-700 hover:border-steel-500"
            >
              <Download className="size-4" aria-hidden />
              İndir
            </a>
          </div>
        )}

        {!latest && !running && status.state !== "error" && (
          <p className="mt-4 text-sm text-steel-400">Henüz üretilmiş katalog yok.</p>
        )}
      </div>

      <p className="mt-4 text-xs text-steel-400">
        Üretilen son katalog sitede /katalog sayfasından da indirilebilir. Ön izleme:{" "}
        <a href="/katalog-baski" target="_blank" className="underline">
          baskı düzenini görüntüle
        </a>
      </p>
    </div>
  );
}
