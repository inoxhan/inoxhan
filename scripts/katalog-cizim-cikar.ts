/**
 * Katalog sayfalarından teknik çizimi ve ölçü tablosunu ayrı ayrı keser,
 * site paletine boyar ve İnoxhan logosunu basar.
 *
 *   npm run katalog:cizim            → kes + yaz
 *   npm run katalog:cizim -- --rapor → yalnız tespit raporu (dosya yazmaz)
 *   npm run katalog:cizim -- --hata-ayikla → tespit kutularını çizen kontrol görselleri
 *
 * Girdi : import/katalog-sayfalar/sayfa-NN.png   (katalog-render.ts çıktısı)
 * Çıktı : import/katalog-cizim/sayfa-NN-cizim.png ve -tablo.png (+ plan.json)
 *
 * Katalog şablonu 55 sayfada da aynı: üstte iki mavi başlık bandı, altında solda
 * çerçeveli teknik çizim kutusu / sağda gri ISO-UNI-DIN tablosu, sonra "TEKNİK BİLGİLER"
 * mavi bandı ve ölçü tablosu, en altta mavi dipnot bandı. Bölgeler bu sabit işaretlerden
 * ÖLÇÜLEREK bulunur — sabit piksel koordinatı varsayılmaz.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const KAYNAK_DIR = path.join(process.cwd(), "import", "katalog-sayfalar");
const HEDEF_DIR = path.join(process.cwd(), "import", "katalog-cizim");
const LOGO = path.join(process.cwd(), "public", "media", "brand", "inoxhan-logo-mono.png");

const RAPOR = process.argv.includes("--rapor");
const HATA_AYIKLA = process.argv.includes("--hata-ayikla");

/** Site paleti — steel-900. Duotone'un koyu ucu. */
const KOYU = { r: 0x14, g: 0x18, b: 0x1d };

/** Filigran: görsel genişliğinin oranı, opaklık, kenar boşluğu oranı. */
const LOGO_ORAN = 0.18;
const LOGO_OPAKLIK = 0.55;
const LOGO_BOSLUK = 0.03;

interface Kutu {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Otomatik tespitin tutmadığı sayfalar için açık düzeltme tablosu.
 * `import-urunler.ts` içindeki CATEGORIES ile aynı felsefe: tahmin yok, elle yazılır.
 * Anahtar = PDF sayfa numarası.
 */
const DUZELTME: Record<number, Partial<Record<"cizim" | "tablo", Partial<Kutu>>>> = {};

type Piksel = { data: Buffer; w: number; h: number; kanal: number };

function luma(p: Piksel, x: number, y: number): number {
  const i = (y * p.w + x) * p.kanal;
  return p.data[i] * 0.299 + p.data[i + 1] * 0.587 + p.data[i + 2] * 0.114;
}
function mavi(p: Piksel, x: number, y: number): boolean {
  const i = (y * p.w + x) * p.kanal;
  return p.data[i + 2] - p.data[i] > 60 && p.data[i + 2] > 120;
}

/**
 * Piksel eşikleri 300 DPI A4 (2481 px genişlik) üzerinde kalibre edildi.
 * Render çözünürlüğü değişince eşikler de ölçeklenmeli — yoksa tespit bozulur.
 */
const KALIBRASYON_GENISLIK = 2481;
const olcekle = (p: Piksel, deger: number) =>
  Math.max(1, Math.round((deger * p.w) / KALIBRASYON_GENISLIK));

/** Yatay mavi bantların (başlık şeritlerinin) dikey aralıkları. */
function maviBantlar(p: Piksel): { ust: number; alt: number; sol: number; sag: number }[] {
  const bantSatiri: boolean[] = [];
  for (let y = 0; y < p.h; y++) {
    let n = 0;
    for (let x = 0; x < p.w; x += 2) if (mavi(p, x, y)) n++;
    bantSatiri[y] = n / (p.w / 2) > 0.5;
  }
  const bantlar: { ust: number; alt: number; sol: number; sag: number }[] = [];
  let y = 0;
  while (y < p.h) {
    if (!bantSatiri[y]) {
      y++;
      continue;
    }
    const ust = y;
    while (y < p.h && bantSatiri[y]) y++;
    const alt = y - 1;
    if (alt - ust < olcekle(p, 8)) continue; // gürültü
    const orta = Math.floor((ust + alt) / 2);
    let sol = 0;
    let sag = p.w - 1;
    while (sol < p.w && !mavi(p, sol, orta)) sol++;
    while (sag > sol && !mavi(p, sag, orta)) sag--;
    bantlar.push({ ust, alt, sol, sag });
  }
  return bantlar;
}

/** Boş olmayan (beyaz olmayan) piksellerin sınır kutusu. */
function icerikKutusu(
  p: Piksel,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  esik = 245,
): Kutu | null {
  let a = x1;
  let b = y1;
  let c = x0;
  let d = y0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (luma(p, x, y) < esik) {
        if (x < a) a = x;
        if (x > c) c = x;
        if (y < b) b = y;
        if (y > d) d = y;
      }
    }
  }
  if (c < a || d < b) return null;
  return { left: a, top: b, width: c - a + 1, height: d - b + 1 };
}

/** ISO/UNI/DIN tablosunun sol kenarı — geniş gri dolgu sütunlarından bulunur. */
function normTablosuSolKenar(p: Piksel, y0: number, y1: number): number {
  const yukseklik = y1 - y0 + 1;
  for (let x = Math.floor(p.w * 0.3); x < p.w; x++) {
    let gri = 0;
    for (let y = y0; y <= y1; y++) {
      const l = luma(p, x, y);
      if (l >= 120 && l <= 200) gri++;
    }
    if (gri > yukseklik * 0.25) return x;
  }
  return p.w - 1;
}

interface SayfaPlan {
  sayfa: number;
  cizim: Kutu | null;
  tablo: Kutu | null;
  not: string;
}

function planla(p: Piksel, sayfa: number): SayfaPlan {
  const bantlar = maviBantlar(p);
  const baslik = bantlar.filter((b) => b.ust < p.h * 0.12);
  const govde = bantlar.filter((b) => b.ust >= p.h * 0.12);
  if (baslik.length === 0 || govde.length < 2) {
    return { sayfa, cizim: null, tablo: null, not: "şablon dışı sayfa (kapak?)" };
  }

  const baslikAlt = Math.max(...baslik.map((b) => b.alt));
  const tabloBandi = govde[0]; // "TEKNİK BİLGİLER"
  const dipnot = govde[govde.length - 1];

  // ── Teknik çizim ────────────────────────────────────────────────────────────
  const cy0 = baslikAlt + olcekle(p, 10);
  const cy1 = tabloBandi.ust - olcekle(p, 10);
  const xStd = normTablosuSolKenar(p, cy0, cy1);
  // 1) Çizimin çevresindeki çerçeve kutusu
  const cerceve = icerikKutusu(p, 0, cy0, Math.max(0, xStd - olcekle(p, 20)), cy1);
  let cizim: Kutu | null = null;
  if (cerceve) {
    // 2) Çerçeveyi içeri alıp asıl çizimin sınırını bul (çerçeve görsele girmesin)
    const ic = olcekle(p, 8);
    const i = icerikKutusu(
      p,
      cerceve.left + ic,
      cerceve.top + ic,
      cerceve.left + cerceve.width - 1 - ic,
      cerceve.top + cerceve.height - 1 - ic,
    );
    const hedef = i ?? cerceve;
    const pad = Math.round(hedef.width * 0.04);
    cizim = {
      left: Math.max(0, hedef.left - pad),
      top: Math.max(0, hedef.top - pad),
      width: Math.min(p.w, hedef.width + pad * 2),
      height: Math.min(p.h, hedef.height + pad * 2),
    };
  }

  // ── Ölçü tablosu ────────────────────────────────────────────────────────────
  // Üst: "TEKNİK BİLGİLER" bandı. Alt: veri içeren SON satır (şablon boş ızgarayı
  // sayfa sonuna kadar sürdürüyor; boş satırları almak görseli anlamsız uzatır).
  const tSol = tabloBandi.sol;
  const tSag = tabloBandi.sag;
  const veriX0 = tSol + Math.round((tSag - tSol) * 0.25); // sol etiket sütununu atla
  const yBas = tabloBandi.alt + 1;
  const ySon = dipnot.ust - olcekle(p, 4);

  // Şablon, boş ızgarayı sayfa sonuna kadar sürdürüyor. Veri içeren son satırı bulmak
  // için ızgara çizgilerini elemek gerekiyor:
  //   · dikey sütun çizgileri → satırların çoğunda koyu olan sütunlar
  //   · yatay satır çizgileri → 25 px'ten uzun koyu diziler
  // Kalan koyu pikseller yalnızca rakam/harf mürekkebidir.
  const satirSayisi = ySon - yBas + 1;
  const cekirdek: boolean[] = [];
  for (let x = veriX0; x <= tSag; x++) {
    let n = 0;
    for (let y = yBas; y <= ySon; y += 3) if (luma(p, x, y) < 90) n++;
    cekirdek[x] = n / (satirSayisi / 3) > 0.7;
  }
  // Dikey çizgilerin kenar yumuşatma pikselleri yalnız yatay çizgi satırlarında koyulaşıyor
  // ve satır başına ~19 px'lik sahte "mürekkep" üretiyordu. Maskeyi ±3 px genişletiyoruz.
  const genislet = olcekle(p, 3);
  const dikeyCizgi: boolean[] = [];
  for (let x = veriX0; x <= tSag; x++) {
    dikeyCizgi[x] = false;
    for (let d = -genislet; d <= genislet; d++) if (cekirdek[x + d]) dikeyCizgi[x] = true;
  }

  const VERI_ESIGI = olcekle(p, 15);
  const UZUN_DIZI = olcekle(p, 25);
  let sonVeri = tabloBandi.alt;
  for (let y = yBas; y <= ySon; y++) {
    let koyu = 0;
    let dizi = 0;
    for (let x = veriX0; x <= tSag + 1; x++) {
      const isKoyu = x <= tSag && !dikeyCizgi[x] && luma(p, x, y) < 90;
      if (isKoyu) dizi++;
      else {
        // Tarama sınırında başlayan dizi, yatay ızgara çizgisinin kırpılmış ucudur —
        // uzunluğu kısa görünür ama mürekkep değildir.
        const baslangic = x - dizi;
        if (dizi > 0 && dizi <= UZUN_DIZI && baslangic > veriX0) koyu += dizi;
        dizi = 0;
      }
    }
    if (koyu > VERI_ESIGI) sonVeri = y;
  }
  const tabloPad = olcekle(p, 6);
  const tablo: Kutu = {
    left: tSol,
    top: tabloBandi.ust,
    width: tSag - tSol + 1,
    height: Math.min(ySon, sonVeri + tabloPad) - tabloBandi.ust + 1,
  };

  return { sayfa, cizim, tablo, not: "" };
}

/** Gri tonu site paletine eşler: 0 → steel-900, 255 → beyaz. */
async function duotone(girdi: ReturnType<typeof sharp>): Promise<Buffer> {
  const { data, info } = await girdi.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 3) {
    const l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    out[o] = Math.round(KOYU.r + (255 - KOYU.r) * l);
    out[o + 1] = Math.round(KOYU.g + (255 - KOYU.g) * l);
    out[o + 2] = Math.round(KOYU.b + (255 - KOYU.b) * l);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toBuffer();
}

/** Logoyu istenen genişlik ve opaklıkta hazırlar. */
async function filigran(genislik: number): Promise<Buffer> {
  const { data, info } = await sharp(LOGO)
    .resize({ width: genislik })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * LOGO_OPAKLIK);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  if (!existsSync(KAYNAK_DIR)) {
    console.error(`Önce sayfaları render edin: npm run katalog:render`);
    process.exit(1);
  }
  if (!existsSync(LOGO)) {
    console.error(`Logo bulunamadı: ${LOGO}\nÖnce: npm run hazirla:logo`);
    process.exit(1);
  }
  await mkdir(HEDEF_DIR, { recursive: true });

  const dosyalar = (await readdir(KAYNAK_DIR)).filter((f) => /^sayfa-\d+\.png$/.test(f)).sort();
  const planlar: SayfaPlan[] = [];

  for (const dosya of dosyalar) {
    const sayfa = Number(dosya.match(/(\d+)/)![1]);
    const tam = path.join(KAYNAK_DIR, dosya);
    const { data, info } = await sharp(tam).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const p: Piksel = { data, w: info.width, h: info.height, kanal: info.channels };

    const plan = planla(p, sayfa);
    const dz = DUZELTME[sayfa];
    if (dz?.cizim && plan.cizim) Object.assign(plan.cizim, dz.cizim);
    if (dz?.tablo && plan.tablo) Object.assign(plan.tablo, dz.tablo);
    planlar.push(plan);

    const ozet = (k: Kutu | null) => (k ? `${k.width}×${k.height} @${k.left},${k.top}` : "—");
    console.log(
      `  s${String(sayfa).padStart(2, "0")}  çizim ${ozet(plan.cizim).padEnd(24)} tablo ${ozet(plan.tablo).padEnd(24)} ${plan.not}`,
    );
    if (RAPOR) continue;

    if (plan.cizim) {
      const png = await duotone(sharp(tam).extract(plan.cizim));
      const logoW = Math.round(plan.cizim.width * LOGO_ORAN);
      const bosluk = Math.round(plan.cizim.width * LOGO_BOSLUK);
      const logo = await filigran(logoW);
      const logoH = (await sharp(logo).metadata()).height!;
      await sharp(png)
        .composite([
          {
            input: logo,
            left: plan.cizim.width - logoW - bosluk,
            top: plan.cizim.height - logoH - bosluk,
          },
        ])
        .png()
        .toFile(path.join(HEDEF_DIR, `sayfa-${String(sayfa).padStart(2, "0")}-cizim.png`));
    }

    if (plan.tablo) {
      const png = await duotone(sharp(tam).extract(plan.tablo));
      // Logo sayıların üstünü kapatmasın diye tablonun ALTINA şerit eklenir.
      const seritH = Math.max(60, Math.round(plan.tablo.height * 0.07));
      const logoW = Math.round(plan.tablo.width * LOGO_ORAN);
      const bosluk = Math.round(plan.tablo.width * LOGO_BOSLUK);
      const logo = await filigran(logoW);
      const logoH = (await sharp(logo).metadata()).height!;
      await sharp({
        create: {
          width: plan.tablo.width,
          height: plan.tablo.height + seritH,
          channels: 3,
          background: "#ffffff",
        },
      })
        .composite([
          { input: png, left: 0, top: 0 },
          {
            input: logo,
            left: plan.tablo.width - logoW - bosluk,
            top: plan.tablo.height + Math.round((seritH - logoH) / 2),
          },
        ])
        .png()
        .toFile(path.join(HEDEF_DIR, `sayfa-${String(sayfa).padStart(2, "0")}-tablo.png`));
    }

    if (HATA_AYIKLA) {
      const ciz = (k: Kutu | null, renk: string) =>
        k
          ? `<rect x="${k.left}" y="${k.top}" width="${k.width}" height="${k.height}" fill="none" stroke="${renk}" stroke-width="10"/>`
          : "";
      const svg = Buffer.from(
        `<svg width="${p.w}" height="${p.h}">${ciz(plan.cizim, "#e8b54a")}${ciz(plan.tablo, "#16a34a")}</svg>`,
      );
      // sharp önce resize, sonra composite uygular — bu yüzden önce tam boyda
      // birleştirip ayrı bir adımda küçültüyoruz.
      const isaretli = await sharp(tam).composite([{ input: svg }]).png().toBuffer();
      await sharp(isaretli)
        .resize({ width: 850 })
        .png()
        .toFile(path.join(HEDEF_DIR, `kontrol-${String(sayfa).padStart(2, "0")}.png`));
    }
  }

  if (!RAPOR) {
    await writeFile(path.join(HEDEF_DIR, "plan.json"), JSON.stringify(planlar, null, 2), "utf8");
  }
  const eksik = planlar.filter((s) => !s.cizim || !s.tablo);
  console.log(
    `\n${planlar.length} sayfa işlendi · ${planlar.length - eksik.length} tam` +
      (eksik.length ? `\nEksik: ${eksik.map((e) => `s${e.sayfa} (${e.not || "kutu bulunamadı"})`).join(", ")}` : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
