import {
  OUTCOME_LABELS,
  OUTCOME_TONES,
  quoteOutcome,
  type QuoteOutcomeInput,
} from "@/lib/quote-outcome";
import { cn } from "@/lib/utils";

/**
 * Türetilmiş teklif sonucu rozeti (Satıldı / Müşteride / Fiyat tutmadı / Açık / Yanıtsız).
 * StatusBadge admin'in elle koyduğu durumu, bu rozet 48 saat kuralının sonucunu gösterir.
 */
export function OutcomeBadge({ quote, className }: { quote: QuoteOutcomeInput; className?: string }) {
  const sonuc = quoteOutcome(quote);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        OUTCOME_TONES[sonuc],
        className,
      )}
    >
      {OUTCOME_LABELS[sonuc]}
    </span>
  );
}
