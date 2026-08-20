"use server";

import { revalidatePath } from "next/cache";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/constants";
import { requireAdminOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { deleteStoredFile } from "@/server/storage";

/** Silinen taleplerin panel sayfalarını tazeler (rapor da talep sayar). */
function tazele(quoteId?: string): void {
  revalidatePath("/panel/teklifler");
  if (quoteId) revalidatePath(`/panel/teklifler/${quoteId}`);
  revalidatePath("/panel");
  revalidatePath("/panel/raporlar");
  revalidatePath("/panel/musteriler");
}

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

  tazele(quoteId);
}

/**
 * Teklif talebini KALICI siler — arşiv/çöp kutusu yoktur, kayıt geri gelmez.
 * Kalemler ve ek kayıtları şemadaki onDelete: Cascade ile birlikte gider;
 * ek DOSYALARI cascade temizlemediği için önce elle siliyoruz (satır gidince
 * yolları bir daha bulamayız).
 *
 * Müşteri kartı silinmez: aynı firma başka taleplerde de geçebilir. Firmayı
 * tümüyle kaldırmak için deleteCustomer (actions/customers.ts).
 */
export async function deleteQuote(quoteId: string): Promise<void> {
  await requireAdminOrThrow();

  const quote = await db.quoteRequest.findUnique({
    where: { id: quoteId },
    select: { attachmentPath: true, attachments: { select: { path: true } } },
  });
  if (!quote) return;

  const dosyalar = [quote.attachmentPath, ...quote.attachments.map((a) => a.path)].filter(
    (p): p is string => Boolean(p),
  );
  await Promise.all(dosyalar.map(deleteStoredFile));

  await db.quoteRequest.delete({ where: { id: quoteId } });
  tazele();
}
