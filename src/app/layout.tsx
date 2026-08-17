import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AnalyticsListener } from "@/components/AnalyticsListener";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { FloatingQuoteButton } from "@/components/layout/FloatingQuoteButton";
import { SITE } from "@/lib/constants";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

// Not: kod/SKU metinleri için ayrı bir web fontu (JetBrains Mono) indiriliyordu —
// her ilk ziyarette ~55 KB. Sistem monospace yığını aynı işi bedava görüyor
// (globals.css → --font-mono).

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Hızlı Teklif, Rekabetçi Fiyat`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const whatsappNumber = process.env.WHATSAPP_NUMBER ?? "";

  return (
    <html
      lang="tr"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingQuoteButton whatsappNumber={whatsappNumber} />
        <AnalyticsListener />
      </body>
    </html>
  );
}
