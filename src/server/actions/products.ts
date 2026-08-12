"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { slugifyTr } from "@/lib/slugify-tr";
import { requireAdminOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { processProductImage } from "@/server/media";

export interface ProductFormState {
  error?: string;
}

function revalidateCatalog() {
  revalidateTag("search-index", "max");
  revalidatePath("/urunler", "layout");
  revalidatePath("/panel/urunler");
}

/** Panel ürün oluşturma/güncelleme — görselleri sharp ile türevlere işler. */
export async function upsertProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const brandName = String(formData.get("brandName") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const shortDesc = String(formData.get("shortDesc") ?? "").trim();
  const useAreas = String(formData.get("useAreas") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDesc = String(formData.get("seoDesc") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!sku || !name || !categoryId) {
    return { error: "SKU, ürün adı ve kategori zorunludur" };
  }

  let specs: { key: string; value: string }[] = [];
  try {
    specs = JSON.parse(String(formData.get("specs") ?? "[]"));
  } catch {
    return { error: "Teknik özellikler okunamadı" };
  }
  specs = specs.filter((s) => s.key.trim() && s.value.trim());

  // SKU çakışması (başka ürün aynı SKU'yu kullanıyorsa)
  const skuOwner = await db.product.findUnique({ where: { sku } });
  if (skuOwner && skuOwner.id !== id) {
    return { error: `Bu SKU zaten kayıtlı: ${skuOwner.name}` };
  }

  // Marka: adıyla bul veya oluştur
  let brandId: string | null = null;
  if (brandName) {
    const brand = await db.brand.upsert({
      where: { slug: slugifyTr(brandName) },
      update: {},
      create: { name: brandName, slug: slugifyTr(brandName) },
    });
    brandId = brand.id;
  }

  // Benzersiz slug üret
  const baseSlug = slugifyTr(`${brandName} ${name}`) || slugifyTr(sku);
  const slugOwner = await db.product.findUnique({ where: { slug: baseSlug } });
  const slug =
    slugOwner && slugOwner.id !== id ? `${baseSlug}-${slugifyTr(sku)}` : baseSlug;

  const data = {
    sku,
    name,
    slug,
    model: model || null,
    shortDesc: shortDesc || null,
    useAreas: useAreas || null,
    seoTitle: seoTitle || null,
    seoDesc: seoDesc || null,
    isActive,
    categoryId,
    brandId,
  };

  const product = id
    ? await db.product.update({ where: { id }, data })
    : await db.product.create({ data });

  // Teknik özellikleri tazele
  await db.productSpec.deleteMany({ where: { productId: product.id } });
  if (specs.length > 0) {
    await db.productSpec.createMany({
      data: specs.map((s, i) => ({
        productId: product.id,
        key: s.key.trim(),
        value: s.value.trim(),
        order: i,
      })),
    });
  }

  // Yeni görseller yüklendiyse mevcutların yerine geçer (ilki ana görsel)
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 0) {
    await db.productImage.deleteMany({ where: { productId: product.id } });
    for (let i = 0; i < files.length; i++) {
      const buf = Buffer.from(await files[i].arrayBuffer());
      const baseName = `${slugifyTr(sku)}-${i}-${Date.now()}`;
      try {
        const processed = await processProductImage(buf, baseName);
        await db.productImage.create({
          data: {
            productId: product.id,
            basePath: processed.basePath,
            alt: name,
            isMain: i === 0,
            order: i,
            width: processed.width,
            height: processed.height,
          },
        });
      } catch {
        return { error: `Görsel işlenemedi: ${files[i].name}` };
      }
    }
  }

  revalidateCatalog();
  redirect("/panel/urunler");
}

export async function toggleProductActive(id: string): Promise<void> {
  await requireAdminOrThrow();
  const product = await db.product.findUnique({ where: { id } });
  if (!product) return;
  await db.product.update({ where: { id }, data: { isActive: !product.isActive } });
  revalidateCatalog();
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdminOrThrow();
  const product = await db.product.findUnique({ where: { id } });
  if (!product) return;
  // Teklif geçmişi bozulmasın: kalemlere ürün adını serbest metin olarak yaz
  await db.quoteItem.updateMany({
    where: { productId: id },
    data: { freeText: `${product.name} (${product.sku})`, productId: null },
  });
  await db.product.delete({ where: { id } });
  revalidateCatalog();
}
