/**
 * Katalog PDF'inin her sayfasından ISO / UNI / DIN norm kodlarını ve İngilizce ürün
 * adını okur. Ürün eşleştirmesinin kaynağı budur.
 *
 * Metin, sayfa metnindeki sıraya göre değil KONUMA göre okunur: "DIN" başlık hücresi
 * bulunur, tam altındaki hücrede yazan değer alınır. Şablonda üç norm sütunu yan yana
 * olduğu için sıra bazlı okuma güvenilir değil.
 */
import { pdfAc, type MetinOge } from "./pdfjs-tarayici";

export type { MetinOge };

export interface SayfaNorm {
  sayfa: number;
  iso: string | null;
  uni: string | null;
  din: string | null;
  /** İkinci başlık bandındaki İngilizce ad — normu olmayan ürünlerin (dübeller) anahtarı. */
  ingilizceAd: string | null;
  ogeler: MetinOge[];
}

/** Başlık hücresinin hemen altındaki ilk anlamlı değeri döndürür. */
function altindakiDeger(ogeler: MetinOge[], baslik: MetinOge): string | null {
  const merkez = baslik.x + baslik.w / 2;
  const adaylar = ogeler
    .filter((o) => {
      const om = o.x + o.w / 2;
      // Aynı sütun (başlık genişliğinin yarısı kadar tolerans) ve başlığın altında
      return (
        Math.abs(om - merkez) < Math.max(baslik.w, 40) &&
        o.y < baslik.y - 4 &&
        o.y > baslik.y - 110 &&
        o.str.trim().length > 0
      );
    })
    .sort((a, b) => b.y - a.y); // en üstteki (y büyük) önce
  const ilk = adaylar[0]?.str.trim() ?? null;
  // "A2/A4" kalite satırı normun altına düşüyor; norm değeri değil.
  if (!ilk || /^A[24]\s*(\/\s*A[24])?$/i.test(ilk)) return null;
  // Bazı sayfalarda kalite kodu norm hücresine yapışık geliyor ("471 A2").
  // DIN biçim harfleri tek karakterdir (125 A, 6798 J, 7504 K) — "A2"/"A4" değil,
  // bu yüzden yalnız rakamlı kalite eki temizlenir.
  const temiz = ilk.replace(/\s*A[24](\s*\/\s*A[24])?\s*$/i, "").trim();
  return temiz.length > 0 ? temiz : null;
}

export async function katalogNormlari(pdfYolu: string): Promise<SayfaNorm[]> {
  const oturum = await pdfAc(pdfYolu);
  const sonuc: SayfaNorm[] = [];

  try {
    for (let n = 1; n <= oturum.sayfaSayisi; n++) {
      const ogeler = await oturum.metin(n);

      const basliginiBul = (etiket: string) =>
        ogeler.find((o) => o.str.trim().toUpperCase() === etiket) ?? null;

      const isoB = basliginiBul("ISO");
      const uniB = basliginiBul("UNI");
      const dinB = basliginiBul("DIN");

      // İkinci başlık bandı: sayfanın üst %10'unda, tamamı büyük harf İngilizce ad.
      const ustSinir = Math.max(...ogeler.map((o) => o.y), 0);
      const ingilizceAd =
        ogeler
          .filter(
            (o) =>
              o.y > ustSinir - 90 &&
              o.y < ustSinir - 10 &&
              /^[A-Z0-9][A-Z0-9 .,()/+-]{4,}$/.test(o.str.trim()),
          )
          .sort((a, b) => a.x - b.x)[0]?.str.trim() ?? null;

      sonuc.push({
        sayfa: n,
        iso: isoB ? altindakiDeger(ogeler, isoB) : null,
        uni: uniB ? altindakiDeger(ogeler, uniB) : null,
        din: dinB ? altindakiDeger(ogeler, dinB) : null,
        ingilizceAd,
        ogeler,
      });
    }
  } finally {
    await oturum.kapat();
  }

  return sonuc;
}
