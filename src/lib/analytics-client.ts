import type { EventType } from "@/lib/constants";

/**
 * Birinci parti olay takibi — sendBeacon ile /api/event'e yazar.
 * Anonim oturum kimliği localStorage'da tutulur (çerez/parmak izi yok);
 * kişisel veri payload'a asla yazılmaz (KVKK).
 */
function sid(): string {
  try {
    let v = localStorage.getItem("inx_sid");
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("inx_sid", v);
    }
    return v;
  } catch {
    return "anon";
  }
}

export function track(type: EventType, payload: Record<string, string | number> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      type,
      payload,
      sessionId: sid(),
      path: window.location.pathname,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/event", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
    }
  } catch {
    // analitik asla kullanıcı deneyimini bozmaz
  }
}
