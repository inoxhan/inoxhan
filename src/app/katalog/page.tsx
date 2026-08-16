import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Download, Zap } from "lucide-react";
import { KatalogVideo } from "@/components/catalog/KatalogVideo";
import { buttonStyles } from "@/components/ui/Button";
import { getLatestCatalogFile } from "@/server/catalog-pdf";
import { videoVar } from "@/server/sayfa-medya";

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
  // Arka plan videosu üretilmemişse bant düz koyu kalır — sayfa her aşamada çalışır
  const video = videoVar("media/video/katalog-duvar");

  return (
    <>
      {/* ── Başlık bandı (koyu) — arka planda 54 ürünlük duvar videosu ── */}
      <section className="relative overflow-hidden bg-steel-950">
        {video && <KatalogVideo />}
        {/* Karartma: butonlar ve başlık videonun parlak metal noktalarına binebiliyor.
            Video yokken tek başına zemin dokusu görevi görür. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,rgba(11,13,16,0.82),rgba(11,13,16,0.55)_60%,rgba(11,13,16,0.35))]"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-steel-950 to-transparent" />

        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:py-28">
          <BookOpen className="mx-auto size-12 text-steel-300" aria-hidden />
          <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-50 md:text-5xl">
            Ürün Kataloğu
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-steel-300 [text-shadow:0_1px_12px_rgba(0,0,0,0.8)]">
            Tüm ürünlerimiz, teknik özellikleri ve ürün sayfalarına giden QR
            kodlarıyla tek PDF&apos;te. Baskıya ve dijital paylaşıma uygundur.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {latest ? (
              <a href="/api/katalog.pdf" className={buttonStyles({ variant: "metallic", size: "lg" })}>
                <Download className="size-5" aria-hidden />
                Kataloğu İndir ({fmtSize(latest.sizeBytes)})
              </a>
            ) : (
              <p className="rounded-md border border-steel-700 bg-steel-950/60 px-6 py-3 text-steel-300 backdrop-blur">
                Katalog hazırlanıyor — çok yakında buradan indirebileceksiniz.
              </p>
            )}
            <Link href="/teklif" className={buttonStyles({ variant: "ghost-dark", size: "lg" })}>
              <Zap className="size-5" aria-hidden />
              Hemen Teklif Al
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-steel-400">
          Katalogda fiyat bulunmaz — güncel ve size özel fiyat için teklif isteyin,
          15-30 dakika içinde dönüş yapalım.
        </p>
      </div>
    </>
  );
}
