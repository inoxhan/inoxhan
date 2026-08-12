"use client";

import { useEffect, useState } from "react";
import { SLA } from "@/lib/constants";
import { cn } from "@/lib/utils";

function fmt(mins: number): string {
  if (mins < 60) return `${mins} dk`;
  const h = Math.floor(mins / 60);
  return `${h} sa ${mins % 60} dk`;
}

/**
 * Canlı "geçen süre" sayacı — 30 sn'de bir tikler.
 * Açık taleplerde 45 dk üzeri amber, 60 dk üzeri kırmızı (pulse).
 * Cevaplanmış taleplerde yanıt süresini sabit gösterir.
 */
export function ElapsedTimer({
  createdAt,
  respondedAt,
  open,
}: {
  createdAt: string;
  respondedAt: string | null;
  open: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [open]);

  const start = new Date(createdAt).getTime();

  if (!open && respondedAt) {
    const mins = Math.max(0, Math.round((new Date(respondedAt).getTime() - start) / 60_000));
    const inSla = mins <= SLA.breachAfterMin;
    return (
      <span className={cn("text-sm", inSla ? "text-status-answered" : "text-steel-500")}>
        {fmt(mins)}&apos;da yanıtlandı
      </span>
    );
  }

  const mins = Math.max(0, Math.floor((now - start) / 60_000));
  const breach = mins >= SLA.breachAfterMin;
  const warn = mins >= SLA.warnAfterMin;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium tabular-nums",
        breach ? "text-status-overdue" : warn ? "text-status-pending" : "text-steel-500",
      )}
    >
      {breach && (
        <span className="size-2 animate-pulse rounded-full bg-status-overdue" aria-hidden />
      )}
      Geçen süre: {fmt(mins)}
    </span>
  );
}
