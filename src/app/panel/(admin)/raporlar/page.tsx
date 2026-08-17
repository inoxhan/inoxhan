import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, TriangleAlert } from "lucide-react";
import { LOST_AFTER_HOURS, LOST_REASON } from "@/lib/constants";
import type { DagilimSatiri, UrunSatiri } from "@/lib/report-aggregate";
import { ayEtiketi, ayKaydir, gecerliAy, getMonthlyReport, sonAylar } from "@/server/reports";

export const metadata = { title: "Raporlar" };

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string }>;
}) {
  const sp = await searchParams;
  const ay = gecerliAy(sp.ay);
  const buAy = gecerliAy();
  const { rapor, kesildi } = await getMonthlyReport(ay);
  const o = rapor.ozet;

  const kartlar = [
    { label: "Talep", value: o.talep },
    { label: "Firma", value: o.firma },
    { label: "Kalem", value: o.kalem },
    { label: "Toplam adet", value: o.toplamAdet.toLocaleString("tr-TR") },
    { label: "Farklı ürün", value: o.urun },
    { label: "Siparişe dönen", value: `${o.siparis} (%${o.siparisOrani})` },
    { label: LOST_REASON, value: o.kayip },
    { label: "Ort. yanıt", value: o.ortYanitDk === null ? "—" : `${o.ortYanitDk} dk` },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-steel-900">Aylık Rapor</h1>

        <div className="flex items-center gap-2">
          <Link
            href={`/panel/raporlar?ay=${ayKaydir(ay, -1)}`}
            className="flex size-9 items-center justify-center rounded-md border border-steel-200 bg-white text-steel-600 hover:border-steel-400"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-[120px] text-center text-sm font-medium text-steel-900">
            {ayEtiketi(ay)}
          </span>
          {ay < buAy ? (
            <Link
              href={`/panel/raporlar?ay=${ayKaydir(ay, 1)}`}
              className="flex size-9 items-center justify-center rounded-md border border-steel-200 bg-white text-steel-600 hover:border-steel-400"
              aria-label="Sonraki ay"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="flex size-9 items-center justify-center rounded-md border border-steel-100 text-steel-300">
              <ChevronRight className="size-4" />
            </span>
          )}

          <form method="get" className="flex items-center gap-2">
            <select
              name="ay"
              defaultValue={ay}
              className="h-9 rounded-md border border-steel-200 bg-white px-2 text-sm text-steel-700"
              aria-label="Ay seç"
            >
              {sonAylar(12, buAy).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-md border border-steel-200 bg-white px-3 text-sm text-steel-700 hover:border-steel-400"
            >
              Göster
            </button>
          </form>
        </div>
      </div>

      {kesildi && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-status-pending/30 bg-status-pending/5 px-4 py-3 text-sm text-status-pending">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          Bu ayda çok fazla talep var; rapor ilk kayıtlarla sınırlandırıldı.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kartlar.map((k) => (
          <div key={k.label} className="rounded-lg border border-steel-200 bg-white p-4 shadow-card">
            <p className="font-display text-2xl font-bold text-steel-900">{k.value}</p>
            <p className="mt-0.5 text-sm text-steel-500">{k.label}</p>
          </div>
        ))}
      </div>

      <Bolum
        baslik="En çok sorulan ürünler"
        aciklama="Satıra tıklayınca istenen ölçüler açılır."
        indir={`/api/panel/rapor?ay=${ay}&tablo=urunler`}
        indirEk={{ href: `/api/panel/rapor?ay=${ay}&tablo=olculer`, label: "Ölçü detayı" }}
      >
        <UrunTablosu satirlar={rapor.urunler.slice(0, 30)} bosMesaj="Bu ay hiç talep gelmemiş." />
      </Bolum>

      <Bolum
        baslik="Sorulmuş ama verilmemiş"
        aciklama={`Fiyat verilip ${LOST_AFTER_HOURS} saat içinde siparişe dönmeyen taleplerin ürünleri — sebep: ${LOST_REASON}.`}
        indir={`/api/panel/rapor?ay=${ay}&tablo=verilmeyenler`}
      >
        <UrunTablosu
          satirlar={rapor.verilmeyenler.slice(0, 30)}
          bosMesaj="Bu ay fiyat tutmadığı için kaybedilen talep yok. 👍"
        />
      </Bolum>

      {rapor.yanitsizlar.length > 0 && (
        <Bolum
          baslik="Yanıtsız kapananlar"
          aciklama={`${LOST_AFTER_HOURS} saat boyunca hiç cevaplanmamış talepler — bunlar fiyat kaybı değil, kaçırılmış iştir.`}
          indir={`/api/panel/rapor?ay=${ay}&tablo=yanitsizlar`}
          uyari
        >
          <UrunTablosu satirlar={rapor.yanitsizlar.slice(0, 30)} bosMesaj="—" />
        </Bolum>
      )}

      <Bolum
        baslik="Firma bazlı döküm"
        aciklama="Bu ay kim, ne kadar sordu."
        indir={`/api/panel/rapor?ay=${ay}&tablo=firmalar`}
      >
        {rapor.firmalar.length === 0 ? (
          <Bos>Bu ay talep gönderen firma yok.</Bos>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-steel-100 text-xs text-steel-400 uppercase">
                <tr>
                  <Th>Firma / Kişi</Th>
                  <Th sag>Talep</Th>
                  <Th sag>Kalem</Th>
                  <Th sag>Adet</Th>
                  <Th sag>Sipariş</Th>
                  <Th sag>Son talep</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {rapor.firmalar.slice(0, 50).map((f) => (
                  <tr key={f.id} className="hover:bg-steel-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/panel/musteriler/${f.id}`}
                        className="font-medium text-steel-900 underline-offset-4 hover:underline"
                      >
                        {f.firma || f.ad}
                      </Link>
                      {f.firma && <span className="ml-2 text-xs text-steel-400">{f.ad}</span>}
                    </td>
                    <Td sag>{f.talep}</Td>
                    <Td sag>{f.kalem}</Td>
                    <Td sag>{f.adet.toLocaleString("tr-TR")}</Td>
                    <Td sag>{f.siparis}</Td>
                    <Td sag>{f.sonTalep.toLocaleDateString("tr-TR")}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bolum>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Dagilim
          baslik="Kategori dağılımı"
          satirlar={rapor.kategoriler}
          indir={`/api/panel/rapor?ay=${ay}&tablo=kategoriler`}
        />
        <Dagilim
          baslik="Ürün grubu dağılımı"
          satirlar={rapor.gruplar}
          indir={`/api/panel/rapor?ay=${ay}&tablo=gruplar`}
        />
      </div>

      <Bolum baslik="Cevap performansı" aciklama="Talebe ne kadar sürede dönüldü.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Kutu
            baslik="Ortalama yanıt"
            deger={o.ortYanitDk === null ? "—" : `${o.ortYanitDk} dk`}
          />
          <Kutu
            baslik="24 saat içinde yanıtlanan"
            deger={o.hizliYanitOrani === null ? "—" : `%${o.hizliYanitOrani}`}
          />
          <Kutu baslik="Hâlâ açık" deger={`${o.acik} talep`} />
        </div>

        {rapor.gecikenler.length > 0 && (
          <ul className="mt-4 divide-y divide-steel-100 rounded-lg border border-steel-200 bg-white">
            {rapor.gecikenler.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <Link
                  href={`/panel/teklifler/${g.id}`}
                  className="truncate text-steel-800 underline-offset-4 hover:underline"
                >
                  {g.firma}
                </Link>
                <span className="shrink-0 text-steel-500">
                  {g.createdAt.toLocaleDateString("tr-TR")} · {saatMetni(g.dakika)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bolum>
    </div>
  );
}

function saatMetni(dk: number): string {
  if (dk < 60) return `${dk} dk`;
  const saat = Math.floor(dk / 60);
  if (saat < 48) return `${saat} sa`;
  return `${Math.floor(saat / 24)} gün`;
}

function Bolum({
  baslik,
  aciklama,
  indir,
  indirEk,
  uyari,
  children,
}: {
  baslik: string;
  aciklama?: string;
  indir?: string;
  /** İkinci CSV bağlantısı (örn. ölçü kırılımı) */
  indirEk?: { href: string; label: string };
  uyari?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className={`text-lg font-semibold ${uyari ? "text-status-overdue" : "text-steel-900"}`}
          >
            {baslik}
          </h2>
          {aciklama && <p className="mt-0.5 text-sm text-steel-500">{aciklama}</p>}
        </div>
        <div className="flex gap-2">
          {indirEk && (
            <a
              href={indirEk.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-steel-200 bg-white px-3 text-sm text-steel-700 hover:border-steel-400"
            >
              <Download className="size-4" aria-hidden />
              {indirEk.label}
            </a>
          )}
          {indir && (
            <a
              href={indir}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-steel-200 bg-white px-3 text-sm text-steel-700 hover:border-steel-400"
            >
              <Download className="size-4" aria-hidden />
              Excel&apos;e aktar
            </a>
          )}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function UrunTablosu({ satirlar, bosMesaj }: { satirlar: UrunSatiri[]; bosMesaj: string }) {
  if (satirlar.length === 0) return <Bos>{bosMesaj}</Bos>;

  return (
    <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-steel-100 text-xs text-steel-400 uppercase">
          <tr>
            <Th>Ürün</Th>
            <Th sag>Talep</Th>
            <Th sag>Firma</Th>
            <Th sag>Adet</Th>
            <Th sag>Sipariş</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-steel-100">
          {satirlar.map((s) => (
            <tr key={s.key} className="align-top hover:bg-steel-50">
              <td className="px-4 py-2.5">
                {s.olculer.length > 0 ? (
                  <details>
                    <summary className="cursor-pointer font-medium text-steel-900">
                      {s.ad}
                      {s.sku && <span className="ml-2 font-mono text-xs text-steel-400">{s.sku}</span>}
                      {!s.sku && (
                        <span className="ml-2 rounded-full border border-steel-200 bg-steel-50 px-2 py-px text-[11px] text-steel-500">
                          katalog dışı
                        </span>
                      )}
                    </summary>
                    <ul className="mt-2 space-y-1 border-l border-steel-200 pl-3 text-xs text-steel-600">
                      {s.olculer.map((v) => (
                        <li key={v.code} className="flex justify-between gap-3">
                          <span className="truncate">
                            <span className="font-mono text-steel-400">{v.code}</span>{" "}
                            {v.description}
                          </span>
                          <span className="shrink-0 text-steel-500">
                            {v.talep} talep · {v.adet.toLocaleString("tr-TR")} adet
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <p className="font-medium text-steel-900">
                    {s.ad}
                    <span className="ml-2 rounded-full border border-steel-200 bg-steel-50 px-2 py-px text-[11px] font-normal text-steel-500">
                      katalog dışı
                    </span>
                  </p>
                )}
                {s.kategori && <p className="mt-0.5 text-xs text-steel-400">{s.kategori}</p>}
              </td>
              <Td sag>{s.talep}</Td>
              <Td sag>{s.firma}</Td>
              <Td sag>{s.adet.toLocaleString("tr-TR")}</Td>
              <Td sag>{s.siparis}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dagilim({
  baslik,
  satirlar,
  indir,
}: {
  baslik: string;
  satirlar: DagilimSatiri[];
  indir: string;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-steel-900">{baslik}</h2>
        <a
          href={indir}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-steel-200 bg-white px-3 text-sm text-steel-700 hover:border-steel-400"
        >
          <Download className="size-4" aria-hidden />
          Excel
        </a>
      </div>
      {satirlar.length === 0 ? (
        <Bos>Veri yok.</Bos>
      ) : (
        <ul className="mt-3 space-y-2 rounded-lg border border-steel-200 bg-white p-4">
          {satirlar.map((s) => (
            <li key={s.ad}>
              <div className="flex justify-between text-sm">
                <span className="text-steel-700">{s.ad}</span>
                <span className="text-steel-500">
                  {s.kalem} kalem · %{s.oran}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-steel-100">
                <div className="h-2 rounded-full bg-steel-950" style={{ width: `${s.oran}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Kutu({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div className="rounded-lg border border-steel-200 bg-white p-4">
      <p className="font-display text-2xl font-bold text-steel-900">{deger}</p>
      <p className="mt-0.5 text-sm text-steel-500">{baslik}</p>
    </div>
  );
}

function Bos({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-steel-200 bg-white p-6 text-center text-sm text-steel-500">
      {children}
    </p>
  );
}

function Th({ children, sag }: { children: React.ReactNode; sag?: boolean }) {
  return <th className={`px-4 py-2 font-medium ${sag ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, sag }: { children: React.ReactNode; sag?: boolean }) {
  return (
    <td className={`px-4 py-2.5 text-steel-700 ${sag ? "text-right tabular-nums" : ""}`}>
      {children}
    </td>
  );
}
