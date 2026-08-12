"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Her sayfada erişilebilir sabit teklif aksiyonu.
 * Desktop: sağ altta pill buton. Mobil: başparmak bölgesinde tam genişlik bar.
 * (Faz 2'de /teklif yerine QuoteModal açacak.)
 */
export function FloatingQuoteButton({ whatsappNumber }: { whatsappNumber: string }) {
  const pathname = usePathname();
  // Panel, teklif sayfası ve PDF baskı düzeninde gösterme
  if (
    pathname.startsWith("/panel") ||
    pathname.startsWith("/teklif") ||
    pathname.startsWith("/katalog-baski")
  ) {
    return null;
  }

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Merhaba, teklif almak istiyorum.")}`
    : null;

  return (
    <>
      {/* Desktop */}
      <div className="fixed right-6 bottom-6 z-40 hidden flex-col items-end gap-3 md:flex">
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_click"
            data-track-payload='{"where":"floating"}'
            className="flex size-12 items-center justify-center rounded-full border border-steel-200 bg-white text-[#25D366] shadow-elevated transition-transform hover:scale-105"
            aria-label="WhatsApp'tan Teklif Al"
          >
            <MessageCircle className="size-6" />
          </a>
        )}
        <Link
          href="/teklif?kaynak=floating"
          data-track="quote_button_click"
          data-track-payload='{"where":"floating"}'
          className="gradient-steel flex h-13 items-center gap-2 rounded-full px-6 font-medium text-steel-950 shadow-elevated transition-all hover:brightness-105"
        >
          <Zap className="size-5" aria-hidden />
          Hızlı Teklif Al
        </Link>
      </div>

      {/* Mobil başparmak barı */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-steel-200 bg-white/95 p-3 backdrop-blur-md md:hidden",
          "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        )}
      >
        <Link
          href="/teklif?kaynak=floating"
          data-track="quote_button_click"
          data-track-payload='{"where":"floating-mobile"}'
          className="gradient-steel flex h-12 flex-1 items-center justify-center gap-2 rounded-md font-medium text-steel-950"
        >
          <Zap className="size-5" aria-hidden />
          Hızlı Teklif Al
        </Link>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_click"
            data-track-payload='{"where":"floating-mobile"}'
            className="flex size-12 items-center justify-center rounded-md border border-steel-200 text-[#25D366]"
            aria-label="WhatsApp'tan Teklif Al"
          >
            <MessageCircle className="size-6" />
          </a>
        )}
      </div>
    </>
  );
}
