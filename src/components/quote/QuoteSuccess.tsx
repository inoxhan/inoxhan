import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { SITE } from "@/lib/constants";

/**
 * `kanal`: statik yayında (GitHub Pages) talep sunucuya kaydedilmez;
 * "eposta" → mailto taslağı açıldı, "whatsapp" → WhatsApp'a yönlendirildi.
 * Sunucu modunda prop verilmez ve klasik "Talebin Alındı" metni gösterilir.
 */
export function QuoteSuccess({ kanal }: { kanal?: "eposta" | "whatsapp" }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <CheckCircle2 className="size-16 text-status-answered" aria-hidden />
      {kanal === "eposta" ? (
        <>
          <h2 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-900">
            E-posta Taslağınız Açıldı
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-steel-600">
            Talebiniz e-posta taslağı olarak hazırlandı —{" "}
            <strong>göndermeyi unutmayın</strong>. Gönderdikten sonra{" "}
            <strong>15-30 dakika</strong> içerisinde sizinle iletişime geçeceğiz.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-steel-500">
            <Mail className="size-4" aria-hidden />
            Taslak açılmadıysa talebinizi doğrudan{" "}
            <a href={`mailto:${SITE.email}`} className="underline underline-offset-4">
              {SITE.email}
            </a>{" "}
            adresine yazabilirsiniz.
          </p>
        </>
      ) : kanal === "whatsapp" ? (
        <>
          <h2 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-900">
            WhatsApp&apos;a Yönlendirildiniz
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-steel-600">
            Talebiniz hazır bir WhatsApp mesajına dönüştürüldü —{" "}
            <strong>göndermeyi unutmayın</strong>. Gönderdikten sonra{" "}
            <strong>15-30 dakika</strong> içerisinde size dönüş yapacağız.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-900">
            Talebin Alındı!
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-steel-600">
            Ekibimiz talebini inceliyor. <strong>15-30 dakika</strong> içerisinde
            seninle iletişime geçeceğiz.
          </p>
        </>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/urunler" className={buttonStyles({ variant: "dark" })}>
          Ürünlere Göz At
        </Link>
        <Link href="/" className={buttonStyles({ variant: "outline" })}>
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
