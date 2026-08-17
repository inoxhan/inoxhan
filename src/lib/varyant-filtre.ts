import { normalizeTr } from "@/lib/slugify-tr";
import type { VariantIndexItem } from "@/server/catalog";

/**
 * Teklif oluşturucunun ölçü araması — kademeli daraltan, tahmin edilebilir eşleştirme.
 *
 * Kural: yazılan HER kelime hedef metinde birebir geçmek zorunda. "din 933" yalnız
 * DIN 933'ü getirir, ardından "8" yazılınca yalnız 8'likler kalır.
 *
 * Sayılar rakam sınırıyla eşleşir: "8" → M8x40 (evet), M18x40 (hayır);
 * "933" → "DIN 933" (evet), "0933203" kodunun içi (hayır). MiniSearch'ün
 * fuzzy/prefix davranışı burada bilinçli olarak kullanılmaz — 933 yazan
 * kullanıcıya 934 gösterilmemeli. Yazım hatası toleransı, sonuç sıfır
 * kaldığında çağrılan yedek arama (variant-search-client.ts) ile korunur.
 */

/** Öğe başına bir kez normalize edilen arama metni — filtre bunun üzerinde çalışır. */
export interface AranabilirVaryant extends VariantIndexItem {
  aranabilir: string;
  normDin: string;
}

export function aranabilirYap(items: VariantIndexItem[]): AranabilirVaryant[] {
  return items.map((v) => ({
    ...v,
    aranabilir: normalizeTr(`${v.description} ${v.code} ${v.dinNorm} ${v.groupCode}`),
    normDin: normalizeTr(v.dinNorm),
  }));
}

export function kelimelereAyir(query: string): string[] {
  return normalizeTr(query)
    .split(/\s+/)
    .filter((k) => k.length > 0);
}

function regexKacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tek kelimenin metinde geçip geçmediği. Rakamla başlayan/biten kelimeler rakam
 * sınırıyla aranır: "8" → "m8x40" (evet), "m18x40" (hayır); "8x40" → "m8x40"
 * (evet), "m18x40" (hayır). Böylece yazdıkça daralma tahmin edilebilir olur.
 */
export function kelimeEslesir(metin: string, kelime: string): boolean {
  const on = /^\d/.test(kelime) ? "(?<!\\d)" : "";
  const arka = /\d$/.test(kelime) ? "(?!\\d)" : "";
  return new RegExp(`${on}${regexKacis(kelime)}${arka}`).test(metin);
}

export function varyantEslesir(v: AranabilirVaryant, kelimeler: string[]): boolean {
  return kelimeler.every((k) => kelimeEslesir(v.aranabilir, k));
}

/**
 * Sayı kelimesinin ÇAP olarak geçtiği kaç kez görülüyor: "8" → "m8x40" (evet),
 * "m3x8" (hayır). Sektörde "8'lik" demek M8 demektir; bu yüzden çap eşleşmesi
 * varsa sonuç ona daraltılır (uzunluk arayan "x8" ya da "3x8" yazar).
 */
function capPuani(v: AranabilirVaryant, kelimeler: string[]): number {
  let puan = 0;
  for (const k of kelimeler) {
    if (!/^\d+$/.test(k)) continue;
    if (new RegExp(`m${k}(?!\\d)`).test(v.aranabilir)) puan += 1;
  }
  return puan;
}

export interface FiltreSonucu {
  items: AranabilirVaryant[];
  /** Sonuç çap eşleşmesine daraltıldı mı (arayüzde ipucu gösterilir) */
  capSuzuldu: boolean;
  /** Limit uygulanmadan önceki eşleşme sayısı */
  toplam: number;
}

/**
 * Sorguya uyan varyantlar. Önce her kelime birebir aranır; sonra çap eşleşmesi
 * olanlar varsa sonuç onlara daraltılır. Sıralama: norm kodu yazılmış olanlar
 * önce (örn. "933" → DIN 933), ardından indeksin doğal ölçü sırası.
 */
export function filtreleVaryantlar(
  items: AranabilirVaryant[],
  query: string,
  limit = 50,
): FiltreSonucu {
  const kelimeler = kelimelereAyir(query);
  if (kelimeler.length === 0) return { items: [], capSuzuldu: false, toplam: 0 };

  const eslesenler = items.filter((v) => varyantEslesir(v, kelimeler));

  const enYuksekCap = eslesenler.reduce((max, v) => Math.max(max, capPuani(v, kelimeler)), 0);
  const secilenler =
    enYuksekCap > 0 ? eslesenler.filter((v) => capPuani(v, kelimeler) === enYuksekCap) : eslesenler;

  // Norm kodu yazılmışsa o ailenin ölçüleri üstte (sort kararlı: kod sırası korunur)
  const sirali = [...secilenler].sort((a, b) => {
    const pa = kelimeler.some((k) => kelimeEslesir(a.normDin, k)) ? 1 : 0;
    const pb = kelimeler.some((k) => kelimeEslesir(b.normDin, k)) ? 1 : 0;
    return pb - pa;
  });

  return {
    items: sirali.slice(0, limit),
    capSuzuldu: enYuksekCap > 0 && secilenler.length < eslesenler.length,
    toplam: sirali.length,
  };
}
