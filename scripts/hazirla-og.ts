/**
 * Sosyal paylaşım (Open Graph) kartını üretir.
 *
 *   npm run hazirla:og
 *
 * Kaynak: import/higgsfield/zemin/og-zemin.jpg  (bkz. docs/higgsfield-promptlar.md, D4)
 *         public/media/brand/inoxhan-logo.png   (npm run hazirla:logo)
 * Çıktı:  src/app/opengraph-image.png  +  src/app/opengraph-image.alt.txt
 *
 * Next.js `src/app/` altındaki bu dosyayı otomatik olarak tüm sayfalara miras ettirir;
 * ayrıca metadata yazmaya gerek yok. Ürün sayfaları kendi görsellerini bildirdiği için
 * yalnız onlar bunu geçersiz kılar.
 *
 * Metin burada BASILIYOR, çalışma anında üretilmiyor: kart yılda birkaç kez değişiyor,
 * her paylaşımda satori/ImageResponse çalıştırmak boşa maliyet.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SITE } from "../src/lib/constants";
import { bul } from "./lib/gorsel";

const GENISLIK = 1200;
const YUKSEKLIK = 630;

const ZEMIN_DIR = path.join(process.cwd(), "import", "higgsfield", "zemin");
const LOGO = path.join(process.cwd(), "public", "media", "brand", "inoxhan-logo.png");
const CIKTI = path.join(process.cwd(), "src", "app", "opengraph-image.png");

/** Logo genişliği — 1657×287 kaynaktan oran korunarak. */
const LOGO_GENISLIK = 380;
const KENAR = 84;
const UST = 104;

/** WhatsApp/LinkedIn küçük önizlemede satırları kırpmasın diye elle bölündü. */
const SATIRLAR = ["İhtiyacını gönder,", "15-30 dakika içinde", "teklifini al."];

async function main() {
  const zeminYolu = bul(ZEMIN_DIR, "og-zemin");
  if (!zeminYolu) {
    console.error(
      `Zemin bulunamadı: ${ZEMIN_DIR}\\og-zemin.*\n` +
        "docs/higgsfield-promptlar.md → D4 bloğunu üretip bu klasöre at.",
    );
    process.exit(1);
  }
  if (!existsSync(LOGO)) {
    console.error(`Logo yok: ${LOGO} — önce npm run hazirla:logo`);
    process.exit(1);
  }

  const zemin = await sharp(zeminYolu)
    .resize({ width: GENISLIK, height: YUKSEKLIK, fit: "cover", position: "center" })
    .toBuffer();

  const logo = await sharp(LOGO).resize({ width: LOGO_GENISLIK }).toBuffer();
  const lm = await sharp(logo).metadata();
  const logoYukseklik = lm.height ?? 0;

  // SVG'de `y` taban çizgisidir, üst kenar değil. Amber çizgi ile ilk satır arasındaki
  // boşluk büyük harf yüksekliği + "İ" noktası kadar açılmalı, yoksa çizgi harfe değiyor.
  const cizgiUst = UST + logoYukseklik + 34;
  const metinUst = cizgiUst + 66;
  const satirYukseklik = 58;

  // Zeminin sağ tarafı aydınlık olabiliyor; sol yarıya karartma basılmazsa
  // beyaz metin bazı üretimlerde okunmuyor. Gradyan sağa doğru tamamen açılıyor.
  const katman = Buffer.from(
    `<svg width="${GENISLIK}" height="${YUKSEKLIK}" xmlns="http://www.w3.org/2000/svg">
       <defs><linearGradient id="g" x1="0" x2="1">
         <stop offset="0" stop-color="#0B0D10" stop-opacity="0.94"/>
         <stop offset="0.58" stop-color="#0B0D10" stop-opacity="0.45"/>
         <stop offset="1" stop-color="#0B0D10" stop-opacity="0"/>
       </linearGradient></defs>
       <rect width="100%" height="100%" fill="url(#g)"/>
       <rect x="${KENAR}" y="${cizgiUst}" width="56" height="4" fill="#E8B54A"/>
       ${SATIRLAR.map(
         (s, i) =>
           `<text x="${KENAR}" y="${metinUst + i * satirYukseklik}" ` +
           `font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif" font-size="46" ` +
           `font-weight="700" fill="#F5F7F8">${s}</text>`,
       ).join("\n       ")}
       <text x="${KENAR}" y="${YUKSEKLIK - KENAR + 8}" ` +
      `font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif" font-size="24" ` +
      `fill="#8B97A3">Paslanmaz bağlantı elemanları · DIN &amp; ISO · A2 / A4</text>
     </svg>`,
  );

  await sharp(zemin)
    .composite([
      { input: katman, left: 0, top: 0 },
      { input: logo, left: KENAR, top: UST },
    ])
    .png()
    .toFile(CIKTI);

  await writeFile(
    path.join(process.cwd(), "src", "app", "opengraph-image.alt.txt"),
    `${SITE.name} — ${SITE.tagline}`,
    "utf8",
  );

  console.log(`OG kartı hazır → src/app/opengraph-image.png  (${GENISLIK}×${YUKSEKLIK})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
