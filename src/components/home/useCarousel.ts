"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Hero slider'ı ve showreel'in ortak kaydırma mantığı.
 *
 * Kapsam: otomatik geçiş, ileri/geri, dokunmatik kaydırma, klavye ok tuşları,
 * fare tekerleği (YALNIZ yatay niyet), hover/focus'ta duraklatma ve
 * `prefers-reduced-motion` desteği.
 *
 * Dikey sayfa scroll'u BİLİNÇLİ olarak ele geçirilmez — kullanıcı sayfada aşağı
 * inerken slayt değişmesi hem mobilde hem erişilebilirlikte sorun çıkarıyor.
 */

/** Parmak/tekerlek hareketinin slayt değiştirmesi için gereken en az yatay mesafe (px). */
const KAYDIRMA_ESIGI = 48;
/** Tekerlek jesti bittikten sonra yeni jest sayılması için beklenen süre (ms). */
const TEKERLEK_BEKLEME = 420;

export interface CarouselProps {
  /** Slayt sayısı. 0 ise kanca pasif kalır. */
  count: number;
  /** Otomatik geçiş süresi (ms). 0 = otomatik geçiş yok. */
  intervalMs?: number;
}

export interface Carousel {
  index: number;
  /** true ise animasyonlar kapalı (kullanıcı hareket azaltma istemiş). */
  reduced: boolean;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  /** Tekerlek dinleyicisi için kapsayıcı referansı — `containerProps`tan AYRI tutulur,
   *  çünkü ref'i spread nesnesi içinde taşımak render sırasında ref okuması sayılıyor. */
  ref: React.RefObject<HTMLElement | null>;
  /** Kaydırma/klavye olayları için kapsayıcıya yayılacak proplar. */
  containerProps: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocusCapture: () => void;
    onBlurCapture: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

export function useCarousel({ count, intervalMs = 0 }: CarouselProps): Carousel {
  const [index, setIndex] = useState(0);
  const [duraklat, setDuraklat] = useState(false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLElement | null>(null);
  const dokunusX = useRef<number | null>(null);
  const tekerlekKilit = useRef(0);

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Otomatik geçiş
  useEffect(() => {
    if (reduced || duraklat || count < 2 || intervalMs <= 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [reduced, duraklat, count, intervalMs]);

  // Fare tekerleği — yalnız yatay niyet (trackpad). Dikey scroll'a dokunulmaz,
  // bu yüzden passive listener yeterli ve preventDefault gerekmez.
  useEffect(() => {
    const el = ref.current;
    if (!el || count < 2) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaX) < 12) return;
      const now = e.timeStamp;
      if (now - tekerlekKilit.current < TEKERLEK_BEKLEME) return;
      tekerlekKilit.current = now;
      setIndex((i) => (((i + (e.deltaX > 0 ? 1 : -1)) % count) + count) % count);
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [count]);

  return {
    index: count === 0 ? 0 : Math.min(index, count - 1),
    reduced,
    goTo,
    next,
    prev,
    ref,
    containerProps: {
      onPointerEnter: () => setDuraklat(true),
      onPointerLeave: () => setDuraklat(false),
      onFocusCapture: () => setDuraklat(true),
      onBlurCapture: () => setDuraklat(false),
      onTouchStart: (e) => {
        dokunusX.current = e.touches[0]?.clientX ?? null;
      },
      onTouchEnd: (e) => {
        const bas = dokunusX.current;
        dokunusX.current = null;
        if (bas === null) return;
        const fark = (e.changedTouches[0]?.clientX ?? bas) - bas;
        if (Math.abs(fark) < KAYDIRMA_ESIGI) return;
        if (fark < 0) next();
        else prev();
      },
      onKeyDown: (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        }
      },
    },
  };
}
