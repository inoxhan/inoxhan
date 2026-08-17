/**
 * Küçük görsel (xs, 160 px) türevlerini üretir — `npm run hazirla:kucuk`
 *
 * Teklif sayfası ürünleri 40-56 px kutularda gösteriyor; oralarda 480 px'lik
 * "sm" türevi servis edilince tek sayfada ~500 KB gereksiz indirme oluyordu.
 * Bu script mevcut `-lg.webp` türevinden küçültme yapar (kaynak fotoğraf
 * klasörüne ihtiyaç duymaz), sonuçlar depoya commit edilir.
 *
 * Varsayılan hedef: public/media/products. `--tumu` ile kategori ve teknik
 * çizim klasörleri de işlenir.
 */
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const KOK = path.join(__dirname, "..");
const XS_GENISLIK = 160;

const KLASORLER = ["products"];
if (process.argv.includes("--tumu")) KLASORLER.push("kategori", "technical");

async function klasoruIsle(ad: string) {
  const dizin = path.join(KOK, "public", "media", ad);
  if (!existsSync(dizin)) {
    console.log(`  ${ad}: klasör yok, atlandı`);
    return { uretilen: 0, atlanan: 0, bayt: 0 };
  }

  const dosyalar = await readdir(dizin);
  // "din-933-lg.webp" → "din-933"
  const tabanlar = dosyalar
    .filter((d) => d.endsWith("-lg.webp"))
    .map((d) => d.slice(0, -"-lg.webp".length));

  let uretilen = 0;
  let atlanan = 0;
  let bayt = 0;

  for (const taban of tabanlar) {
    const kaynak = path.join(dizin, `${taban}-lg.webp`);
    const hedefler = [
      { yol: path.join(dizin, `${taban}-xs.avif`), tur: "avif" as const },
      { yol: path.join(dizin, `${taban}-xs.webp`), tur: "webp" as const },
    ];

    if (hedefler.every((h) => existsSync(h.yol)) && !process.argv.includes("--force")) {
      atlanan += 1;
      continue;
    }

    const kucuk = sharp(kaynak).resize({ width: XS_GENISLIK, withoutEnlargement: true });
    await kucuk.clone().avif({ quality: 55 }).toFile(hedefler[0].yol);
    await kucuk.clone().webp({ quality: 78 }).toFile(hedefler[1].yol);
    for (const h of hedefler) bayt += (await stat(h.yol)).size;
    uretilen += 1;
  }

  console.log(
    `  ${ad}: ${uretilen} üretildi, ${atlanan} atlandı · toplam ${Math.round(bayt / 1024)} KB`,
  );
  return { uretilen, atlanan, bayt };
}

async function main() {
  console.log(`Küçük görsel (${XS_GENISLIK}px) türevleri:`);
  let toplam = 0;
  for (const k of KLASORLER) {
    const s = await klasoruIsle(k);
    toplam += s.uretilen;
  }
  console.log(`Bitti: ${toplam} görsel.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
