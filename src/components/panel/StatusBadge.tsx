import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const styles: Record<QuoteStatus, string> = {
  YENI: "bg-status-new/10 text-status-new border-status-new/30",
  BEKLEYEN: "bg-status-pending/10 text-status-pending border-status-pending/30",
  CEVAPLANAN: "bg-status-answered/10 text-status-answered border-status-answered/30",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status in styles ? status : "YENI") as QuoteStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[s],
      )}
    >
      {QUOTE_STATUS_LABELS[s]}
    </span>
  );
}
