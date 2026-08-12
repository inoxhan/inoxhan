import { describe, expect, it } from "vitest";
import { formatPhoneTr, normalizePhoneTr } from "./phone";

describe("normalizePhoneTr", () => {
  it("farklı yazımları tek biçime indirger", () => {
    expect(normalizePhoneTr("0532 123 45 67")).toBe("+905321234567");
    expect(normalizePhoneTr("532 123 45 67")).toBe("+905321234567");
    expect(normalizePhoneTr("+90 532 123 45 67")).toBe("+905321234567");
    expect(normalizePhoneTr("0 (532) 123 45 67")).toBe("+905321234567");
  });

  it("sabit hatları kabul eder (B2B)", () => {
    expect(normalizePhoneTr("0212 345 67 89")).toBe("+902123456789");
    expect(normalizePhoneTr("0850 222 33 44")).toBe("+908502223344");
  });

  it("geçersiz numaraları reddeder", () => {
    expect(normalizePhoneTr("12345")).toBeNull();
    expect(normalizePhoneTr("0132 123 45 67")).toBeNull(); // 1xx alan kodu yok
    expect(normalizePhoneTr("")).toBeNull();
  });
});

describe("formatPhoneTr", () => {
  it("görüntü biçimine çevirir", () => {
    expect(formatPhoneTr("+905321234567")).toBe("0 (532) 123 45 67");
  });
});
