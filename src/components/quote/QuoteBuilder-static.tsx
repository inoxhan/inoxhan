import Link from "next/link";
import { SITE } from "@/lib/constants";
import type { QuoteFamily } from "@/server/catalog";

/**
 * GitHub Pages statik derlemesinde QuoteBuilder'ın yerine geçen boş karşılık
 * (next.config.ts → turbopack.resolveAlias). Gerçek oluşturucu sunucu aksiyonu
 * kullanır; statik dışa aktarım sunucu aksiyonu bulunduramaz.
 *
 * Statik sürümde /teklif sayfası zaten IS_STATIC dalında eski tek formu render
 * eder; bu bileşen pratikte boyanmaz, yalnız derlemenin geçmesi için vardır.
 */
export function QuoteBuilder({
  families,
}: {
  families: QuoteFamily[];
  initialSku?: string | null;
  initialQuality?: string | null;
}) {
  return (
    <div className="rounded-lg border border-steel-200 bg-white p-6 text-sm text-steel-600">
      <p>
        Bu sürümde ({families.length} ürün ailesi) liste oluşturucu kapalıdır.{" "}
        <Link href="/teklif" className="underline underline-offset-4">
          Teklif formunu
        </Link>{" "}
        kullanabilir ya da {SITE.email} adresine yazabilirsiniz.
      </p>
    </div>
  );
}
