import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Kişisel verilerin korunması hakkında aydınlatma metni.",
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
          yükümlülükler saklıdır. KVKK kapsamındaki haklarınız (bilgi talep
          etme, düzeltme, silme vb.) için bizimle iletişime geçebilirsiniz.
        </p>
        <p className="text-sm text-steel-400">
          Not: Bu metin taslaktır; firma bilgileri netleştiğinde hukuki
          danışmanlık ile güncellenmesi önerilir.
        </p>
      </div>
    </div>
  );
}
