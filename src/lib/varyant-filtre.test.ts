import { describe, expect, it } from "vitest";
import type { VariantIndexItem } from "@/server/catalog";
import { aranabilirYap, filtreleVaryantlar, kelimeEslesir, kelimelereAyir } from "./varyant-filtre";

function v(
  code: string,
  dinNorm: string,
  description: string,
  quality: string | null = "A2",
): VariantIndexItem {
  return {
    id: 0,
    code,
    groupCode: "CIVATA",
    dinNorm,
    description,
    quality,
    image: null,
    productSlug: null,
    categorySlug: null,
  };
}

const KATALOG = aranabilirYap([
  v("0933208 040", "DIN 933", "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M8x40 A2"),
  v("0933208 050", "DIN 933", "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M8x50 A2"),
  v("0933218 040", "DIN 933", "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M18x40 A2"),
  v("0933408 040", "DIN 933", "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M8x40 A4", "A4"),
  v("0934208 000", "DIN 934", "INOX ALTIKÖŞE SOMUN M8 A2"),
  v("0931208 040", "DIN 931", "INOX ALTIKÖŞE BAŞLI METRİK DİŞ YARIM PASO CIVATA M8x40 A2"),
  v("0125208 000", "DIN 125 A", "INOX DÜZ RONDELA M8 A2"),
]);

const kodlar = (q: string) => filtreleVaryantlar(KATALOG, q).items.map((x) => x.code);

describe("kelimelereAyir", () => {
  it("Türkçe karakterleri ve büyük harfi normalize eder", () => {
    expect(kelimelereAyir("  DİN   933 ")).toEqual(["din", "933"]);
  });

  it("boş sorguda kelime üretmez", () => {
    expect(kelimelereAyir("   ")).toEqual([]);
  });
});

describe("kelimeEslesir", () => {
  it("sayıyı rakam sınırıyla arar", () => {
    expect(kelimeEslesir("civata m8x40 a2", "8")).toBe(true);
    expect(kelimeEslesir("civata m18x40 a2", "8")).toBe(false);
    expect(kelimeEslesir("din 933", "933")).toBe(true);
    expect(kelimeEslesir("0933203 006", "933")).toBe(false);
  });

  it("harf içeren kelimeyi alt dizge olarak arar", () => {
    expect(kelimeEslesir("inox altikose civata", "civata")).toBe(true);
    expect(kelimeEslesir("civata m8x40 a2", "m8x40")).toBe(true);
    expect(kelimeEslesir("civata m8x40 a2", "somun")).toBe(false);
  });

  it("rakamla başlayan/biten kelimede de rakam sınırı uygular", () => {
    expect(kelimeEslesir("civata m8x40 a2", "8x40")).toBe(true);
    expect(kelimeEslesir("civata m18x40 a2", "8x40")).toBe(false); // 18x40 içine düşmesin
    expect(kelimeEslesir("civata m8x40 a2", "m8")).toBe(true);
    expect(kelimeEslesir("civata m80x40 a2", "m8")).toBe(false);
  });
});

describe("filtreleVaryantlar", () => {
  it("norm yazınca yalnız o normu getirir (934/931 karışmaz)", () => {
    expect(kodlar("din 933")).toEqual([
      "0933208 040",
      "0933208 050",
      "0933218 040",
      "0933408 040",
    ]);
  });

  it("ikinci kelime sonucu daraltır", () => {
    // "933 8" → DIN 933'ün M8'likleri; M18 elenir
    expect(kodlar("933 8")).toEqual(["0933208 040", "0933208 050", "0933408 040"]);
  });

  it("sayı çap olarak yorumlanır, uzunluk olarak değil", () => {
    // M3x8 (8 mm uzunluk) "8" aramasına girmemeli; M8'ler kalmalı
    const r = filtreleVaryantlar(
      aranabilirYap([
        v("A", "DIN 933", "INOX CIVATA M8x40 A2"),
        v("B", "DIN 933", "INOX CIVATA M3x8 A2"),
        v("C", "DIN 933", "INOX CIVATA M8x50 A2"),
      ]),
      "8",
    );
    expect(r.items.map((x) => x.code)).toEqual(["A", "C"]);
    expect(r.capSuzuldu).toBe(true);
  });

  it("çap eşleşmesi yoksa daraltma yapılmaz", () => {
    const r = filtreleVaryantlar(KATALOG, "din 933");
    expect(r.capSuzuldu).toBe(false);
    expect(r.toplam).toBe(4);
  });

  it("uzunluk aramak isteyen ölçüyü birlikte yazar", () => {
    expect(kodlar("3x8")).toEqual([]); // örnek katalogda M3x8 yok
    expect(kodlar("8x40")).toEqual(["0933208 040", "0933408 040", "0931208 040"]);
  });

  it("ölçüyle tek başına arama yapılabilir", () => {
    expect(kodlar("m8x40")).toEqual(["0933208 040", "0933408 040", "0931208 040"]);
  });

  it("kalite kelimesiyle daraltır", () => {
    expect(kodlar("933 8 a4")).toEqual(["0933408 040"]);
  });

  it("eşleşme yoksa boş döner (yedek aramaya düşülür)", () => {
    expect(kodlar("cıvta")).toEqual([]);
  });

  it("boş sorguda sonuç üretmez", () => {
    expect(kodlar("  ")).toEqual([]);
  });

  it("limit uygulanır ama toplam bildirilir", () => {
    const r = filtreleVaryantlar(KATALOG, "civata", 2);
    expect(r.items).toHaveLength(2);
    expect(r.toplam).toBeGreaterThan(2);
  });
});
