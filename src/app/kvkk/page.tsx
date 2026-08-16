import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Kişisel verilerin korunması hakkında aydınlatma metni.",
  alternates: { canonical: "/kvkk" },
};

export default function KvkkPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-steel-900">
        KVKK Aydınlatma Metni
      </h1>
      <div className="mt-6 space-y-4 leading-relaxed text-steel-600">
        <p>
          {SITE.legalName} olarak, 6698 sayılı Kişisel Verilerin Korunması
          Kanunu (&quot;KVKK&quot;) kapsamında, teklif talep formu aracılığıyla
          paylaştığınız ad-soyad, firma, telefon ve e-posta bilgilerinizi
          yalnızca talebinize dönüş yapmak ve teklif süreçlerini yürütmek
          amacıyla işleriz.
        </p>
        <p>
          Verileriniz üçüncü kişilerle pazarlama amacıyla paylaşılmaz; yasal
          yükümlülükler saklıdır. KVKK&apos;nın 11. maddesi kapsamındaki
          haklarınızı (bilgi talep etme, düzeltme, silme, işlemeye itiraz vb.)
          kullanmak için başvurunuzu{" "}
          <a href={`mailto:${SITE.email}`} className="underline underline-offset-4">
            {SITE.email}
          </a>{" "}
          adresine iletebilirsiniz; başvurular en geç 30 gün içinde
          yanıtlanır.
        </p>
      </div>
    </div>
  );
}
