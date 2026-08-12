"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Paneli belirli aralıkla tazeler — yeni teklifler sayfa yenilemeden düşer. */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
