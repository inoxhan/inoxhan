import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

// Statik dışa aktarım (output: export) metadata rotalarında bunu açıkça ister
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel", "/katalog-baski", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
