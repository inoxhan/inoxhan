import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/panel/ProductForm";
import { db } from "@/server/db";

export default async function YeniUrunPage() {
  const categories = await db.category.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <Link
        href="/panel/urunler"
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Ürünlere Dön
      </Link>
      <h1 className="font-display mt-4 mb-8 text-2xl font-bold text-steel-900">Yeni Ürün</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
