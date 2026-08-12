import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Paperclip, Phone } from "lucide-react";
import { ElapsedTimer } from "@/components/panel/ElapsedTimer";
import { QuoteStatusActions } from "@/components/panel/QuoteStatusActions";
import { StatusBadge } from "@/components/panel/StatusBadge";
import { formatPhoneTr } from "@/lib/phone";
import { db } from "@/server/db";

export default async function TeklifDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await db.quoteRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: { include: { category: true } } } },
    },
  });
  if (!quote) notFound();

  const open = quote.status !== "CEVAPLANAN";
  const waPhone = quote.customer.phone.replace("+", "");

  return (
    <div className="max-w-3xl">
      <Link
        href="/panel/teklifler"
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tekliflere Dön
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-steel-900">
          Talep #{quote.id.slice(-6).toUpperCase()}
        </h1>
        <div className="flex items-center gap-3">
          <StatusBadge status={quote.status} />
          <ElapsedTimer
            createdAt={quote.createdAt.toISOString()}
            respondedAt={quote.respondedAt?.toISOString() ?? null}
            open={open}
          />
        </div>
      </div>
      <p className="mt-1 text-sm text-steel-400">
        {quote.createdAt.toLocaleString("tr-TR")} · Kaynak: {quote.source}
      </p>

      <section className="mt-6 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">Müşteri</h2>
        <p className="mt-2 text-lg font-medium text-steel-900">
          {quote.customer.name}
          {quote.customer.company ? ` — ${quote.customer.company}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`tel:${quote.customer.phone}`}
            className="inline-flex items-center gap-2 rounded-md border border-steel-200 px-3.5 py-2 text-sm text-steel-700 hover:border-steel-400"
          >
            <Phone className="size-4" aria-hidden />
            {formatPhoneTr(quote.customer.phone)}
          </a>
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 px-3.5 py-2 text-sm text-[#128C4A]"
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </a>
          {quote.customer.email && (
            <a
              href={`mailto:${quote.customer.email}`}
              className="inline-flex items-center gap-2 rounded-md border border-steel-200 px-3.5 py-2 text-sm text-steel-700 hover:border-steel-400"
            >
              <Mail className="size-4" aria-hidden />
              {quote.customer.email}
            </a>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">Talep</h2>
        <ul className="mt-3 divide-y divide-steel-100">
          {quote.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                {item.product ? (
                  <Link
                    href={`/urunler/${item.product.category.slug}/${item.product.slug}`}
                    target="_blank"
                    className="font-medium text-steel-900 underline-offset-4 hover:underline"
                  >
                    {item.product.name}
                  </Link>
                ) : (
                  <p className="font-medium text-steel-900">{item.freeText ?? "—"}</p>
                )}
                {item.product && (
                  <p className="font-mono text-xs text-steel-400">{item.product.sku}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-steel-700">
                  {item.quantity} {item.unit}
                </p>
                {item.quality && (
                  <p className="mt-0.5 text-xs font-medium text-steel-900">
                    Kalite: {item.quality}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {quote.note && (
          <p className="mt-3 rounded-md bg-steel-50 p-4 text-sm leading-relaxed text-steel-700">
            {quote.note}
          </p>
        )}
        {quote.attachmentPath && (
          <a
            href={`/api/files/${quote.attachmentPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-steel-200 px-3.5 py-2 text-sm text-steel-700 hover:border-steel-400"
          >
            <Paperclip className="size-4" aria-hidden />
            Ekli dosyayı görüntüle
          </a>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">Durum</h2>
        <div className="mt-3">
          <QuoteStatusActions quoteId={quote.id} current={quote.status} />
        </div>
        <p className="mt-3 text-xs text-steel-400">
          &quot;Cevaplanan&quot; işaretlendiğinde yanıt süresi kaydedilir ve istatistiklere işlenir.
        </p>
      </section>
    </div>
  );
}
