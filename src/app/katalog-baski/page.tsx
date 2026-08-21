import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { SITE } from "@/lib/constants";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";

/**
 * GİZLİ PDF baskı sayfası — Playwright bu sayfayı A4 PDF'e basar.
 * Erişim: ?token=CATALOG_PRINT_TOKEN veya panel oturumu.
 * robots: noindex + Faz 7'de robots.txt disallow.
 */
export const metadata = { robots: { index: false, follow: false } };

const PRINT_CSS = `
  /* Site kabuğunu gizle (header/footer/sabit butonlar) */
  body:has(#katalog-baski) header,
  body:has(#katalog-baski) footer,
  body:has(#katalog-baski) .no-print { display: none !important; }
  body:has(#katalog-baski) { background: white !important; }

  /* @page marjı 0 KALMALI: kapak kâğıdın tamamını kaplıyor. Kenar boşluğunu
     elemanların padding'i üretir. (margin: 14mm 13mm + adlandırılmış @page ve
     negatif margin denendi — Chromium ikisinde de kapağı 184mm'de tutup
     sağ/alt kenarda beyaz şerit bıraktı.) */
  @page { size: A4 portrait; margin: 0; }

  #katalog-baski { font-size: 10.5pt; color: #14181D; }

  /* Tam sayfa tutulan bölümler: kapak ve içindekiler */
  .pdf-sheet { width: 210mm; min-height: 297mm; padding: 14mm 13mm; box-sizing: border-box; page-break-after: always; }
  .pdf-cover {
    display: flex; flex-direction: column; justify-content: space-between;
    background: #0B0D10; color: #F5F7F8;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* Kategoriler TEK akış: her biri ayrı .pdf-page olduğunda 2-4 ürünlü
     kategoriler yarısı boş sayfa üretiyordu ("katalog bitmiş gibi"). Sarmalayıcı
     genişliği vermek şart — yoksa ürün satırının sağındaki QR sütunu (flexShrink: 0)
     sayfa dışına taşıp kırpılıyor. */
  .pdf-flow { width: 210mm; padding: 14mm 13mm; box-sizing: border-box; }
  .pdf-category { break-inside: auto; }
  .pdf-section-head {
    background: #14181D; color: #F5F7F8;
    break-after: avoid; page-break-after: avoid;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* Akış içinde kategoriler birbirine yapışmasın; ilki başlıktan sonra gelir */
  .pdf-category + .pdf-category .pdf-section-head { margin-top: 10mm; }

  .pdf-product { break-inside: avoid; page-break-inside: avoid; }
  /* Sayfa dibindeki son ürünün alt çizgisi havada kalmasın */
  .pdf-product:last-child { border-bottom: none; }
`;

interface SearchParams {
  token?: string;
}

export default async function KatalogBaskiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await searchParams;
  const validToken =
    Boolean(process.env.CATALOG_PRINT_TOKEN) && token === process.env.CATALOG_PRINT_TOKEN;
  const session = await getSession();
  if (!validToken && !session.adminId) notFound();

  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          brand: true,
          images: { where: { isMain: true }, take: 1 },
          drawings: { where: { kind: "cizim" }, take: 1 },
          specs: { orderBy: { order: "asc" }, take: 5 },
        },
      },
    },
  });
  const withProducts = categories.filter((c) => c.products.length > 0);
  const totalProducts = withProducts.reduce((n, c) => n + c.products.length, 0);
  const year = new Date().getFullYear();
  const coverImage = withProducts[0]?.products[0]?.images[0]?.basePath ?? null;

  // Her ürün için QR (data URL) — ürünün web sayfasına gider
  const qrMap = new Map<string, string>();
  for (const cat of withProducts) {
    for (const p of cat.products) {
      const url = `${SITE.url}/urunler/${cat.slug}/${p.slug}`;
      qrMap.set(
        p.id,
        await QRCode.toDataURL(url, { margin: 0, width: 120, color: { dark: "#14181D" } }),
      );
    }
  }

  return (
    <div id="katalog-baski">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* ── KAPAK ── */}
      <section className="pdf-sheet pdf-cover">
        <div style={{ paddingTop: "24mm" }}>
          {/* Saydam zeminli kurumsal logo — koyu kapak üzerinde metalik okunur.
              display:block şart: satır içi <img> taban çizgisi boşluğu ekliyor ve
              kapak 297 mm'i aşıp ikinci sayfaya taşıyor. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/brand/inoxhan-logo.png"
            alt="İnoxhan"
            style={{ width: "72mm", display: "block" }}
          />
          <h1
            className="font-display"
            style={{ fontSize: "42pt", fontWeight: 700, lineHeight: 1.05, marginTop: "18mm" }}
          >
            Ürün Kataloğu
            <br />
            <span style={{ color: "#8B97A3" }}>{year}</span>
          </h1>
          <p style={{ marginTop: "10mm", fontSize: "13pt", color: "#B9C2CA", maxWidth: "120mm" }}>
            {SITE.tagline}
          </p>
          <p style={{ marginTop: "4mm", fontSize: "11pt", color: "#6E7B88", maxWidth: "120mm" }}>
            Paslanmaz çelik bağlantı elemanları · DIN / ISO normları · A2 ve A4 kalite
          </p>
        </div>

        {/* Kapak görseli — kataloğun ilk kategorisinden temsili ürün */}
        {coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/${coverImage}-lg.webp`}
            alt=""
            style={{ width: "135mm", alignSelf: "flex-end" }}
          />
        )}
        <div style={{ borderTop: "0.5pt solid #333C46", paddingTop: "6mm", display: "flex", justifyContent: "space-between", fontSize: "9.5pt", color: "#8B97A3" }}>
          <span>{totalProducts} ürün · {withProducts.length} kategori</span>
          <span>{SITE.url.replace(/^https?:\/\//, "")}</span>
        </div>
      </section>

      {/* ── İÇİNDEKİLER ── */}
      <section className="pdf-sheet">
        <h2 className="font-display" style={{ fontSize: "20pt", fontWeight: 700, marginBottom: "10mm" }}>
          İçindekiler
        </h2>
        <ol style={{ listStyle: "none", padding: 0 }}>
          {withProducts.map((c, i) => (
            <li
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4mm 0",
                borderBottom: "0.5pt solid #D2D8DE",
                fontSize: "12pt",
              }}
            >
              <span>
                <span style={{ color: "#8B97A3", marginRight: "6mm", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {c.name}
              </span>
              <span style={{ color: "#6E7B88" }}>{c.products.length} ürün</span>
            </li>
          ))}
        </ol>
        <p style={{ marginTop: "12mm", fontSize: "9.5pt", color: "#6E7B88" }}>
          Her ürünün yanındaki QR kodu okutarak ürünün web sayfasına ulaşabilir, tek tıkla
          teklif isteyebilirsiniz. Fiyatlar için: {SITE.url.replace(/^https?:\/\//, "")}/teklif
        </p>
      </section>

      {/* ── KATEGORİLER — tek sürekli akış, aralarda boş sayfa bırakmaz ── */}
      <div className="pdf-flow">
      {withProducts.map((cat, ci) => (
        <section key={cat.id} className="pdf-category">
          <div
            className="pdf-section-head"
            style={{ padding: "6mm 8mm", borderRadius: "3mm", marginBottom: "8mm", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
          >
            <h2 className="font-display" style={{ fontSize: "16pt", fontWeight: 700 }}>
              {String(ci + 1).padStart(2, "0")} · {cat.name}
            </h2>
            <span style={{ fontSize: "9.5pt", color: "#8B97A3" }}>{cat.products.length} ürün</span>
          </div>

          {cat.products.map((p) => (
            <article
              key={p.id}
              className="pdf-product"
              style={{
                display: "flex",
                gap: "6mm",
                padding: "5mm 0",
                borderBottom: "0.5pt solid #D2D8DE",
              }}
            >
              <div style={{ width: "42mm", flexShrink: 0 }}>
                {p.images[0] ? (
                  // Fotoğraflar siyah zeminli: koyu kutu içinde contain ile basılır.
                  // 42mm @300dpi ≈ 500px → -sm (480w) yeterli; -md kullanmak
                  // PDF'i gereksiz yere birkaç kat büyütüyor
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/${p.images[0].basePath}-sm.webp`}
                    alt={p.name}
                    style={{
                      width: "42mm",
                      height: "32mm",
                      objectFit: "contain",
                      background: "#0C0C0B",
                      borderRadius: "2mm",
                    }}
                  />
                ) : (
                  <div style={{ width: "42mm", height: "32mm", background: "#E8ECEF", borderRadius: "2mm" }} />
                )}

                {/* Teknik çizim — katalog PDF'inden çıkarılmış line-art, beyaz zeminli.
                    Ölçü tablosu baskıya girmez: satır yüksekliğini ve dosya boyutunu
                    katlıyor, web sayfasında tam çözünürlükte zaten var. */}
                {p.drawings[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/${p.drawings[0].basePath}-sm.webp`}
                    alt={p.drawings[0].alt}
                    style={{
                      width: "42mm",
                      height: "20mm",
                      objectFit: "contain",
                      marginTop: "2mm",
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "8pt", color: "#6E7B88" }}>
                  {p.sku}
                </p>
                <h3 className="font-display" style={{ fontSize: "12pt", fontWeight: 600, lineHeight: 1.25 }}>
                  {p.name}
                </h3>
                {[p.brand?.name, p.model].filter(Boolean).length > 0 && (
                  <p style={{ fontSize: "9pt", color: "#6E7B88", marginTop: "1mm" }}>
                    {[p.brand?.name, p.model].filter(Boolean).join(" · ")}
                  </p>
                )}
                {p.shortDesc && (
                  <p style={{ fontSize: "9pt", color: "#4A5561", marginTop: "2mm", lineHeight: 1.4 }}>
                    {p.shortDesc}
                  </p>
                )}
                {p.specs.length > 0 && (
                  <table style={{ marginTop: "2.5mm", fontSize: "8.5pt", borderCollapse: "collapse" }}>
                    <tbody>
                      {p.specs.map((s) => (
                        <tr key={s.id}>
                          <td style={{ color: "#6E7B88", paddingRight: "5mm", paddingBottom: "0.8mm" }}>{s.key}</td>
                          <td style={{ fontWeight: 500 }}>{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ width: "20mm", flexShrink: 0, textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrMap.get(p.id)} alt="QR" style={{ width: "18mm", height: "18mm" }} />
                <p style={{ fontSize: "6.5pt", color: "#8B97A3", marginTop: "1mm" }}>Teklif için okutun</p>
              </div>
            </article>
          ))}
        </section>
      ))}
      </div>
    </div>
  );
}
