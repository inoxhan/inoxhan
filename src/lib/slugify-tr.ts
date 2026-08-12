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

/**
 * Olduğu gibi bırakılacak kelimeler: malzeme/norm kısaltmaları ve tek harfli tip ekleri
 * (DIN 7504 K, DIN 6798 J, TİP A…). Küçültülselerdi "INOX" → "ınox" olurdu.
 */
const KEEP_UPPER = new Set([
  "INOX", "DIN", "ISO", "AISI", "PN", "A2", "A4",
  "A", "B", "J", "K", "N", "P", "T",
]);

/**
 * Ürün adlarında geçen İngilizce terimler (dübellerin global adları, "DOG POINT").
 * Türkçe locale bunlarda yanlış sonuç verir: "POINT" → "poınt".
 */
const ENGLISH_WORDS = new Set([
  "DROP", "IN", "ANCHOR", "SLEEVE", "TYPE", "WEDGE", "DOG", "POINT",
]);

/**
 * BÜYÜK HARFLE yazılmış ürün adını okunabilir başlık biçimine çevirir.
 * "INOX TIRTIKLI RONDELA DIŞ" → "INOX Tırtıklı Rondela Dış"
 *
 * Türkçe locale şart: toLowerCase() "TIRTIKLI"yı "tirtikli" yapar (I → i),
 * toLocaleLowerCase("tr") ise doğru şekilde "tırtıklı" verir.
 */
export function titleCaseTr(input: string): string {
  return mapWords(input, (lower, isEnglish) =>
    isEnglish
      ? lower.charAt(0).toUpperCase() + lower.slice(1)
      : lower.charAt(0).toLocaleUpperCase("tr") + lower.slice(1),
  );
}

/**
 * Cümle içinde kullanmak için küçültür; kısaltmalar ve tip ekleri korunur.
 * "INOX Mil Emniyet Segmanı Tip A" → "INOX mil emniyet segmanı tip A"
 */
export function lowerCaseTr(input: string): string {
  return mapWords(input, (lower) => lower);
}

/**
 * Kelime bazlı dönüşüm. Türkçe locale İngilizce kelimeleri bozduğu için
 * ("POINT" → "poınt", "in" → "İn") dönüşüme kelimenin dili de bildirilir.
 */
function mapWords(
  input: string,
  transform: (lowered: string, isEnglish: boolean) => string,
): string {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toLocaleUpperCase("tr");
      if (KEEP_UPPER.has(upper)) return upper;
      // Norm numaraları ve ölçüler ("933", "M8x40") dokunulmadan geçer
      if (/\d/.test(word)) return word;
      if (ENGLISH_WORDS.has(upper)) return transform(word.toLowerCase(), true);
      return transform(word.toLocaleLowerCase("tr"), false);
    })
    .join(" ");
}
