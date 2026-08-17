import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Paperclip } from "lucide-react";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { ElapsedTimer } from "@/components/panel/ElapsedTimer";
import { OutcomeBadge } from "@/components/panel/OutcomeBadge";
import { StatusBadge } from "@/components/panel/StatusBadge";
import { LOST_AFTER_HOURS, QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/constants";
import { formatPhoneTr } from "@/lib/phone";
import { quoteOutcome } from "@/lib/quote-outcome";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";

export default async function TekliflerPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const sp = await searchParams;

  // 48 saat kuralının SQL karşılığı — türetilmiş sonuçlar da sekmeden filtrelenebilsin
  const esik = new Date(Date.now() - LOST_AFTER_HOURS * 60 * 60 * 1000);
  const SEKMELER: { key: string; label: string; where: Prisma.QuoteRequestWhereInput }[] = [
    ...QUOTE_STATUSES.map((s) => ({
      key: s,
      label: QUOTE_STATUS_LABELS[s],
      where: { status: s } as Prisma.QuoteRequestWhereInput,
    })),
    {
      key: "fiyat_tutmadi",
      label: "Fiyat tutmadı",
      where: { status: "CEVAPLANAN", orderedAt: null, respondedAt: { lte: esik } },
    },
    {
      key: "yanitsiz",
      label: "Yanıtsız",
      where: { status: { in: ["YENI", "BEKLEYEN"] }, createdAt: { lte: esik } },
    },
  ];

  const aktif = SEKMELER.find((s) => s.key === sp.durum) ?? SEKMELER[0];
  const open = aktif.key === "YENI" || aktif.key === "BEKLEYEN" || aktif.key === "yanitsiz";

  const [counts, quotes] = await Promise.all([
    Promise.all(
      SEKMELER.map(async (s) => ({
        key: s.key,
        label: s.label,
        count: await db.quoteRequest.count({ where: s.where }),
      })),
    ),
    db.quoteRequest.findMany({
      where: aktif.where,
      include: {
        customer: true,
        items: { include: { product: true, variant: true }, orderBy: { order: "asc" } },
        _count: { select: { attachments: true } },
      },
      // Açık taleplerde en eski (SLA'ya en yakın) üstte; cevaplananlar yeniden eskiye
      orderBy: open ? { createdAt: "asc" } : { respondedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <AutoRefresh />
      <h1 className="font-display text-2xl font-bold text-steel-900">Teklif Talepleri</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {counts.map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/panel/teklifler?durum=${key}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              key === aktif.key
                ? "border-steel-950 bg-steel-950 text-steel-50"
                : "border-steel-200 bg-white text-steel-600 hover:border-steel-400",
            )}
          >
            {label} ({count})
          </Link>
        ))}
      </div>

      {quotes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-steel-200 bg-white p-8 text-center text-steel-500">
          Bu durumda talep yok.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {quotes.map((q) => {
            const item = q.items[0];
            return (
              <li key={q.id}>
                <Link
                  href={`/panel/teklifler/${q.id}`}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-steel-200 bg-white p-4 shadow-card transition-colors hover:border-steel-400 sm:grid-cols-[2fr_2fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-steel-900">
                      {q.customer.name}
                      {(q.attachmentPath || q._count.attachments > 0) && (
                        <Paperclip className="size-3.5 text-steel-400" aria-label="Ekli dosya" />
                      )}
                      {q.source === "liste" && (
                        <span className="rounded-full border border-steel-200 bg-steel-50 px-2 py-px text-[11px] font-normal text-steel-500">
                          liste
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-steel-500">
                      {q.customer.company || formatPhoneTr(q.customer.phone)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-steel-700">
                      {item?.variant?.description ??
                        item?.product?.name ??
                        item?.freeText ??
                        "—"}
                    </p>
                    <p className="text-xs text-steel-400">
                      {item ? `${item.quantity} ${item.unit}` : ""}
                      {item?.quality ? ` · ${item.quality}` : ""}
                      {q.items.length > 1 ? ` +${q.items.length - 1} kalem` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={q.status} />
                      {/* Türetilmiş kayıp sonuçları — admin'in koymadığı, süreden gelen durum */}
                      {["fiyat_tutmadi", "yanitsiz"].includes(quoteOutcome(q)) && (
                        <OutcomeBadge quote={q} />
                      )}
                    </div>
                    <ElapsedTimer
                      createdAt={q.createdAt.toISOString()}
                      respondedAt={q.respondedAt?.toISOString() ?? null}
                      open={open}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
