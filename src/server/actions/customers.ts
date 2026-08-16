"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOrThrow } from "@/server/auth";
import { db } from "@/server/db";

/**
 * Panelden müşteri bilgisi güncelleme — vergi no/TC burada tutulur:
 * teklif formunda sorulmaz, yalnız sipariş aşamasında müşteriden istenip
 * panelde kaydedilir (kargo/fatura).
 */
const customerUpdateSchema = z.object({
  company: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  taxOrTcNo: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Vergi no 10, TC no 11 haneli olmalı")
    .optional()
    .or(z.literal("")),
});

export type UpdateCustomerResult = { ok: true } | { ok: false; message: string };

export async function updateCustomer(
  customerId: string,
  formData: FormData,
): Promise<UpdateCustomerResult> {
  await requireAdminOrThrow();

  const parsed = customerUpdateSchema.safeParse({
    company: String(formData.get("company") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    taxOrTcNo: String(formData.get("taxOrTcNo") ?? ""),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Bilgileri kontrol edin" };
  }
  const v = parsed.data;

  await db.customer.update({
    where: { id: customerId },
    data: {
      company: v.company || null,
      email: v.email || null,
      address: v.address || null,
      taxOrTcNo: v.taxOrTcNo || null,
    },
  });

  revalidatePath("/panel/musteriler");
  revalidatePath(`/panel/musteriler/${customerId}`);
  return { ok: true };
}
