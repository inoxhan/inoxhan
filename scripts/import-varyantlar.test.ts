import { describe, expect, it } from "vitest";
import { kaliteAyikla, normalizeSku, SKU_ALIAS } from "./import-varyantlar";

describe("normalizeSku", () => {
  it("boşlukları teke indirir ve büyütür", () => {
    expect(normalizeSku("  din   84 ")).toBe("DIN 84");
  });
});

describe("kaliteAyikla", () => {
  it("son token A2/A4 ise ayrıştırır", () => {
    expect(kaliteAyikla("INOX SİLİNDİR BAŞ METRİK VİDA M2x5 A2")).toBe("A2");
    expect(kaliteAyikla("INOX ZİNCİR 13x82 A4")).toBe("A4");
  });

  it("kalite yoksa null döner", () => {
    expect(kaliteAyikla("INOX GÜPİLYA DIN 94")).toBeNull();
    // "A2" kelime içinde geçse de son token değilse alınmaz
    expect(kaliteAyikla("A2 KALİTE ÜRÜN M8")).toBeNull();
  });
});

describe("SKU_ALIAS", () => {
  it("bilinen ekli SKU'lara yönlendirir", () => {
    expect(SKU_ALIAS["DIN 125"]).toBe("DIN 125 A");
    expect(SKU_ALIAS["DIN 127"]).toBe("DIN 127 B");
  });
});
