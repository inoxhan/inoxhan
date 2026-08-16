/**
 * Statik dışa aktarım (GitHub Pages) desteği — tek doğruluk kaynağı.
 *
 * GitHub Pages proje sitesi bir alt yolda yayınlanır (inoxhan.github.io/inoxhan).
 * next/link basePath'i kendiliğinden ekler ama elle kurulan <img>/<video>/<a>
 * medya URL'leri eklemez; o yüzden kök-göreli her medya yolu buradan geçer.
 *
 * Sunucu modunda (VPS / next start) her iki sabit de boş kalır ve asset()
 * yolu olduğu gibi döndürür — davranış değişmez.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

/** Kök-göreli medya yolunu basePath ile önekler. "media/x" ve "/media/x" ikisi de kabul. */
export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
