"use client";

import { Loader2, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { updateCustomer } from "@/server/actions/customers";

const inputClass =
  "h-10 w-full rounded-md border border-steel-200 bg-white px-3 text-sm text-steel-900 placeholder:text-steel-400 focus:border-steel-500 focus:outline-none";

/**
 * Panel müşteri düzenleme — vergi no/TC dahil sipariş bilgileri.
 * Teklif formu bu alanları sormaz; sipariş netleşince buradan işlenir.
 */
export function CustomerEditForm({
  customerId,
  initial,
}: {
  customerId: string;
  initial: { company: string; email: string; address: string; taxOrTcNo: string };
}) {
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMesaj(null);
    startTransition(async () => {
      const res = await updateCustomer(customerId, fd);
      setMesaj(
        res.ok
          ? { ok: true, text: "Kaydedildi" }
          : { ok: false, text: res.message },
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1 block text-steel-600">Firma</span>
        <input name="company" defaultValue={initial.company} className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-steel-600">E-posta</span>
        <input name="email" type="email" defaultValue={initial.email} className={inputClass} />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-steel-600">Adres</span>
        <input name="address" defaultValue={initial.address} className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-steel-600">
          Vergi No / TC No{" "}
          <span className="text-xs text-steel-400">(kargo/fatura — siparişte istenir)</span>
        </span>
        <input
          name="taxOrTcNo"
          inputMode="numeric"
          defaultValue={initial.taxOrTcNo}
          placeholder="10 hane vergi no / 11 hane TC"
          className={inputClass}
        />
      </label>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-steel-950 px-4 text-sm font-medium text-steel-50 hover:bg-steel-800 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Kaydet
        </button>
        {mesaj && (
          <p className={mesaj.ok ? "text-sm text-status-answered" : "text-sm text-status-overdue"}>
            {mesaj.text}
          </p>
        )}
      </div>
    </form>
  );
}
