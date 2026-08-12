"use client";

import Link from "next/link";
import { Loader2, Pencil, Power, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteProduct, toggleProductActive } from "@/server/actions/products";

export function ProductRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      {pending ? (
        <Loader2 className="size-4 animate-spin text-steel-400" />
      ) : (
        <>
          <Link
            href={`/panel/urunler/${id}`}
            className="rounded p-2 text-steel-500 hover:bg-steel-100 hover:text-steel-900"
            aria-label="Düzenle"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => startTransition(() => toggleProductActive(id))}
            className="rounded p-2 text-steel-500 hover:bg-steel-100 hover:text-steel-900"
            aria-label={isActive ? "Pasife al" : "Aktife al"}
            title={isActive ? "Pasife al" : "Aktife al"}
          >
            <Power className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Bu ürün kalıcı olarak silinecek. Emin misiniz?")) {
                startTransition(() => deleteProduct(id));
              }
            }}
            className="rounded p-2 text-steel-500 hover:bg-status-overdue/10 hover:text-status-overdue"
            aria-label="Sil"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
