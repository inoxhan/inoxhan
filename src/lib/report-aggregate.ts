import { quoteOutcome, type QuoteOutcome } from "@/lib/quote-outcome";

/**
 * Aylık rapor agregasyonu — SAF fonksiyon (veritabanı bilmez, fixture ile test edilir).
 * Sorgu katmanı: src/server/reports.ts
 *
 * "Sorulmuş ama verilmemiş", teklif sonucundan türetilir (quote-outcome.ts):
 * fiyat verilip 48 saat içinde siparişe dönmeyen taleplerin kalemleri.
 */

export interface ReportItemInput {
  productSku: string | null;
  productName: string | null;
  categoryName: string | null;
  variantCode: string | null;
  variantDescription: string | null;
  variantDinNorm: string | null;
  groupCode: string | null;
  freeText: string | null;
  quantity: number;
  unit: string;
  quality: string | null;
}

export interface ReportQuoteInput {
  id: string;
  status: string;
  source: string;
  createdAt: Date;
  respondedAt: Date | null;
  orderedAt: Date | null;
  customerId: string;
  customerName: string;
  customerCompany: string | null;
  customerPhone: string;
  items: ReportItemInput[];
}

export interface UrunSatiri {
  key: string;
  ad: string;
  sku: string | null;
  kategori: string | null;
  /** Kaç ayrı talepte geçti */
  talep: number;
  /** Kaç ayrı firma sordu */
  firma: number;
  /** Toplam istenen miktar (birimler karışık olabilir — kalem birimi ayrıca tutulur) */
  adet: number;
  /** Bu üründen kaç talep siparişe döndü */
  siparis: number;
  olculer: { code: string; description: string; talep: number; adet: number }[];
}

export interface FirmaSatiri {
  id: string;
  ad: string;
  firma: string | null;
  telefon: string;
  talep: number;
  kalem: number;
  adet: number;
  siparis: number;
  sonTalep: Date;
}

export interface DagilimSatiri {
  ad: string;
  kalem: number;
  adet: number;
  /** Kalem sayısına göre yüzde */
  oran: number;
}

export interface MonthlyReport {
  ozet: {
    talep: number;
    firma: number;
    kalem: number;
    toplamAdet: number;
    urun: number;
    siparis: number;
    siparisOrani: number;
    kayip: number;
    yanitsiz: number;
    acik: number;
    musteride: number;
    katalogDisi: number;
    ortYanitDk: number | null;
    hizliYanitOrani: number | null;
  };
  urunler: UrunSatiri[];
  verilmeyenler: UrunSatiri[];
  yanitsizlar: UrunSatiri[];
  firmalar: FirmaSatiri[];
  kategoriler: DagilimSatiri[];
  gruplar: DagilimSatiri[];
  gecikenler: { id: string; firma: string; dakika: number; createdAt: Date }[];
}

/** Hızlı yanıt eşiği (dakika) — "24 saat içinde cevaplanan" oranı. */
const HIZLI_YANIT_DK = 24 * 60;

function urunAnahtari(item: ReportItemInput): { key: string; ad: string } {
  if (item.productSku) return { key: item.productSku, ad: item.productName ?? item.productSku };
  if (item.variantDinNorm) return { key: `norm:${item.variantDinNorm}`, ad: item.variantDinNorm };
  if (item.variantCode)
    return { key: `kod:${item.variantCode}`, ad: item.variantDescription ?? item.variantCode };
  const t = (item.freeText ?? "—").trim().toLowerCase();
  return { key: `serbest:${t}`, ad: item.freeText?.trim() || "—" };
}

/** Talep kümesinden ürün tablosu üretir (en çok sorulan / verilmeyen listeleri aynı işi görür). */
function urunTablosu(quotes: ReportQuoteInput[], now: Date): UrunSatiri[] {
  const map = new Map<
    string,
    UrunSatiri & { firmalar: Set<string>; olcuMap: Map<string, { description: string; talepler: Set<string>; adet: number }> }
  >();

  for (const q of quotes) {
    const satildi = quoteOutcome(q, now) === "satildi";
    // Aynı üründen birden fazla kalem varsa talep bir kez sayılsın
    const buTalepteGorulen = new Set<string>();

    for (const item of q.items) {
      const { key, ad } = urunAnahtari(item);
      let satir = map.get(key);
      if (!satir) {
        satir = {
          key,
          ad,
          sku: item.productSku,
          kategori: item.categoryName,
          talep: 0,
          firma: 0,
          adet: 0,
          siparis: 0,
          olculer: [],
          firmalar: new Set(),
          olcuMap: new Map(),
        };
        map.set(key, satir);
      }

      satir.adet += item.quantity;
      satir.firmalar.add(q.customerId);
      if (!buTalepteGorulen.has(key)) {
        buTalepteGorulen.add(key);
        satir.talep += 1;
        if (satildi) satir.siparis += 1;
      }

      if (item.variantCode) {
        const olcu = satir.olcuMap.get(item.variantCode) ?? {
          description: item.variantDescription ?? item.variantCode,
          talepler: new Set<string>(),
          adet: 0,
        };
        olcu.talepler.add(q.id);
        olcu.adet += item.quantity;
        satir.olcuMap.set(item.variantCode, olcu);
      }
    }
  }

  return [...map.values()]
    .map((s) => ({
      key: s.key,
      ad: s.ad,
      sku: s.sku,
      kategori: s.kategori,
      talep: s.talep,
      firma: s.firmalar.size,
      adet: s.adet,
      siparis: s.siparis,
      olculer: [...s.olcuMap.entries()]
        .map(([code, o]) => ({
          code,
          description: o.description,
          talep: o.talepler.size,
          adet: o.adet,
        }))
        .sort((a, b) => b.talep - a.talep || b.adet - a.adet),
    }))
    .sort((a, b) => b.talep - a.talep || b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
}

function dagilim(
  quotes: ReportQuoteInput[],
  etiket: (item: ReportItemInput) => string,
): DagilimSatiri[] {
  const map = new Map<string, { kalem: number; adet: number }>();
  let toplamKalem = 0;

  for (const q of quotes) {
    for (const item of q.items) {
      const ad = etiket(item);
      const mevcut = map.get(ad) ?? { kalem: 0, adet: 0 };
      mevcut.kalem += 1;
      mevcut.adet += item.quantity;
      map.set(ad, mevcut);
      toplamKalem += 1;
    }
  }

  return [...map.entries()]
    .map(([ad, v]) => ({
      ad,
      kalem: v.kalem,
      adet: v.adet,
      oran: toplamKalem > 0 ? Math.round((v.kalem / toplamKalem) * 100) : 0,
    }))
    .sort((a, b) => b.kalem - a.kalem);
}

export function buildMonthlyReport(
  quotes: ReportQuoteInput[],
  now: Date = new Date(),
): MonthlyReport {
  const sonuclar = new Map<string, QuoteOutcome>(quotes.map((q) => [q.id, quoteOutcome(q, now)]));
  const sonucla = (s: QuoteOutcome) => quotes.filter((q) => sonuclar.get(q.id) === s);

  const firmaMap = new Map<string, FirmaSatiri>();
  let kalem = 0;
  let toplamAdet = 0;
  let katalogDisi = 0;
  const urunAnahtarlari = new Set<string>();
  const yanitSureleri: number[] = [];

  for (const q of quotes) {
    const satildi = sonuclar.get(q.id) === "satildi";
    for (const item of q.items) {
      kalem += 1;
      toplamAdet += item.quantity;
      if (!item.productSku) katalogDisi += 1;
      urunAnahtarlari.add(urunAnahtari(item).key);
    }

    const f = firmaMap.get(q.customerId);
    if (f) {
      f.talep += 1;
      f.kalem += q.items.length;
      f.adet += q.items.reduce((s, i) => s + i.quantity, 0);
      if (satildi) f.siparis += 1;
      if (q.createdAt > f.sonTalep) f.sonTalep = q.createdAt;
    } else {
      firmaMap.set(q.customerId, {
        id: q.customerId,
        ad: q.customerName,
        firma: q.customerCompany,
        telefon: q.customerPhone,
        talep: 1,
        kalem: q.items.length,
        adet: q.items.reduce((s, i) => s + i.quantity, 0),
        siparis: satildi ? 1 : 0,
        sonTalep: q.createdAt,
      });
    }

    if (q.respondedAt) {
      yanitSureleri.push((q.respondedAt.getTime() - q.createdAt.getTime()) / 60_000);
    }
  }

  const siparis = sonucla("satildi").length;
  const gecikenler = quotes
    .filter((q) => {
      const s = sonuclar.get(q.id);
      return s === "yanitsiz" || (q.respondedAt && q.respondedAt.getTime() - q.createdAt.getTime() > HIZLI_YANIT_DK * 60_000);
    })
    .map((q) => ({
      id: q.id,
      firma: q.customerCompany || q.customerName,
      dakika: Math.round(
        ((q.respondedAt ?? now).getTime() - q.createdAt.getTime()) / 60_000,
      ),
      createdAt: q.createdAt,
    }))
    .sort((a, b) => b.dakika - a.dakika)
    .slice(0, 20);

  return {
    ozet: {
      talep: quotes.length,
      firma: firmaMap.size,
      kalem,
      toplamAdet,
      urun: urunAnahtarlari.size,
      siparis,
      siparisOrani: quotes.length > 0 ? Math.round((siparis / quotes.length) * 100) : 0,
      kayip: sonucla("fiyat_tutmadi").length,
      yanitsiz: sonucla("yanitsiz").length,
      acik: sonucla("acik").length,
      musteride: sonucla("musteride").length,
      katalogDisi,
      ortYanitDk:
        yanitSureleri.length > 0
          ? Math.round(yanitSureleri.reduce((a, b) => a + b, 0) / yanitSureleri.length)
          : null,
      hizliYanitOrani:
        yanitSureleri.length > 0
          ? Math.round(
              (yanitSureleri.filter((d) => d <= HIZLI_YANIT_DK).length / yanitSureleri.length) * 100,
            )
          : null,
    },
    urunler: urunTablosu(quotes, now),
    verilmeyenler: urunTablosu(sonucla("fiyat_tutmadi"), now),
    yanitsizlar: urunTablosu(sonucla("yanitsiz"), now),
    firmalar: [...firmaMap.values()].sort(
      (a, b) => b.talep - a.talep || b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"),
    ),
    kategoriler: dagilim(quotes, (i) => i.categoryName ?? "Katalog dışı"),
    gruplar: dagilim(quotes, (i) => i.groupCode ?? "Katalog dışı"),
    gecikenler,
  };
}
