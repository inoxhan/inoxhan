/**
 * Video script'lerinin paylaştığı ffmpeg sarmalayıcısı ve web kodlaması.
 *
 * Sistemde ffmpeg kurulu olmasına gerek yok — binary `ffmpeg-static` ile geliyor.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { IMAGE_VARIANTS, processVideoPoster } from "../../src/server/media";

const calistir = promisify(execFile);

export const CIKTI_DIR = path.join(process.cwd(), "public", "media", "video");
export const GECICI_DIR = path.join(process.cwd(), "import", ".gecici");

export const mb = (bayt: number) => (bayt / 1024 / 1024).toFixed(2);

export async function ffmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error("ffmpeg-static binary bulunamadı — npm install çalıştır.");
  await calistir(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    maxBuffer: 1024 * 1024 * 32,
  });
}

/**
 * ffmpeg kırpma ifadesi. `min(iw,ih*oran)` biçimi kaynak beklenenden dar geldiğinde de
 * geçerli kalıyor — sabit piksel verilseydi ffmpeg "crop area out of bounds" ile düşerdi.
 */
export const kirpFiltresi = (oran: number) =>
  `crop=min(iw\\,ih*${oran}):min(ih\\,iw/${oran})`;

/** yuv420p çift sayı ister; tek piksellik kırpma artığı encoder'ı düşürüyor. */
export const CIFTLE = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

export interface KodlamaSecenekleri {
  /** Kırpılacak en-boy oranı. null → kaynağın oranı korunur. */
  oran?: number | null;
  /**
   * Klibi ters kopyasıyla birleştirip dikişsiz döngü yapar. Higgsfield kusursuz döngü
   * vermiyor, hero videosu ise `loop` ile sürekli dönüyor — dikiş her turda göze çarpar.
   * Yönlü hareket içeren kliplerde KAPALI olmalı: geri sarılınca ucuz duruyor.
   */
  pingPong?: boolean;
  /** Uyarı eşiği (MB). Aşılırsa uyarı basılır, dosya yine de yazılır. */
  sinirMB?: number;
  posterVariants?: readonly { suffix: string; width: number }[];
  /** false → poster üretilmez (ara dosyalar için). */
  poster?: boolean;
  /**
   * H.264 CRF (VP9 karşılığı +11 olarak türetilir). Varsayılan 23 hero için ölçüldü.
   * Detay yoğun kareler (54 hücrelik ürün duvarı) 23'te 3+ MB'a çıkıyor; 27'de görünür
   * kayıp olmadan yarıya iniyor — showreel katlamanın altında ve tam ekran basılmıyor.
   */
  crf?: number;
}

export interface KodlamaSonucu {
  mp4Boyut: number;
  webmBoyut: number;
  webmVar: boolean;
  uyari: boolean;
}

/**
 * Kaynağı web'e hazır hâle getirir: H.264 MP4 + VP9 WebM + poster karesi.
 * Ses izi HER ZAMAN atılır (-an) — arka planda otomatik oynayan videonun sesi olamaz.
 */
export async function kodla(
  kaynak: string,
  ad: string,
  {
    oran = null,
    pingPong = false,
    sinirMB = 2,
    posterVariants = IMAGE_VARIANTS,
    poster = true,
    crf = 23,
  }: KodlamaSecenekleri = {},
): Promise<KodlamaSonucu> {
  await mkdir(CIKTI_DIR, { recursive: true });

  const parcalar = [...(oran !== null ? [kirpFiltresi(oran)] : []), CIFTLE];
  const on = parcalar.join(",");
  // pingPong filter_complex kullanıyor; -vf ile aynı anda verilemiyor
  const vf = pingPong
    ? ["-filter_complex", `[0:v]${on},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]`, "-map", "[v]"]
    : ["-vf", on];

  const mp4 = path.join(CIKTI_DIR, `${ad}.mp4`);
  await ffmpeg([
    "-i", kaynak,
    ...vf,
    "-c:v", "libx264",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-crf", String(crf),
    "-preset", "slow",
    "-movflags", "+faststart", // metadata başa alınır, tarayıcı tamamını beklemeden oynatır
    "-an",
    mp4,
  ]);

  const webm = path.join(CIKTI_DIR, `${ad}.webm`);
  let webmVar = true;
  let uyari = false;
  try {
    await ffmpeg([
      "-i", kaynak,
      ...vf,
      "-c:v", "libvpx-vp9",
      "-crf", String(crf + 11), // VP9 ölçeği x264'ten kabaca 11 kademe yukarıda

      "-b:v", "0", // sabit kalite modu; b:v verilmezse VP9 çok düşük bitrate seçiyor
      "-row-mt", "1",
      "-an",
      webm,
    ]);
  } catch {
    // WebM olmadan da site çalışır, MP4 her tarayıcıda oynar — hattı düşürmeye değmez.
    console.warn(`  ! ${ad}: WebM üretilemedi, yalnız MP4 kullanılacak`);
    webmVar = false;
    uyari = true;
  }

  if (poster) {
    // Kırpma filtresi burada da uygulanır ki poster ile videonun kadrajı birebir aynı
    // olsun — yoksa video başlarken görüntü zıplıyor.
    await mkdir(GECICI_DIR, { recursive: true });
    const kare = path.join(GECICI_DIR, `${ad}-kare.png`);
    await ffmpeg([
      "-i", kaynak,
      ...(oran !== null ? ["-vf", kirpFiltresi(oran)] : []),
      "-frames:v", "1",
      kare,
    ]);
    await processVideoPoster(await readFile(kare), `${ad}-poster`, posterVariants);
    await unlink(kare);
  }

  const mp4Boyut = (await stat(mp4)).size;
  const webmBoyut = webmVar ? (await stat(webm)).size : 0;
  const enBuyuk = Math.max(mp4Boyut, webmBoyut);

  console.log(`  ✓ ${ad}  mp4 ${mb(mp4Boyut)} MB` + (webmVar ? `  webm ${mb(webmBoyut)} MB` : ""));
  if (enBuyuk > sinirMB * 1024 * 1024) {
    console.warn(
      `  ! ${ad}: ${mb(enBuyuk)} MB, hedef ${sinirMB} MB altı — ` +
        "süreyi kısaltmayı ya da çözünürlüğü düşürmeyi dene.",
    );
    uyari = true;
  }

  return { mp4Boyut, webmBoyut, webmVar, uyari };
}
