/**
 * Hero slaytları için GEÇİCİ arka plan görselleri üretir.
 *
 *   npm run hazirla:hero
 *
 * Kaynak: mevcut ÜRÜN fotoğrafları (siyah stüdyo zeminli). Geniş ve dikey kadraja
 * kırpılıp metnin durduğu tarafa doğru koyulaştırılır.
 *
 * BUNLAR YER TUTUCUDUR. Amaçları hero'yu gerçek medya gelene kadar ayakta tutmak:
 * `HERO_SLIDES` bu dosya adlarını gösteriyor, türev yoksa hero bomboş kalır.
 *
 * Gerçek görseller `import/higgsfield/` altına düşünce `npm run hazirla:medya`
 * AYNI dosya adlarının üzerine yazar — `HERO_SLIDES`'a dokunmaya gerek kalmaz.
 * Prompt paketi ve adlandırma sözleşmesi: docs/higgsfield-promptlar.md
 *
 * Slayt 1 video: video dosyası yokken `<video>` poster karesini gösterdiği için
 * o slaydın posteri de burada üretilir, böylece video gelmeden de bir şey görünür.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  HERO_VARIANTS,
  processHeroImage,
  processHeroPortrait,
  processVideoPoster,
} from "../src/server/media";

/** hedef dosya adı → kaynak ürün görselinin basePath'i (HERO_SLIDES sırasıyla) */
const KAYNAKLAR: { ad: string; urun: string }[] = [
  { ad: "01-asili", urun: "media/products/din-933" },
  { ad: "02-kilit", urun: "media/products/din-934" },
  { ad: "03-yiv", urun: "media/products/din-975" },
  { ad: "04-akis", urun: "media/products/din-125-a" },
  { ad: "05-yuzey", urun: "media/products/din-965" },
];

const GENISLIK = 2560;
const YUKSEKLIK = 1100; // ~21:9 — hero bandı çok yüksek olmasın

const MOBIL_GENISLIK = 1440;
const MOBIL_YUKSEKLIK = 2160; // 2:3

/** Ürün fotoğrafını hedef tuvale yerleştirip okunabilirlik gradyanını basar. */
async function kompoze(
  kaynak: string,
  tuvalG: number,
  tuvalY: number,
  /** Ürünün tuval içindeki merkezi (0-1). Yatayda sağa, dikeyde aşağı yaslanır. */
  merkez: { x: number; y: number },
  /** Gradyanın yönü — metin nerede duruyorsa orası koyulaşır. */
  yon: "sol" | "ust",
) {
  // Ürün fotoğrafı kare; tuvale SIĞDIRILIR (yükseklik de sınırlanmazsa taşar).
  const govde = await sharp(kaynak)
    .resize({
      width: Math.round(tuvalG * (yon === "sol" ? 0.62 : 0.86)),
      height: Math.round(tuvalY * (yon === "sol" ? 1 : 0.5)),
      fit: "inside",
      withoutEnlargement: false,
    })
    // Stüdyo fotoğrafları zaten koyu; hero'nun kendi gradyan katmanı da üstüne binince
    // ürün seçilmiyordu. Hafif aydınlatma ile metal detayları geri geliyor.
    .modulate({ brightness: 1.45 })
    .toBuffer();
  const gm = await sharp(govde).metadata();
  const gw = gm.width ?? 0;
  const gh = gm.height ?? 0;

  const gradyan =
    yon === "sol"
      ? `<linearGradient id="g" x1="0" x2="1">
           <stop offset="0" stop-color="#0B0D10" stop-opacity="0.92"/>
           <stop offset="0.55" stop-color="#0B0D10" stop-opacity="0.30"/>
           <stop offset="1" stop-color="#0B0D10" stop-opacity="0"/>
         </linearGradient>`
      : `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#0B0D10" stop-opacity="0.94"/>
           <stop offset="0.5" stop-color="#0B0D10" stop-opacity="0.35"/>
           <stop offset="1" stop-color="#0B0D10" stop-opacity="0"/>
         </linearGradient>`;

  return sharp({
    create: {
      width: tuvalG,
      height: tuvalY,
      channels: 3,
      background: "#0c0c0b", // --color-photo: fotoğrafların stüdyo zemini
    },
  })
    .composite([
      {
        input: govde,
        left: Math.max(0, Math.min(tuvalG - gw, Math.round(tuvalG * merkez.x - gw / 2))),
        top: Math.max(0, Math.min(tuvalY - gh, Math.round(tuvalY * merkez.y - gh / 2))),
      },
      // Slogan alanı — okunabilirlik için koyulaştırma
      {
        input: Buffer.from(
          `<svg width="${tuvalG}" height="${tuvalY}">
             <defs>${gradyan}</defs>
             <rect width="100%" height="100%" fill="url(#g)"/>
           </svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function main() {
  for (const k of KAYNAKLAR) {
    const kaynak = path.join(process.cwd(), "public", `${k.urun}-lg.webp`);
    if (!existsSync(kaynak)) {
      console.warn(`Kaynak yok, atlandı: ${k.urun}-lg.webp — önce npm run import:urunler`);
      continue;
    }

    // Masaüstü: metin solda → özne sağda, sol taraf koyulaşır
    const genis = await kompoze(kaynak, GENISLIK, YUKSEKLIK, { x: 0.66, y: 0.5 }, "sol");
    const out = await processHeroImage(genis, k.ad);

    // Mobil: metin üstte → özne altta, üst taraf koyulaşır
    const dikey = await kompoze(
      kaynak,
      MOBIL_GENISLIK,
      MOBIL_YUKSEKLIK,
      { x: 0.5, y: 0.68 },
      "ust",
    );
    await processHeroPortrait(dikey, `${k.ad}-mobil`);

    console.log(`  ${k.ad}  ${out.width}×${out.height} + mobil  ← ${k.urun}`);
  }

  // Slayt 1 video; dosyası yokken <video> poster karesine düşüyor.
  const videoKaynak = path.join(process.cwd(), "public", `${KAYNAKLAR[0].urun}-lg.webp`);
  if (existsSync(videoKaynak)) {
    const genis = await kompoze(videoKaynak, GENISLIK, YUKSEKLIK, { x: 0.66, y: 0.5 }, "sol");
    await processVideoPoster(genis, "01-asili-poster", HERO_VARIANTS);
    console.log("  01-asili-poster  (video slaytının yer tutucu posteri)");
  }

  console.log("Hero yer tutucuları hazır → public/media/hero/ + public/media/video/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
