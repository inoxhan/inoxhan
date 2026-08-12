import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  /** Sayfa numarasını URL'e çevirir (diğer parametreleri koruyarak). */
  makeHref: (page: number) => string;
}

export function Pagination({ page, pageCount, makeHref }: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2,
  );

  const items: (number | "...")[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push("...");
    items.push(pages[i]);
  }

  return (
    <nav className="mt-12 flex items-center justify-center gap-1" aria-label="Sayfalama">
      {page > 1 && (
        <Link
          href={makeHref(page - 1)}
          className="flex size-10 items-center justify-center rounded-md border border-steel-200 text-steel-600 hover:border-steel-400"
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      {items.map((it, i) =>
        it === "..." ? (
          <span key={`gap-${i}`} className="px-2 text-steel-400">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={makeHref(it)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              "flex size-10 items-center justify-center rounded-md border text-sm",
              it === page
                ? "border-steel-950 bg-steel-950 text-steel-50"
                : "border-steel-200 text-steel-600 hover:border-steel-400",
            )}
          >
            {it}
          </Link>
        ),
      )}
      {page < pageCount && (
        <Link
          href={makeHref(page + 1)}
          className="flex size-10 items-center justify-center rounded-md border border-steel-200 text-steel-600 hover:border-steel-400"
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="size-5" />
        </Link>
      )}
    </nav>
  );
}
