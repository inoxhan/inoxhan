/**
 * İnoxhan ürün kataloğu içe aktarma — kaynak: "resimler ve açıklamalar\" klasörü.
 *
 *   npm run import:urunler          → içe aktar
 *   npm run import:urunler -- --dry → yazmadan önizleme
 *   npm run import:urunler -- --force → mevcut görsel türevlerini yeniden üret
 *
 * Tüm ürün bilgisi DOSYA ADINDAN gelir; hiçbir teknik değer uydurulmaz:
 *   NN - INOX <ÜRÜN ADI> - <NORM(lar)>.png
 *   21 - INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA - DIN 933 - ISO 4017.png
 *
 * Ürün kodu (SKU) global norm kodudur: "DIN 933" → yoksa "ISO 7380" → norm yoksa
 * dosya adındaki global İngilizce ad ("DROP IN ANCHOR").
 *
 * SKU ile upsert eder; tekrar çalıştırmak güvenlidir. Yeni fotoğraf klasörleri
 * SOURCE_DIRS listesine eklenerek aynı yolla içe aktarılır.
 */
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { lowerCaseTr, slugifyTr, titleCaseTr } from "../src/lib/slugify-tr";
import { processProductImage } from "../src/server/media";

const db = new PrismaClient();

const SOURCE_DIRS = ["resimler ve açıklamalar"];
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

const MATERIAL = "Paslanmaz Çelik (INOX)";
const QUALITY = "A2 (AISI 304) / A4 (AISI 316)";

/** Dosya numarası → kategori. Açık tablo; tahmin yok. */
const CATEGORIES: { name: string; order: number; files: number[]; coverFile: number }[] = [
  { name: "Cıvatalar", order: 1, coverFile: 21, files: [8, 12, 13, 20, 21, 37, 39, 44] },
  { name: "Somunlar", order: 2, coverFile: 22, files: [6, 7, 18, 19, 22, 23, 29, 30, 32, 33, 38] },
  {
    name: "Vidalar",
    order: 3,
    coverFile: 26,
    files: [2, 11, 24, 25, 26, 27, 40, 41, 42, 43, 47, 48, 49, 50, 51],
  },
  { name: "Setskurlar", order: 4, coverFile: 14, files: [14, 15, 16, 17] },
  { name: "Rondela ve Pullar", order: 5, coverFile: 4, files: [4, 5, 34, 35, 45] },
  { name: "Segman, Pim ve Kama", order: 6, coverFile: 9, files: [3, 9, 10, 31, 36, 46] },
  { name: "Dübeller", order: 7, coverFile: 54, files: [52, 53, 54] },
  { name: "Gijon ve Zincir", order: 8, coverFile: 28, files: [28, 55] },
];

interface ParsedProduct {
  fileNo: number;
  filePath: string;
  name: string; // "INOX Altıköşe Başlı Metrik Diş Tam Paso Cıvata"
  sku: string; // "DIN 933"
  din: string | null;
  iso: string | null;
  globalName: string | null; // norm yoksa "Drop In Anchor"
}

/**
 * "21 - INOX ALTIKÖŞE ... - DIN 933 - ISO 4017" biçimini parçalarına ayırır.
 * Ad ile norm(lar) " - " ile ayrılmıştır; normlar sondadır.
 */
function parseFileName(filePath: string): ParsedProduct | null {
  const base = path.basename(filePath, path.extname(filePath));
  const parts = base.split(" - ").map((p) => p.trim());
  if (parts.length < 2) return null;

  const fileNo = Number(parts[0]);
  if (!Number.isFinite(fileNo)) return null;

  let din: string | null = null;
  let iso: string | null = null;
  const nameParts: string[] = [];
  const extraParts: string[] = [];

  for (const part of parts.slice(1)) {
    if (/^DIN\s/i.test(part)) din = part.toUpperCase();
    else if (/^ISO\s/i.test(part)) iso = part.toUpperCase();
    else if (nameParts.length === 0) nameParts.push(part);
    else extraParts.push(part); // "DROP IN ANCHOR" gibi norm olmayan ek ad
  }
  if (nameParts.length === 0) return null;

  const globalName = extraParts.length > 0 ? titleCaseTr(extraParts.join(" ")) : null;
  const sku = din ?? iso ?? extraParts.join(" ").toUpperCase();
  if (!sku) return null;

  return {
    fileNo,
    filePath,
    name: titleCaseTr(nameParts[0]),
    sku,
    din,
    iso,
    globalName,
  };
}

/** Ürün adının ve normunun düz ifadesi — uydurma bilgi içermez. */
function buildDescription(p: ParsedProduct): string {
  // "INOX Altıköşe Başlı ..." → "altıköşe başlı ..." (cümle içinde akıcı olsun)
  const readable = lowerCaseTr(p.name.replace(/^INOX\s+/, ""));
  const norms = [p.din, p.iso].filter(Boolean).join(" / ");

  if (norms) return `${norms} normuna uygun paslanmaz çelik ${readable}.`;
  if (p.globalName) return `Paslanmaz çelik ${readable} (${p.globalName}).`;
  return `Paslanmaz çelik ${readable}.`;
}

async function collectFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const abs = path.join(process.cwd(), dir);
    if (!existsSync(abs)) {
      console.warn(`Klasör bulunamadı, atlanıyor: ${dir}`);
      continue;
    }
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
        files.push(path.join(abs, entry.name));
      }
    }
  }
  return files.sort();
}

async function main() {
  const files = await collectFiles();
  if (files.length === 0) {
    console.error("Hiç fotoğraf bulunamadı. Kaynak klasör: " + SOURCE_DIRS.join(", "));
    process.exit(1);
  }

  const parsed: ParsedProduct[] = [];
  for (const file of files) {
    const p = parseFileName(file);
    if (!p) {
      console.warn(`Dosya adı çözümlenemedi, atlandı: ${path.basename(file)}`);
      continue;
    }
    parsed.push(p);
  }
  console.log(`${parsed.length} ürün dosyası okundu.`);

  // Kategori ataması — tabloda olmayan dosya varsa erken uyar
  const categoryOfFile = new Map<number, string>();
  for (const cat of CATEGORIES) {
    for (const no of cat.files) categoryOfFile.set(no, cat.name);
  }
  const orphans = parsed.filter((p) => !categoryOfFile.has(p.fileNo));
  if (orphans.length > 0) {
    console.error(
      "Kategori tablosunda karşılığı olmayan dosyalar var:\n" +
        orphans.map((o) => `  ${o.fileNo} — ${o.name}`).join("\n") +
        "\nscripts/import-urunler.ts içindeki CATEGORIES tablosuna ekleyin.",
    );
    process.exit(1);
  }

  // SKU benzersizliği
  const seen = new Map<string, string>();
  for (const p of parsed) {
    const clash = seen.get(p.sku);
    if (clash) {
      console.error(`Aynı ürün kodu iki üründe: "${p.sku}" → ${clash} ve ${p.name}`);
      process.exit(1);
    }
    seen.set(p.sku, p.name);
  }

  if (DRY) {
    for (const p of parsed) {
      console.log(
        `  ${String(p.fileNo).padStart(2, "0")} [${categoryOfFile.get(p.fileNo)}] ${p.sku.padEnd(14)} ${p.name}`,
      );
      console.log(`       ${buildDescription(p)}`);
    }
    console.log("\n(dry-run: veritabanına yazılmadı)");
    return;
  }

  // Kategoriler
  const categoryIds = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const slug = slugifyTr(cat.name);
    const row = await db.category.upsert({
      where: { slug },
      update: { name: cat.name, order: cat.order },
      create: { name: cat.name, slug, order: cat.order },
    });
    categoryIds.set(cat.name, row.id);
  }

  // Ürünler
  let created = 0;
  let updated = 0;
  let imagesProcessed = 0;
  const basePathOfFile = new Map<number, string>();

  for (const p of parsed) {
    const categoryName = categoryOfFile.get(p.fileNo)!;
    const slug = slugifyTr(`${p.name} ${p.sku}`);
    const existing = await db.product.findUnique({ where: { sku: p.sku } });

    const data = {
      name: p.name,
      slug,
      model: p.iso && p.din ? p.iso : p.globalName, // SKU'da olmayan ikinci kod
      shortDesc: buildDescription(p),
      useAreas: null, // panelden doldurulacak
      seoTitle: null,
      seoDesc: null,
      categoryId: categoryIds.get(categoryName)!,
      brandId: null,
      isActive: true,
    };

    const product = existing
      ? await db.product.update({ where: { sku: p.sku }, data })
      : await db.product.create({ data: { ...data, sku: p.sku } });
    existing ? updated++ : created++;

    // Teknik özellikler — hepsi dosya adından veya doğrulanmış malzeme bilgisinden
    const specs: { key: string; value: string }[] = [];
    if (p.din) specs.push({ key: "Norm", value: p.din });
    if (p.iso) specs.push({ key: p.din ? "ISO Karşılığı" : "Norm", value: p.iso });
    if (!p.din && !p.iso && p.globalName) {
      specs.push({ key: "Tip", value: p.globalName });
    }
    specs.push({ key: "Malzeme", value: MATERIAL });
    specs.push({ key: "Kalite", value: QUALITY });

    await db.productSpec.deleteMany({ where: { productId: product.id } });
    await db.productSpec.createMany({
      data: specs.map((s, i) => ({ productId: product.id, key: s.key, value: s.value, order: i })),
    });

    // Görsel türevleri (AVIF/WebP × 480/960/1600)
    const baseName = slugifyTr(p.sku);
    const lgPath = path.join(process.cwd(), "public", "media", "products", `${baseName}-lg.webp`);
    let dims = { width: 1600, height: 1200 };
    if (FORCE || !existsSync(lgPath)) {
      const buf = await readFile(p.filePath);
      const out = await processProductImage(buf, baseName);
      dims = { width: out.width, height: out.height };
      imagesProcessed++;
      process.stdout.write(`\r  görsel işleniyor: ${imagesProcessed}/${parsed.length}   `);
    } else {
      const known = await db.productImage.findFirst({ where: { productId: product.id } });
      if (known) dims = { width: known.width, height: known.height };
    }

    const basePath = `media/products/${baseName}`;
    basePathOfFile.set(p.fileNo, basePath);

    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.create({
      data: {
        productId: product.id,
        basePath,
        alt: p.name,
        isMain: true,
        order: 0,
        width: dims.width,
        height: dims.height,
      },
    });
  }
  if (imagesProcessed > 0) process.stdout.write("\n");

  // Kategori kapak görselleri — temsili ürünün fotoğrafı
  for (const cat of CATEGORIES) {
    const cover = basePathOfFile.get(cat.coverFile);
    if (cover) {
      await db.category.update({
        where: { id: categoryIds.get(cat.name)! },
        data: { imagePath: cover },
      });
    }
  }

  console.log(
    `Tamam: ${created} yeni, ${updated} güncellenen ürün · ${CATEGORIES.length} kategori · ${imagesProcessed} görsel işlendi.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
