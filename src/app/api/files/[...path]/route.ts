import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { readStoredFile } from "@/server/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
};

/** Teklif ekleri — yalnızca panel oturumu olanlara servis edilir. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session.adminId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { path: parts } = await params;
  const relPath = parts.join("/");
  const buf = await readStoredFile(relPath);
  if (!buf) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const ext = relPath.slice(relPath.lastIndexOf(".")).toLowerCase();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
  });
}
