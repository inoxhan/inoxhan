import { describe, expect, it } from "vitest";
import { buildSearchIndex, searchProducts, type SearchIndexItem } from "./search-client";

const ITEMS: SearchIndexItem[] = [
  {
    id: "1",
    sku: "INX-CV-0001",
    name: "Altıköşe Başlı Cıvata DIN 933 M8x40 A2",
    slug: "profix-altikose-basli-civata-din-933-m8x40-a2",
    model: "DIN 933",
    brand: "ProFix",
    category: "Cıvatalar",
    categorySlug: "civatalar",
    image: null,
    specText: "Norm DIN 933 Ölçü M8x40 Malzeme A2-70 Paslanmaz Çelik",
    specs: [],
  },
  {
    id: "2",
    sku: "INX-SM-0002",
    name: "Fiberli Kilitli Somun DIN 985 M10",
    slug: "steelmax-fiberli-kilitli-somun-din-985-m10",
    model: "DIN 985",
    brand: "SteelMax",
    category: "Somunlar",
    categorySlug: "somunlar",
    image: null,
    specText: "Norm DIN 985 Ölçü M10 Kalite 8",
    specs: [],
  },
];

describe("arama (MiniSearch + normalizeTr)", () => {
  const mini = buildSearchIndex(ITEMS);

  it("tam kelimeyle bulur", () => {
    const r = searchProducts(mini, "civata m8");
    expect(r[0]?.sku).toBe("INX-CV-0001");
  });

  it("Türkçe karakter farkını tolere eder (cıvata ↔ civata)", () => {
    expect(searchProducts(mini, "cıvata")[0]?.sku).toBe("INX-CV-0001");
    expect(searchProducts(mini, "CIVATA")[0]?.sku).toBe("INX-CV-0001");
  });

  it("yazım hatasını tolere eder (cıvta)", () => {
    expect(searchProducts(mini, "cıvta")[0]?.sku).toBe("INX-CV-0001");
  });

  it("SKU ile bulur", () => {
    expect(searchProducts(mini, "INX-SM-0002")[0]?.sku).toBe("INX-SM-0002");
  });

  it("model normuyla bulur", () => {
    expect(searchProducts(mini, "din 985")[0]?.sku).toBe("INX-SM-0002");
  });

  it("alakasız sorguda boş döner", () => {
    expect(searchProducts(mini, "xqzw")).toHaveLength(0);
  });
});
