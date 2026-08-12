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

  await db.quoteRequest.update({
    where: { id: quoteId },
    data: {
      status,
      // Cevaplanan → yanıt zamanını damgala; geri alınırsa temizle
      respondedAt: status === "CEVAPLANAN" ? new Date() : null,
    },
  });

  revalidatePath("/panel/teklifler");
  revalidatePath(`/panel/teklifler/${quoteId}`);
  revalidatePath("/panel");
}
