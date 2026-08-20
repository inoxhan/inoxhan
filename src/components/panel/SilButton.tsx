"use client";

import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Panelin ortak kalıcı silme düğmesi.
 *
 * Sunucu aksiyonu `action` olarak bağlanmış hâlde gelir
 * (`deleteQuote.bind(null, id)`), böylece tek bileşen her varlık için
 * kullanılabiliyor. Silme geri alınamaz — bu yüzden onay penceresi zorunlu
 * ve metni çağıran tarafından, ne kaybedileceğini söyleyecek şekilde verilir.
 *
 * `sonrasi` verilirse silme bitince oraya yönlendirilir (detay sayfaları:
 * silinen kaydın sayfasında kalmak 404 demek olurdu).
 */
export function SilButton({
  action,
  soru,
  etiket = "Sil",
  sonrasi,
  genis = false,
}: {
  action: () => Promise<void>;
  soru: string;
  etiket?: string;
  sonrasi?: string;
  genis?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const router = useRouter();

  function tikla() {
    if (!confirm(soru)) return;
    setHata(null);
    startTransition(async () => {
      try {
        await action();
        if (sonrasi) router.push(sonrasi);
      } catch {
        setHata("Silinemedi — sayfayı yenileyip tekrar deneyin.");
      }
    });
  }

  return (
    <div className={cn("flex items-center gap-2", genis && "flex-col items-stretch")}>
      <button
        type="button"
        onClick={tikla}
        disabled={pending}
        aria-label={etiket}
        title={etiket}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md text-steel-500 transition-colors",
          "hover:bg-status-overdue/10 hover:text-status-overdue",
          "disabled:cursor-not-allowed disabled:opacity-50",
          genis
            ? "h-10 border border-status-overdue/30 px-4 text-sm font-medium text-status-overdue"
            : "size-9",
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
        {genis && <span>{etiket}</span>}
      </button>
      {hata && <p className="text-xs text-status-overdue">{hata}</p>}
    </div>
  );
}
