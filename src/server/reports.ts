import { buildMonthlyReport, type MonthlyReport, type ReportQuoteInput } from "@/lib/report-aggregate";
import { db } from "@/server/db";

/**
 * Aylık rapor sorgusu. Agregasyon saf fonksiyonda (lib/report-aggregate.ts);
 * burada yalnız ay sınırları ve tek sorgu var.
 *
 * Ay sınırları Türkiye saatine (UTC+3, DST yok) göre kurulur — gece yarısına
 * yakın gelen talepler yanlış aya düşmesin.
 */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Bellekte toplanan azami talep — aşılırsa sayfa uyarı basar (SQL groupBy zamanı gelmiştir). */
export const RAPOR_LIMIT = 5000;

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** "2026-08" — geçersiz/boş girdide içinde bulunulan ay (TR saati). */
export function gecerliAy(ay?: string | null): string {
  if (ay && /^\d{4}-(0[1-9]|1[0-2])$/.test(ay)) return ay;
  return new Date(Date.now() + TR_OFFSET_MS).toISOString().slice(0, 7);
}

export function ayEtiketi(ay: string): string {
  const [y, m] = ay.split("-").map(Number);
  return `${AY_ADLARI[m - 1]} ${y}`;
}

export function ayKaydir(ay: string, delta: number): string {
  const [y, m] = ay.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ayAraligi(ay: string): { baslangic: Date; bitis: Date } {
  const [y, m] = ay.split("-").map(Number);
  return {
    baslangic: new Date(Date.UTC(y, m - 1, 1) - TR_OFFSET_MS),
    bitis: new Date(Date.UTC(y, m, 1) - TR_OFFSET_MS),
  };
}

/** Ay seçici için son N ay (yeniden eskiye). */
export function sonAylar(n = 12, bitisAyi = gecerliAy()): { value: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const v = ayKaydir(bitisAyi, -i);
    return { value: v, label: ayEtiketi(v) };
  });
}

export async function getMonthlyReport(
  ay: string,
): Promise<{ rapor: MonthlyReport; kesildi: boolean }> {
  const { baslangic, bitis } = ayAraligi(ay);

  const quotes = await db.quoteRequest.findMany({
    where: { createdAt: { gte: baslangic, lt: bitis } },
    include: {
      customer: { select: { id: true, name: true, company: true, phone: true } },
      items: {
        include: {
          product: { select: { sku: true, name: true, category: { select: { name: true } } } },
          variant: { select: { code: true, description: true, dinNorm: true, groupCode: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: RAPOR_LIMIT,
  });

  const girdi: ReportQuoteInput[] = quotes.map((q) => ({
    id: q.id,
    status: q.status,
    source: q.source,
    createdAt: q.createdAt,
    respondedAt: q.respondedAt,
    orderedAt: q.orderedAt,
    customerId: q.customer.id,
    customerName: q.customer.name,
    customerCompany: q.customer.company,
    customerPhone: q.customer.phone,
    items: q.items.map((i) => ({
      productSku: i.product?.sku ?? null,
      productName: i.product?.name ?? null,
      categoryName: i.product?.category.name ?? null,
      variantCode: i.variant?.code ?? null,
      variantDescription: i.variant?.description ?? null,
      variantDinNorm: i.variant?.dinNorm ?? null,
      groupCode: i.variant?.groupCode ?? null,
      freeText: i.freeText,
      quantity: i.quantity,
      unit: i.unit,
      quality: i.quality,
    })),
  }));

  return { rapor: buildMonthlyReport(girdi), kesildi: quotes.length >= RAPOR_LIMIT };
}
