import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Yayına hazırlık kapısı — site henüz herkese açılmadan alan adı üzerinden
 * yalnız sahibinin görebilmesi için.
 *
 * `SITE_PASSWORD` ortam değişkeni DOLU olduğu sürece tüm sayfalar tarayıcının
 * kendi parola penceresiyle korunur (HTTP Basic Auth); değişken silindiğinde
 * site aynı anda herkese açılır — kod değişikliği gerekmez.
 *
 * Kullanıcı adı serbesttir (boş bırakılabilir), parola SITE_PASSWORD'dür.
 * 401 döndüğü için arama motorları da içeriği göremez/indekslemez.
 *
 * Not: Next 16'da bu dosya konvansiyonu `middleware` değil `proxy`.
 * Statik dışa aktarım (GitHub Pages) proxy desteklemez — derle-statik.ts
 * bu dosyayı derleme süresince dışarı alır.
 */
export function proxy(request: NextRequest) {
  const sifre = process.env.SITE_PASSWORD;
  if (!sifre) return NextResponse.next();

  const yetki = request.headers.get("authorization");
  if (yetki?.startsWith("Basic ")) {
    try {
      const cozulmus = atob(yetki.slice(6));
      const girilen = cozulmus.slice(cozulmus.indexOf(":") + 1);
      if (girilen === sifre) return NextResponse.next();
    } catch {
      // bozuk başlık — aşağıda yeniden sorulur
    }
  }

  return new NextResponse("Bu site henüz yayında değil.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Inoxhan", charset="UTF-8"',
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export const config = {
  // Statik varlıklar ve medya dışarıda: parola penceresi yalnız sayfalarda çıksın
  matcher: ["/((?!_next/static|_next/image|media|favicon.ico|icon.png|apple-icon.png).*)"],
};
