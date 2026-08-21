import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCatalogForDownload } from "@/server/catalog-pdf";

/**
 * Son üretilen PDF katalog — herkese açık indirme.
 * Kaynak seçimi (storage/ → public/katalog.pdf) getCatalogForDownload'da;
 * /katalog sayfası da aynı fonksiyonu kullanır, ikisi asla ayrışmasın.
 */
export async function GET() {
  const katalog = await getCatalogForDownload();
  if (!katalog) {
    return NextResponse.json({ error: "Katalog henüz hazır değil" }, { status: 404 });
  }

  const buf = await readFile(katalog.absPath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="inoxhan-katalog.pdf"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
