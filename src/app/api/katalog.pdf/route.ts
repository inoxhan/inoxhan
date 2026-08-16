import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getLatestCatalogFile } from "@/server/catalog-pdf";

/**
 * Son üretilen PDF katalog — herkese açık indirme.
 * Vercel'de storage/ diski yoktur; lokalde üretilip repoya commit edilen
 * public/katalog.pdf yedek kaynak olarak servis edilir.
 */
export async function GET() {
  const latest = await getLatestCatalogFile();
  if (!latest) {
    try {
      const buf = await readFile(path.join(process.cwd(), "public", "katalog.pdf"));
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="inoxhan-katalog.pdf"`,
          "cache-control": "public, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json({ error: "Katalog henüz hazır değil" }, { status: 404 });
    }
  }
  const buf = await readFile(latest.absPath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="inoxhan-katalog.pdf"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
