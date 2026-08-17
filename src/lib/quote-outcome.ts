import { LOST_AFTER_HOURS, LOST_REASON } from "@/lib/constants";

/**
 * Teklif sonucu — SAKLANMAZ, her okumada türetilir.
 *
 * Kural (kullanıcı kararı): kalem kalem elle işaretleme yok. Fiyat verildikten
 * sonra LOST_AFTER_HOURS (48) saat içinde sipariş oluşmazsa talep kendiliğinden
 * "Fiyat tutmadı" sayılır; hiç cevaplanmadan aynı süre geçerse "Yanıtsız kapandı"
 * (bu bizden kaynaklı kayıptır, raporda ayrı blokta uyarı olarak çıkar).
 *
 * Türetilmiş olduğu için cron/arka plan işi gerekmez ve eşik değiştiğinde geçmiş
 * aylar da yeni kurala göre yeniden hesaplanır.
 */

export const QUOTE_OUTCOMES = ["acik", "musteride", "satildi", "fiyat_tutmadi", "yanitsiz"] as const;
export type QuoteOutcome = (typeof QUOTE_OUTCOMES)[number];

/** quoteOutcome'un ihtiyaç duyduğu asgari alanlar (QuoteRequest alt kümesi). */
export interface QuoteOutcomeInput {
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
  orderedAt: Date | null;
}

export const OUTCOME_LABELS: Record<QuoteOutcome, string> = {
  acik: "Açık",
  musteride: "Müşteride",
  satildi: "Satıldı",
  fiyat_tutmadi: LOST_REASON,
  yanitsiz: "Yanıtsız kapandı",
};

export const OUTCOME_HINTS: Record<QuoteOutcome, string> = {
  acik: "Fiyat bekleniyor",
  musteride: `Fiyat verildi — ${LOST_AFTER_HOURS} saatlik karar süresi işliyor`,
  satildi: "Siparişe dönüştü",
  fiyat_tutmadi: `Fiyat verildi, ${LOST_AFTER_HOURS} saat içinde sipariş oluşmadı`,
  yanitsiz: `${LOST_AFTER_HOURS} saat boyunca cevaplanmadı`,
};

/** Panel rozeti renkleri — globals.css'teki --color-status-* değişkenleri. */
export const OUTCOME_TONES: Record<QuoteOutcome, string> = {
  acik: "bg-status-new/10 text-status-new border-status-new/30",
  musteride: "bg-status-pending/10 text-status-pending border-status-pending/30",
  satildi: "bg-status-answered/10 text-status-answered border-status-answered/30",
  fiyat_tutmadi: "bg-steel-100 text-steel-600 border-steel-300",
  yanitsiz: "bg-status-overdue/10 text-status-overdue border-status-overdue/30",
};

/** Raporun "sorulmuş ama verilmemiş" bloğuna giren sonuçlar. */
export const LOST_OUTCOMES: readonly QuoteOutcome[] = ["fiyat_tutmadi", "yanitsiz"];

const ESIK_MS = LOST_AFTER_HOURS * 60 * 60 * 1000;

export function quoteOutcome(q: QuoteOutcomeInput, now: Date = new Date()): QuoteOutcome {
  if (q.status === "SIPARIS" || q.orderedAt) return "satildi";

  if (q.status === "CEVAPLANAN") {
    // respondedAt normalde dolu; elle veri düzeltmelerine karşı createdAt'e düşer
    const baslangic = (q.respondedAt ?? q.createdAt).getTime();
    return now.getTime() - baslangic >= ESIK_MS ? "fiyat_tutmadi" : "musteride";
  }

  return now.getTime() - q.createdAt.getTime() >= ESIK_MS ? "yanitsiz" : "acik";
}

/**
 * Sonucun değişeceği an — "3 saat sonra kapanır" geri sayımı için.
 * Kapanmış (satildi/fiyat_tutmadi/yanitsiz) taleplerde null.
 */
export function outcomeDeadline(q: QuoteOutcomeInput, now: Date = new Date()): Date | null {
  const sonuc = quoteOutcome(q, now);
  if (sonuc === "musteride") return new Date((q.respondedAt ?? q.createdAt).getTime() + ESIK_MS);
  if (sonuc === "acik") return new Date(q.createdAt.getTime() + ESIK_MS);
  return null;
}

/** Panelde hâlâ iş bekleyen talep: cevaplanmamış VE süresi dolmamış. */
export function isOpenQuote(q: QuoteOutcomeInput, now: Date = new Date()): boolean {
  return quoteOutcome(q, now) === "acik";
}
