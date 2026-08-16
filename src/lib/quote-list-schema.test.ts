import { describe, expect, it } from "vitest";
import { quoteCustomerSchema, quoteListSchema } from "./quote-list-schema";

const gecerliMusteri = {
  company: "Örnek Metal A.Ş.",
  name: "",
  phone: "0532 123 45 67",
  address: "Sanayi Mah. Demir Sk. No:4, Tuzla / İstanbul",
  email: "",
  note: "",
  kvkk: true,
};

describe("quoteCustomerSchema", () => {
  it("firma adı doluyken ad-soyad boş kalabilir", () => {
    expect(quoteCustomerSchema.safeParse(gecerliMusteri).success).toBe(true);
  });

  it("ad-soyad doluyken firma boş kalabilir", () => {
    const r = quoteCustomerSchema.safeParse({ ...gecerliMusteri, company: "", name: "Ali Veli" });
    expect(r.success).toBe(true);
  });

  it("ikisi de boşsa reddeder", () => {
    const r = quoteCustomerSchema.safeParse({ ...gecerliMusteri, company: "", name: "" });
    expect(r.success).toBe(false);
  });

  it("kısa adresi reddeder (kargo için açık adres şart)", () => {
    const r = quoteCustomerSchema.safeParse({ ...gecerliMusteri, address: "İstanbul" });
    expect(r.success).toBe(false);
  });

  it("kvkk onaysız reddeder", () => {
    const r = quoteCustomerSchema.safeParse({ ...gecerliMusteri, kvkk: false });
    expect(r.success).toBe(false);
  });

  it("e-posta opsiyonel ama bozuksa reddeder", () => {
    expect(
      quoteCustomerSchema.safeParse({ ...gecerliMusteri, email: "bozuk@" }).success,
    ).toBe(false);
  });
});

describe("quoteListSchema items", () => {
  const taban = { ...gecerliMusteri, source: "liste" as const };

  it("kodlu kalemleri kabul eder", () => {
    const r = quoteListSchema.safeParse({
      ...taban,
      items: [{ code: "084202 005", freeText: "", quantity: 100, unit: "adet", quality: "" }],
    });
    expect(r.success).toBe(true);
  });

  it("boş listeyi reddeder", () => {
    expect(quoteListSchema.safeParse({ ...taban, items: [] }).success).toBe(false);
  });

  it("kodu ve açıklaması olmayan kalemi reddeder", () => {
    const r = quoteListSchema.safeParse({
      ...taban,
      items: [{ code: "", freeText: "", quantity: 1, unit: "adet", quality: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("dizge adet değerini sayıya çevirir (form girdisi)", () => {
    const r = quoteListSchema.safeParse({
      ...taban,
      items: [{ code: "X", freeText: "", quantity: "25", unit: "kutu", quality: "A4" }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items[0].quantity).toBe(25);
  });
});
