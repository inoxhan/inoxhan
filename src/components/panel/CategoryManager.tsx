"use client";

import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type CategoryState,
} from "@/server/actions/categories";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

const inputClass =
  "h-10 rounded-md border border-steel-200 bg-white px-3 text-sm focus:border-steel-500 focus:outline-none";

function CategoryRow({ cat }: { cat: Category }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-lg border border-steel-200 bg-white p-3.5 shadow-card">
      {editing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} flex-1`}
            autoFocus
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await renameCategory(cat.id, name);
                setEditing(false);
              })
            }
            className="rounded p-2 text-status-answered hover:bg-steel-100"
            aria-label="Kaydet"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setName(cat.name);
              setEditing(false);
            }}
            className="rounded p-2 text-steel-400 hover:bg-steel-100"
            aria-label="Vazgeç"
          >
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-steel-900">{cat.name}</p>
            <p className="text-xs text-steel-400">
              /{cat.slug} · {cat.productCount} ürün
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded p-2 text-steel-500 hover:bg-steel-100 hover:text-steel-900"
            aria-label="Yeniden adlandır"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`"${cat.name}" kategorisi silinsin mi?`)) {
                startTransition(async () => {
                  const res = await deleteCategory(cat.id);
                  setError(res.error ?? null);
                });
              }
            }}
            className="rounded p-2 text-steel-500 hover:bg-status-overdue/10 hover:text-status-overdue"
            aria-label="Sil"
          >
            <Trash2 className="size-4" />
          </button>
          {error && <p className="text-xs text-status-overdue">{error}</p>}
        </>
      )}
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState<CategoryState, FormData>(
    createCategory,
    {},
  );

  return (
    <div className="max-w-xl">
      <form action={formAction} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Yeni kategori adı"
          className={`${inputClass} h-11 flex-1`}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-1.5 rounded-md bg-steel-950 px-4 text-sm font-medium text-steel-50 hover:bg-steel-800"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Ekle
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-status-overdue">{state.error}</p>}

      <ul className="mt-6 space-y-2">
        {categories.map((c) => (
          <CategoryRow key={c.id} cat={c} />
        ))}
      </ul>
    </div>
  );
}
