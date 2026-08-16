"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Medya sorgusunu canlı izler. Sunucuda ve ilk boyamada `false` döner.
 *
 * `useEffect` + `setState` yerine `useSyncExternalStore`: hem React'in
 * "efekt içinde setState çağırma" kuralına uyar hem de kullanıcı pencereyi
 * yeniden boyutlandırdığında / hareket azaltma tercihini değiştirdiğinde
 * sonuç kendiliğinden güncellenir.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
