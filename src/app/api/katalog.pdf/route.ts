import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getLatestCatalogFile } from "@/server/catalog-pdf";

/** Son üretilen PDF katalog — herkese açık indirme. */
export async function GET() {
  const latest = await getLatestCatalogFile();
  if (!latest) {
    return NextResponse.json({ error: "Katalog henüz hazır değil" }, { status: 404 });
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
