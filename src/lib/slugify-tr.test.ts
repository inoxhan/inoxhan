import { describe, expect, it } from "vitest";
import { normalizeTr, slugifyTr } from "./slugify-tr";

describe("slugifyTr", () => {
  it("Türkçe karakterleri dönüştürür", () => {
    expect(slugifyTr("Yıldız Havşa Vida")).toBe("yildiz-havsa-vida");
    expect(slugifyTr("Çelik Dübel Ğğ Üü Öö Şş")).toBe("celik-dubel-gg-uu-oo-ss");
  });

  it("Türkçe İ/I büyük harflerini doğru indirger", () => {
    // "I".toLowerCase() JS'te "i" döner; Türkçede "ı" olmalıydı — harita bunu düzeltir
    expect(slugifyTr("ISPARTA")).toBe("isparta");
    expect(slugifyTr("İNOXHAN")).toBe("inoxhan");
    expect(slugifyTr("KILIT SOMUNU")).toBe("kilit-somunu");
  });

  it("ölçü ve norm ifadelerini korur", () => {
    expect(slugifyTr("DIN 933 M8x40 A2-70")).toBe("din-933-m8x40-a2-70");
    expect(slugifyTr('Küresel Vana 1/2" PN25')).toBe("kuresel-vana-1-2-pn25");
  });

  it("fazla boşluk ve noktalama temizler", () => {
    expect(slugifyTr("  Pirinç   Rakor,  3/4''  ")).toBe("pirinc-rakor-3-4");
    expect(slugifyTr("---a---")).toBe("a");
  });

  it("boş girişte boş döner", () => {
    expect(slugifyTr("")).toBe("");
    expect(slugifyTr("   ")).toBe("");
  });
});

describe("normalizeTr", () => {
  it("boşlukları korur, harfleri sadeleştirir", () => {
    expect(normalizeTr("Cıvata M8")).toBe("civata m8");
    expect(normalizeTr("ŞIK ÜRÜN")).toBe("sik urun");
  });
});
