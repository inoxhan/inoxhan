import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getVariantIndexData } from "@/server/catalog";

/**
 * Hızlı teklif seçicisinin MiniSearch indeksi — ~6.750 hafif varyant satırı
 * (gzip ~150 KB). Varyant importu sonrası en geç 1 saat içinde kendiliğinden
 * tazelenir; istenirse revalidateTag("variant-index") anında tazeler.
 */
const getCached = unstable_cache(getVariantIndexData, ["variant-index"], {
  tags: ["variant-index"],
  revalidate: 3600,
});

export async function GET() {
  const data = await getCached();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
