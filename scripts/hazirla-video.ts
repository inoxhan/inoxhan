/**
 * Hero videosunu ve (varsa) hazır showreel/katalog kliplerini web'e uygun hale getirir.
 *
 *   npm run hazirla:video
 *
 * Kaynak:  import/higgsfield/hero/01-asili.mp4
 *          import/higgsfield/showreel/{01-hizli,02-kapsam,03-teklif}.mp4  (opsiyonel)
 *          import/higgsfield/katalog/katalog.mp4                          (opsiyonel)
 * Çıktı:   public/media/video/{ad}.{mp4,webm} + {ad}-poster-*.{avif,webp}
 *
 * Showreel ve katalog arka planı için ikişer üretici var, hepsi aynı çıktı adlarına
 * yazar — en son çalıştırılan kazanır:
 *   - BU script: kullanıcının Higgsfield'de ürettiği hazır klipleri kodlar
 *   - `npm run hazirla:showreel` / `hazirla:katalog-video`: 54 ürünün gerçek
 *     fotoğraflarından montajlar
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { HERO_VARIANTS } from "../src/server/media";
import { kodla } from "./lib/video";

const KOK = path.join(process.cwd(), "import", "higgsfield");

/** HeroSlider bandının oranı — hazirla-medya.ts ile aynı. */
const HERO_ORAN = 2560 / 1100;

const UZANTILAR = [".mp4", ".mov", ".webm"];

function kaynakBul(klasor: string, ad: string): string | null {
  for (const uz of UZANTILAR) {
    const yol = path.join(KOK, klasor, ad + uz);
    if (existsSync(yol)) return yol;
  }
  return null;
}

async function main() {
  // ── Hero ──
  const hero = kaynakBul("hero", "01-asili");
  if (hero) {
    await kodla(hero, "01-asili", {
      oran: HERO_ORAN,
      pingPong: true, // hero `loop` ile sürekli dönüyor, dikiş görünmesin
      sinirMB: 3,
      posterVariants: HERO_VARIANTS,
    });
  } else {
    console.log("01-asili: kaynak yok (import/higgsfield/hero/), atlandı");
    console.log("Hero videosu olmadan slayt poster görselini gösterir — site çalışır.");
  }

  // ── Showreel (hazır klipler) ──
  const adlar = ["01-hizli", "02-kapsam", "03-teklif"] as const;
  const klipler = adlar
    .map((ad) => ({ ad, kaynak: kaynakBul("showreel", ad) }))
    .filter((k): k is { ad: (typeof adlar)[number]; kaynak: string } => k.kaynak !== null);

  if (klipler.length === 0) {
    console.log("\nShowreel kaynağı yok — montaj kullanılıyor: npm run hazirla:showreel");
  } else {
    console.log(`\nShowreel: ${klipler.length}/3 hazır klip bulundu`);
    for (const k of klipler) {
      // pingPong yok: klipler yönlü kamera hareketi içeriyor, geri sarım ucuz duruyor.
      // sinirMB 2.5: `02-kapsam` (yüzlerce parçalık dizilim) crf 27'de 2 MB'ı aşabiliyor;
      // kaliteyi kırmaya değmeyecek kadar küçük bir aşım.
      await kodla(k.kaynak, k.ad, { oran: 16 / 9, sinirMB: 2.5, crf: 27 });
    }
  }

  // ── Katalog arka planı (hazır klip) ──
  const katalog = kaynakBul("katalog", "katalog");
  if (katalog) {
    // Ping-pong YOK: klip 20 sn — döngü dikişi bu uzunlukta zaten nadiren yakalanıyor,
    // ters kopya eklemek yalnız dosyayı ikiye katlardı. crf 28: arka planda karartma
    // altında oynuyor, showreel'den bir kademe kısık kalite fark edilmiyor.
    console.log("\nKatalog arka planı: hazır klip bulundu");
    await kodla(katalog, "katalog-duvar", { oran: 16 / 9, sinirMB: 4, crf: 28 });
  } else {
    console.log("\nKatalog arka planı kaynağı yok — montaj: npm run hazirla:katalog-video");
  }

  console.log("\nVideolar hazır → public/media/video/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
