/**
 * Bir ürün ailesindeki açıklamaların ortak ön eki
 * ("INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA ").
 *
 * Ölçü panelinde zaten o ailenin içindeyiz; ön ek atılınca satırda ölçü öne
 * çıkar ("M8x40 A2") ve dar ekranda kırpılmadan okunur. Biçime dair tahmin yok:
 * ön ek gerçekten ortaksa ve anlamlı uzunluktaysa kesilir, değilse boş döner.
 */
export function ortakOnEk(metinler: string[]): string {
  if (metinler.length < 2) return "";

  let onEk = metinler[0];
  for (const m of metinler) {
    let i = 0;
    while (i < onEk.length && i < m.length && onEk[i] === m[i]) i++;
    onEk = onEk.slice(0, i);
    if (onEk.length < 10) return "";
  }

  // Kelime ortasından kesme ("INOX ALTIK" gibi) — son boşluğa kadar geri sar
  const sonBosluk = onEk.lastIndexOf(" ");
  return sonBosluk >= 10 ? onEk.slice(0, sonBosluk + 1) : "";
}

/** Ön ek uyuyorsa atılmış kısa etiket, uymuyorsa metnin kendisi. */
export function onEkiAt(metin: string, onEk: string): string {
  return onEk && metin.startsWith(onEk) ? metin.slice(onEk.length) : metin;
}
