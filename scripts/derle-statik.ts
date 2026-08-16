/**
 * GitHub Pages statik derlemesi — `npm run derle:statik`
 *
 * GitHub Pages sunucu çalıştırmaz; site "output: export" ile salt HTML/CSS/JS
 * olarak derlenir (bkz. next.config.ts). Sunucu gerektiren rotalar (panel, api,
 * katalog-baski) derleme süresince geçici olarak dışarı alınır, ISR/dinamik
 * segment ayarları geçici olarak kapatılır; script her durumda (hata dahil)
 * dosyaları eski hâline döndürür.
 *
 * Statik sürümde çalışmayan özellikler bilinçli ödünlerdir:
 *   - Yönetim paneli, teklif kaydı/e-postası, analitik, dosya eki
 *   - Teklif formu WhatsApp/e-posta taslağına düşer (quote-static.ts)
 *
 * Çıktı: out/ → gh-pages dalına itilir (README "GitHub Pages" bölümü).
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const KOK = path.join(__dirname, "..");
const GECICI = path.join(KOK, ".statik-cikarilan");

/** GitHub Pages proje sitesi adresi — depo adı değişirse burayı güncelle. */
const BASE_PATH = "/inoxhan";
const SITE_URL = "https://inoxhan.github.io/inoxhan";

/** Derleme süresince dışarı alınan sunucu rotaları. */
const CIKARILAN_DIZINLER = ["src/app/panel", "src/app/api", "src/app/katalog-baski"];

/** Statik dışa aktarımın kabul etmediği segment ayarları — geçici kapatılır. */
const YAMALAR: { dosya: string; ara: string; koy: string }[] = [
  {
    dosya: "src/app/page.tsx",
    ara: 'export const revalidate = 3600;',
    koy: '// STATIK: export const revalidate = 3600;',
  },
  {
    dosya: "src/app/sitemap.ts",
    ara: 'export const revalidate = 3600;',
    koy: '// STATIK: export const revalidate = 3600;',
  },
  {
    dosya: "src/app/katalog/page.tsx",
    ara: 'export const dynamic = "force-dynamic";',
    koy: '// STATIK: export const dynamic = "force-dynamic";',
  },
];

/** Derleme sonrası public/'ten silinecek geçici üretimler. */
const GECICI_PUBLIC = ["public/search-index.json", "public/katalog.pdf"];

function envDosyasindanOku(anahtar: string): string {
  try {
    const icerik = readFileSync(path.join(KOK, ".env"), "utf8");
    const satir = icerik.split(/\r?\n/).find((s) => s.startsWith(`${anahtar}=`));
    if (!satir) return "";
    return satir.slice(anahtar.length + 1).replace(/^"|"$/g, "").trim();
  } catch {
    return "";
  }
}

async function aramaIndeksiUret() {
  // Alias'lı importlar tsx altında tsconfig paths ile çözülür
  const { getSearchIndexData } = await import("../src/server/catalog");
  const veriler = await getSearchIndexData();
  writeFileSync(path.join(KOK, "public", "search-index.json"), JSON.stringify(veriler), "utf8");
  console.log(`✓ search-index.json: ${veriler.length} ürün`);
}

function katalogPdfKopyala() {
  const dizin = path.join(KOK, "storage", "katalog");
  if (!existsSync(dizin)) return;
  const pdfler = readdirSync(dizin)
    .filter((f) => f.startsWith("katalog-") && f.endsWith(".pdf"))
    .map((f) => ({ f, mtime: statSync(path.join(dizin, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (pdfler.length === 0) return;
  copyFileSync(path.join(dizin, pdfler[0].f), path.join(KOK, "public", "katalog.pdf"));
  console.log(`✓ katalog.pdf: ${pdfler[0].f}`);
}

async function main() {
  const tasinanlar: { kaynak: string; hedef: string }[] = [];
  const yamalananlar: { dosya: string; orijinal: string }[] = [];

  mkdirSync(GECICI, { recursive: true });

  try {
    // 0) Eski dev/build tip üretimleri dışarı alınan rotalara referans veriyor
    rmSync(path.join(KOK, ".next"), { recursive: true, force: true });

    // 1) Sunucu rotalarını dışarı al
    for (const d of CIKARILAN_DIZINLER) {
      const kaynak = path.join(KOK, d);
      if (!existsSync(kaynak)) continue;
      const hedef = path.join(GECICI, d.replace(/[\\/]/g, "__"));
      renameSync(kaynak, hedef);
      tasinanlar.push({ kaynak, hedef });
      console.log(`→ dışarı alındı: ${d}`);
    }

    // 2) Statik dışa aktarımın reddettiği segment ayarlarını kapat
    for (const y of YAMALAR) {
      const dosya = path.join(KOK, y.dosya);
      const orijinal = readFileSync(dosya, "utf8");
      if (!orijinal.includes(y.ara)) {
        console.warn(`! yama atlandı (bulunamadı): ${y.dosya} — "${y.ara}"`);
        continue;
      }
      yamalananlar.push({ dosya, orijinal });
      writeFileSync(dosya, orijinal.replace(y.ara, y.koy), "utf8");
      console.log(`→ yamalandı: ${y.dosya}`);
    }

    // 3) Statik varlıkları üret
    await aramaIndeksiUret();
    katalogPdfKopyala();

    // 4) next build (output: export)
    const sonuc = spawnSync("npx", ["next", "build"], {
      cwd: KOK,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        STATIC_EXPORT: "1",
        NEXT_PUBLIC_STATIC: "1",
        NEXT_PUBLIC_BASE_PATH: BASE_PATH,
        NEXT_PUBLIC_SITE_URL: SITE_URL,
        NEXT_PUBLIC_WHATSAPP_NUMBER: envDosyasindanOku("WHATSAPP_NUMBER"),
        NEXT_PUBLIC_QUOTE_EMAIL:
          envDosyasindanOku("NOTIFY_EMAIL") || "maksu21@gmail.com",
      },
    });
    if (sonuc.status !== 0) throw new Error(`next build başarısız (kod ${sonuc.status})`);

    // 5) GitHub Pages: _next/ dizini Jekyll tarafından yutulmasın
    writeFileSync(path.join(KOK, "out", ".nojekyll"), "", "utf8");

    // 6) Dağıtım iş akışı gh-pages dalında yaşar — her derlemede out/'a yazılır ki
    //    dal tamamen out/ içeriğiyle değiştirildiğinde iş akışı kaybolmasın
    const isAkisi = path.join(KOK, "out", ".github", "workflows");
    mkdirSync(isAkisi, { recursive: true });
    writeFileSync(
      path.join(isAkisi, "pages.yml"),
      `# gh-pages dalindaki hazir statik ciktiyi GitHub Pages'e dagitir.
# Ilk calismada Pages kaynagini "GitHub Actions" moduna cevirir —
# boylece main'deki README degil, bu daldaki site yayinlanir.
name: GitHub Pages yayini

on:
  push:
    branches: [gh-pages]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
`,
      "utf8",
    );
    console.log("✓ out/ hazır — gh-pages dalına itilebilir");
  } finally {
    for (const y of yamalananlar) writeFileSync(y.dosya, y.orijinal, "utf8");
    for (const t of tasinanlar.reverse()) renameSync(t.hedef, t.kaynak);
    for (const p of GECICI_PUBLIC) rmSync(path.join(KOK, p), { force: true });
    rmSync(GECICI, { recursive: true, force: true });
    console.log("✓ kaynak ağacı eski hâline döndürüldü");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
