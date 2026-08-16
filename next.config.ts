import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 → GitHub Pages statik derlemesi (scripts/derle-statik.ts).
 * Sunucu gerektiren rotalar (panel, api, katalog-baski) derleme sırasında
 * geçici olarak dışarı alınır; teklif aksiyonu WhatsApp/e-posta karşılığına
 * takas edilir. Normal `next dev` / `next build` bu bloktan etkilenmez.
 */
const statik = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Dosyalı teklif kanalının dev/disk fallback'i FormData ile gelir (10 MB dosya
  // + multipart ek yükü). Vercel'de dosyalar istemciden doğrudan Blob'a yüklenir.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  ...(statik && {
    output: "export" as const,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
    trailingSlash: true,
    images: { unoptimized: true },
    turbopack: {
      resolveAlias: {
        "@/server/actions/quote": "@/server/actions/quote-static",
      },
    },
  }),
};

export default nextConfig;
