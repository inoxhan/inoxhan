"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { deleteStoredFile } from "@/server/storage";

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

/**
 * Firmayı ve TÜM teklif geçmişini KALICI siler — arşiv yoktur, geri gelmez.
 *
 * QuoteRequest → Customer ilişkisinde cascade YOK (şema bilinçli olarak
 * kısıtlayıcı); talepler önce silinmezse Postgres yabancı anahtar hatası
 * verir. Talep satırları gidince kalemler/ekler kendi cascade'leriyle düşer,
 * ek DOSYALARI ise elle temizlenir.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await requireAdminOrThrow();

  const quotes = await db.quoteRequest.findMany({
    where: { customerId },
    select: { attachmentPath: true, attachments: { select: { path: true } } },
  });

  const dosyalar = quotes
    .flatMap((q) => [q.attachmentPath, ...q.attachments.map((a) => a.path)])
    .filter((p): p is string => Boolean(p));
  await Promise.all(dosyalar.map(deleteStoredFile));

  await db.quoteRequest.deleteMany({ where: { customerId } });
  await db.customer.delete({ where: { id: customerId } });

  revalidatePath("/panel/musteriler");
  revalidatePath("/panel/teklifler");
  revalidatePath("/panel");
  revalidatePath("/panel/raporlar");
}
