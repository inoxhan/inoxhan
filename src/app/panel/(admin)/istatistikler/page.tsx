import { EVENT_TYPES } from "@/lib/constants";
import { normalizeTr } from "@/lib/slugify-tr";
import { db } from "@/server/db";

const EVENT_LABELS: Record<string, string> = {
  quote_button_click: "Teklif butonu tıklama",
  form_open: "Form açılma",
  form_submit: "Form gönderimi",
  form_abandon: "Form terk",
  whatsapp_click: "WhatsApp'a geçiş",
  product_quote_requested: "Üründen teklif talebi",
  category_view: "Kategori görüntülenme",
  search_query: "Arama",
};

export default async function PanelIstatistiklerPage() {
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await db.analyticsEvent.findMany({
    where: { createdAt: { gte: monthAgo } },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });

  const countByType = new Map<string, number>();
  for (const t of EVENT_TYPES) countByType.set(t, 0);
  const searchTerms = new Map<string, number>();
  const productRequests = new Map<string, number>();

  for (const e of events) {
    countByType.set(e.type, (countByType.get(e.type) ?? 0) + 1);
    try {
      const p = JSON.parse(e.payload) as Record<string, string>;
      if (e.type === "search_query" && p.q) {
        const q = normalizeTr(p.q);
        if (q.length >= 2) searchTerms.set(q, (searchTerms.get(q) ?? 0) + 1);
      }
      if (e.type === "product_quote_requested") {
        const key = p.sku || p.freeText || "—";
        productRequests.set(key, (productRequests.get(key) ?? 0) + 1);
      }
    } catch {
      /* bozuk payload atlanır */
    }
  }

  const formOpen = countByType.get("form_open") ?? 0;
  const formSubmit = countByType.get("form_submit") ?? 0;
  const conversion = formOpen > 0 ? Math.round((formSubmit / formOpen) * 100) : null;
  const abandonRate =
    formOpen > 0
      ? Math.round(((countByType.get("form_abandon") ?? 0) / formOpen) * 100)
      : null;

  const topSearches = [...searchTerms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const topProducts = [...productRequests.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const maxCount = Math.max(1, ...[...countByType.values()]);

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-bold text-steel-900">İstatistikler</h1>
      <p className="mb-8 text-sm text-steel-500">Son 30 gün · {events.length} olay</p>

      {/* Dönüşüm kartları */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
          <p className="font-display text-3xl font-bold text-steel-900">
            {conversion === null ? "—" : `%${conversion}`}
          </p>
          <p className="mt-1 text-sm text-steel-500">Form dönüşümü (açan → gönderen)</p>
        </div>
        <div className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
          <p className="font-display text-3xl font-bold text-steel-900">
            {abandonRate === null ? "—" : `%${abandonRate}`}
          </p>
          <p className="mt-1 text-sm text-steel-500">Form terk oranı</p>
        </div>
        <div className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
          <p className="font-display text-3xl font-bold text-steel-900">
            {countByType.get("whatsapp_click") ?? 0}
          </p>
          <p className="mt-1 text-sm text-steel-500">WhatsApp&apos;a geçiş</p>
        </div>
      </div>

      {/* Olay dağılımı */}
      <section className="mt-8 rounded-lg border border-steel-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">
          Olay Dağılımı
        </h2>
        <ul className="mt-4 space-y-2.5">
          {EVENT_TYPES.map((t) => {
            const n = countByType.get(t) ?? 0;
            return (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="w-52 shrink-0 text-steel-600">{EVENT_LABELS[t]}</span>
                <span className="h-2.5 rounded-full bg-steel-700" style={{ width: `${Math.max(2, (n / maxCount) * 100)}%` }} />
                <span className="font-mono text-xs text-steel-500">{n}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Popüler aramalar */}
        <section className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">
            Popüler Aramalar
          </h2>
          {topSearches.length === 0 ? (
            <p className="mt-4 text-sm text-steel-400">Henüz arama verisi yok.</p>
          ) : (
            <ol className="mt-4 space-y-1.5 text-sm">
              {topSearches.map(([q, n], i) => (
                <li key={q} className="flex justify-between gap-3">
                  <span className="text-steel-700">
                    <span className="mr-2 font-mono text-xs text-steel-400">{i + 1}.</span>
                    {q}
                  </span>
                  <span className="font-mono text-xs text-steel-500">{n}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* En çok teklif istenen ürünler */}
        <section className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold tracking-wide text-steel-400 uppercase">
            En Çok Teklif İstenenler
          </h2>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-steel-400">Henüz teklif verisi yok.</p>
          ) : (
            <ol className="mt-4 space-y-1.5 text-sm">
              {topProducts.map(([sku, n], i) => (
                <li key={sku} className="flex justify-between gap-3">
                  <span className="text-steel-700">
                    <span className="mr-2 font-mono text-xs text-steel-400">{i + 1}.</span>
                    {sku}
                  </span>
                  <span className="font-mono text-xs text-steel-500">{n}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
