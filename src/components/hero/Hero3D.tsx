"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("@/components/hero/HeroScene"), { ssr: false });

/**
 * 3D sahneyi yalnızca uygun cihazlarda yükler:
 * masaüstü (fine pointer, ≥768px) + hareket azaltma tercihi yok.
 * Mobil ve reduced-motion'da canvas HİÇ mount edilmez → CWV etkilenmez;
 * statik poster (CSS gradyan katmanı) görünür kalır.
 */
export function Hero3D() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const noReducedMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    if (finePointer && noReducedMotion && wide) setEnabled(true);
  }, []);

  if (!enabled) return null;
  return <HeroScene />;
}
