import Link from "next/link";
import { formatPhoneTr } from "@/lib/phone";
import { db } from "@/server/db";

export default async function PanelMusterilerPage() {
  const customers = await db.customer.findMany({
    include: {
      quotes: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { quotes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-2xl font-bold text-steel-900">Müşteriler</h1>
      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white shadow-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-steel-100 text-left text-xs tracking-wide text-steel-400 uppercase">
              <th className="p-3">Müşteri</th>
              <th className="p-3">Telefon</th>
              <th className="p-3">E-posta</th>
              <th className="p-3">Adres</th>
              <th className="p-3">Talep</th>
              <th className="p-3">Son Talep</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-steel-50 last:border-0 hover:bg-steel-50">
                <td className="p-3">
                  <Link href={`/panel/musteriler/${c.id}`} className="block">
                    <p className="font-medium text-steel-900 underline-offset-4 hover:underline">
                      {c.name}
                    </p>
                    {c.company && <p className="text-xs text-steel-400">{c.company}</p>}
                  </Link>
                </td>
                <td className="p-3 text-steel-600">
                  <a href={`tel:${c.phone}`} className="hover:underline">
                    {formatPhoneTr(c.phone)}
                  </a>
                </td>
                <td className="p-3 text-steel-600">{c.email ?? "—"}</td>
                <td className="max-w-52 truncate p-3 text-steel-500">{c.address ?? "—"}</td>
                <td className="p-3 text-steel-600">{c._count.quotes}</td>
                <td className="p-3 text-steel-500">
                  {c.quotes[0]?.createdAt.toLocaleDateString("tr-TR") ?? "—"}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-steel-400">
                  Henüz müşteri kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
