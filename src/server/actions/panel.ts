"use server";

import { revalidatePath } from "next/cache";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/constants";
import { requireAdminOrThrow } from "@/server/auth";
import { db } from "@/server/db";

export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  await requireAdminOrThrow();
  if (!QUOTE_STATUSES.includes(status as QuoteStatus)) {
    throw new Error("Geçersiz durum");
  }

  const simdi = new Date();
  // Sipariş işaretlenirken fiyat zaten verilmiş sayılır: respondedAt boşsa şimdi damgalanır,
  // doluysa korunur (yanıt süresi istatistikleri bozulmasın)
  const mevcut =
    status === "SIPARIS"
      ? await db.quoteRequest.findUnique({
          where: { id: quoteId },
          select: { respondedAt: true },
        })
      : null;

  await db.quoteRequest.update({
    where: { id: quoteId },
    data: {
      status,
      // Cevaplanan → yanıt zamanını damgala; geri alınırsa temizle
      respondedAt:
        status === "CEVAPLANAN"
          ? simdi
          : status === "SIPARIS"
            ? (mevcut?.respondedAt ?? simdi)
            : null,
      // Sipariş damgası, 48 saatlik "fiyat tutmadı" sayacını durdurur
      orderedAt: status === "SIPARIS" ? simdi : null,
    },
  });

  revalidatePath("/panel/teklifler");
  revalidatePath(`/panel/teklifler/${quoteId}`);
  revalidatePath("/panel");
  revalidatePath("/panel/raporlar");
}
