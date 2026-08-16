"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Güven metrikleri — YALNIZCA gerçek/rakamsal olarak savunulabilir değerler.
 * Ürün sayısı DB'den gelir; sahte müşteri sayısı veya yorum üretilmez.
 */
function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);
  return value;
}

export function TrustMetrics({ productCount }: { productCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const counted = useCountUp(productCount, inView);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.4 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const items = [
    { big: "15-30 dk", label: "Teklif dönüş hedefi" },
    { big: `${counted}`, label: "DIN / ISO normunda ürün" },
    { big: "A2 · A4", label: "Paslanmaz kalite seçeneği" },
    { big: "20 Yıl", label: "Sektör deneyimi" },
  ];

  return (
    <section ref={ref} className="border-y border-steel-200 bg-steel-100/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 py-14 sm:px-6 md:grid-cols-4 md:py-20">
        {items.map((it) => (
          <div key={it.label} className="px-4 py-6 text-center">
            <p className="font-display text-4xl font-bold tracking-tight text-steel-900 md:text-5xl">
              {it.big}
            </p>
            <p className="mx-auto mt-2 max-w-[22ch] text-sm text-steel-500">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
