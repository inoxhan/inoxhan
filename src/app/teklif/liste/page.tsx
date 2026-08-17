import { permanentRedirect } from "next/navigation";

/**
 * Eski hızlı teklif rotası — seçim artık /teklif sayfasının kendisinde yapılıyor.
 * Paylaşılmış bağlantılar ve ürün detayından gelen ?din= kırılmasın diye kalıcı
 * yönlendirme. (Statik derlemede bu dizin CIKARILAN_DIZINLER ile dışarıda kalır.)
 */
export default async function EskiListePage({
  searchParams,
}: {
  searchParams: Promise<{ din?: string }>;
}) {
  const sp = await searchParams;
  permanentRedirect(sp.din ? `/teklif?urun=${encodeURIComponent(sp.din)}` : "/teklif");
}
