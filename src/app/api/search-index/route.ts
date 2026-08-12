import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getSearchIndexData } from "@/server/catalog";

/**
 * MiniSearch istemci indeksi — hafif alanlarla tüm aktif ürünler.
 * Ürün CRUD'u (Faz 3) revalidateTag("search-index") ile tazeler.
 */
const getCached = unstable_cache(getSearchIndexData, ["search-index"], {
  tags: ["search-index"],
  revalidate: 3600,
});

export async function GET() {
  const data = await getCached();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
