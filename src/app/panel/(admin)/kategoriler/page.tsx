import { CategoryManager } from "@/components/panel/CategoryManager";
import { db } from "@/server/db";

export default async function PanelKategorilerPage() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-2xl font-bold text-steel-900">Kategoriler</h1>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
