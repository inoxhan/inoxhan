import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Ürün görseli işleme — TEK sözleşme: `{basePath}-{sm|md|lg}.{avif|webp}`.
 * Seed, panel CRUD ve Faz 5 içe aktarma hattı aynı fonksiyonu kullanır.
 */
export const IMAGE_VARIANTS = [
  // xs: liste/sepet küçük görselleri (40-56 px kutu, 2-3× DPR). 480 px'lik "sm"i
  // 56 px'e sıkıştırmak teklif sayfasında yarım MB gereksiz indirme demekti.
  { suffix: "xs", width: 160 },
  { suffix: "sm", width: 480 },
  { suffix: "md", width: 960 },
  { suffix: "lg", width: 1600 },
] as const;

const PRODUCTS_DIR = path.join(process.cwd(), "public", "media", "products");
const TECHNICAL_DIR = path.join(process.cwd(), "public", "media", "technical");
const HERO_DIR = path.join(process.cwd(), "public", "media", "hero");
const PAGE_DIR = path.join(process.cwd(), "public", "media", "sayfa");
const VIDEO_DIR = path.join(process.cwd(), "public", "media", "video");
const CATEGORY_DIR = path.join(process.cwd(), "public", "media", "kategori");

/** Hero tam ekran arka planı — ürün türevlerinden (480/960/1600) belirgin şekilde büyük. */
export const HERO_VARIANTS = [
  { suffix: "md", width: 1280 },
  { suffix: "lg", width: 1920 },
  { suffix: "xl", width: 2560 },
] as const;

/**
 * Hero'nun mobil dikey karşılığı (2:3).
 *
 * Yatay hero görseli dar ekranda `object-cover` ile ortadan kırpılıyor; kompozisyon
 * gereği sağa yaslanmış özne kadraj dışında kalıyordu. Dikey türev ayrı çekim/üretim
 * ister, ölçek de farklı: 1440 px, 3× DPR'de 480 px CSS genişliğini karşılıyor.
 */
export const HERO_PORTRAIT_VARIANTS = [
  { suffix: "sm", width: 720 },
  { suffix: "md", width: 1080 },
  { suffix: "lg", width: 1440 },
] as const;

export async function processProductImage(
  buf: Buffer,
  baseName: string,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(PRODUCTS_DIR, { recursive: true });
  const src = sharp(buf).rotate();
  const meta = await src.metadata();

  for (const v of IMAGE_VARIANTS) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 55 })
      .toFile(path.join(PRODUCTS_DIR, `${baseName}-${v.suffix}.avif`));
    await resized
      .clone()
      .webp({ quality: 78 })
      .toFile(path.join(PRODUCTS_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/products/${baseName}`,
    width: meta.width ?? 1600,
    height: meta.height ?? 1200,
  };
}

/**
 * Hero arka plan görseli — tam ekran basıldığı için `HERO_VARIANTS` genişliklerinde üretilir.
 * Metin okunabilirliğini HeroSlider'daki gradyan katmanı sağlar; burada yalnız boyut/format işi.
 */
export async function processHeroImage(
  buf: Buffer,
  baseName: string,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(HERO_DIR, { recursive: true });
  const src = sharp(buf);
  const meta = await src.metadata();

  for (const v of HERO_VARIANTS) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized.clone().avif({ quality: 58 }).toFile(path.join(HERO_DIR, `${baseName}-${v.suffix}.avif`));
    await resized.clone().webp({ quality: 80 }).toFile(path.join(HERO_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/hero/${baseName}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

/**
 * Hero'nun mobil dikey türevi. Kalite ayarları yatay hero ile aynı tutuldu —
 * aynı sahnenin iki kadrajı, birinde daha yumuşak bir sıkıştırma göze çarpardı.
 */
export async function processHeroPortrait(
  buf: Buffer,
  baseName: string,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(HERO_DIR, { recursive: true });
  const src = sharp(buf);
  const meta = await src.metadata();

  for (const v of HERO_PORTRAIT_VARIANTS) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized.clone().avif({ quality: 58 }).toFile(path.join(HERO_DIR, `${baseName}-${v.suffix}.avif`));
    await resized.clone().webp({ quality: 80 }).toFile(path.join(HERO_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/hero/${baseName}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

/**
 * İçerik sayfası görseli (hakkımızda, iletişim). Ayrı klasöre yazılır:
 * `public/media/products` altındakiler `ProductImage` satırlarıyla birebir eşleşiyor,
 * araya dekoratif dosya karışırsa içe aktarma raporları yanıltıcı oluyor.
 *
 * `variants` varsayılanı bölüm içi görseller içindir (en fazla yarım ekran genişliğinde
 * basılıyorlar). Tam genişlik basılan bantlar için `HERO_VARIANTS` geçilir.
 */
export async function processPageImage(
  buf: Buffer,
  baseName: string,
  variants: readonly { suffix: string; width: number }[] = IMAGE_VARIANTS,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(PAGE_DIR, { recursive: true });
  const src = sharp(buf).rotate();
  const meta = await src.metadata();

  for (const v of variants) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized.clone().avif({ quality: 55 }).toFile(path.join(PAGE_DIR, `${baseName}-${v.suffix}.avif`));
    await resized.clone().webp({ quality: 78 }).toFile(path.join(PAGE_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/sayfa/${baseName}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

/**
 * Kategori kapağı — `hazirla-kategori.ts`'in ürettiği bileşik (soyut zemin + ürün fotoğrafı).
 *
 * `ProductImage` ile aynı genişlikler: kapak kutusu ürün kartıyla aynı 4:3 kutu.
 * Ayrı klasör, çünkü `Category.imagePath` kaynağı (ürün fotoğrafı) yerinde kalıyor —
 * bu klasör silindiğinde site kendiliğinden eski kapaklara dönüyor.
 */
export async function processCategoryImage(
  buf: Buffer,
  baseName: string,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(CATEGORY_DIR, { recursive: true });
  const src = sharp(buf);
  const meta = await src.metadata();

  for (const v of IMAGE_VARIANTS) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized.clone().avif({ quality: 55 }).toFile(path.join(CATEGORY_DIR, `${baseName}-${v.suffix}.avif`));
    await resized.clone().webp({ quality: 78 }).toFile(path.join(CATEGORY_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/kategori/${baseName}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

/**
 * Video poster karesi — video inene kadar görünen tek kare, `hazirla-video.ts` besler.
 *
 * `<video poster>` srcset desteklemiyor, tek URL alıyor; yine de tüm türevler üretilir:
 * `prefers-reduced-motion` açıkken video hiç oynatılmıyor ve o durumda poster normal
 * bir `<picture>` gibi, ekran genişliğine göre servis ediliyor.
 */
export async function processVideoPoster(
  buf: Buffer,
  baseName: string,
  variants: readonly { suffix: string; width: number }[] = IMAGE_VARIANTS,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(VIDEO_DIR, { recursive: true });
  const src = sharp(buf);
  const meta = await src.metadata();

  for (const v of variants) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized.clone().avif({ quality: 58 }).toFile(path.join(VIDEO_DIR, `${baseName}-${v.suffix}.avif`));
    await resized.clone().webp({ quality: 80 }).toFile(path.join(VIDEO_DIR, `${baseName}-${v.suffix}.webp`));
  }

  return {
    basePath: `media/video/${baseName}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

/**
 * Teknik çizim / ölçü tablosu görseli — katalog PDF'inden çıkarılan çizgi grafiği.
 *
 * Fotoğraf ayarları (avif q55 / webp q78) ince çizgileri ve küçük rakamları eziyor,
 * bu yüzden kalite yükseltilir. Ayrıca `-full.webp` yazılır: ölçü tabloları 20 satır ×
 * 12 sütuna çıkabiliyor, kullanıcı "Büyüt" ile tam çözünürlüğe gidebilsin.
 */
export async function processDrawingImage(
  buf: Buffer,
  baseName: string,
): Promise<{ basePath: string; width: number; height: number }> {
  await mkdir(TECHNICAL_DIR, { recursive: true });
  const src = sharp(buf);
  const meta = await src.metadata();

  // Kalite ayarları ölçüldü: ölçü tablosunun rakamları q88 ile q92 arasında 2× yakınlaştırmada
  // ayırt edilemiyor ama dosya ~%20 küçülüyor. Kayıpsız WebP bu duotone görsellerde
  // kayıplıdan BÜYÜK çıkıyor (543 KB / 361 KB), o yüzden kullanılmıyor.
  for (const v of IMAGE_VARIANTS) {
    const resized = src.clone().resize({ width: v.width, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 65 })
      .toFile(path.join(TECHNICAL_DIR, `${baseName}-${v.suffix}.avif`));
    await resized
      .clone()
      .webp({ quality: 88, effort: 6 })
      .toFile(path.join(TECHNICAL_DIR, `${baseName}-${v.suffix}.webp`));
  }
  // "Büyüt" bağlantısının kaynağı. 2400 px sınırı: ölçü tablosunun en küçük rakamı
  // bu genişlikte rahat okunuyor, üstü yalnız dosya boyutu ekliyor.
  await src
    .clone()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(TECHNICAL_DIR, `${baseName}-full.webp`));

  return {
    basePath: `media/technical/${baseName}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}
