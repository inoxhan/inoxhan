/**
 * Tam katalog varyant içe aktarımı — `npm run import:varyantlar -- --file <xlsx>`
 *
 * Excel biçimi (tek sayfa, ~6.750 satır): Ürün Kodu | Grup Kodu | DIN Normu | Açıklama
 * Her satır ölçü/kalite seviyesinde bir satış birimidir ("INOX ... M2x5 A2").
 * Sitedeki Product kayıtları AİLE seviyesindedir (sku = "DIN 84" gibi) —
 * "DIN Normu" kolonu aileye bağlanır; eşleşmeyenler raporlanır ama yine aktarılır
 * (productId=null, seçicide görselsiz aranabilir).
 *
 * Yeniden çalıştırılabilir: `code` anahtardır; yeni satırlar toplu eklenir,
 * içeriği değişenler güncellenir. `--prune` dosyada olmayan kodları pasifleştirir.
 * `--dry` hiçbir şey yazmaz, yalnız raporlar.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const db = new PrismaClient();

/**
 * Excel "DIN Normu" → Product.sku düzeltmeleri. Aile SKU'ları harf eki taşıyabiliyor
 * ("DIN 125 A") ya da DIN'siz olabiliyor (dübeller). İlk çalıştırmanın
 * "eşleşmeyen dinNorm" raporuna göre genişletilir.
 */
export const SKU_ALIAS: Record<string, string> = {
  "DIN 125": "DIN 125 A",
  "DIN 127": "DIN 127 B",
  "DIN 444": "DIN 444 B",
  "DIN 6798": "DIN 6798 A",
  "DIN 6885": "DIN 6885 A",
  "DIN 7505": "DIN 7505 A",
  // İlk içe aktarım raporundan (2026-08-17): Excel harf ekini bitişik yazıyor,
  // torks başlı vida ailesi ise sitede ISO normuyla duruyor
  "DIN 6885A": "DIN 6885 A",
  "DIN 7504K": "DIN 7504 K",
  "DIN 7504N": "DIN 7504 N",
  "DIN 7504P": "DIN 7504 P",
  "DIN 7380": "ISO 7380",
};

/**
 * Normu olmayan satırlar (Excel'de "DIN Normu" = "-") için açıklama anahtar
 * kelimesinden aile eşlemesi. Dübellerin DIN normu yok; site aileleri İngilizce
 * ticari adla duruyor (INOX Çakma Dübel = DROP IN ANCHOR).
 */
export const ACIKLAMA_ALIAS: { anahtar: RegExp; sku: string }[] = [
  { anahtar: /ÇAKMA\s+DÜBEL/i, sku: "DROP IN ANCHOR" },
  { anahtar: /ÇEKME\s+DÜBEL/i, sku: "SLEEVE ANCHOR T TYPE" },
  { anahtar: /KLİPSLİ\s+DÜBEL/i, sku: "WEDGE ANCHOR" },
];

/** dinNorm → aile SKU; eşleşmezse açıklamadan dener. */
export function aileSkusu(dinNorm: string, description: string): string {
  const alias = SKU_ALIAS[dinNorm];
  if (alias) return alias;
  const acikla = ACIKLAMA_ALIAS.find((a) => a.anahtar.test(description));
  return acikla ? acikla.sku : dinNorm;
}

export function normalizeSku(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Açıklamanın son token'ı kalite sınıfıysa ayrıştırır: "... M2x5 A2" → "A2". */
export function kaliteAyikla(description: string): string | null {
  const son = description.trim().split(/\s+/).at(-1);
  return son === "A2" || son === "A4" ? son : null;
}

interface Satir {
  code: string;
  groupCode: string;
  dinNorm: string;
  description: string;
  quality: string | null;
}

function excelOku(dosya: string): { satirlar: Satir[]; atlanan: string[] } {
  const wb = XLSX.readFile(dosya);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const ham = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const satirlar: Satir[] = [];
  const atlanan: string[] = [];
  const gorulen = new Set<string>();

  ham.forEach((r, i) => {
    const hucre = (k: string) => String(r[k] ?? "").trim();
    const code = hucre("Ürün Kodu");
    const description = hucre("Açıklama");
    if (!code || !description) {
      atlanan.push(`satır ${i + 2}: kod veya açıklama boş`);
      return;
    }
    if (gorulen.has(code)) {
      atlanan.push(`satır ${i + 2}: mükerrer kod ${code} (son satır kazanır)`);
      // son satır kazanır — öncekini çıkar
      const idx = satirlar.findIndex((s) => s.code === code);
      if (idx >= 0) satirlar.splice(idx, 1);
    }
    gorulen.add(code);
    satirlar.push({
      code,
      groupCode: hucre("Grup Kodu"),
      dinNorm: normalizeSku(hucre("DIN Normu")),
      description,
      quality: kaliteAyikla(description),
    });
  });

  return { satirlar, atlanan };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const prune = args.includes("--prune");
  const fileIdx = args.indexOf("--file");
  const dosya =
    fileIdx >= 0 && args[fileIdx + 1]
      ? args[fileIdx + 1]
      : path.join(process.cwd(), "import", "varyantlar.xlsx");

  const { satirlar, atlanan } = excelOku(dosya);
  console.log(`Excel: ${satirlar.length} satır okundu, ${atlanan.length} atlandı`);
  for (const a of atlanan.slice(0, 20)) console.log(`  ! ${a}`);
  if (atlanan.length > 20) console.log(`  ! … +${atlanan.length - 20} satır daha`);

  // Aile eşleşmesi: dinNorm → Product.sku (birebir ya da alias)
  const urunler = await db.product.findMany({ select: { id: true, sku: true } });
  const skuMap = new Map(urunler.map((u) => [normalizeSku(u.sku), u.id]));
  const eslesmeyen = new Map<string, number>(); // dinNorm → satır sayısı

  const cozulmus = satirlar.map((s) => {
    const hedefSku = aileSkusu(s.dinNorm, s.description);
    const productId = skuMap.get(normalizeSku(hedefSku)) ?? null;
    if (!productId) eslesmeyen.set(s.dinNorm, (eslesmeyen.get(s.dinNorm) ?? 0) + 1);
    return { ...s, productId };
  });

  if (dry) {
    console.log(`--dry: yazılmadı. Aile eşleşen: ${cozulmus.filter((s) => s.productId).length}`);
    rapor(eslesmeyen);
    return;
  }

  // Mevcut durum: tek sorguda kod → kayıt haritası
  const mevcutlar = await db.variant.findMany({
    select: { code: true, groupCode: true, dinNorm: true, description: true, quality: true, productId: true, isActive: true },
  });
  const mevcutMap = new Map(mevcutlar.map((m) => [m.code, m]));

  const yeniler = cozulmus.filter((s) => !mevcutMap.has(s.code));
  const degisenler = cozulmus.filter((s) => {
    const m = mevcutMap.get(s.code);
    return (
      m &&
      (m.groupCode !== s.groupCode ||
        m.dinNorm !== s.dinNorm ||
        m.description !== s.description ||
        m.quality !== s.quality ||
        m.productId !== s.productId ||
        !m.isActive)
    );
  });

  // Yeniler: 1.000'lik parçalarla toplu ekleme (Neon'a 6.752 tekil sorgu atılmaz)
  for (let i = 0; i < yeniler.length; i += 1000) {
    await db.variant.createMany({
      data: yeniler.slice(i, i + 1000).map((s) => ({
        code: s.code,
        groupCode: s.groupCode,
        dinNorm: s.dinNorm,
        description: s.description,
        quality: s.quality,
        productId: s.productId,
      })),
      skipDuplicates: true,
    });
    console.log(`  + eklendi: ${Math.min(i + 1000, yeniler.length)}/${yeniler.length}`);
  }

  for (const s of degisenler) {
    await db.variant.update({
      where: { code: s.code },
      data: {
        groupCode: s.groupCode,
        dinNorm: s.dinNorm,
        description: s.description,
        quality: s.quality,
        productId: s.productId,
        isActive: true,
      },
    });
  }

  let pasif = 0;
  if (prune) {
    const dosyadakiler = new Set(cozulmus.map((s) => s.code));
    const sonuc = await db.variant.updateMany({
      where: { code: { notIn: [...dosyadakiler] }, isActive: true },
      data: { isActive: false },
    });
    pasif = sonuc.count;
  }

  console.log(
    `Bitti: toplam ${cozulmus.length} · yeni ${yeniler.length} · güncellenen ${degisenler.length}` +
      ` · aile eşleşen ${cozulmus.filter((s) => s.productId).length}` +
      (prune ? ` · pasifleştirilen ${pasif}` : ""),
  );
  rapor(eslesmeyen);
}

function rapor(eslesmeyen: Map<string, number>) {
  if (eslesmeyen.size === 0) {
    console.log("Tüm DIN normları bir aileye bağlandı.");
    return;
  }
  console.log(`\nEŞLEŞMEYEN dinNorm değerleri (${eslesmeyen.size} adet) — SKU_ALIAS'a eklenebilir:`);
  for (const [din, adet] of [...eslesmeyen.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${din || "(boş)"} → ${adet} satır`);
  }
}

// Testler yardımcıları import edebilsin diye yalnız doğrudan çalıştırıldığında koşar
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
