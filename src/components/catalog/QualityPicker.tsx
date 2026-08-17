"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import {
  QUALITY_HINTS,
  QUALITY_LABELS,
  QUALITY_OPTIONS,
  type Quality,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Ürün detayındaki kalite seçimi + teklif çağrısı.
 * Seçilen kalite teklif formuna URL ile taşınır, müşteri tekrar seçmez.
 */
export function QualityPicker({ sku }: { sku: string }) {
  const [quality, setQuality] = useState<Quality>("A2");

  // Sunucu modunda teklif oluşturucu o ailenin ölçü paneli açık gelir; statikte eski tek form
  const href = `/teklif?urun=${encodeURIComponent(sku)}&kalite=${quality}&kaynak=product`;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-steel-700">Kalite Seçin</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {QUALITY_OPTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuality(q)}
            aria-pressed={quality === q}
            className={cn(
              "rounded-md border px-4 py-3 text-left transition-colors",
              quality === q
                ? "border-steel-950 bg-steel-950 text-steel-50"
                : "border-steel-200 bg-white text-steel-700 hover:border-steel-400",
            )}
          >
            <span className="block text-sm font-semibold">{QUALITY_LABELS[q]}</span>
            <span
              className={cn(
                "block text-xs",
                quality === q ? "text-steel-300" : "text-steel-500",
              )}
            >
              {QUALITY_HINTS[q]}
            </span>
          </button>
        ))}
      </div>

      <Link
        href={href}
        data-track="quote_button_click"
        data-track-payload={JSON.stringify({ where: "detail", sku })}
        className={buttonStyles({
          variant: "metallic",
          size: "lg",
          className: "mt-4 w-full",
        })}
      >
        <Zap className="size-5" aria-hidden />
        Bu Ürün İçin Teklif Al
      </Link>
    </div>
  );
}
