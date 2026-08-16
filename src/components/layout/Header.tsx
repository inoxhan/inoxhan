"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/urunler", label: "Ürünler" },
  { href: "/katalog", label: "Katalog" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-steel-800 bg-steel-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          {/* Saydam zeminli kurumsal logo (scripts/hazirla-logo.ts üretir).
              next/image kullanılmaz — türev zaten optimize, tek dosya. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/brand/inoxhan-logo-sm.webp"
            alt="İnoxhan"
            width={185}
            height={32}
            className="h-8 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-steel-300 transition-colors hover:text-steel-50",
                pathname.startsWith(item.href) && "text-steel-50",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/teklif"
            className={buttonStyles({
              variant: "metallic",
              size: "sm",
              className: "hidden md:inline-flex",
            })}
          >
            <Zap className="size-4" aria-hidden />
            Teklif Al
          </Link>
          <button
            type="button"
            className="p-2 text-steel-200 md:hidden"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-steel-800 bg-steel-950 px-4 pt-2 pb-4 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-3 text-steel-200 hover:text-steel-50"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/teklif"
            className={buttonStyles({
              variant: "metallic",
              size: "md",
              className: "mt-3 w-full",
            })}
            onClick={() => setOpen(false)}
          >
            <Zap className="size-4" aria-hidden />
            Teklif Al
          </Link>
        </nav>
      )}
    </header>
  );
}
