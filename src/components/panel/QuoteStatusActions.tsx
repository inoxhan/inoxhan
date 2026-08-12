"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateQuoteStatus } from "@/server/actions/panel";

const activeStyle: Record<QuoteStatus, string> = {
  YENI: "border-status-new bg-status-new text-white",
  BEKLEYEN: "border-status-pending bg-status-pending text-white",
  CEVAPLANAN: "border-status-answered bg-status-answered text-white",
};

export function QuoteStatusActions({
  quoteId,
  current,
}: {
  quoteId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUOTE_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending || s === current}
          onClick={() => startTransition(() => updateQuoteStatus(quoteId, s))}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-default",
            s === current
              ? activeStyle[s]
              : "border-steel-200 bg-white text-steel-600 hover:border-steel-400",
          )}
        >
          {QUOTE_STATUS_LABELS[s]}
        </button>
      ))}
      {pending && <Loader2 className="size-4 animate-spin text-steel-400" />}
    </div>
  );
}
