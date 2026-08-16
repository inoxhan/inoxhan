import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const outputDir = path.resolve(
  "outputs",
  "01a00b62-ba26-7821-bb51-3fd88344f2f3",
);
const outputPath = path.join(outputDir, "din-84-ilk-urun-ornek.xlsx");

const productName = "INOX SİLİNDİR BAŞ METRİK VİDA";
const dinNorm = "DIN 84";
const sizes = [
  ["M2", [5, 6, 8, 10, 12, 14, 16, 20, 25]],
  ["M2,5", [4, 5, 6, 8, 10, 12, 14, 16, 20, 25]],
  ["M3", [4, 5, 6, 8, 10, 12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60]],
  ["M4", [6, 8, 10, 12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60]],
  ["M5", [6, 8, 10, 12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80]],
  ["M6", [8, 10, 12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80]],
  ["M8", [10, 12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80]],
  ["M10", [12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80]],
];

const rowsForGrade = (grade) =>
  sizes.flatMap(([metric, lengths]) =>
    lengths.map((length) => [
      dinNorm,
      `${productName} ${metric}x${length} ${grade}`,
    ]),
  );

const a2Rows = rowsForGrade("A2");
const a4Rows = rowsForGrade("A4");
const rows = [["DIN Normu", "Açıklama"], ...a2Rows, ...a4Rows];

if (a2Rows.length !== 113 || a4Rows.length !== 113) {
  throw new Error(`Beklenen kalite başına 113 satır; oluşan A2=${a2Rows.length}, A4=${a4Rows.length}`);
}

const descriptions = rows.slice(1).map((row) => row[1]);
if (new Set(descriptions).size !== 226) {
  throw new Error("Açıklama alanlarında yinelenen ürün satırı bulundu.");
}

const worksheet = XLSX.utils.aoa_to_sheet(rows);
worksheet["!cols"] = [{ wch: 16 }, { wch: 54 }];
worksheet["!rows"] = [{ hpt: 25 }, ...Array.from({ length: 226 }, () => ({ hpt: 19 }))];
worksheet["!autofilter"] = { ref: "A1:B227" };
worksheet["!freeze"] = {
  xSplit: 0,
  ySplit: 1,
  topLeftCell: "A2",
  activePane: "bottomLeft",
  state: "frozen",
};
worksheet["!margins"] = {
  left: 0.35,
  right: 0.35,
  top: 0.5,
  bottom: 0.5,
  header: 0.2,
  footer: 0.2,
};
worksheet["!pageSetup"] = {
  orientation: "portrait",
  fitToWidth: 1,
  fitToHeight: 0,
  paperSize: 9,
};

const thinGray = { style: "thin", color: { rgb: "FFD9E2E7" } };
const headerStyle = {
  font: { name: "Aptos Display", sz: 12, bold: true, color: { rgb: "FFFFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "FF0B5E8E" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: { bottom: { style: "medium", color: { rgb: "FF083D5B" } } },
};
const normStyle = {
  font: { name: "Aptos", sz: 10, color: { rgb: "FF1F2933" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: { bottom: thinGray },
};
const descriptionStyle = {
  font: { name: "Aptos", sz: 10, color: { rgb: "FF1F2933" } },
  alignment: { horizontal: "left", vertical: "center" },
  border: { bottom: thinGray },
};

for (const address of ["A1", "B1"]) worksheet[address].s = headerStyle;
for (let rowNumber = 2; rowNumber <= 227; rowNumber += 1) {
  worksheet[`A${rowNumber}`].s = { ...normStyle };
  worksheet[`B${rowNumber}`].s = { ...descriptionStyle };

  if (rowNumber % 2 === 1) {
    const bandFill = { patternType: "solid", fgColor: { rgb: "FFF3F7F9" } };
    worksheet[`A${rowNumber}`].s.fill = bandFill;
    worksheet[`B${rowNumber}`].s.fill = bandFill;
  }
}

for (const column of ["A", "B"]) {
  const cell = worksheet[`${column}115`];
  cell.s = {
    ...cell.s,
    border: {
      ...cell.s.border,
      top: { style: "medium", color: { rgb: "FF16A085" } },
    },
  };
}

const workbook = XLSX.utils.book_new();
workbook.Props = {
  Title: "DIN 84 İlk Ürün Excel Örneği",
  Subject: "INOX SİLİNDİR BAŞ METRİK VİDA - A2 ve A4 ölçü listesi",
  Author: "User",
  Comments: "Kaynak: katalog.pdf, PDF sayfa 2. Dolu metrik-boy hücreleri kullanılmıştır.",
};
XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

fs.mkdirSync(outputDir, { recursive: true });
XLSX.writeFile(workbook, outputPath, {
  bookType: "xlsx",
  compression: true,
  bookSST: true,
  cellStyles: true,
});

const checkWorkbook = XLSX.readFile(outputPath, { cellStyles: true });
const checkSheet = checkWorkbook.Sheets["Ürünler"];
const checkRows = XLSX.utils.sheet_to_json(checkSheet, { header: 1, defval: "" });

const expected = {
  rowCount: 227,
  headers: ["DIN Normu", "Açıklama"],
  first: ["DIN 84", `${productName} M2x5 A2`],
  lastA2: ["DIN 84", `${productName} M10x80 A2`],
  firstA4: ["DIN 84", `${productName} M2x5 A4`],
  last: ["DIN 84", `${productName} M10x80 A4`],
};

const sameRow = (left, right) => JSON.stringify(left) === JSON.stringify(right);
if (
  checkRows.length !== expected.rowCount ||
  !sameRow(checkRows[0], expected.headers) ||
  !sameRow(checkRows[1], expected.first) ||
  !sameRow(checkRows[113], expected.lastA2) ||
  !sameRow(checkRows[114], expected.firstA4) ||
  !sameRow(checkRows[226], expected.last)
) {
  throw new Error("Yazılan Excel dosyasının satır sırası veya içeriği doğrulanamadı.");
}

const verifiedDescriptions = checkRows.slice(1).map((row) => row[1]);
const verification = {
  outputPath,
  sheetNames: checkWorkbook.SheetNames,
  dataRows: checkRows.length - 1,
  a2Rows: verifiedDescriptions.filter((value) => value.endsWith(" A2")).length,
  a4Rows: verifiedDescriptions.filter((value) => value.endsWith(" A4")).length,
  uniqueDescriptions: new Set(verifiedDescriptions).size,
  firstDataRow: checkRows[1],
  a4StartRow: checkRows[114],
  lastDataRow: checkRows[226],
  autofilter: checkSheet["!autofilter"]?.ref ?? null,
  columnWidths: checkSheet["!cols"]?.map((column) => column.wch ?? null) ?? null,
};

console.log(JSON.stringify(verification, null, 2));
