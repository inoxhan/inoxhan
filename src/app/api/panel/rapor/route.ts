import type { NextRequest } from "next/server";
import { requireAdminOrThrow } from "@/server/auth";
import { gecerliAy, getMonthlyReport } from "@/server/reports";

/**
 * Aylık rapor tablolarının CSV çıktısı (panel içi, oturum zorunlu).
 * Türkçe Excel doğru açsın diye: UTF-8 BOM + noktalı virgül ayracı.
 */
const AYIRAC = ";";

function csv(satirlar: (string | number)[][]): string {
  const kacis = (v: string | number) => {
    const s = String(v ?? "");
    return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const BOM = "﻿"; // Excel'in UTF-8'i tanıması için
  return BOM + satirlar.map((r) => r.map(kacis).join(AYIRAC)).join("\r\n");
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrThrow();
  } catch {
    return new Response("Yetkisiz", { status: 401 });
  }

  const ay = gecerliAy(req.nextUrl.searchParams.get("ay"));
  const tablo = req.nextUrl.searchParams.get("tablo") ?? "urunler";
  const { rapor } = await getMonthlyReport(ay);

  const urunSatirlari = (liste: typeof rapor.urunler) => [
    ["Ürün", "SKU", "Kategori", "Talep", "Firma", "Adet", "Siparişe dönen"],
    ...liste.map((s) => [s.ad, s.sku ?? "", s.kategori ?? "", s.talep, s.firma, s.adet, s.siparis]),
  ];

  let satirlar: (string | number)[][];
  switch (tablo) {
    case "verilmeyenler":
      satirlar = urunSatirlari(rapor.verilmeyenler);
      break;
    case "yanitsizlar":
      satirlar = urunSatirlari(rapor.yanitsizlar);
      break;
    case "olculer":
      satirlar = [
        ["Ürün", "SKU", "Ölçü kodu", "Açıklama", "Talep", "Adet"],
        ...rapor.urunler.flatMap((s) =>
          s.olculer.map((v) => [s.ad, s.sku ?? "", v.code, v.description, v.talep, v.adet]),
        ),
      ];
      break;
    case "firmalar":
      satirlar = [
        ["Firma", "Kişi", "Telefon", "Talep", "Kalem", "Adet", "Sipariş", "Son talep"],
        ...rapor.firmalar.map((f) => [
          f.firma ?? "",
          f.ad,
          f.telefon,
          f.talep,
          f.kalem,
          f.adet,
          f.siparis,
          f.sonTalep.toLocaleDateString("tr-TR"),
        ]),
      ];
      break;
    case "kategoriler":
    case "gruplar":
      satirlar = [
        [tablo === "kategoriler" ? "Kategori" : "Ürün grubu", "Kalem", "Adet", "Oran (%)"],
        ...rapor[tablo].map((k) => [k.ad, k.kalem, k.adet, k.oran]),
      ];
      break;
    case "ozet":
      satirlar = [
        ["Ölçüt", "Değer"],
        ...Object.entries(rapor.ozet).map(([k, v]) => [k, v ?? "—"]),
      ];
      break;
    default:
      satirlar = urunSatirlari(rapor.urunler);
  }

  return new Response(csv(satirlar), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inoxhan-${tablo}-${ay}.csv"`,
      "cache-control": "no-store",
    },
  });
}
