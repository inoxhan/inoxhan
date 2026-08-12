import Link from "next/link";
import { AlertTriangle, Clock, Inbox, PackageCheck } from "lucide-react";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { ElapsedTimer } from "@/components/panel/ElapsedTimer";
import { StatusBadge } from "@/components/panel/StatusBadge";
import { SLA } from "@/lib/constants";
import { db } from "@/server/db";

export default async function PanelDashboard() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const warnBefore = new Date(Date.now() - SLA.warnAfterMin * 60 * 1000);

  const [todayCount, openCount, answered30d, urgent] = await Promise.all([
    db.quoteRequest.count({ where: { createdAt: { gte: startOfDay } } }),
    db.quoteRequest.count({ where: { status: { in: ["YENI", "BEKLEYEN"] } } }),
    db.quoteRequest.findMany({
      where: { status: "CEVAPLANAN", respondedAt: { not: null }, createdAt: { gte: monthAgo } },
      select: { createdAt: true, respondedAt: true },
    }),
    db.quoteRequest.findMany({
      where: { status: { in: ["YENI", "BEKLEYEN"] }, createdAt: { lte: warnBefore } },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);

  const avgResponseMin =
    answered30d.length > 0
      ? Math.round(
          answered30d.reduce(
            (sum, q) => sum + (q.respondedAt!.getTime() - q.createdAt.getTime()) / 60_000,
            0,
          ) / answered30d.length,
        )
      : null;

  const stats = [
    { label: "Bugünkü Talepler", value: String(todayCount), icon: Inbox },
    { label: "Açık Talepler", value: String(openCount), icon: Clock },
    {
      label: "Ort. Yanıt Süresi (30 gün)",
      value: avgResponseMin === null ? "—" : `${avgResponseMin} dk`,
      icon: PackageCheck,
    },
  ];

  return (
    <div>
      <AutoRefresh />
      <h1 className="font-display text-2xl font-bold text-steel-900">Genel Bakış</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
            <s.icon className="size-5 text-steel-400" aria-hidden />
            <p className="font-display mt-3 text-3xl font-bold text-steel-900">{s.value}</p>
            <p className="mt-1 text-sm text-steel-500">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-steel-900">
          <AlertTriangle className="size-5 text-status-pending" aria-hidden />
          SLA Riski — {SLA.warnAfterMin} dk üzeri bekleyenler
        </h2>
        {urgent.length === 0 ? (
          <p className="mt-4 rounded-lg border border-steel-200 bg-white p-6 text-sm text-steel-500">
            Bekleyen riskli talep yok. 👍 Hedef: her talebe {SLA.breachAfterMin} dk içinde dönüş.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {urgent.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/panel/teklifler/${q.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-overdue/30 bg-white p-4 shadow-card transition-colors hover:border-status-overdue"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-steel-900">
                      {q.customer.name}
                      {q.customer.company ? ` — ${q.customer.company}` : ""}
                    </p>
                    <p className="truncate text-sm text-steel-500">
                      {q.items[0]?.product?.name ?? q.items[0]?.freeText ?? "Talep"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={q.status} />
                    <ElapsedTimer
                      createdAt={q.createdAt.toISOString()}
                      respondedAt={null}
                      open
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
