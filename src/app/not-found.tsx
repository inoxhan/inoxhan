import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 md:py-32">
      <SearchX className="size-16 text-steel-300" aria-hidden />
      <h1 className="font-display mt-6 text-4xl font-bold tracking-tight text-steel-900">
        Sayfa Bulunamadı
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-steel-600">
        Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Ürün
        kütüphanesinden aradığınızı bulabilir veya doğrudan teklif
        isteyebilirsiniz.
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
