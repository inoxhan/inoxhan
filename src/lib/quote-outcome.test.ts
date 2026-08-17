import { describe, expect, it } from "vitest";
import { LOST_AFTER_HOURS } from "./constants";
import { isOpenQuote, outcomeDeadline, quoteOutcome } from "./quote-outcome";

const SIMDI = new Date("2026-08-17T12:00:00Z");
const saatOnce = (s: number) => new Date(SIMDI.getTime() - s * 60 * 60 * 1000);
const dakikaOnce = (d: number) => new Date(SIMDI.getTime() - d * 60 * 1000);

describe("quoteOutcome", () => {
  it("sipariş işaretliyse satıldı", () => {
    expect(
      quoteOutcome(
        {
          status: "SIPARIS",
          createdAt: saatOnce(500),
          respondedAt: saatOnce(499),
          orderedAt: saatOnce(400),
        },
        SIMDI,
      ),
    ).toBe("satildi");
  });

  it("cevaplanan + süre dolmadıysa müşteride", () => {
    expect(
      quoteOutcome(
        {
          status: "CEVAPLANAN",
          createdAt: saatOnce(50),
          respondedAt: dakikaOnce(LOST_AFTER_HOURS * 60 - 1),
          orderedAt: null,
        },
        SIMDI,
      ),
    ).toBe("musteride");
  });

  it("cevaplanan + 48 saat dolduysa fiyat tutmadı", () => {
    expect(
      quoteOutcome(
        {
          status: "CEVAPLANAN",
          createdAt: saatOnce(60),
          respondedAt: dakikaOnce(LOST_AFTER_HOURS * 60 + 1),
          orderedAt: null,
        },
        SIMDI,
      ),
    ).toBe("fiyat_tutmadi");
  });

  it("cevaplanmamış + süre dolmadıysa açık", () => {
    expect(
      quoteOutcome(
        { status: "YENI", createdAt: dakikaOnce(30), respondedAt: null, orderedAt: null },
        SIMDI,
      ),
    ).toBe("acik");
  });

  it("cevaplanmamış + 48 saat dolduysa yanıtsız kapandı", () => {
    expect(
      quoteOutcome(
        { status: "BEKLEYEN", createdAt: saatOnce(49), respondedAt: null, orderedAt: null },
        SIMDI,
      ),
    ).toBe("yanitsiz");
  });

  it("eşik tam 48 saatte kapanır", () => {
    const tam = {
      status: "CEVAPLANAN",
      createdAt: saatOnce(100),
      respondedAt: saatOnce(LOST_AFTER_HOURS),
      orderedAt: null,
    };
    expect(quoteOutcome(tam, SIMDI)).toBe("fiyat_tutmadi");
  });

  it("durum CEVAPLANAN olmasa da sipariş damgası satıldı yapar", () => {
    expect(
      quoteOutcome(
        { status: "BEKLEYEN", createdAt: saatOnce(72), respondedAt: null, orderedAt: saatOnce(1) },
        SIMDI,
      ),
    ).toBe("satildi");
  });
});

describe("outcomeDeadline", () => {
  it("açık talepte createdAt + 48 saat", () => {
    const q = { status: "YENI", createdAt: saatOnce(2), respondedAt: null, orderedAt: null };
    expect(outcomeDeadline(q, SIMDI)?.getTime()).toBe(
      q.createdAt.getTime() + LOST_AFTER_HOURS * 3600_000,
    );
  });

  it("kapanmış talepte null", () => {
    expect(
      outcomeDeadline(
        { status: "CEVAPLANAN", createdAt: saatOnce(100), respondedAt: saatOnce(99), orderedAt: null },
        SIMDI,
      ),
    ).toBeNull();
  });
});

describe("isOpenQuote", () => {
  it("yalnız süresi dolmamış cevapsız talepler açıktır", () => {
    expect(
      isOpenQuote({ status: "YENI", createdAt: dakikaOnce(10), respondedAt: null, orderedAt: null }, SIMDI),
    ).toBe(true);
    expect(
      isOpenQuote({ status: "YENI", createdAt: saatOnce(72), respondedAt: null, orderedAt: null }, SIMDI),
    ).toBe(false);
  });
});
