/**
 * Kategori kapaklarını zenginleştirir: soyut zemin + GERÇEK ürün fotoğrafı.
 *
 *   npm run hazirla:kategori
 *
 * Kaynak:  import/higgsfield/zemin/zemin-01..03.jpg  (bkz. docs/higgsfield-promptlar.md, D1-D3)
 * Çıktı:   public/media/kategori/{slug}-{sm|md|lg}.{avif|webp}
 *
 * Kapak neden tamamen AI değil: kullanıcı "Somunlar"a bakarken gerçek bir somun görmeli.
 * Soyut bir kapak güzel durur ama hangi kategoriye baktığını söylemez.
 *
 * `Category.imagePath` DEĞİŞTİRİLMEZ — kaynak ürün fotoğrafı orada kalır.
 * Ana sayfa bu klasörde dosya varsa onu, yoksa ürün fotoğrafını kullanır; yani
 * `public/media/kategori/` silinince site kendiliğinden eski hâline döner.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { processCategoryImage } from "../src/server/media";
import { db } from "../src/server/db";
import { bul } from "./lib/gorsel";

const ZEMIN_DIR = path.join(process.cwd(), "import", "higgsfield", "zemin");

const GENISLIK = 1600;
const YUKSEKLIK = 1200; // 4:3 — CategoryHighlights'taki kutu oranı

/** Ürün fotoğrafının kapak içinde kaplayacağı oran. Alt gradyanın altında kalmasın. */
const URUN_ORANI = 0.78;

async function main() {
  const zeminler = ["zemin-01", "zemin-02", "zemin-03"]
    .map((ad) => bul(ZEMIN_DIR, ad))
    .filter((y): y is string => y !== null);

  if (zeminler.length === 0) {
    console.error(
      `Zemin bulunamadı: ${ZEMIN_DIR}\n` +
        "docs/higgsfield-promptlar.md → D1-D3 bloklarını üretip bu klasöre at.",
    );
    process.exit(1);
  }
  console.log(`${zeminler.length} zemin bulundu.`);

  const kategoriler = await db.category.findMany({ orderBy: { order: "asc" } });
  let islenen = 0;

  for (const [i, k] of kategoriler.entries()) {
    if (!k.imagePath) {
      console.log(`  - ${k.slug}: kategori görseli yok, atlandı`);
      continue;
    }
    const urunYolu = path.join(process.cwd(), "public", `${k.imagePath}-lg.webp`);
    if (!existsSync(urunYolu)) {
      console.log(`  - ${k.slug}: ${k.imagePath}-lg.webp yok, atlandı`);
      continue;
    }

    // Zeminler kategoriler arasında sırayla dağıtılır — 8 kategori, 3 zemin.
    const zemin = await sharp(zeminler[i % zeminler.length])
      .resize({ width: GENISLIK, height: YUKSEKLIK, fit: "cover", position: "center" })
      .toBuffer();

    const urun = await sharp(urunYolu)
      .resize({
        width: Math.round(GENISLIK * URUN_ORANI),
        height: Math.round(YUKSEKLIK * URUN_ORANI),
        fit: "inside",
        withoutEnlargement: false,
      })
      .toBuffer();
    const um = await sharp(urun).metadata();

    const bilesik = await sharp(zemin)
      .composite([
        {
          input: urun,
          left: Math.round((GENISLIK - (um.width ?? 0)) / 2),
          top: Math.round((YUKSEKLIK - (um.height ?? 0)) / 2),
          // Ürün fotoğraflarının stüdyo zemini siyah. Normal bindirmede zeminin
          // üstünde keskin kenarlı siyah bir dikdörtgen kalıyor; "screen" karışımında
          // siyah pikseller zemini olduğu gibi geçiriyor, yalnız metal görünür kalıyor.
          blend: "screen",
        },
      ])
      .png()
      .toBuffer();

    const out = await processCategoryImage(bilesik, k.slug);
    console.log(`  ✓ ${k.slug}  ${out.width}×${out.height}  ← ${k.imagePath}`);
    islenen++;
  }

  console.log(`\n${islenen} kategori kapağı hazır → public/media/kategori/`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
