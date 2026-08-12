"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrThrow } from "@/server/auth";
import { runCatalogGeneration } from "@/server/catalog-pdf";

/** Panelden PDF katalog üretimini tetikler — üretim arka planda sürer. */
export async function generateCatalog(): Promise<void> {
  await requireAdminOrThrow();
  // fire-and-forget: yanıt beklemeden dönülür, panel durumu yoklar
  void runCatalogGeneration();
  revalidatePath("/panel/katalog");
}
