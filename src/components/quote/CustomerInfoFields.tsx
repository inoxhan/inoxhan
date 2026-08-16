"use client";

import Link from "next/link";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { QuoteCustomerValues } from "@/lib/quote-list-schema";
import { cn } from "@/lib/utils";

/**
 * İki kanallı teklif sisteminin ortak müşteri bilgi alanları.
 * Kargo teklifi için gerekli asgari küme: firma YA DA ad-soyad, telefon, adres.
 * Vergi no/TC teklif aşamasında SORULMAZ (sipariş aşamasında panelde tutulur).
 */
export const inputClass =
  "h-11 w-full rounded-md border border-steel-200 bg-white px-3.5 text-[15px] text-steel-900 placeholder:text-steel-400 focus:border-steel-500 focus:outline-none";

export function Field({
  label,
  required,
  optional,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-steel-700">
        {label}
        {required && <span className="text-status-overdue"> *</span>}
        {optional && <span className="font-normal text-steel-400"> (opsiyonel)</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-status-overdue">{error}</span>}
    </label>
  );
}

export function CustomerInfoFields({
  register,
  errors,
}: {
  register: UseFormRegister<QuoteCustomerValues>;
  errors: FieldErrors<QuoteCustomerValues>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Firma Adı" error={errors.company?.message}>
          <input
            type="text"
            autoComplete="organization"
            placeholder="Şirketse firma adı"
            className={inputClass}
            {...register("company")}
          />
        </Field>
        <Field label="Ad Soyad" error={errors.name?.message}>
          <input
            type="text"
            autoComplete="name"
            placeholder="Firma yoksa ad soyad"
            className={inputClass}
            {...register("name")}
          />
        </Field>
        <Field label="Telefon" required error={errors.phone?.message}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0 (5xx) xxx xx xx"
            className={inputClass}
            {...register("phone")}
          />
        </Field>
        <Field label="E-posta" optional error={errors.email?.message}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            {...register("email")}
          />
        </Field>
      </div>

      <Field label="Adres" required error={errors.address?.message}>
        <textarea
          rows={2}
          autoComplete="street-address"
          placeholder="Kargo/teslimat için açık adres (il, ilçe dahil)"
          className={cn(inputClass, "h-auto py-2.5")}
          {...register("address")}
        />
      </Field>

      <Field label="Not" optional error={errors.note?.message}>
        <textarea
          rows={3}
          placeholder="Teslimat, ölçü, kaplama gibi detaylar…"
          className={cn(inputClass, "h-auto py-2.5")}
          {...register("note")}
        />
      </Field>

      <label className="flex items-start gap-3 text-sm text-steel-600">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-steel-950"
          {...register("kvkk")}
        />
        <span>
          <Link href="/kvkk" target="_blank" className="underline underline-offset-4">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni okudum; iletişim bilgilerimin teklif süreci için işlenmesini
          onaylıyorum.
        </span>
      </label>
      {errors.kvkk && <p className="text-sm text-status-overdue">{errors.kvkk.message}</p>}
    </div>
  );
}
