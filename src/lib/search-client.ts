import MiniSearch from "minisearch";
import { normalizeTr } from "@/lib/slugify-tr";
import type { SearchIndexItem } from "@/server/catalog";

/**
 * İstemci tarafı toleranslı arama — 456 ürün için indeks birkaç yüz KB'ı geçmez.
 * SKU tam eşleşmesi en güçlü sinyal; ad ve model onu izler.
 * processTerm normalizeTr kullanır → "CIVATA" da "cıvata" da aynı terime iner.
 */
export type { SearchIndexItem };

export function buildSearchIndex(items: SearchIndexItem[]) {
  const mini = new MiniSearch<SearchIndexItem>({
    fields: ["sku", "name", "brand", "model", "category", "specText"],
    storeFields: [
      "id",
      "sku",
      "name",
      "slug",
      "model",
      "brand",
      "category",
      "categorySlug",
      "image",
      "specs",
    ],
    processTerm: (term) => {
      const t = normalizeTr(term);
      return t.length > 0 ? t : null;
    },
    searchOptions: {
      prefix: true,
      fuzzy: 0.25,
      boost: { sku: 4, name: 2, model: 1.5 },
    },
  });
  mini.addAll(items);
  return mini;
}

export function searchProducts(
  mini: MiniSearch<SearchIndexItem>,
  query: string,
): SearchIndexItem[] {
  return mini.search(query) as unknown as SearchIndexItem[];
}
