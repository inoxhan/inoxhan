import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/panel/ProductForm";
import { db } from "@/server/db";

export default async function UrunDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        brand: true,
        specs: { orderBy: { order: "asc" } },
        images: { orderBy: [{ isMain: "desc" }, { order: "asc" }] },
      },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link
        href="/panel/urunler"
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Ürünlere Dön
      </Link>
      <h1 className="font-display mt-4 mb-8 text-2xl font-bold text-steel-900">
        Ürünü Düzenle
      </h1>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          model: product.model ?? "",
          brandName: product.brand?.name ?? "",
          categoryId: product.categoryId,
          shortDesc: product.shortDesc ?? "",
          useAreas: product.useAreas ?? "",
          seoTitle: product.seoTitle ?? "",
          seoDesc: product.seoDesc ?? "",
          isActive: product.isActive,
          specs: product.specs.map((s) => ({ key: s.key, value: s.value })),
          imageBasePaths: product.images.map((i) => i.basePath),
        }}
      />
    </div>
  );
}
