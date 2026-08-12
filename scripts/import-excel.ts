/**
 * İnoxhan gerçek veri içe aktarma hattı — YENİDEN ÇALIŞTIRILABİLİR (SKU ile upsert).
 *
 * Beklenen girdi:
 *   import\urunler.xlsx          → ürün listesi (ilk sayfa)
 *   import\fotograflar\*.jpg     → ürün fotoğrafları (veya import\ kökü)
 *
 * Kullanım:
 *   npm run import              → içe aktar
 *   npm run import -- --dry     → yazmadan önizleme
 *   npm run import -- --force   → mevcut görsel türevlerini yeniden üret
 *
 * Çıktılar:
 *   public\media\products\      → AVIF/WebP türevleri (-sm/-md/-lg)
 *   import\eslesmeyen.csv       → eşleşmeyen fotoğraflar + fotoğrafsız ürünler raporu
 *
 * Excel kolonları esnek eşlenir (COLUMNS haritası) — gerçek dosya farklıysa
 * yalnızca bu haritayı güncellemek yeterli.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { normalizeTr, slugifyTr } from "../src/lib/slugify-tr";
import { processProductImage } from "../src/server/media";

const db = new PrismaClient();

const IMPORT_DIR = path.join(process.cwd(), "import");
const EXCEL_PATH = path.join(IMPORT_DIR, "urunler.xlsx");
const PHOTO_DIRS = [path.join(IMPORT_DIR, "fotograflar"), IMPORT_DIR];
const REPORT_PATH = path.join(IMPORT_DIR, "eslesmeyen.csv");
const MEDIA_DIR = path.join(process.cwd(), "public", "media", "products");

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

/** Kolon başlığı adayları — normalizeTr ile karşılaştırılır. */
const COLUMNS: Record<string, string[]> = {
  sku: ["urun kodu", "sku", "stok kodu", "kod", "urun no"],
  name: ["urun adi", "ad", "urun", "isim", "aciklama adi"],
  category: ["kategori", "grup", "urun grubu"],
  brand: ["marka"],
  model: ["model", "norm", "tip"],
  shortDesc: ["kisa aciklama", "aciklama", "detay"],
  useAreas: ["kullanim alanlari", "kullanim alani", "kullanim yerleri"],
  seoTitle: ["seo basligi", "seo baslik", "seo title"],
  seoDesc: ["seo aciklamasi", "seo aciklama", "seo description"],
};
/** "Teknik Özellik 1..N" / "Özellik N" kolonları */
const SPEC_PREFIXES = ["teknik ozellik", "ozellik", "spec"];

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

interface ParsedRow {
  rowNo: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  shortDesc: string;
  useAreas: string;
  seoTitle: string;
  seoDesc: string;
  specs: { key: string; value: string }[];
}

/** Sørensen–Dice bigram benzerliği (0..1) — dosya adı ↔ ürün adı eşleştirme. */
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const ma = bigrams(a);
  const mb = bigrams(b);
  let overlap = 0;
  for (const [bg, ca] of ma) overlap += Math.min(ca, mb.get(bg) ?? 0);
  return (2 * overlap) / (a.length - 1 + b.length - 1);
}

function parseSheet(): ParsedRow[] {
  const wb = XLSX.read(readFileSync(EXCEL_PATH), { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rows.length < 2) throw new Error("Excel boş görünüyor (başlık + en az 1 satır gerekli)");

  const headers = rows[0].map((h) => normalizeTr(String(h)));

  // Alan → kolon indeksi. İKİ AŞAMALI eşleme: önce tam eşleşme, sonra önek.
  // (Tek aşamalı startsWith "Ürün Adı" alanını "Ürün Kodu" kolonuna bağlayabilir:
  //  "urun" adayı "urun kodu"nun önekidir. Kolonlar bir kez eşlenince rezerve edilir.)
  const fieldIndex = new Map<string, number>();
  const claimed = new Set<number>();
  for (const [field, candidates] of Object.entries(COLUMNS)) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && candidates.some((c) => h === c));
    if (idx >= 0) {
      fieldIndex.set(field, idx);
      claimed.add(idx);
    }
  }
  for (const [field, candidates] of Object.entries(COLUMNS)) {
    if (fieldIndex.has(field)) continue;
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && candidates.some((c) => h.startsWith(c)),
    );
    if (idx >= 0) {
      fieldIndex.set(field, idx);
      claimed.add(idx);
    }
  }
  const specIndexes = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => SPEC_PREFIXES.some((p) => h.startsWith(p)))
    .map(({ h, i }) => ({ index: i, header: rows[0][i] ? String(rows[0][i]).trim() : h }));

  if (!fieldIndex.has("sku") || !fieldIndex.has("name")) {
    throw new Error(
      `Zorunlu kolonlar bulunamadı. Bulunan başlıklar: ${headers.join(" | ")}\n` +
        `"Ürün Kodu" ve "Ürün Adı" kolonları gerekli (veya scripts/import-excel.ts içindeki COLUMNS haritasını uyarlayın).`,
    );
  }

  const get = (row: unknown[], field: string) => {
    const idx = fieldIndex.get(field);
    return idx === undefined ? "" : String(row[idx] ?? "").trim();
  };

  const parsed: ParsedRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const sku = get(row, "sku").toUpperCase();
    const name = get(row, "name");
    if (!sku && !name) continue; // tamamen boş satır
    const specs: { key: string; value: string }[] = [];
    for (const { index, header } of specIndexes) {
      const raw = String(row[index] ?? "").trim();
      if (!raw) continue;
      const colonAt = raw.indexOf(":");
      if (colonAt > 0) {
        specs.push({ key: raw.slice(0, colonAt).trim(), value: raw.slice(colonAt + 1).trim() });
      } else {
        // "Teknik Özellik 1" gibi jenerik başlıkta değer düz yazılmışsa
        const genericHeader = /(teknik )?(ozellik|özellik|spec)\s*\d*$/i.test(header);
        specs.push({ key: genericHeader ? "Özellik" : header, value: raw });
      }
    }
    parsed.push({
      rowNo: r + 1,
      sku,
      name,
      category: get(row, "category") || "Genel",
      brand: get(row, "brand"),
      model: get(row, "model"),
      shortDesc: get(row, "shortDesc"),
      useAreas: get(row, "useAreas"),
      seoTitle: get(row, "seoTitle"),
      seoDesc: get(row, "seoDesc"),
      specs,
    });
  }
  return parsed;
}

async function listPhotos(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of PHOTO_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of await readdir(dir, { withFileTypes: true })) {
      if (f.isFile() && IMAGE_EXTS.has(path.extname(f.name).toLowerCase())) {
        files.push(path.join(dir, f.name));
      }
    }
  }
  return files;
}

async function main() {
  if (!existsSync(EXCEL_PATH)) {
    console.error(`Bulunamadı: ${EXCEL_PATH}`);
    console.error(
      "Excel dosyasını import\\urunler.xlsx olarak, fotoğrafları import\\fotograflar\\ içine koyun.",
    );
    process.exit(1);
  }

  // ── 1. Excel → ürünler ────────────────────────────────────────────────
  const rows = parseSheet();
  console.log(`Excel: ${rows.length} satır okundu.`);

  const problems: string[] = [];
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row.sku) {
      problems.push(`satir;${row.rowNo};SKU eksik;${row.name}`);
      continue;
    }
    if (!row.name) {
      problems.push(`satir;${row.rowNo};ürün adı eksik;${row.sku}`);
      continue;
    }
    if (DRY) continue;

    const catSlug = slugifyTr(row.category);
    const category = await db.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { name: row.category, slug: catSlug, order: 99 },
    });

    let brandId: string | null = null;
    if (row.brand) {
      const brand = await db.brand.upsert({
        where: { slug: slugifyTr(row.brand) },
        update: {},
        create: { name: row.brand, slug: slugifyTr(row.brand) },
      });
      brandId = brand.id;
    }

    const baseSlug = slugifyTr(`${row.brand} ${row.name}`) || slugifyTr(row.sku);
    const slugOwner = await db.product.findUnique({ where: { slug: baseSlug } });
    const existing = await db.product.findUnique({ where: { sku: row.sku } });
    const slug =
      slugOwner && slugOwner.sku !== row.sku ? `${baseSlug}-${slugifyTr(row.sku)}` : baseSlug;

    const data = {
      name: row.name,
      slug,
      model: row.model || null,
      shortDesc: row.shortDesc || null,
      useAreas: row.useAreas || null,
      seoTitle: row.seoTitle || null,
      seoDesc: row.seoDesc || null,
      categoryId: category.id,
      brandId,
    };

    const product = existing
      ? await db.product.update({ where: { sku: row.sku }, data })
      : await db.product.create({ data: { ...data, sku: row.sku } });
    existing ? updated++ : created++;

    await db.productSpec.deleteMany({ where: { productId: product.id } });
    if (row.specs.length > 0) {
      await db.productSpec.createMany({
        data: row.specs.map((s, i) => ({
          productId: product.id,
          key: s.key,
          value: s.value,
          order: i,
        })),
      });
    }
  }
  console.log(DRY ? "(dry-run: veritabanına yazılmadı)" : `Ürünler: ${created} yeni, ${updated} güncellendi.`);

  // ── 2. Fotoğraf eşleştirme ────────────────────────────────────────────
  const photos = await listPhotos();
  console.log(`Fotoğraf: ${photos.length} dosya bulundu.`);

  const products = await db.product.findMany({ include: { brand: true } });
  const index = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    skuSlug: slugifyTr(p.sku),
    nameSlug: slugifyTr(`${p.brand?.name ?? ""} ${p.name}`),
    nameOnlySlug: slugifyTr(p.name),
    name: p.name,
  }));

  const byProduct = new Map<string, string[]>(); // productId → dosyalar
  const unmatched: { file: string; best: string; score: number }[] = [];

  for (const photo of photos) {
    const base = slugifyTr(path.basename(photo, path.extname(photo)));

    // 1) SKU dosya adında geçiyor mu?
    let hit = index.find((p) => base.includes(p.skuSlug));
    let score = 1;

    // 2) Ad benzerliği (Dice)
    if (!hit) {
      let best: (typeof index)[number] | null = null;
      let bestScore = 0;
      for (const p of index) {
        const s = Math.max(dice(base, p.nameSlug), dice(base, p.nameOnlySlug));
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      if (best && bestScore >= 0.5) {
        hit = best;
        score = bestScore;
      } else {
        unmatched.push({
          file: path.basename(photo),
          best: best?.name ?? "-",
          score: Math.round(bestScore * 100) / 100,
        });
        continue;
      }
    }

    const list = byProduct.get(hit.id) ?? [];
    list.push(photo);
    byProduct.set(hit.id, list);
    if (score < 1) {
      console.log(`  ~ ${path.basename(photo)} → ${hit.name} (benzerlik ${score.toFixed(2)})`);
    }
  }

  // ── 3. Görsel işleme (AVIF/WebP türevleri) ────────────────────────────
  if (!DRY) {
    await mkdir(MEDIA_DIR, { recursive: true });
    let processed = 0;
    for (const [productId, files] of byProduct) {
      const p = index.find((x) => x.id === productId)!;
      await db.productImage.deleteMany({ where: { productId } });
      for (let i = 0; i < files.length; i++) {
        const baseName = `${p.skuSlug}-${i}`;
        const lgPath = path.join(MEDIA_DIR, `${baseName}-lg.webp`);
        let dims = { width: 1600, height: 1200 };
        if (FORCE || !existsSync(lgPath)) {
          const buf = await readFile(files[i]);
          const out = await processProductImage(buf, baseName);
          dims = { width: out.width, height: out.height };
          processed++;
        }
        await db.productImage.create({
          data: {
            productId,
            basePath: `media/products/${baseName}`,
            alt: p.name,
            isMain: i === 0,
            order: i,
            width: dims.width,
            height: dims.height,
          },
        });
      }
    }
    console.log(`Görsel: ${byProduct.size} ürüne fotoğraf bağlandı, ${processed} dosya işlendi.`);
  }

  // ── 4. Rapor ──────────────────────────────────────────────────────────
  const photoless = DRY
    ? []
    : await db.product.findMany({ where: { images: { none: {} }, isActive: true } });

  const reportLines = [
    "tur;dosya_veya_satir;en_yakin_urun;benzerlik",
    ...unmatched.map((u) => `foto;${u.file};${u.best};${u.score}`),
    ...photoless.map((p) => `fotografsiz_urun;${p.sku};${p.name};`),
    ...problems.map((p) => `excel;${p}`),
  ];
  // BOM ile yaz → Excel'de Türkçe karakterler doğru açılır
  await writeFile(REPORT_PATH, "﻿" + reportLines.join("\r\n"), "utf8");
  console.log(
    `Rapor: ${REPORT_PATH} (${unmatched.length} eşleşmeyen foto, ${photoless.length} fotoğrafsız ürün, ${problems.length} satır sorunu)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
