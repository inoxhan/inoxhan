import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "@/lib/quote-schema";

/**
 * Dosyalı teklif kanalının istemciden-doğrudan-Blob yükleme ucu.
 *
 * Vercel fonksiyon gövdesi ~4,5 MB ile sınırlı; 10 MB'a kadar dosyalar bu yüzden
 * sunucudan GEÇMEDEN tarayıcıdan Blob'a yüklenir (@vercel/blob/client `upload()`).
 * Bu uç yalnızca kısa ömürlü yükleme jetonu üretir: tip/boyut/yol burada sınırlanır.
 * Üretilen pathname submitQuoteList'e "blobPaths" olarak iletilir ve panel
 * erişimi yine /api/files oturum kapısından geçer.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob yapılandırılmadı — dosyalar form ile gönderilir" },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("uploads/")) {
          throw new Error("Geçersiz yükleme yolu");
        }
        return {
          allowedContentTypes: [...ATTACHMENT_TYPES],
          maximumSizeInBytes: ATTACHMENT_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      // Yükleme bitince ayrıca yapılacak iş yok — kayıt submitQuoteList'te oluşur
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yükleme başarısız" },
      { status: 400 },
    );
  }
}
