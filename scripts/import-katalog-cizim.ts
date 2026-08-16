/**
 * Katalog PDF'inden çıkarılan teknik çizim ve ölçü tablosu görsellerini ürünlerle
 * eşleştirir, türevlerini üretir ve veritabanına yazar.
 *
 *   npm run import:cizim              → eşleştir + yaz
 *   npm run import:cizim -- --rapor   → yalnız eşleşme raporu (yazmaz)
 *   npm run import:cizim -- --force   → mevcut türevleri yeniden üret
 *
 * Ön koşullar:
 *   npm run katalog:render   → import/katalog-sayfalar/
 *   npm run katalog:cizim    → import/katalog-cizim/
 *
 * EŞLEŞTİRME: birincil anahtar norm kodudur (DIN → ISO). Normu olmayan ürünlerde
 * (dübeller) katalogdaki İngilizce ada düşülür. Sayfa sırası ÇAPRAZ KONTROL olarak
 * kullanılır: fotoğraf dosyası numarası ile PDF sayfa numarası birebir örtüşmeli.
 * Çelişki varsa hiçbir şey yazılmaz — sessiz yanlış eşleşme olmaz.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { slugifyTr } from "../src/lib/slugify-tr";
import { processDrawingImage } from "../src/server/media";
import { katalogNormlari, type SayfaNorm } from "./lib/katalog-normlar";
import { collectFiles, parseFileName, type ParsedProduct } from "./lib/urun-dosyalari";
import { kaynakPdfYolu } from "./katalog-render";

const db = new PrismaClient();

const CIZIM_DIR = path.join(process.cwd(), "import", "katalog-cizim");
const RAPOR = process.argv.includes("--rapor");
const FORCE = process.argv.includes("--force");

const TURLER = [
  { kind: "cizim", ek: "cizim", etiket: "teknik çizimi", order: 0 },
  { kind: "tablo", ek: "tablo", etiket: "ölçü tablosu", order: 1 },
] as const;

/** Karşılaştırma anahtarı: büyük harf, yalnız harf+rakam. "DIN 125 A" → "DIN125A" */
const anahtar = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const kelimeler = (s: string) =>
  s
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

/** Biri diğerinin alt kümesiyse eşleşir: "WEDGE ANCHOR" ⊂ "WEDGE IN ANCHOR" */
function adEsler(a: string, b: string): boolean {
  const ka = kelimeler(a);
  const kb = kelimeler(b);
  if (ka.length < 2 || kb.length < 2) return false;
  const [kucuk, buyuk] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  const kume = new Set(buyuk);
  return kucuk.every((k) => kume.has(k));
}

interface Eslesme {
  sayfa: number;
  sku: string;
  urunAdi: string;
  yontem: "DIN" | "ISO" | "ad";
  dosyaNo: number | null;
}

async function main() {
  const pdfYolu = kaynakPdfYolu();
  if (!existsSync(CIZIM_DIR)) {
    console.error(`Çizimler yok. Önce: npm run katalog:render && npm run katalog:cizim`);
    process.exit(1);
  }

  // ── Kaynaklar ───────────────────────────────────────────────────────────────
  const dosyalar = (await collectFiles())
    .map(parseFileName)
    .filter((p): p is ParsedProduct => p !== null);
  const dosyaNoyaGore = new Map(dosyalar.map((d) => [d.fileNo, d]));

  const urunler = await db.product.findMany({ select: { id: true, sku: true, name: true } });
  const skuyaGore = new Map(urunler.map((u) => [anahtar(u.sku), u]));

  console.log(`PDF okunuyor: ${pdfYolu}`);
  const sayfalar: SayfaNorm[] = await katalogNormlari(pdfYolu);

  // ── Eşleştirme ──────────────────────────────────────────────────────────────
  const eslesenler: Eslesme[] = [];
  const eslesmeyenSayfa: { sayfa: number; neden: string }[] = [];
  const celiskiler: string[] = [];

  for (const s of sayfalar) {
    const cizimVar = existsSync(
      path.join(CIZIM_DIR, `sayfa-${String(s.sayfa).padStart(2, "0")}-cizim.png`),
    );
    if (!cizimVar) {
      eslesmeyenSayfa.push({ sayfa: s.sayfa, neden: "çizim üretilmedi (şablon dışı sayfa)" });
      continue;
    }

    let bulunan: { id: string; sku: string; name: string } | undefined;
    let yontem: Eslesme["yontem"] = "DIN";

    if (s.din) bulunan = skuyaGore.get(anahtar(`DIN ${s.din}`));
    if (!bulunan && s.iso) {
      bulunan = skuyaGore.get(anahtar(`ISO ${s.iso}`));
      if (bulunan) yontem = "ISO";
    }
    if (!bulunan && s.ingilizceAd) {
      const aday = urunler.find((u) => adEsler(u.sku, s.ingilizceAd!));
      if (aday) {
        bulunan = aday;
        yontem = "ad";
      }
    }

    if (!bulunan) {
      eslesmeyenSayfa.push({
        sayfa: s.sayfa,
        neden: `norm bulunamadı (DIN=${s.din ?? "-"} ISO=${s.iso ?? "-"} ad="${s.ingilizceAd ?? "-"}")`,
      });
      continue;
    }

    const dosya = dosyaNoyaGore.get(s.sayfa);
    if (dosya && anahtar(dosya.sku) !== anahtar(bulunan.sku)) {
      celiskiler.push(
        `  s${s.sayfa}: norm eşleşmesi "${bulunan.sku}" ama ${s.sayfa}. fotoğraf dosyası "${dosya.sku}"`,
      );
    }

    eslesenler.push({
      sayfa: s.sayfa,
      sku: bulunan.sku,
      urunAdi: bulunan.name,
      yontem,
      dosyaNo: dosya?.fileNo ?? null,
    });
  }

  // ── Rapor ───────────────────────────────────────────────────────────────────
  console.log(`\n── Eşleşenler (${eslesenler.length}) ──`);
  for (const e of eslesenler) {
    const isaret = e.yontem === "DIN" ? " " : "*";
    console.log(
      `${isaret} s${String(e.sayfa).padStart(2, "0")} → ${e.sku.padEnd(16)} ${e.urunAdi}` +
        (e.yontem !== "DIN" ? `   [${e.yontem} ile]` : ""),
    );
  }

  const cizimsizUrunler = urunler.filter(
    (u) => !eslesenler.some((e) => anahtar(e.sku) === anahtar(u.sku)),
  );
  console.log(`\n── Karşılığı olmayan PDF sayfaları (${eslesmeyenSayfa.length}) ──`);
  for (const e of eslesmeyenSayfa) console.log(`  s${e.sayfa}: ${e.neden}`);
  console.log(`\n── Teknik çizimi olmayan ürünler (${cizimsizUrunler.length}) ──`);
  for (const u of cizimsizUrunler) console.log(`  ${u.sku.padEnd(16)} ${u.name}`);

  if (celiskiler.length > 0) {
    console.error(
      `\nDURDURULDU — norm eşleşmesi ile sayfa sırası çelişiyor:\n${celiskiler.join("\n")}\n` +
        `Hiçbir şey yazılmadı. Katalog sayfa sırası veya dosya adları kontrol edilmeli.`,
    );
    process.exit(1);
  }

  if (RAPOR) {
    console.log("\n(rapor: veritabanına yazılmadı)");
    return;
  }

  // ── Yazma ───────────────────────────────────────────────────────────────────
  let islenen = 0;
  for (const e of eslesenler) {
    const urun = urunler.find((u) => anahtar(u.sku) === anahtar(e.sku))!;
    const taban = slugifyTr(e.sku);

    for (const tur of TURLER) {
      const kaynak = path.join(
        CIZIM_DIR,
        `sayfa-${String(e.sayfa).padStart(2, "0")}-${tur.ek}.png`,
      );
      if (!existsSync(kaynak)) continue;

      const baseName = `${taban}-${tur.ek}`;
      const lgYolu = path.join(process.cwd(), "public", "media", "technical", `${baseName}-lg.webp`);
      let olcu: { basePath: string; width: number; height: number };

      if (FORCE || !existsSync(lgYolu)) {
        olcu = await processDrawingImage(await readFile(kaynak), baseName);
        islenen++;
        process.stdout.write(`\r  görsel işleniyor: ${islenen}   `);
      } else {
        const mevcut = await db.productDrawing.findUnique({
          where: { productId_kind: { productId: urun.id, kind: tur.kind } },
        });
        olcu = {
          basePath: `media/technical/${baseName}`,
          width: mevcut?.width ?? 0,
          height: mevcut?.height ?? 0,
        };
      }

      const veri = {
        basePath: olcu.basePath,
        alt: `${urun.name} ${tur.etiket}`,
        width: olcu.width,
        height: olcu.height,
        order: tur.order,
      };
      await db.productDrawing.upsert({
        where: { productId_kind: { productId: urun.id, kind: tur.kind } },
        update: veri,
        create: { productId: urun.id, kind: tur.kind, ...veri },
      });
    }
  }
  if (islenen > 0) process.stdout.write("\n");

  console.log(
    `\nTamam: ${eslesenler.length} ürüne teknik çizim + ölçü tablosu bağlandı · ${islenen} görsel işlendi.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
