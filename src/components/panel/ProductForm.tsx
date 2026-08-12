"use client";

import { Loader2, Plus, Save, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { upsertProduct, type ProductFormState } from "@/server/actions/products";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-md border border-steel-200 bg-white px-3.5 text-[15px] text-steel-900 focus:border-steel-500 focus:outline-none";

export interface ProductFormData {
  id?: string;
  sku?: string;
  name?: string;
  model?: string;
  brandName?: string;
  categoryId?: string;
  shortDesc?: string;
  useAreas?: string;
  seoTitle?: string;
  seoDesc?: string;
  isActive?: boolean;
  specs?: { key: string; value: string }[];
  imageBasePaths?: string[];
}

interface ProductFormProps {
  categories: { id: string; name: string }[];
  initial?: ProductFormData;
}

export function ProductForm({ categories, initial }: ProductFormProps) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    upsertProduct,
    {},
  );
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    initial?.specs?.length ? initial.specs : [{ key: "", value: "" }],
  );

  function setSpec(i: number, field: "key" | "value", v: string) {
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="specs" value={JSON.stringify(specs)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-steel-700">
            SKU / Ürün Kodu <span className="text-status-overdue">*</span>
          </span>
          <input
            name="sku"
            required
            defaultValue={initial?.sku}
            className={cn(inputClass, "font-mono uppercase")}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-steel-700">Kategori <span className="text-status-overdue">*</span></span>
          <select name="categoryId" required defaultValue={initial?.categoryId ?? ""} className={inputClass}>
            <option value="" disabled>
              Seçin…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-steel-700">
          Ürün Adı <span className="text-status-overdue">*</span>
        </span>
        <input name="name" required defaultValue={initial?.name} className={inputClass} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-steel-700">Marka</span>
          <input
            name="brandName"
            defaultValue={initial?.brandName}
            placeholder="Yoksa boş bırakın"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-steel-700">Model / Norm</span>
          <input name="model" defaultValue={initial?.model} placeholder="örn. DIN 933" className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-steel-700">Kısa Açıklama</span>
        <textarea
          name="shortDesc"
          rows={2}
          defaultValue={initial?.shortDesc}
          className={cn(inputClass, "h-auto py-2.5")}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-steel-700">
          Kullanım Alanları <span className="font-normal text-steel-400">(virgülle ayırın)</span>
        </span>
        <input
          name="useAreas"
          defaultValue={initial?.useAreas}
          placeholder="İnşaat, Mobilya, Tesisat"
          className={inputClass}
        />
      </label>

      {/* Teknik özellikler */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-steel-700">Teknik Özellikler</span>
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.key}
                onChange={(e) => setSpec(i, "key", e.target.value)}
                placeholder="Özellik (örn. Ölçü)"
                className={cn(inputClass, "flex-1")}
              />
              <input
                value={s.value}
                onChange={(e) => setSpec(i, "value", e.target.value)}
                placeholder="Değer (örn. M8x40)"
                className={cn(inputClass, "flex-1")}
              />
              <button
                type="button"
                onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded p-2 text-steel-400 hover:text-status-overdue"
                aria-label="Özelliği sil"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-900"
        >
          <Plus className="size-4" aria-hidden />
          Özellik ekle
        </button>
      </div>

      {/* Görseller */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-steel-700">
          Görseller{" "}
          <span className="font-normal text-steel-400">
            (birden fazla seçilebilir; ilki ana görsel olur{initial?.id ? ", yüklerseniz eskilerin yerine geçer" : ""})
          </span>
        </span>
        {initial?.imageBasePaths && initial.imageBasePaths.length > 0 && (
          <div className="mb-2 flex gap-2">
            {initial.imageBasePaths.map((bp) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={bp}
                src={`/${bp}-sm.webp`}
                alt=""
                className="size-16 rounded-md border border-steel-800 bg-photo object-contain"
              />
            ))}
          </div>
        )}
        <input
          type="file"
          name="images"
          multiple
          accept="image/*"
          className="block w-full text-sm text-steel-500 file:mr-3 file:rounded-md file:border-0 file:bg-steel-950 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-steel-50"
        />
      </div>

      <details className="rounded-md border border-steel-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-steel-700">
          SEO (opsiyonel)
        </summary>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-steel-600">SEO Başlığı</span>
            <input name="seoTitle" defaultValue={initial?.seoTitle} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-steel-600">SEO Açıklaması</span>
            <textarea
              name="seoDesc"
              rows={2}
              defaultValue={initial?.seoDesc}
              className={cn(inputClass, "h-auto py-2.5")}
            />
          </label>
        </div>
      </details>

      <label className="flex items-center gap-2.5 text-sm text-steel-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="size-4 accent-steel-950"
        />
        Sitede yayında (aktif)
      </label>

      {state.error && (
        <p className="rounded-md border border-status-overdue/30 bg-status-overdue/5 px-4 py-3 text-sm text-status-overdue">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="dark" size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
        {initial?.id ? "Değişiklikleri Kaydet" : "Ürünü Oluştur"}
      </Button>
    </form>
  );
}
