"use client";

import dynamic from "next/dynamic";
import type { SahneAdi } from "@/components/hero/HeroScene";
import { useMediaQuery } from "@/lib/use-media-query";

const HeroScene = dynamic(() => import("@/components/hero/HeroScene"), { ssr: false });

/**
 * 3D sahneyi yalnızca uygun cihazlarda yükler:
 * masaüstü (fine pointer, ≥768px) + hareket azaltma tercihi yok.
 * Mobil ve reduced-motion'da canvas HİÇ mount edilmez → CWV etkilenmez;
 * statik poster (hero'daki CSS gradyan katmanı) görünür kalır.
 */
export function Hero3D({ scene = "asili" }: { scene?: SahneAdi }) {
  const finePointer = useMediaQuery("(pointer: fine)");
  const wide = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (!finePointer || !wide || reducedMotion) return null;
  return <HeroScene scene={scene} />;
}
