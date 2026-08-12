"use client";

import { useEffect } from "react";
import type { EventType } from "@/lib/constants";
import { track } from "@/lib/analytics-client";

/**
 * Delege edilmiş tıklama takibi: herhangi bir eleman
 * `data-track="quote_button_click"` (+ ops. `data-track-payload='{"x":1}'`)
 * taşıyorsa tıklandığında olay gönderilir. Sunucu bileşenleri client'a
 * çevirmeden işaretleme yapılabilsin diye tek global dinleyici kullanılır.
 */
export function AnalyticsListener() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const type = el.dataset.track as EventType;
      let payload: Record<string, string | number> = {};
      try {
        payload = el.dataset.trackPayload ? JSON.parse(el.dataset.trackPayload) : {};
      } catch {
        /* bozuk payload yok sayılır */
      }
      track(type, payload);
    };
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}

/** Sayfa görüntülenince tek seferlik olay (ör. category_view). */
export function TrackOnMount({
  type,
  payload,
}: {
  type: EventType;
  payload?: Record<string, string | number>;
}) {
  useEffect(() => {
    track(type, payload ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
