import Link from "next/link";
import { cn } from "@/lib/utils";

interface FilterItem {
  name: string;
  slug: string;
  count: number;
}

interface FilterPanelProps {
  categories: FilterItem[];
  brands: FilterItem[];
  activeCategorySlug?: string;
  activeBrandSlug?: string;
}

function chipClass(active: boolean) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
    active
      ? "border-steel-950 bg-steel-950 text-steel-50"
      : "border-steel-200 bg-white text-steel-600 hover:border-steel-400 hover:text-steel-900",
  );
}

/**
 * URL tabanlı filtreler — paylaşılabilir ve SEO dostu.
 * Kategori → /urunler/[kategori] rotası; marka → ?marka= parametresi.
 */
export function FilterPanel({
  categories,
  brands,
  activeCategorySlug,
  activeBrandSlug,
}: FilterPanelProps) {
  const basePath = activeCategorySlug ? `/urunler/${activeCategorySlug}` : "/urunler";

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap" role="list" aria-label="Kategoriler">
        <Link href="/urunler" className={chipClass(!activeCategorySlug)}>
          Tümü
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/urunler/${c.slug}`}
            className={chipClass(activeCategorySlug === c.slug)}
          >
            {c.name}
            <span className="text-xs opacity-60">{c.count}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap" aria-label="Markalar">
        <span className="shrink-0 text-xs tracking-wide text-steel-400 uppercase">Marka:</span>
        <Link href={basePath} className={chipClass(!activeBrandSlug)}>
          Tümü
        </Link>
        {brands
          .filter((b) => b.count > 0)
          .map((b) => (
            <Link
              key={b.slug}
              href={`${basePath}?marka=${b.slug}`}
              className={chipClass(activeBrandSlug === b.slug)}
            >
              {b.name}
            </Link>
          ))}
      </div>
    </div>
  );
}
