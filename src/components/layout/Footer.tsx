import Link from "next/link";
import { SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-steel-800 bg-steel-950 text-steel-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/brand/inoxhan-logo-sm.webp"
            alt="İnoxhan"
            width={162}
            height={28}
            className="h-7 w-auto"
          />
          <p className="mt-3 max-w-sm text-sm leading-relaxed">{SITE.tagline}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-steel-800 px-3 py-1.5 text-xs text-steel-300">
            <span className="size-1.5 rounded-full bg-signal" aria-hidden />
            15-30 dakika içinde dönüş hedefi
          </p>
        </div>

        <nav aria-label="Site" className="text-sm">
          <p className="mb-3 font-medium text-steel-200">Site</p>
          <ul className="space-y-2">
            <li><Link href="/urunler" className="hover:text-steel-100">Ürünler</Link></li>
            <li><Link href="/teklif" className="hover:text-steel-100">Teklif Al</Link></li>
            <li><Link href="/katalog" className="hover:text-steel-100">Katalog (PDF)</Link></li>
            <li><Link href="/hakkimizda" className="hover:text-steel-100">Hakkımızda</Link></li>
            <li><Link href="/iletisim" className="hover:text-steel-100">İletişim</Link></li>
          </ul>
        </nav>

        <nav aria-label="Yasal" className="text-sm">
          <p className="mb-3 font-medium text-steel-200">Yasal</p>
          <ul className="space-y-2">
            <li><Link href="/kvkk" className="hover:text-steel-100">KVKK Aydınlatma Metni</Link></li>
          </ul>
        </nav>
      </div>
      <div className="divider-inox" />
      <div className="mx-auto max-w-7xl px-4 py-5 text-xs sm:px-6">
        © {new Date().getFullYear()} {SITE.legalName}. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
