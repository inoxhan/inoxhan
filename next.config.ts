import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 → GitHub Pages statik derlemesi (scripts/derle-github-pages.ts).
 * Sunucu gerektiren rotalar (panel, api, katalog-baski) derleme sırasında
 * geçici olarak dışarı alınır; teklif aksiyonu WhatsApp/e-posta karşılığına
 * takas edilir. Normal `next dev` / `next build` bu bloktan etkilenmez.
 */
const statik = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
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
