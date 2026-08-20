import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerEditForm } from "@/components/panel/CustomerEditForm";
import { SilButton } from "@/components/panel/SilButton";
import { StatusBadge } from "@/components/panel/StatusBadge";
import { formatPhoneTr } from "@/lib/phone";
import { deleteCustomer } from "@/server/actions/customers";
import { db } from "@/server/db";

export default async function MusteriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      quotes: {
        include: { items: { include: { variant: true, product: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!customer) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/panel/musteriler"
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Müşterilere Dön
      </Link>

      <h1 className="font-display mt-4 text-2xl font-bold text-steel-900">
        {customer.name}
        {customer.company ? ` — ${customer.company}` : ""}
      </h1>
      <p className="mt-1 text-sm text-steel-500">
        <a href={`tel:${customer.phone}`} className="hover:underline">
          {formatPhoneTr(customer.phone)}
        </a>
        {" · "}kayıt: {customer.createdAt.toLocaleDateString("tr-TR")}
      </p>

      <section className="mt-6 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-steel-400 uppercase">
          Sipariş Bilgileri
        </h2>
        <CustomerEditForm
          customerId={customer.id}
          initial={{
            company: customer.company ?? "",
            email: customer.email ?? "",
            address: customer.address ?? "",
            taxOrTcNo: customer.taxOrTcNo ?? "",
          }}
        />
      </section>

      <section className="mt-4 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">
          Teklif Geçmişi ({customer.quotes.length})
        </h2>
        <ul className="mt-3 divide-y divide-steel-100">
          {customer.quotes.map((q) => (
            <li key={q.id}>
              <Link
                href={`/panel/teklifler/${q.id}`}
                className="flex items-center justify-between gap-3 py-3 hover:bg-steel-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-steel-800">
                    {q.items[0]?.variant?.description ??
                      q.items[0]?.product?.name ??
                      q.items[0]?.freeText ??
                      "—"}
                    {q.items.length > 1 && (
                      <span className="text-steel-400"> +{q.items.length - 1} kalem</span>
                    )}
                  </p>
                  <p className="text-xs text-steel-400">
                    {q.createdAt.toLocaleString("tr-TR")} · {q.source}
                  </p>
                </div>
                <StatusBadge status={q.status} />
              </Link>
            </li>
          ))}
          {customer.quotes.length === 0 && (
            <li className="py-4 text-sm text-steel-400">Henüz talebi yok.</li>
          )}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-status-overdue/30 bg-white p-5">
        <h2 className="text-sm font-semibold tracking-wide text-status-overdue uppercase">
          Kalıcı Silme
        </h2>
        <p className="mt-1 mb-4 text-sm text-steel-500">
          Firma kartı ve{" "}
          {customer.quotes.length > 0
            ? `${customer.quotes.length} teklif talebinin tamamı`
            : "varsa tüm talepleri"}{" "}
          veritabanından silinir. Arşiv tutulmaz, kayıt geri getirilemez.
        </p>
        <SilButton
          action={deleteCustomer.bind(null, customer.id)}
          soru={
            `${customer.company || customer.name} kalıcı olarak silinecek` +
            (customer.quotes.length > 0
              ? ` — ${customer.quotes.length} teklif talebi de birlikte gidecek.`
              : ".") +
            " Geri alınamaz. Emin misiniz?"
          }
          etiket="Firmayı ve tüm taleplerini sil"
          sonrasi="/panel/musteriler"
          genis
        />
      </section>
    </div>
  );
}
