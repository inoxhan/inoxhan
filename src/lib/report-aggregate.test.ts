import { describe, expect, it } from "vitest";
import { buildMonthlyReport, type ReportItemInput, type ReportQuoteInput } from "./report-aggregate";

const SIMDI = new Date("2026-08-17T12:00:00Z");
const saatOnce = (s: number) => new Date(SIMDI.getTime() - s * 60 * 60 * 1000);

function kalem(over: Partial<ReportItemInput> = {}): ReportItemInput {
  return {
    productSku: "DIN 933",
    productName: "Altı Köşe Cıvata",
    categoryName: "Cıvatalar",
    variantCode: "093301",
    variantDescription: "INOX ALTI KÖŞE CIVATA M8x40 A2",
    variantDinNorm: "DIN 933",
    groupCode: "CIVATA",
    freeText: null,
    quantity: 100,
    unit: "adet",
    quality: "A2",
    ...over,
  };
}

// q1: fiyat verildi, 48 saati geçti, sipariş yok → "fiyat tutmadı"
const q1: ReportQuoteInput = {
  id: "q1",
  status: "CEVAPLANAN",
  source: "liste",
  createdAt: saatOnce(96),
  respondedAt: saatOnce(72),
  orderedAt: null,
  customerId: "c1",
  customerName: "Ali Veli",
  customerCompany: "Akım Metal",
  customerPhone: "+905551112233",
  items: [
    kalem(),
    kalem({
      productSku: "DIN 934",
      productName: "Altı Köşe Somun",
      variantCode: "093401",
      variantDescription: "INOX ALTI KÖŞE SOMUN M8 A2",
      variantDinNorm: "DIN 934",
      groupCode: "SOMUN",
      quantity: 50,
    }),
  ],
};

// q2: siparişe döndü
const q2: ReportQuoteInput = {
  id: "q2",
  status: "SIPARIS",
  source: "liste",
  createdAt: saatOnce(13),
  respondedAt: saatOnce(12),
  orderedAt: saatOnce(10),
  customerId: "c2",
  customerName: "Ayşe Yıldız",
  customerCompany: null,
  customerPhone: "+905551112244",
  items: [kalem({ quantity: 200 })],
};

// q3: hiç cevaplanmadı, 48 saat geçti → "yanıtsız kapandı" (katalog dışı kalem)
const q3: ReportQuoteInput = {
  id: "q3",
  status: "YENI",
  source: "liste",
  createdAt: saatOnce(72),
  respondedAt: null,
  orderedAt: null,
  customerId: "c1",
  customerName: "Ali Veli",
  customerCompany: "Akım Metal",
  customerPhone: "+905551112233",
  items: [
    kalem({
      productSku: null,
      productName: null,
      categoryName: null,
      variantCode: null,
      variantDescription: null,
      variantDinNorm: null,
      groupCode: null,
      freeText: "8'lik dübel, siyah",
      quantity: 5,
      quality: null,
    }),
  ],
};

// q4: yeni gelmiş, hâlâ açık
const q4: ReportQuoteInput = {
  id: "q4",
  status: "YENI",
  source: "liste",
  createdAt: saatOnce(1),
  respondedAt: null,
  orderedAt: null,
  customerId: "c3",
  customerName: "Mehmet Kaya",
  customerCompany: "Kaya Makine",
  customerPhone: "+905551112255",
  items: [kalem({ quantity: 10 })],
};

const rapor = buildMonthlyReport([q1, q2, q3, q4], SIMDI);

describe("özet", () => {
  it("talep, firma, kalem ve adet sayar", () => {
    expect(rapor.ozet.talep).toBe(4);
    expect(rapor.ozet.firma).toBe(3); // c1 iki talep açtı, bir kez sayılır
    expect(rapor.ozet.kalem).toBe(5);
    expect(rapor.ozet.toplamAdet).toBe(365);
  });

  it("sonuçları 48 saat kuralına göre ayırır", () => {
    expect(rapor.ozet.siparis).toBe(1);
    expect(rapor.ozet.siparisOrani).toBe(25);
    expect(rapor.ozet.kayip).toBe(1);
    expect(rapor.ozet.yanitsiz).toBe(1);
    expect(rapor.ozet.acik).toBe(1);
  });

  it("katalogda olmayan kalemleri ayrı sayar", () => {
    expect(rapor.ozet.katalogDisi).toBe(1);
  });

  it("yanıt süresini yalnız cevaplanmışlardan hesaplar", () => {
    expect(rapor.ozet.ortYanitDk).toBe(750); // (1440 + 60) / 2
    expect(rapor.ozet.hizliYanitOrani).toBe(100);
  });
});

describe("en çok sorulan ürünler", () => {
  it("talep sayısına göre sıralar, firmayı tekilleştirir", () => {
    const ilk = rapor.urunler[0];
    expect(ilk.sku).toBe("DIN 933");
    expect(ilk.talep).toBe(3);
    expect(ilk.firma).toBe(3);
    expect(ilk.adet).toBe(310);
    expect(ilk.siparis).toBe(1);
  });

  it("ölçü kırılımını taşır", () => {
    expect(rapor.urunler[0].olculer).toEqual([
      { code: "093301", description: "INOX ALTI KÖŞE CIVATA M8x40 A2", talep: 3, adet: 310 },
    ]);
  });

  it("serbest metin kalemini SKU'suz satır olarak tutar", () => {
    const serbest = rapor.urunler.find((u) => u.sku === null);
    expect(serbest?.ad).toBe("8'lik dübel, siyah");
    expect(serbest?.talep).toBe(1);
  });
});

describe("sorulmuş ama verilmemiş", () => {
  it("yalnız fiyat tutmadı sonuçlu talebin kalemlerini içerir", () => {
    expect(rapor.verilmeyenler.map((u) => u.sku).sort()).toEqual(["DIN 933", "DIN 934"]);
    expect(rapor.verilmeyenler.find((u) => u.sku === "DIN 933")?.adet).toBe(100);
  });

  it("yanıtsız kapananları ayrı listeler", () => {
    expect(rapor.yanitsizlar).toHaveLength(1);
    expect(rapor.yanitsizlar[0].ad).toBe("8'lik dübel, siyah");
  });
});

describe("firma dökümü ve dağılımlar", () => {
  it("firmayı talep sayısına göre sıralar", () => {
    expect(rapor.firmalar[0].id).toBe("c1");
    expect(rapor.firmalar[0].talep).toBe(2);
    expect(rapor.firmalar[0].kalem).toBe(3);
  });

  it("kategori dağılımını yüzdeyle verir", () => {
    const civata = rapor.kategoriler.find((k) => k.ad === "Cıvatalar");
    expect(civata?.kalem).toBe(4);
    expect(civata?.oran).toBe(80);
    expect(rapor.kategoriler.find((k) => k.ad === "Katalog dışı")?.kalem).toBe(1);
  });

  it("gecikenlere yanıtsız kapananları alır", () => {
    expect(rapor.gecikenler.map((g) => g.id)).toContain("q3");
  });
});
