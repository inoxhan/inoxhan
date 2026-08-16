import MiniSearch from "minisearch";
import { normalizeTr } from "@/lib/slugify-tr";
import type { VariantIndexItem } from "@/server/catalog";

/**
 * Hızlı teklif seçicisinin istemci tarafı araması — search-client.ts ile aynı
 * ilkeler: normalizeTr, AND-öncelikli sorgu, kod en güçlü sinyal.
 * ~6.750 varyantta MiniSearch indeksi tarayıcıda sorunsuz kurulur.
 */
export type { VariantIndexItem };

export function buildVariantIndex(items: VariantIndexItem[]) {
  const mini = new MiniSearch<VariantIndexItem>({
    fields: ["code", "dinNorm", "description", "groupCode"],
    storeFields: [
      "code",
      "groupCode",
      "dinNorm",
      "description",
      "quality",
      "image",
      "productSlug",
      "categorySlug",
    ],
    processTerm: (term) => {
      const t = normalizeTr(term);
      return t.length > 0 ? t : null;
    },
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { code: 4, dinNorm: 3, description: 1.5 },
    },
  });
  mini.addAll(items);
  return mini;
}

/** AND önce: "DIN 933 M8" tüm katalogu döndürmesin; boş kalırsa OR'a düşülür. */
export function searchVariants(
  mini: MiniSearch<VariantIndexItem>,
  query: string,
  limit = 50,
): VariantIndexItem[] {
  const strict = mini.search(query, { combineWith: "AND" });
  const results = strict.length > 0 ? strict : mini.search(query);
  return results.slice(0, limit) as unknown as VariantIndexItem[];
}
