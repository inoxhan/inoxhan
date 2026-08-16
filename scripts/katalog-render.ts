/**
 * Kaynak katalog PDF'inin her sayfasını 300 DPI PNG olarak `import/katalog-sayfalar/`
 * altına yazar. Teknik çizim çıkarma hattının ilk adımı.
 *
 *   npm run katalog:render                    → ~/Desktop/katalog.pdf
 *   npm run katalog:render -- --pdf=yol.pdf   → başka bir dosya
 *
 * Neden Playwright? Sistemde poppler/ghostscript yok ve pdf.js'in Node tarafı native
 * `canvas` derlemesi istiyor. pdf.js'i zaten kurulu olan Chromium'un içinde çalıştırmak
 * ek bağımlılık gerektirmiyor.
 *
 * ES modülleri `file://` üzerinden CORS'a takıldığı için sahte bir `https://pdfjs.local`
 * kökeni route ile karşılanır — kütüphane, worker ve PDF aynı köken üzerinden servis edilir.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pdfAc } from "./lib/pdfjs-tarayici";

/**
 * 450 DPI. Teknik çizim kutusu sayfa genişliğinin ~%28'i; 300 DPI'da kırpılan çizim
 * 859 px çıkıyor ve retina ekranda ~1344 px'e büyütülüyordu (yumuşak görünüm).
 * 450 DPI'da 1290 px'e çıkıyor, büyütme kalmıyor.
 */
const DPI = 450;
const SCALE = DPI / 72;
const HEDEF_DIR = path.join(process.cwd(), "import", "katalog-sayfalar");

export function kaynakPdfYolu(): string {
  const bayrak = process.argv.find((a) => a.startsWith("--pdf="));
  if (bayrak) return path.resolve(bayrak.slice("--pdf=".length));
  const yerel = path.join(process.cwd(), "import", "katalog.pdf");
  if (existsSync(yerel)) return yerel;
  return path.join(os.homedir(), "Desktop", "katalog.pdf");
}

async function main() {
  const pdfYolu = kaynakPdfYolu();
  if (!existsSync(pdfYolu)) {
    console.error(`Katalog PDF bulunamadı: ${pdfYolu}\n--pdf=<yol> ile belirtin.`);
    process.exit(1);
  }
  await mkdir(HEDEF_DIR, { recursive: true });

  const oturum = await pdfAc(pdfYolu);
  console.log(`${path.basename(pdfYolu)} → ${oturum.sayfaSayisi} sayfa, ${DPI} DPI`);

  try {
    for (let n = 1; n <= oturum.sayfaSayisi; n++) {
      const buf = await oturum.render(n, SCALE);
      const ad = `sayfa-${String(n).padStart(2, "0")}.png`;
      await writeFile(path.join(HEDEF_DIR, ad), buf);
      process.stdout.write(
        `\r  ${n}/${oturum.sayfaSayisi} · ${ad} (${(buf.length / 1024).toFixed(0)} KB)   `,
      );
    }
    process.stdout.write("\n");
  } finally {
    await oturum.kapat();
  }
  console.log(`Tamam → import/katalog-sayfalar/`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
