"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CustomerInfoFields, Field, inputClass } from "@/components/quote/CustomerInfoFields";
import { QuoteSuccess } from "@/components/quote/QuoteSuccess";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics-client";
import {
  quoteCustomerSchema,
  type QuoteCustomerValues,
} from "@/lib/quote-list-schema";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "@/lib/quote-schema";
import { submitQuoteList } from "@/server/actions/quote-list";

const MAX_FILES = 3;

/**
 * Fotoğraf/dosya kanalı — ürün bulunamadığında görselle talep.
 *
 * Yükleme iki yollu: Vercel'de dosyalar tarayıcıdan doğrudan Blob'a gider
 * (/api/blob-upload jetonuyla; sunucu gövde limiti aşılmaz), lokalde/route
 * kapalıysa FormData ile action'a düşer ve diske yazılır.
 */
export function FileQuoteForm() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuoteCustomerValues & { aciklama?: string }>({
    resolver: zodResolver(quoteCustomerSchema),
    defaultValues: { kvkk: false },
  });

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const yeni = [...(e.target.files ?? [])];
    e.target.value = "";
    const kabul: File[] = [...files];
    for (const f of yeni) {
      if (kabul.length >= MAX_FILES) {
        setFileError(`En fazla ${MAX_FILES} dosya ekleyebilirsiniz`);
        break;
      }
      if (f.size > ATTACHMENT_MAX_BYTES) {
        setFileError(`${f.name}: dosya 10 MB'dan büyük olamaz`);
        continue;
      }
      if (!ATTACHMENT_TYPES.includes(f.type as (typeof ATTACHMENT_TYPES)[number])) {
        setFileError(`${f.name}: yalnızca fotoğraf veya PDF yükleyebilirsiniz`);
        continue;
      }
      kabul.push(f);
    }
    setFiles(kabul);
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (files.length === 0) {
      setFileError("Lütfen en az bir fotoğraf veya dosya ekleyin");
      return;
    }

    const fd = new FormData();
    fd.set("company", values.company ?? "");
    fd.set("name", values.name ?? "");
    fd.set("phone", values.phone);
    fd.set("address", values.address);
    fd.set("email", values.email ?? "");
    fd.set("note", values.note ?? "");
    fd.set("kvkk", String(values.kvkk));
    fd.set("source", "dosya");
    const aciklama = (values.aciklama ?? "").trim();
    fd.set(
      "items",
      JSON.stringify([
        {
          code: "",
          freeText: aciklama || "Fotoğraf/dosya ile talep",
          quantity: 1,
          unit: "adet",
          quality: "",
        },
      ]),
    );

    // Önce doğrudan Blob yüklemesi denenir; uç kapalıysa (lokal dev) FormData'ya düşülür
    try {
      const { upload } = await import("@vercel/blob/client");
      const yollar: string[] = [];
      for (const f of files) {
        const sonuc = await upload(`uploads/${f.name}`, f, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });
        yollar.push(sonuc.pathname);
      }
      fd.set("blobPaths", JSON.stringify(yollar));
    } catch {
      for (const f of files) fd.append("attachment", f);
    }

    const res = await submitQuoteList(fd);
    if (res.ok) {
      track("form_submit", { source: "dosya", files: files.length });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setServerError(res.message);
    }
  });

  if (done) return <QuoteSuccess />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Kısa Açıklama" optional error={undefined}>
        <input
          type="text"
          placeholder="Neye ihtiyacınız var? (örn. fotoğraftaki bağlantı elemanından 500 adet)"
          className={inputClass}
          {...register("aciklama")}
        />
      </Field>

      {/* Dosyalar */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-steel-700">
          Fotoğraf / Dosya <span className="text-status-overdue">*</span>{" "}
          <span className="font-normal text-steel-400">(en fazla {MAX_FILES})</span>
        </span>
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-steel-300 bg-steel-50 px-4 py-3.5 text-sm text-steel-500 transition-colors hover:border-steel-500">
          <Paperclip className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            Ürünün fotoğrafını veya teknik dosyasını yükleyin — &quot;Bana bu ürün lazım&quot; deyin.
          </span>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={onFileChange}
          />
        </label>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-md border border-steel-200 bg-white px-3 py-2 text-sm text-steel-700"
              >
                <Paperclip className="size-3.5 shrink-0 text-steel-400" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="shrink-0 text-steel-400 hover:text-steel-700"
                  aria-label="Dosyayı kaldır"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {fileError && <p className="mt-1 text-sm text-status-overdue">{fileError}</p>}
      </div>

      <CustomerInfoFields
        register={register as unknown as Parameters<typeof CustomerInfoFields>[0]["register"]}
        errors={errors}
      />

      {serverError && (
        <p className="rounded-md border border-status-overdue/30 bg-status-overdue/5 px-4 py-3 text-sm text-status-overdue">
          {serverError}
        </p>
      )}

      <Button type="submit" variant="metallic" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <Send className="size-5" aria-hidden />
        )}
        {isSubmitting ? "Gönderiliyor…" : "Talebi Gönder"}
      </Button>
      <p className="text-center text-sm text-steel-500">
        Dosyalı taleplerde dönüş süresi, listeli taleplere göre biraz daha uzun olabilir.
      </p>
    </form>
  );
}
