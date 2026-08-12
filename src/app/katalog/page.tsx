import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Download, Zap } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { getLatestCatalogFile } from "@/server/catalog-pdf";

export const metadata: Metadata = {
  title: "Ürün Kataloğu",
  description:
    "İnoxhan ürün kataloğu — paslanmaz çelik bağlantı elemanları, DIN/ISO normları ve QR kodlarla PDF olarak.",
};

// Son üretilen kataloğu her istekte diskten kontrol eder
export const dynamic = "force-dynamic";

function fmtSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default async function KatalogPage() {
  const latest = await getLatestCatalogFile();

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <BookOpen className="mx-auto size-12 text-steel-400" aria-hidden />
      <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-900">
        Ürün Kataloğu
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-steel-600">
        Tüm ürünlerimiz, teknik özellikleri ve ürün sayfalarına giden QR
        kodlarıyla tek PDF&apos;te. Baskıya ve dijital paylaşıma uygundur.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {latest ? (
          <a href="/api/katalog.pdf" className={buttonStyles({ variant: "dark", size: "lg" })}>
            <Download className="size-5" aria-hidden />
            Kataloğu İndir ({fmtSize(latest.sizeBytes)})
          </a>
        ) : (
          <p className="rounded-md border border-steel-200 bg-white px-6 py-3 text-steel-500">
            Katalog hazırlanıyor — çok yakında buradan indirebileceksiniz.
          </p>
        )}
        <Link href="/teklif" className={buttonStyles({ variant: "outline", size: "lg" })}>
          <Zap className="size-5" aria-hidden />
          Hemen Teklif Al
        </Link>
      </div>

      <p className="mt-6 text-sm text-steel-400">
        Katalogda fiyat bulunmaz — güncel ve size özel fiyat için teklif isteyin,
        en geç 1 saat içinde dönüş yapalım.
      </p>
    </div>
  );
}
