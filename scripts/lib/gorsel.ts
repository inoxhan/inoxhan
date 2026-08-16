/** Medya hazırlama script'lerinin paylaştığı görsel yardımcıları. */
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

/** Higgsfield çıktısı jpg/png/webp olabiliyor — hangisi geldiyse onu bul. */
export const UZANTILAR = [".jpg", ".jpeg", ".png", ".webp"] as const;

/** `klasor/ad.*` dosyasını arar; yoksa null döner (çağıran uyarı basıp devam eder). */
export function bul(klasor: string, ad: string): string | null {
  for (const uz of UZANTILAR) {
    const yol = path.join(klasor, ad + uz);
    if (existsSync(yol)) return yol;
  }
  return null;
}

/**
 * Kaynağı hedef en-boy oranına ORTADAN kırpar. Ölçek değiştirmez, yalnız fazlalığı atar —
 * asıl küçültmeyi `processHeroImage` vb. yapıyor, burada erken küçültmek çözünürlük yakar.
 */
export async function oranaKirp(buf: Buffer, oran: number): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Görselin boyutu okunamadı");

  const mevcut = w / h;
  // %0.5'in altındaki fark için kırpmıyoruz: yeniden kodlama kayıp getirir, kazandırmaz.
  if (Math.abs(mevcut - oran) / oran < 0.005) return buf;

  const [kw, kh] =
    mevcut > oran
      ? [Math.round(h * oran), h] // fazla geniş → yanlardan kırp
      : [w, Math.round(w / oran)]; // fazla uzun → üstten/alttan kırp

  return sharp(buf)
    .extract({
      left: Math.round((w - kw) / 2),
      top: Math.round((h - kh) / 2),
      width: kw,
      height: kh,
    })
    .png() // ara format kayıpsız olsun; nihai kodlama türev fonksiyonlarında
    .toBuffer();
}

/**
 * Kaynak, üretilecek en büyük türevi besleyecek kadar geniş mi?
 *
 * `processHeroImage` ve kardeşleri `withoutEnlargement: true` kullanıyor: dar bir kaynak
 * DOĞRU İSİMLİ ama küçük bir `-xl` dosyası üretir. Hata da vermez, görsel büyük ekranda
 * sessizce bulanık kalır. Tek yakalama noktası burası.
 */
export function genislikUyari(ad: string, genislik: number, gereken: number): boolean {
  if (genislik >= gereken) return false;
  console.warn(
    `  ! ${ad}: kaynak ${genislik} px, ${gereken} px gerekiyordu — ` +
      "en büyük türev bulanık kalacak. Higgsfield'de upscale edip yeniden at.",
  );
  return true;
}
