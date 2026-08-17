import { describe, expect, it } from "vitest";
import { onEkiAt, ortakOnEk } from "./ortak-onek";

const DIN933 = [
  "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M3x6 A2",
  "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M3x8 A2",
  "INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA M8x40 A4",
];

describe("ortakOnEk", () => {
  it("aile adını ön ek olarak bulur", () => {
    expect(ortakOnEk(DIN933)).toBe("INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA ");
  });

  it("kelime ortasından kesmez", () => {
    // ortak karakterler "INOX ÇAKMA DÜBEL M" ile bitiyor; "M" atılmalı
    const onEk = ortakOnEk(["INOX ÇAKMA DÜBEL M6x25", "INOX ÇAKMA DÜBEL M8x30"]);
    expect(onEk).toBe("INOX ÇAKMA DÜBEL ");
  });

  it("tek kayıtta ön ek üretmez", () => {
    expect(ortakOnEk(["INOX ZİNCİR 13x82 A4"])).toBe("");
  });

  it("ortak kısım kısaysa ön ek üretmez", () => {
    expect(ortakOnEk(["INOX VİDA M6", "INOX SOMUN M6"])).toBe("");
  });

  it("hiç ortak yoksa boş döner", () => {
    expect(ortakOnEk(["ABC", "XYZ"])).toBe("");
  });
});

describe("onEkiAt", () => {
  it("ön eki atar", () => {
    expect(onEkiAt(DIN933[0], ortakOnEk(DIN933))).toBe("M3x6 A2");
  });

  it("uymayan metni olduğu gibi bırakır", () => {
    expect(onEkiAt("INOX GÜPİLYA DIN 94 2x20", "INOX ZİNCİR ")).toBe("INOX GÜPİLYA DIN 94 2x20");
  });
});
