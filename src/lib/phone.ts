/**
 * Türkiye telefon numarası normalizasyonu.
 * Saklama biçimi: +90XXXXXXXXXX (mobil 5xx, sabit hat 2xx/3xx/4xx/8xx).
 */

/** Girilen numarayı +90XXXXXXXXXX biçimine çevirir; geçersizse null döner. */
export function normalizePhoneTr(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let national: string;
  if (digits.length === 10) {
    national = digits; // 5XXXXXXXXX veya 2XXXXXXXXX
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("90")) {
    national = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith("090")) {
    national = digits.slice(3);
  } else {
    return null;
  }

  if (!/^[23458]\d{9}$/.test(national)) return null;
  return `+90${national}`;
}

/** +90XXXXXXXXXX → "0 (5XX) XXX XX XX" görüntü biçimi. */
export function formatPhoneTr(normalized: string): string {
  const m = normalized.match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (!m) return normalized;
  return `0 (${m[1]}) ${m[2]} ${m[3]} ${m[4]}`;
}
