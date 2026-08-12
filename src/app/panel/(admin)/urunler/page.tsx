import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ProductRowActions } from "@/components/panel/ProductRowActions";
import { ProductImage } from "@/components/catalog/ProductImage";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";

export default async function PanelUrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await db.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q.toUpperCase() } },
            { model: { contains: q } },
          ],
        }
      : undefined,
    include: {
      category: true,
      brand: true,
      images: { where: { isMain: true }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-steel-900">Ürünler</h1>
        <Link href="/panel/urunler/yeni" className={buttonStyles({ variant: "dark", size: "sm" })}>
          <Plus className="size-4" aria-hidden />
          Yeni Ürün
        </Link>
      </div>

      <form action="/panel/urunler" className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-steel-400" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Ad, SKU veya model ara…"
          className="h-11 w-full rounded-md border border-steel-200 bg-white pl-10 text-[15px] focus:border-steel-500 focus:outline-none"
        />
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-steel-200 bg-white shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-steel-100 text-left text-xs tracking-wide text-steel-400 uppercase">
              <th className="p-3">Ürün</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Durum</th>
              <th className="p-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-steel-50 last:border-0 hover:bg-steel-50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 shrink-0 overflow-hidden rounded-md bg-photo">
                      <ProductImage
                        basePath={p.images[0]?.basePath ?? null}
                        alt=""
                        sizes="44px"
                        className="size-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-steel-900">{p.name}</p>
                      <p className="text-xs text-steel-400">{p.brand?.name ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-mono text-xs text-steel-500">{p.sku}</td>
                <td className="p-3 text-steel-600">{p.category.name}</td>
                <td className="p-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      p.isActive
                        ? "bg-status-answered/10 text-status-answered"
                        : "bg-steel-100 text-steel-400",
                    )}
                  >
                    {p.isActive ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="p-3">
                  <ProductRowActions id={p.id} isActive={p.isActive} />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-steel-400">
                  Ürün bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-steel-400">
        Toplu ürün girişi için Excel içe aktarma hattı kullanılacak (Faz 5).
      </p>
    </div>
  );
}
