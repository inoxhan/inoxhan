import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";

export function QuoteSuccess() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <CheckCircle2 className="size-16 text-status-answered" aria-hidden />
      <h2 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-900">
        Talebin Alındı!
      </h2>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-steel-600">
        Ekibimiz talebini inceliyor. <strong>15-30 dakika</strong> içerisinde
        seninle iletişime geçeceğiz.
      </p>
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
