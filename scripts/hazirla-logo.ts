/**
 * İnoxhan logosunun beyaz zeminini kaldırır — renkler DEĞİŞTİRİLMEZ.
 *
 *   npm run hazirla:logo
 *
 * Kaynak `inoxhan-logo.png` düz beyaz (~254) zemin üzerine basılmış RGB bir görsel.
 * Üç adım uygulanır:
 *
 *   1. Luma → alfa rampası. LUMA_OPAK altı tam opak, LUMA_SAYDAM üstü tam saydam,
 *      arası doğrusal. Sert eşik yerine rampa, harf kenarlarındaki anti-aliasing'i
 *      korur (aksi halde konturlar tırtıklı çıkar).
 *   2. Beyaza karşı "unmultiply". Kenar pikselleri aslında `a·renk + (1-a)·beyaz`
 *      karışımı; bunu geri almazsak koyu zeminde harflerin çevresinde beyaz hale olur.
 *   3. İçerik kutusuna kırpma — kaynakta logonun etrafında geniş beyaz boşluk var.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const KAYNAK = path.join(process.cwd(), "inoxhan-logo.png");
const HEDEF_DIR = path.join(process.cwd(), "public", "media", "brand");

/** Bu lumanın altı tam opak sayılır (logonun en açık metalik tonu ~240 ölçüldü). */
const LUMA_OPAK = 240;
/** Bu lumanın üstü zemin sayılır (zemin 254–255 ölçüldü). */
const LUMA_SAYDAM = 252;
/** Kırpma sınırı — bu alfanın altındaki piksel "boş" kabul edilir. */
const KIRPMA_ALFA = 8;

/**
 * "INOX" harflerini beyaza çevirir, "HAN" metalik kalır.
 *
 * Logoda harfler iki yatay cetvel arasında duruyor. Cetveller tüm genişliğe uzandığı için
 * "solu beyaz yap" demek onları ortadan ikiye bölerdi — bu yüzden önce cetvel satırları
 * ayıklanır, sonra harf bandındaki sütun boşluklarından (I·N·O·X·H·A·N → 6 boşluk)
 * X ile H arasındaki sınır ÖLÇÜLEREK bulunur. Alfa değişmez; kenar yumuşatma korunur.
 *
 * Buffer yerinde değiştirilir; dönen değer bulunan bölme noktasıdır.
 */
function inoxBeyazlat(rgba: Buffer, w: number, h: number): number {
  const opak = (x: number, y: number) => rgba[(y * w + x) * 4 + 3] > KIRPMA_ALFA;

  // 1) Yatay cetveller: genişliğin >%80'i opak olan satırlar
  const cetvel: boolean[] = [];
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) if (opak(x, y)) n++;
    cetvel[y] = n > w * 0.8;
  }
  let harfUst = 0;
  while (harfUst < h && cetvel[harfUst]) harfUst++;
  let harfAlt = h - 1;
  while (harfAlt > harfUst && cetvel[harfAlt]) harfAlt--;
  // Cetveller kenarlarda; aralarında kalan bant harflerin bandı
  for (let y = harfUst; y <= harfAlt; y++) {
    if (cetvel[y]) {
      if (y - harfUst < h / 2) harfUst = y + 1;
      else harfAlt = y - 1;
    }
  }

  // 2) Harf bandında sütun mürekkebi → boşluk blokları
  const dolu: boolean[] = [];
  for (let x = 0; x < w; x++) {
    let n = 0;
    for (let y = harfUst; y <= harfAlt; y++) if (opak(x, y)) n++;
    dolu[x] = n > 0;
  }
  // Kenar yumuşatmadan doğan 1–2 px'lik sahte boşluklar elenir; gerçek harf araları
  // bu logoda en dar 21 px (ölçüldü).
  const ENAZ_ARA = Math.max(6, Math.round(w * 0.006));
  const bosluklar: { bas: number; son: number }[] = [];
  let x = 0;
  while (x < w) {
    if (dolu[x]) {
      x++;
      continue;
    }
    const bas = x;
    while (x < w && !dolu[x]) x++;
    // Kenarlardaki boşluklar harf arası değil
    if (bas > 0 && x < w && x - bas >= ENAZ_ARA) bosluklar.push({ bas, son: x - 1 });
  }

  if (bosluklar.length !== 6) {
    throw new Error(
      `Harf araları beklenen 6 yerine ${bosluklar.length} bulundu ` +
        `(harf bandı y${harfUst}–${harfAlt}, boşluklar: ` +
        `${bosluklar.map((b) => `${b.bas}-${b.son}`).join(", ")}). ` +
        `Logo değiştiyse bu adım gözden geçirilmeli — yanlış yerden bölmemek için durduruldu.`,
    );
  }

  // 3) X ile H arasındaki 4. boşluğun ortası
  const ara = bosluklar[3];
  const bolme = Math.round((ara.bas + ara.son) / 2);

  // 4) Harf bandında solda kalan pikseller beyaz (alfa aynen)
  for (let y = harfUst; y <= harfAlt; y++) {
    for (let px = 0; px < bolme; px++) {
      const i = (y * w + px) * 4;
      if (rgba[i + 3] === 0) continue;
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
    }
  }
  return bolme;
}

async function main() {
  await mkdir(HEDEF_DIR, { recursive: true });

  const { data, info } = await sharp(KAYNAK)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = r * 0.299 + g * 0.587 + b * 0.114;

      let a = 255;
      if (luma >= LUMA_SAYDAM) a = 0;
      else if (luma > LUMA_OPAK) {
        a = Math.round(((LUMA_SAYDAM - luma) / (LUMA_SAYDAM - LUMA_OPAK)) * 255);
      }

      if (a === 0) {
        out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
        continue;
      }

      // Beyaza karşı unmultiply: Cs = (C - (1-a)·255) / a
      const af = a / 255;
      const geri = (c: number) => {
        const v = (c - (1 - af) * 255) / af;
        return Math.max(0, Math.min(255, Math.round(v)));
      };
      out[i] = geri(r);
      out[i + 1] = geri(g);
      out[i + 2] = geri(b);
      out[i + 3] = a;

      if (a >= KIRPMA_ALFA) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) throw new Error("Logoda içerik bulunamadı — eşik değerlerini kontrol edin.");

  const kutu = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  const kirpik = await sharp(out, { raw: { width, height, channels: 4 } })
    .extract(kutu)
    .raw()
    .toBuffer();

  const bolme = inoxBeyazlat(kirpik, kutu.width, kutu.height);
  const kirpilmis = sharp(kirpik, {
    raw: { width: kutu.width, height: kutu.height, channels: 4 },
  });

  await kirpilmis.clone().png({ compressionLevel: 9 }).toFile(path.join(HEDEF_DIR, "inoxhan-logo.png"));
  await kirpilmis.clone().webp({ quality: 95, alphaQuality: 100 }).toFile(path.join(HEDEF_DIR, "inoxhan-logo.webp"));
  await kirpilmis
    .clone()
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 95, alphaQuality: 100 })
    .toFile(path.join(HEDEF_DIR, "inoxhan-logo-sm.webp"));

  // Tek renk (steel-700) sürüm — YALNIZ beyaz zeminli teknik çizimlerin filigranı için.
  // Orijinal logonun "INOX" harfleri açık gümüş kontur; beyaz üstünde görünmez oluyor.
  // Site header/footer'ında orijinal renkli sürüm kullanılır.
  const mono = await kirpilmis
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data: d, info: n }) => {
      const buf = Buffer.alloc(d.length);
      for (let i = 0; i < d.length; i += 4) {
        buf[i] = 0x33; // steel-700 #333C46
        buf[i + 1] = 0x3c;
        buf[i + 2] = 0x46;
        buf[i + 3] = d[i + 3];
      }
      return sharp(buf, { raw: { width: n.width, height: n.height, channels: 4 } });
    });
  await mono.png({ compressionLevel: 9 }).toFile(path.join(HEDEF_DIR, "inoxhan-logo-mono.png"));

  console.log(
    `Logo hazır: ${width}×${height} → ${kutu.width}×${kutu.height} ` +
      `(kırpma x${x0}–${x1}, y${y0}–${y1}) · "INOX" beyaz, bölme x=${bolme} · ` +
      `public/media/brand/ [inoxhan-logo.png/.webp/-sm.webp + inoxhan-logo-mono.png]`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
