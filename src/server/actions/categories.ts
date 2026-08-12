"use server";

import { revalidatePath } from "next/cache";
import { slugifyTr } from "@/lib/slugify-tr";
import { requireAdminOrThrow } from "@/server/auth";
import { db } from "@/server/db";

export interface CategoryState {
  error?: string;
}

export async function createCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  await requireAdminOrThrow();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Kategori adı en az 2 karakter olmalı" };

  const slug = slugifyTr(name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) return { error: "Bu kategori zaten var" };

  const max = await db.category.aggregate({ _max: { order: true } });
  await db.category.create({
    data: { name, slug, order: (max._max.order ?? 0) + 1 },
  });
  revalidatePath("/panel/kategoriler");
  revalidatePath("/urunler", "layout");
  return {};
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await requireAdminOrThrow();
  const trimmed = name.trim();
  if (trimmed.length < 2) return;
  await db.category.update({
    where: { id },
    data: { name: trimmed, slug: slugifyTr(trimmed) },
  });
  revalidatePath("/panel/kategoriler");
  revalidatePath("/urunler", "layout");
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await requireAdminOrThrow();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return { error: `Bu kategoride ${count} ürün var — önce ürünleri taşıyın` };
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/panel/kategoriler");
  revalidatePath("/urunler", "layout");
  return {};
}
