/**
 * 54 ürünün GERÇEK medyasından video montajlar.
 *
 *   npm run hazirla:showreel        → showreel'in üç klibi + katalog arka planı
 *   npm run hazirla:katalog-video   → YALNIZ katalog arka planı (showreel'e dokunmaz)
 *
 * İkinci mod önemli: showreel şu an kullanıcının Higgsfield'de ürettiği hazır kliplerle
 * çalışıyor (`hazirla:video`). Tam mod 01/02/03'ün üzerine yazar; katalog sayfasının
 * arka planını tazelemek için showreel'i feda etmek gerekmesin.
 *
 * Girdi (ikisi de opsiyonel değil ama biri eksikse diğerine düşülür):
 *   import/higgsfield/urun/{slug}.mp4   — ürünün Higgsfield image-to-video klibi
 *   public/media/products/{slug}-lg.webp — her zaman var, klip yoksa buna düşülür
 *
 * Çıktı: public/media/video/0{1,2,3}-*.{mp4,webm} + katalog-duvar.{mp4,webm} + posterler
 *
 * Klip yoksa hata vermez. Sıfır klible de çalışır (tamamı duran fotoğraftan) — böylece
 * 54 üretimi parça parça yapabilir, her aşamada sonucu görebilirsin.
 *
 * Neden metin prompt'uyla AI klip değil: "paslanmaz bağlantı elemanı" denince model
 * klişeyi çiziyor — cıvata ve somun. Katalogda kelebek somun, ay segman, gupilya, zincir,
 * gijon, çakma dübel var; üstelik dübellerin DIN normu bile yok. Gerçek fotoğraftan
 * başlayan image-to-video geometriyi uydurmuyor.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "../src/server/db";
import { urunleriGetir, type Urun } from "./lib/urun-listesi";
import { ffmpeg, GECICI_DIR, kodla } from "./lib/video";

const KLIP_DIR = path.join(process.cwd(), "import", "higgsfield", "urun");
const GECICI = path.join(GECICI_DIR, "showreel");

const FPS = 30;
const G = 1920;
const Y = 1080;

/** Izgara: 9×6 = 54 hücre. Hücre 430 içerik + 5 px kenar → 440 adım, aralar açık kalır. */
const SUTUN = 9;
const SATIR = 6;
const HUCRE = 430;
const ADIM = 440;
const DUVAR_G = SUTUN * ADIM; // 3960
const DUVAR_Y = SATIR * ADIM; // 2640

/**
 * Izgaranın altındaki boş bant. Yazı doğrudan ürünlerin üstüne binince en alt sıradaki
 * 9 ürün (kama, gupilya, segman, dübeller, gijon, zincir) karartmanın altında kayboluyordu —
 * "54 ürünün hepsi görünsün" şartı bozuluyor. Bant yazıya kendi yerini veriyor.
 */
const BANT = 280;

/** Tuval 16:9 (kamera oranı). Farklı olsaydı zoompan tam geri çekilince görüntüyü eziyordu. */
const TUVAL_Y = DUVAR_Y + BANT; // 2920
const TUVAL_G = Math.round((TUVAL_Y * 16) / 9) & ~1; // 5192

const KLIP_SN = 6;
const TOPLAM_KARE = KLIP_SN * FPS;

/** Klip 1 hızlanma rampası (kare cinsinden). 2 kare = 1/15 sn, algılanabilir alt sınır. */
const RAMPA_BAS = 6;
const RAMPA_SON = 2;

interface Kaynak {
  urun: Urun;
  /** Klip varsa yolu, yoksa null — o üründe duran fotoğrafa düşülür. */
  video: string | null;
  /** Izgara kutusu: KARE, kullanılan medyanın koordinatında. Hücreler eşit → ölçek de eşit. */
  kutu: { left: number; top: number; boyut: number };
  /** Doğal oranlı kutu, kullanılan medyanın koordinatında — klip 3 kuyruğu tam kadraj. */
  dogal: { left: number; top: number; width: number; height: number };
  /** Izgara hücresi olarak kullanılacak 470×470 PNG (yalnız videosuz ürünlerde). */
  hucrePng: string | null;
  /** Tam kadraj kart görseli (klip 1) — her üründe üretilir. */
  kartPng: string;
}

// ── Yardımcılar ────────────────────────────────────────────────────────────────

/** ffmpeg ile ilk kareyi PNG'ye alır; hem boyut hem içerik kutusu ölçümü buradan çıkar. */
async function ilkKare(video: string, hedef: string) {
  await ffmpeg(["-i", video, "-frames:v", "1", hedef]);
  return readFile(hedef);
}

/**
 * Siyah zemini kırparak içerik kutusunu bulur ve %15 paylandırır.
 *
 * Neden gerekli: fotoğraflarda ölçek çok değişken — zincir kareyi dolduruyor, ay segman
 * ortada minik duruyor, ikisi de 1254×1254. Ham hâlde ızgaraya dizilince dağınık görünür.
 *
 * Pay AI klibi için: nesne kadrajda hafif hareket edebilir, kutudan taşmasın.
 *
 * İKİ kutu döner:
 *   `dogal` — içeriğin kendi oranı. Tam kadraj kartta kullanılır; uzun bir cıvata kareye
 *             sığdırılınca ekranın ortasında ince bir çizgi gibi kalıyordu.
 *   `kare`  — ızgara hücresi için. Hücreler eşit olduğundan ölçek de eşitlenmeli.
 */
async function icerikKutusu(buf: Buffer) {
  const meta = await sharp(buf).metadata();
  const G0 = meta.width ?? 0;
  const Y0 = meta.height ?? 0;

  let l = 0;
  let t = 0;
  let w = G0;
  let h = Y0;
  try {
    // Varsayılan `background` sol üst pikseli alıyor — bu fotoğraflarda saf siyah, tam isabet.
    const { info } = await sharp(buf).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
    if (info.width > 8 && info.height > 8) {
      l = -(info.trimOffsetLeft ?? 0);
      t = -(info.trimOffsetTop ?? 0);
      w = info.width;
      h = info.height;
    }
  } catch {
    // Tamamen düz bir kare gelirse sharp kırpamıyor; tam kadraj kullanılır.
  }

  const PAY = 1.15;
  const cx = l + w / 2;
  const cy = t + h / 2;

  /** Merkezi koruyarak verilen ölçüyü kaynak sınırlarına oturtur. ffmpeg crop çift sayı ister. */
  const otur = (gen: number, yuk: number) => {
    const gg = Math.max(2, Math.min(G0, Math.round(gen)) & ~1);
    const yy = Math.max(2, Math.min(Y0, Math.round(yuk)) & ~1);
    return {
      left: Math.max(0, Math.min(G0 - gg, Math.round(cx - gg / 2))),
      top: Math.max(0, Math.min(Y0 - yy, Math.round(cy - yy / 2))),
      width: gg,
      height: yy,
    };
  };

  const kenar = Math.max(w, h) * PAY;
  const karesel = otur(kenar, kenar);

  return {
    dogal: otur(w * PAY, h * PAY),
    kare: { left: karesel.left, top: karesel.top, boyut: Math.min(karesel.width, karesel.height) },
  };
}

/** SVG metin katmanı → PNG. hazirla-og.ts'de doğrulanmış yöntem; ffmpeg drawtext font dosyası ister. */
async function metinPng(
  hedef: string,
  genislik: number,
  yukseklik: number,
  icerik: string,
) {
  await sharp(Buffer.from(`<svg width="${genislik}" height="${yukseklik}" xmlns="http://www.w3.org/2000/svg">${icerik}</svg>`))
    .png()
    .toFile(hedef);
}

const kacis = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Sol alt köşe karartması — yazının oturduğu yer.
 *
 * Tam genişlik bir alt bant, ızgarada en sağdaki ürünleri de karartıyordu. Gradyan
 * çapraz: sol altta koyu, sağa ve yukarı doğru tamamen açılıyor. Böylece yalnız
 * yazının arkası kararıyor, kadrajın geri kalanındaki ürünler olduğu gibi kalıyor.
 */
const SCRIM = (yukseklik = 280) =>
  `<defs><linearGradient id="s" gradientUnits="objectBoundingBox" x1="0" y1="1" x2="0.78" y2="0">
     <stop offset="0" stop-color="#000000" stop-opacity="0.95"/>
     <stop offset="0.45" stop-color="#000000" stop-opacity="0.6"/>
     <stop offset="1" stop-color="#000000" stop-opacity="0"/>
   </linearGradient></defs>
   <rect x="0" y="${Y - yukseklik}" width="${G}" height="${yukseklik}" fill="url(#s)"/>`;

// ── 1. Kaynak hazırlığı ────────────────────────────────────────────────────────

async function kaynakHazirla(u: Urun, i: number, toplam: number): Promise<Kaynak | null> {
  if (!existsSync(u.fotograf)) {
    console.warn(`  ! ${u.slug}: fotoğraf yok, ürün atlandı`);
    return null;
  }

  const video = existsSync(path.join(KLIP_DIR, `${u.slug}.mp4`))
    ? path.join(KLIP_DIR, `${u.slug}.mp4`)
    : null;

  // Kutu, kullanılacak medyanın KENDİ ilk karesinden ölçülür. Higgsfield çıktısının
  // çözünürlüğü/oranı kaynaktan farklı olabiliyor; fotoğraftan ölçülen kutu videoya
  // birebir oturmayabilir.
  const olcumBuf = video
    ? await ilkKare(video, path.join(GECICI, `kare-${u.slug}.png`))
    : await readFile(u.fotograf);
  const { kare: kutu, dogal } = await icerikKutusu(olcumBuf);
  // Kart her zaman duran fotoğraftan üretiliyor; kutusu da fotoğraftan ölçülmeli
  const kartKutu = video ? (await icerikKutusu(await readFile(u.fotograf))).dogal : dogal;

  // Izgara hücresi: videosuz üründe PNG olarak hazırlanır (ffmpeg'e resim girdisi olur).
  let hucrePng: string | null = null;
  if (!video) {
    hucrePng = path.join(GECICI, `hucre-${u.slug}.png`);
    await sharp(u.fotograf)
      .extract({ left: kutu.left, top: kutu.top, width: kutu.boyut, height: kutu.boyut })
      .resize(HUCRE, HUCRE)
      .png()
      .toFile(hucrePng);
  }

  // Klip 1 kartı: ürün ortada, sol altta norm kodu. Kart görsellerinde HER ZAMAN duran
  // fotoğraf kullanılır — 2-6 karelik kesmede hareket zaten algılanmıyor, video açmak
  // sadece maliyet olurdu.
  const kartPng = path.join(GECICI, `kart-${u.slug}.png`);
  // Doğal oranıyla, kadrajın içine SIĞDIRILARAK: uzun cıvata genişliği doldurur,
  // küçük bir segman yüksekliği. İkisi de kadrajda dolgun durur.
  const ALAN_G = Math.round(G * 0.74);
  const ALAN_Y = Math.round(Y * 0.7);
  const gorsel = await sharp(u.fotograf)
    .extract(kartKutu)
    .resize({ width: ALAN_G, height: ALAN_Y, fit: "inside" })
    .toBuffer();
  const gm = await sharp(gorsel).metadata();

  const etiketKatmani = Buffer.from(
    `<svg width="${G}" height="${Y}" xmlns="http://www.w3.org/2000/svg">
       ${SCRIM(240)}
       <rect x="96" y="${Y - 150}" width="56" height="3" fill="#E8B54A"/>
       <text x="96" y="${Y - 96}" font-family="Consolas, 'Courier New', monospace"
             font-size="42" font-weight="700" fill="#F5F7F8"
             letter-spacing="3">${kacis(u.etiket)}</text>
       <text x="${G - 96}" y="${Y - 96}" text-anchor="end"
             font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif"
             font-size="26" fill="#6E7B88">${kacis(u.kategori)}</text>
     </svg>`,
  );

  await sharp({ create: { width: G, height: Y, channels: 3, background: "#000000" } })
    .composite([
      {
        input: gorsel,
        left: Math.round((G - (gm.width ?? 0)) / 2),
        top: Math.round((Y - (gm.height ?? 0)) / 2),
      },
      { input: etiketKatmani, left: 0, top: 0 },
    ])
    .png()
    .toFile(kartPng);

  if ((i + 1) % 10 === 0 || i + 1 === toplam) console.log(`  ${i + 1}/${toplam} ürün hazır`);
  return { urun: u, video, kutu, dogal, hucrePng, kartPng };
}

// ── 2. Klip 1 — hız ────────────────────────────────────────────────────────────

/**
 * 54 ürün arka arkaya, hızlanarak. Süreler üstel azalıyor (doğrusal rampa mekanik duruyor),
 * her segment tam kare sayısına yuvarlanıyor — concat demuxer kesirli süreyle titriyor.
 */
function rampa(adet: number): number[] {
  if (adet <= 1) return [RAMPA_BAS];
  const oran = (RAMPA_SON / RAMPA_BAS) ** (1 / (adet - 1));
  return Array.from({ length: adet }, (_, i) =>
    Math.max(RAMPA_SON, Math.round(RAMPA_BAS * oran ** i)),
  );
}

async function klip1(kaynaklar: Kaynak[], hedef: string) {
  const kareler = rampa(kaynaklar.length);
  const toplamSn = kareler.reduce((a, b) => a + b, 0) / FPS;

  const satirlar: string[] = [];
  kaynaklar.forEach((k, i) => {
    satirlar.push(`file '${k.kartPng.replace(/\\/g, "/")}'`);
    satirlar.push(`duration ${(kareler[i] / FPS).toFixed(4)}`);
  });
  // concat demuxer son dosyayı süresiz sayıyor; tekrar yazılmazsa son kare düşüyor.
  satirlar.push(`file '${kaynaklar[kaynaklar.length - 1].kartPng.replace(/\\/g, "/")}'`);

  const liste = path.join(GECICI, "klip1.txt");
  await writeFile(liste, satirlar.join("\n"), "utf8");

  await ffmpeg([
    "-f", "concat", "-safe", "0", "-i", liste,
    // `-r` tek başına sabit kare hızı veriyor; `-vsync vfr` ile birlikte verilirse
    // ffmpeg 6 "contradictory" deyip düşüyor. Süreler `duration` satırlarından geliyor.
    "-r", String(FPS),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
    "-an",
    hedef,
  ]);
  console.log(`  klip 1: ${kaynaklar.length} kesme, ${toplamSn.toFixed(1)} sn`);
  return toplamSn;
}

// ── 3. Duvar (klip 2 ve 3'ün kaynağı) ──────────────────────────────────────────

/**
 * 9×6 duvarı kademeli kurar: önce 6 satır (9'ar girdi), sonra satırlar üst üste.
 * Tek seferde 54 girdiyi filtre grafiğine vermek ffmpeg'i zorluyor; bu hâliyle her adım
 * küçük ve hata verirse hangi satırda olduğu belli.
 */
async function duvarKur(kaynaklar: Kaynak[], hedef: string) {
  const satirDosyalari: string[] = [];

  for (let s = 0; s < SATIR; s++) {
    const dilim = kaynaklar.slice(s * SUTUN, (s + 1) * SUTUN);
    const girdiler: string[] = [];
    const filtreler: string[] = [];

    for (const [i, k] of dilim.entries()) {
      if (k.video) {
        // Kısa klip 6 sn'yi doldurmuyorsa başa sarılır
        girdiler.push("-stream_loop", "-1", "-i", k.video);
        filtreler.push(
          `[${i}:v]crop=${k.kutu.boyut}:${k.kutu.boyut}:${k.kutu.left}:${k.kutu.top},` +
            `scale=${HUCRE}:${HUCRE},fps=${FPS},setsar=1,` +
            `pad=${ADIM}:${ADIM}:${(ADIM - HUCRE) / 2}:${(ADIM - HUCRE) / 2}:black[c${i}]`,
        );
      } else {
        girdiler.push("-loop", "1", "-i", k.hucrePng!);
        filtreler.push(
          `[${i}:v]scale=${HUCRE}:${HUCRE},fps=${FPS},setsar=1,` +
            `pad=${ADIM}:${ADIM}:${(ADIM - HUCRE) / 2}:${(ADIM - HUCRE) / 2}:black[c${i}]`,
        );
      }
    }

    // Satır eksik kalırsa (54'ten az ürün) boş hücrelerle tamamlanır
    const etiketler = dilim.map((_, i) => `[c${i}]`).join("");
    const filtre =
      dilim.length === 1
        ? `${filtreler.join(";")};[c0]null[v]`
        : `${filtreler.join(";")};${etiketler}hstack=inputs=${dilim.length}[v]`;

    const satirYolu = path.join(GECICI, `satir-${s}.mp4`);
    await ffmpeg([
      ...girdiler,
      "-filter_complex", filtre,
      "-map", "[v]",
      "-t", String(KLIP_SN),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
      "-an",
      satirYolu,
    ]);
    satirDosyalari.push(satirYolu);
    console.log(`  duvar satırı ${s + 1}/${SATIR}`);
  }

  const girdiler = satirDosyalari.flatMap((y) => ["-i", y]);
  const etiketler = satirDosyalari.map((_, i) => `[${i}:v]`).join("");
  // Izgara üste yaslanır; altta kalan BANT yüksekliğindeki siyah şerit yazının yeri
  const yan = Math.round((TUVAL_G - DUVAR_G) / 2);
  await ffmpeg([
    ...girdiler,
    "-filter_complex",
    `${etiketler}vstack=inputs=${satirDosyalari.length}[g];` +
      `[g]pad=${TUVAL_G}:${TUVAL_Y}:${yan}:0:black[v]`,
    "-map", "[v]",
    "-t", String(KLIP_SN),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
    "-an",
    hedef,
  ]);
  console.log(`  duvar hazır: ${TUVAL_G}×${TUVAL_Y} (ızgara ${DUVAR_G}×${DUVAR_Y} + ${BANT} px bant)`);
}

// ── 4. Klip 2 — kapsam ─────────────────────────────────────────────────────────

/**
 * Kamera duvarda çapraz süzülüp geri çekiliyor; sonda 54'ün tamamı tek karede.
 *
 * `zoompan` kullanılıyor çünkü `crop` çıktı boyutunu başlangıçta sabitliyor, kare kare
 * değişen zoom'u ifade edemiyor. Son karede zoom=1 → x,y ifadeleri kendiliğinden 0'a
 * iniyor, yani kadraj tam duvara oturuyor.
 */
async function klip2(duvar: string, hedef: string) {
  const son = TOPLAM_KARE - 1;
  const p = `(on/${son})`;
  const z = `2.6-1.6*${p}`;

  const seritYolu = path.join(GECICI, "serit2.png");
  await metinPng(
    seritYolu,
    G,
    Y,
    `${SCRIM(300)}
     <rect x="96" y="${Y - 150}" width="56" height="3" fill="#E8B54A"/>
     <text x="96" y="${Y - 96}" font-family="Consolas, 'Courier New', monospace"
           font-size="34" font-weight="700" fill="#F5F7F8" letter-spacing="4">8 KATEGORİ · DIN &amp; ISO · A2 / A4</text>`,
  );

  await ffmpeg([
    "-i", duvar,
    "-i", seritYolu,
    "-filter_complex",
    `[0:v]zoompan=z='${z}':x='(iw-iw/zoom)*(0.14+0.72*${p})':y='(ih-ih/zoom)*(0.14+0.72*${p})':` +
      `d=1:s=${G}x${Y}:fps=${FPS}[bg];[bg][1:v]overlay=0:0[v]`,
    "-map", "[v]",
    "-t", String(KLIP_SN),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
    "-an",
    hedef,
  ]);
  console.log("  klip 2 hazır");
}

// ── 5. Klip 3 — karar ──────────────────────────────────────────────────────────

/** Duvardan tek ürüne dalış, sonra o ürün tam kadrajda büyük koduyla. */
async function klip3(duvar: string, kaynaklar: Kaynak[], hedef: string) {
  // Hedef: mümkünse gerçek klibi olan bir ürün; yoksa ilk ürün.
  const hedefIndex = Math.max(0, kaynaklar.findIndex((k) => k.video));
  const k = kaynaklar[hedefIndex];

  // Hücrenin tuval üzerindeki merkezi (0-1). Izgara üste yaslı, yanlarda pay var.
  const sut = hedefIndex % SUTUN;
  const sat = Math.floor(hedefIndex / SUTUN);
  const yan = (TUVAL_G - DUVAR_G) / 2;
  const mx = (yan + sut * ADIM + ADIM / 2) / TUVAL_G;
  const my = (sat * ADIM + ADIM / 2) / TUVAL_Y;

  const DALIS_KARE = Math.round(2.4 * FPS);
  const son = DALIS_KARE - 1;
  // Kübik ivme: dalış sonda hızlanıyor, sabit hız mekanik duruyor
  const p = `pow(on/${son}\\,3)`;
  const dalis = path.join(GECICI, "dalis.mp4");
  await ffmpeg([
    "-i", duvar,
    "-filter_complex",
    `[0:v]zoompan=z='1+8.5*${p}':x='(iw-iw/zoom)*${mx.toFixed(4)}':y='(ih-ih/zoom)*${my.toFixed(4)}':` +
      `d=1:s=${G}x${Y}:fps=${FPS}[v]`,
    "-map", "[v]",
    "-t", (DALIS_KARE / FPS).toFixed(3),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
    "-an",
    dalis,
  ]);

  // Kuyruk: ürün tam kadrajda, kod büyük
  const buyukEtiket = path.join(GECICI, "etiket3.png");
  await metinPng(
    buyukEtiket,
    G,
    Y,
    `${SCRIM(340)}
     <rect x="96" y="${Y - 190}" width="80" height="4" fill="#E8B54A"/>
     <text x="96" y="${Y - 110}" font-family="Consolas, 'Courier New', monospace"
           font-size="64" font-weight="700" fill="#F5F7F8" letter-spacing="4">${kacis(k.urun.etiket)}</text>
     <text x="96" y="${Y - 62}" font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif"
           font-size="28" fill="#8B97A3">${kacis(k.urun.ad.replace(/^INOX\s+/i, ""))}</text>`,
  );

  const KUYRUK_SN = KLIP_SN - DALIS_KARE / FPS;
  const kuyruk = path.join(GECICI, "kuyruk.mp4");
  // Doğal oranıyla sığdırılır — kare kutu uzun ürünlerde kadrajı boş bırakıyor
  const ALAN_G = Math.round(G * 0.78);
  const ALAN_Y = Math.round(Y * 0.74);
  if (k.video) {
    // ffmpeg `force_original_aspect_ratio=decrease` = sharp'ın fit:"inside" karşılığı
    await ffmpeg([
      "-stream_loop", "-1", "-i", k.video,
      "-i", buyukEtiket,
      "-filter_complex",
      `[0:v]crop=${k.dogal.width}:${k.dogal.height}:${k.dogal.left}:${k.dogal.top},` +
        `scale=${ALAN_G}:${ALAN_Y}:force_original_aspect_ratio=decrease,fps=${FPS},setsar=1,` +
        `pad=${G}:${Y}:(ow-iw)/2:(oh-ih)/2:black[p];` +
        `[p][1:v]overlay=0:0[v]`,
      "-map", "[v]",
      "-t", KUYRUK_SN.toFixed(3),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
      "-an",
      kuyruk,
    ]);
  } else {
    const durgun = path.join(GECICI, "kuyruk.png");
    const gorsel = await sharp(k.urun.fotograf)
      .extract(k.dogal)
      .resize({ width: ALAN_G, height: ALAN_Y, fit: "inside" })
      .toBuffer();
    const gm = await sharp(gorsel).metadata();
    await sharp({ create: { width: G, height: Y, channels: 3, background: "#000000" } })
      .composite([
        {
          input: gorsel,
          left: Math.round((G - (gm.width ?? 0)) / 2),
          top: Math.round((Y - (gm.height ?? 0)) / 2),
        },
        { input: await readFile(buyukEtiket), left: 0, top: 0 },
      ])
      .png()
      .toFile(durgun);
    // Yavaş yaklaşma — tamamen donuk kare kliple aynı bölümde göze batıyor
    await ffmpeg([
      "-loop", "1", "-i", durgun,
      "-filter_complex",
      `[0:v]zoompan=z='1+0.07*(on/${Math.round(KUYRUK_SN * FPS) - 1})':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':` +
        `d=1:s=${G}x${Y}:fps=${FPS}[v]`,
      "-map", "[v]",
      "-t", KUYRUK_SN.toFixed(3),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
      "-an",
      kuyruk,
    ]);
  }

  const liste = path.join(GECICI, "klip3.txt");
  await writeFile(
    liste,
    [dalis, kuyruk].map((y) => `file '${y.replace(/\\/g, "/")}'`).join("\n"),
    "utf8",
  );
  await ffmpeg([
    "-f", "concat", "-safe", "0", "-i", liste,
    "-c", "copy",
    hedef,
  ]);
  console.log(`  klip 3 hazır (hedef ürün: ${k.urun.etiket}${k.video ? ", klipli" : ", duran"})`);
}

// ── Katalog arka planı ─────────────────────────────────────────────────────────

/**
 * Katalog sayfasının arka plan videosu: duvar üstünde yazısız, yavaş çapraz süzülme.
 *
 * Üstüne sayfa başlığı ve butonlar binecek — bu yüzden metin katmanı YOK ve hareket
 * showreel'dekinden belirgin şekilde yavaş. Kodlamada ping-pong açılır: süzülme yönlü
 * ama bu hızda geri dönüş "geriye tarama" gibi okunuyor, döngü dikişi görünmüyor.
 */
async function katalogKlip(duvar: string, hedef: string) {
  const son = TOPLAM_KARE - 1;
  const p = `(on/${son})`;
  // y üst sınırı 0.55: pencere alt kenarı duvarın %81'ini geçmez, alttaki boş
  // yazı bandı (BANT) hiç kadraja girmez.
  await ffmpeg([
    "-i", duvar,
    "-filter_complex",
    `[0:v]zoompan=z='1.7':x='(iw-iw/zoom)*(0.08+0.77*${p})':y='(ih-ih/zoom)*(0.12+0.43*${p})':` +
      `d=1:s=${G}x${Y}:fps=${FPS}[v]`,
    "-map", "[v]",
    "-t", String(KLIP_SN),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
    "-an",
    hedef,
  ]);
  console.log("  katalog arka planı hazır");
}

// ── Akış ───────────────────────────────────────────────────────────────────────

async function main() {
  const yalnizKatalog = process.argv.includes("--katalog");
  await rm(GECICI, { recursive: true, force: true });
  await mkdir(GECICI, { recursive: true });

  const urunler = await urunleriGetir();
  if (urunler.length === 0) {
    console.error("Ürün bulunamadı — önce npm run import:urunler");
    process.exit(1);
  }

  const klipli = urunler.filter((u) => existsSync(path.join(KLIP_DIR, `${u.slug}.mp4`))).length;
  console.log(
    `${urunler.length} ürün · ${klipli} klip bulundu · ${urunler.length - klipli} üründe duran fotoğraf kullanılacak`,
  );
  if (klipli === 0) {
    console.log("(Hiç klip yok — üçü de duran fotoğraftan üretilecek. npm run hazirla:yukleme)");
  }

  console.log("\nKaynaklar hazırlanıyor…");
  const kaynaklar: Kaynak[] = [];
  for (const [i, u] of urunler.entries()) {
    const k = await kaynakHazirla(u, i, urunler.length);
    if (k) kaynaklar.push(k);
  }
  if (kaynaklar.length === 0) throw new Error("Kullanılabilir ürün medyası bulunamadı.");

  // Izgara 54 hücre; ürün sayısı farklıysa baştan doldurulur, artan hücre olmaz
  const izgara = kaynaklar.slice(0, SUTUN * SATIR);

  console.log("\nDuvar kuruluyor…");
  const duvar = path.join(GECICI, "duvar.mp4");
  await duvarKur(izgara, duvar);

  console.log("\nKlipler montajlanıyor…");
  const hamKatalog = path.join(GECICI, "ham-katalog.mp4");
  await katalogKlip(duvar, hamKatalog);

  if (!yalnizKatalog) {
    const ham1 = path.join(GECICI, "ham-01.mp4");
    const ham2 = path.join(GECICI, "ham-02.mp4");
    const ham3 = path.join(GECICI, "ham-03.mp4");
    await klip1(kaynaklar, ham1);
    await klip2(duvar, ham2);
    await klip3(duvar, izgara, ham3);

    console.log("\nWeb kodlaması…");
    for (const [ham, ad] of [
      [ham1, "01-hizli"],
      [ham2, "02-kapsam"],
      [ham3, "03-teklif"],
    ] as const) {
      // pingPong yok: üç klip de yönlü hareket içeriyor, geri sarılınca ucuz duruyor
      await kodla(ham, ad, { oran: 16 / 9, sinirMB: 2, crf: 27 });
    }
  } else {
    console.log("\nWeb kodlaması…");
  }

  // Arka plan döngüsü: ping-pong ile 6 sn → 12 sn dikişsiz
  await kodla(hamKatalog, "katalog-duvar", { oran: 16 / 9, pingPong: true, sinirMB: 2.5, crf: 27 });

  await rm(GECICI, { recursive: true, force: true });
  console.log(
    yalnizKatalog
      ? "\nKatalog arka planı hazır → public/media/video/katalog-duvar.*"
      : "\nShowreel + katalog arka planı hazır → public/media/video/",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
