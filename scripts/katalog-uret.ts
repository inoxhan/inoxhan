/**
 * PDF kataloğu üretir —  npm run katalog:uret
 *
 *   npm run katalog:uret                              → NEXT_PUBLIC_SITE_URL (yayın)
 *   npm run katalog:uret -- --base=https://alanadi.com → başka adres
 *
 * Çıktı doğrudan public/katalog.pdf'e yazılır; depoya commit edilir ve Vercel
 * oradan servis eder (sunucuda kalıcı disk yok, storage/ Vercel'de boştur).
 *
 * NEDEN AYRI BİR SCRIPT: panelin "Katalog Üret" düğmesi (runCatalogGeneration)
 * sunucuda çalışır ve `SITE.url` üzerinden kendi kendine bağlanır. Yerelde
 * çalıştırıldığında bu adres localhost olduğu için ÜRÜN SAYFALARINA GİDEN QR
 * KODLARI da localhost'a gömülüyordu — basılan katalogdaki her kare kod ölüydü.
 * Bu script hedefi açıkça alır, localhost'u reddeder ve ürettiği PDF'in metnini
 * okuyup gerçekten doğru adresi taşıdığını doğrular.
 */
import { readFileSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

/** .env'i elle okuruz — bu script Next çalışma zamanı dışındadır. */
function envYukle() {
  try {
    const icerik = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const satir of icerik.split(/\r?\n/)) {
      const t = satir.trim();
      if (!t || t.startsWith("#")) continue;
      const esit = t.indexOf("=");
      if (esit < 0) continue;
      const anahtar = t.slice(0, esit).trim();
      if (process.env[anahtar]) continue;
      process.env[anahtar] = t.slice(esit + 1).trim().replace(/^"|"$/g, "");
    }
  } catch {
    console.error("! .env okunamadı — proje kökünden çalıştırın");
  }
}

function hedefAdres(): string {
  const bayrak = process.argv.find((a) => a.startsWith("--base="));
  const ham = (bayrak ? bayrak.slice("--base=".length) : process.env.NEXT_PUBLIC_SITE_URL) ?? "";
  return ham.trim().replace(/\/+$/, "");
}

/** Üretilen PDF'in ilk sayfalarındaki metni okur (kapak + içindekiler). */
async function pdfMetni(dosya: string, sayfaSayisi = 2): Promise<{ metin: string; sayfa: number }> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(readFileSync(dosya));
  const doc = await getDocument({ data, useWorkerFetch: false, useSystemFonts: true }).promise;

  let metin = "";
  for (let n = 1; n <= Math.min(sayfaSayisi, doc.numPages); n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    metin += tc.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return { metin, sayfa: doc.numPages };
}

async function main() {
  envYukle();

  const base = hedefAdres();
  // Taslak: yalnız SAYFA DÜZENİNİ denemek için. Yerel adrese izin verir ama
  // çıktıyı public/'e yazmaz — localhost QR'lı bir PDF asla yayına sızmasın.
  const taslak = process.argv.includes("--taslak");

  if (!base) {
    console.error("✗ Hedef adres yok.");
    console.error("  NEXT_PUBLIC_SITE_URL doldurun ya da --base=https://... verin.");
    process.exitCode = 1;
    return;
  }

  const yerel = /localhost|127\.0\.0\.1|\[::1\]/i.test(base);
  if (yerel && !taslak) {
    console.error(`✗ Hedef adres yerel: ${base}`);
    console.error("  Katalogdaki QR kodları bu adresi TAŞIR ve müşterinin telefonunda açılmaz.");
    console.error("  Gerçek yayın adresini verin: npm run katalog:uret -- --base=https://...");
    console.error("  Sadece sayfa düzenini denemek istiyorsanız: -- --taslak");
    process.exitCode = 1;
    return;
  }

  const token = process.env.CATALOG_PRINT_TOKEN ?? "";
  if (!token) {
    console.error("✗ CATALOG_PRINT_TOKEN boş — /katalog-baski sayfası 404 döner.");
    process.exitCode = 1;
    return;
  }

  const url = `${base}/katalog-baski?token=${encodeURIComponent(token)}`;
  const ciktiRel = taslak
    ? path.join("storage", "katalog", "taslak.pdf")
    : path.join("public", "katalog.pdf");
  const cikti = path.join(process.cwd(), ciktiRel);

  console.log(`Kaynak : ${base}/katalog-baski`);
  console.log(`Çıktı  : ${ciktiRel}${taslak ? "  (TASLAK — yayına girmez)" : ""}\n`);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const yanit = await page.goto(url, { waitUntil: "networkidle", timeout: 180_000 });
    if (!yanit || !yanit.ok()) {
      throw new Error(
        `Baskı sayfası açılamadı (HTTP ${yanit?.status() ?? "?"}). ` +
          `CATALOG_PRINT_TOKEN yereldeki ile sunucudaki aynı mı?`,
      );
    }

    await mkdir(path.dirname(cikti), { recursive: true });
    await page.pdf({
      path: cikti,
      format: "A4",
      printBackground: true,
      // Kenar boşluğu artık CSS @page'ten geliyor (kapak tam taşma olabilsin)
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }

  const s = await stat(cikti);
  const { metin, sayfa } = await pdfMetni(cikti);
  const beklenen = base.replace(/^https?:\/\//, "");

  console.log(`✓ ${sayfa} sayfa · ${(s.size / 1024 / 1024).toFixed(1)} MB`);

  if (taslak) {
    console.log("\nTASLAK üretildi — yalnız sayfa düzenini denemek için.");
    console.log("Yayın kataloğu için yerel adres OLMADAN çalıştırın.");
    return;
  }

  // Üretilen dosyanın kendisini doğrula — QR'lar da aynı SITE.url'den doğuyor
  if (/localhost|127\.0\.0\.1/i.test(metin)) {
    console.error("\n✗ PDF metninde 'localhost' geçiyor — QR kodları BOZUK.");
    console.error("  Sunucuda NEXT_PUBLIC_SITE_URL tanımlı mı? Tanımlayıp yeniden dağıtın.");
    process.exitCode = 1;
    return;
  }
  if (!metin.includes(beklenen)) {
    console.error(`\n! PDF metninde beklenen adres (${beklenen}) bulunamadı.`);
    console.error("  Kapak ve içindekiler sayfasını gözle kontrol edin.");
    process.exitCode = 1;
    return;
  }

  console.log(`✓ QR/adres doğrulandı: ${beklenen}`);
  console.log("\nDepoya commit edip push edin; Vercel public/katalog.pdf'i servis eder.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
