"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Adet kutusu — kutunun İÇİ boşaltılabilir olmalı ki kullanıcı "1"i silip
 * doğrudan "100" yazabilsin. Bu yüzden yazarken metin taslağı tutulur;
 * sayıya çevirme odak çıkışında/Enter'da yapılır, boş bırakılırsa 1'e döner.
 */
export function QtyInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (qty: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [taslak, setTaslak] = useState(String(value));
  // Dışarıdan değişirse (−/+ düğmeleri, sepette adet birleşmesi) kutuyu eşitle.
  // React'in "prop değişince state'i render sırasında düzelt" deseni — efekt değil.
  const [oncekiValue, setOncekiValue] = useState(value);
  if (value !== oncekiValue) {
    setOncekiValue(value);
    setTaslak(String(value));
  }

  function onayla() {
    const n = Number.parseInt(taslak, 10);
    const gecerli = Number.isFinite(n) && n > 0 ? n : 1;
    setTaslak(String(gecerli));
    if (gecerli !== value) onChange(gecerli);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={taslak}
      onChange={(e) => {
        const t = e.target.value.replace(/\D/g, ""); // yalnız rakam; boş bırakılabilir
        setTaslak(t);
        const n = Number.parseInt(t, 10);
        if (Number.isFinite(n) && n > 0) onChange(n);
      }}
      onBlur={onayla}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onayla();
          (e.target as HTMLInputElement).blur();
        }
      }}
      onFocus={(e) => e.target.select()}
      aria-label={ariaLabel}
      className={cn(
        "h-9 w-16 rounded-md border border-steel-200 text-center text-sm text-steel-900 focus:border-steel-500 focus:outline-none",
        className,
      )}
    />
  );
}
