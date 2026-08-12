import { describe, expect, it } from "vitest";
import { lowerCaseTr, normalizeTr, slugifyTr, titleCaseTr } from "./slugify-tr";

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

describe("titleCaseTr", () => {
  it("Türkçe I/İ kurallarına uyar", () => {
    // toLowerCase() olsaydı "Tirtikli Rondela Dis" çıkardı
    expect(titleCaseTr("INOX TIRTIKLI RONDELA DIŞ")).toBe("INOX Tırtıklı Rondela Dış");
    expect(titleCaseTr("INOX TIRTIKLI RONDELA İÇ")).toBe("INOX Tırtıklı Rondela İç");
    expect(titleCaseTr("INOX YILDIZ HAVŞA BAŞLI SAÇ VİDASI")).toBe(
      "INOX Yıldız Havşa Başlı Saç Vidası",
    );
  });

  it("kısaltmaları ve tip eklerini büyük bırakır", () => {
    expect(titleCaseTr("INOX MİL EMNİYET SEGMANI TİP A")).toBe(
      "INOX Mil Emniyet Segmanı Tip A",
    );
    expect(titleCaseTr("INOX GUPİLYA")).toBe("INOX Gupilya");
  });

  it("norm numaralarını ve ölçüleri bozmaz", () => {
    expect(titleCaseTr("DIN 933 M8x40")).toBe("DIN 933 M8x40");
    expect(titleCaseTr("INOX DÜZ KAMA DIN 6885 A")).toBe("INOX Düz Kama DIN 6885 A");
  });

  it("İngilizce global adları düzgün yazar", () => {
    expect(titleCaseTr("DROP IN ANCHOR")).toBe("Drop In Anchor");
    expect(titleCaseTr("INOX DOG POINT SETSKUR")).toBe("INOX Dog Point Setskur");
  });
});

describe("lowerCaseTr", () => {
  it("cümle içi kullanım için küçültür, kısaltmaları korur", () => {
    expect(lowerCaseTr("Altıköşe Başlı Metrik Diş Tam Paso Cıvata")).toBe(
      "altıköşe başlı metrik diş tam paso cıvata",
    );
    expect(lowerCaseTr("Mil Emniyet Segmanı Tip A")).toBe("mil emniyet segmanı tip A");
    expect(lowerCaseTr("Dog Point Setskur")).toBe("dog point setskur");
    expect(lowerCaseTr("Tırtıklı Rondela Dış")).toBe("tırtıklı rondela dış");
  });
});
