/**
 * Higgsfield üretimlerini sitenin beklediği türevlere çevirir.
 *
 *   npm run hazirla:medya
 *
 * Kaynak klasör (prompt paketiyle aynı sözleşme — bkz. docs/higgsfield-promptlar.md):
 *
 *   import/higgsfield/hero/    01-asili.jpg  01-asili-mobil.jpg  02-kilit.jpg  ...
 *   import/higgsfield/sayfa/   hakkimizda-banner.jpg  iletisim.jpg  ...
 *
 * Eksik dosya hata değildir: uyarı basılıp geçilir. Böylece önce yalnız hero setini
 * üretip siteye bakabilir, kalanını sonra ekleyebilirsin.
 *
 * Videolar bu script'in işi değil → npm run hazirla:video
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  HERO_PORTRAIT_VARIANTS,
  HERO_VARIANTS,
  IMAGE_VARIANTS,
  processHeroImage,
  processHeroPortrait,
  processPageImage,
} from "../src/server/media";
import { bul, genislikUyari, oranaKirp } from "./lib/gorsel";

const KOK = path.join(process.cwd(), "import", "higgsfield");

/** HeroSlider bandının oranı — hazirla-hero.ts'teki 2560×1100 ile aynı. */
const HERO_ORAN = 2560 / 1100;
const HERO_MOBIL_ORAN = 2 / 3;
const SAYFA_ORAN = 3 / 2;

const enGenis = (v: readonly { width: number }[]) => Math.max(...v.map((x) => x.width));

/** HERO_SLIDES sırasıyla — dosya adları prompt paketindeki bloklarla birebir. */
const HERO = ["01-asili", "02-kilit", "03-yiv", "04-akis", "05-yuzey"] as const;

/** İçerik sayfası görselleri. `genis` = tam genişlik bant (hero türev genişlikleri). */
const SAYFA: { ad: string; oran: number; genis?: boolean }[] = [
  { ad: "hakkimizda-banner", oran: HERO_ORAN, genis: true },
  { ad: "hakkimizda-tedarik", oran: SAYFA_ORAN },
  { ad: "hakkimizda-lojistik", oran: SAYFA_ORAN },
  { ad: "hakkimizda-kalite", oran: SAYFA_ORAN },
  { ad: "iletisim", oran: SAYFA_ORAN },
];

let islenen = 0;
let atlanan = 0;
let uyari = 0;

/** Tek dosyayı kırpar, ölçer, verilen türev fonksiyonuna verir. */
async function isle(
  klasor: string,
  ad: string,
  oran: number,
  gerekenGenislik: number,
  uret: (buf: Buffer, ad: string) => Promise<{ width: number; height: number }>,
) {
  const kaynak = bul(klasor, ad);
  if (!kaynak) {
    console.log(`  - ${ad}: kaynak yok, atlandı`);
    atlanan++;
    return;
  }

  const kirpilmis = await oranaKirp(await readFile(kaynak), oran);
  // Genişlik ölçümü KIRPMADAN SONRA yapılır: 16:9 bir kare 2.33:1'e kırpılırken
  // yalnız yükseklik gider, ama dikey kaynaklarda genişlik de düşebiliyor.
  const { width = 0 } = await sharp(kirpilmis).metadata();
  if (genislikUyari(ad, width, gerekenGenislik)) uyari++;

  const out = await uret(kirpilmis, ad);
  console.log(`  ✓ ${ad}  ${out.width}×${out.height}`);
  islenen++;
}

async function main() {
  const heroDir = path.join(KOK, "hero");
  const sayfaDir = path.join(KOK, "sayfa");

  console.log("Hero — masaüstü");
  for (const ad of HERO) {
    await isle(heroDir, ad, HERO_ORAN, enGenis(HERO_VARIANTS), processHeroImage);
  }

  console.log("Hero — mobil dikey");
  for (const ad of HERO) {
    await isle(
      heroDir,
      `${ad}-mobil`,
      HERO_MOBIL_ORAN,
      enGenis(HERO_PORTRAIT_VARIANTS),
      processHeroPortrait,
    );
  }

  console.log("Sayfa görselleri");
  for (const s of SAYFA) {
    const variants = s.genis ? HERO_VARIANTS : IMAGE_VARIANTS;
    await isle(sayfaDir, s.ad, s.oran, enGenis(variants), (buf, ad) =>
      processPageImage(buf, ad, variants),
    );
  }

  console.log(`\n${islenen} işlendi, ${atlanan} atlandı, ${uyari} çözünürlük uyarısı.`);
  if (uyari > 0) {
    console.log("Uyarı verilen dosyaları Higgsfield'de upscale edip yeniden çalıştır.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
