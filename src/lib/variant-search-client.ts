import MiniSearch from "minisearch";
import { normalizeTr } from "@/lib/slugify-tr";
import type { VariantIndexItem } from "@/server/catalog";

/**
 * YEDEK arama — yalnız birebir eşleştirme (varyant-filtre.ts) sonuç bulamadığında
 * çalışır: yazım hatalarını (fuzzy) ve ön ek eşleşmesini tolere eder.
 * Asıl arama artık kademeli daraltan, tahmin edilebilir filtredir; MiniSearch'ün
 * fuzzy davranışı "933 yazana 934 gösterme" sorununu yaratıyordu.
 * ~6.750 varyantta indeks tarayıcıda sorunsuz kurulur.
 */
export type { VariantIndexItem };

/**
 * MiniSearch indeksi maliyetlidir (~6.750 belge); aynı liste için bir kez kurulup
 * saklanır. WeakMap sayesinde render sırasında güvenle çağrılabilir (saf, idempotent).
 */
const yedekIndeksler = new WeakMap<object, MiniSearch<VariantIndexItem>>();

export function yedekIndeks(items: VariantIndexItem[]): MiniSearch<VariantIndexItem> {
  let mevcut = yedekIndeksler.get(items);
  if (!mevcut) {
    mevcut = buildVariantIndex(items);
    yedekIndeksler.set(items, mevcut);
  }
  return mevcut;
}

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
