import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-steel-500">
      <Link href="/" className="hover:text-steel-900">
        Ana Sayfa
      </Link>
      {items.map((item, i) => (
        <Fragment key={i}>
          <ChevronRight className="size-3.5 text-steel-300" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="hover:text-steel-900">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-steel-900">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
