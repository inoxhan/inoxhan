/**
 * Türkçe karakterleri transliterasyonla sadeleştirip URL-uyumlu slug üretir.
 *
 * ÖNEMLİ: Dönüşüm haritası lowercase'ten ÖNCE uygulanır — JS'te "I".toLowerCase()
 * Türkçe metinde "ı" değil "i" üretir ve "İ".toLowerCase() "i̇" (noktalı) döndürür.
 * Tüm slug ve arama normalizasyonu BU fonksiyondan geçmek zorundadır.
 */
const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c",
  ğ: "g", Ğ: "g",
  ı: "i", I: "i",
  i: "i", İ: "i",
  ö: "o", Ö: "o",
  ş: "s", Ş: "s",
  ü: "u", Ü: "u",
};

export function slugifyTr(input: string): string {
  const transliterated = input
    .trim()
    .replace(/[çÇğĞıIiİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase();

  return transliterated
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // kalan aksanlı karakterler (é vb.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Arama/eşleştirme için normalizasyon: slug ile aynı harf dönüşümü, tire yerine boşluk korunur. */
export function normalizeTr(input: string): string {
  return input
    .trim()
    .replace(/[çÇğĞıIiİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
