import fs from "node:fs";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const workbookPath = process.argv[2];
if (!workbookPath) throw new Error("Excel path is required");

const payload = JSON.parse(fs.readFileSync("tmp/product-code-data.json", "utf8"));
const extractionPaths = [
  "tmp/catalog-extract-02-19.json",
  "tmp/catalog-extract-20-37.json",
  "tmp/catalog-extract-38-55.json",
];
const products = extractionPaths
  .flatMap((filePath) => JSON.parse(fs.readFileSync(filePath, "utf8")))
  .sort((left, right) => left.page - right.page);

const cleanVariant = (value) =>
  String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/\((?:\d+)\)/g, "")
    .replace(/\*+$/g, "")
    .replace(/X/g, "x")
    .replace(/^m/, "M");

const oldRows = [];
for (const product of products) {
  const norm = String(product.normLabel ?? "").trim() || "-";
  const grades = product.grades.length > 0 ? product.grades : [""];
  for (const grade of grades) {
    for (const rawVariant of product.variants) {
      const description = [
        String(product.productNameTurkish).trim(),
        cleanVariant(rawVariant),
        grade,
      ]
        .filter(Boolean)
        .join(" ");
      oldRows.push([norm, description]);
    }
  }
}

if (payload.rows.length !== oldRows.length) {
  throw new Error(`Kod verisi ile katalog satır sayısı farklı: ${payload.rows.length}/${oldRows.length}`);
}

const expectedRows = [
  ["Ürün Kodu", "Grup Kodu", "DIN Normu", "Açıklama"],
  ...oldRows.map((oldRow, index) => [...payload.rows[index], ...oldRow]),
];

const workbook = XLSX.readFile(workbookPath, {
  cellDates: false,
  cellFormula: true,
  cellStyles: true,
});
if (JSON.stringify(workbook.SheetNames) !== JSON.stringify(["Ürünler"])) {
  throw new Error(`Beklenmeyen sayfa listesi: ${workbook.SheetNames.join(", ")}`);
}
const sheet = workbook.Sheets["Ürünler"];
const actualRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
if (JSON.stringify(actualRows) !== JSON.stringify(expectedRows)) {
  let mismatch = -1;
  const max = Math.max(actualRows.length, expectedRows.length);
  for (let index = 0; index < max; index += 1) {
    if (JSON.stringify(actualRows[index]) !== JSON.stringify(expectedRows[index])) {
      mismatch = index + 1;
      break;
    }
  }
  throw new Error(
    `Excel içeriği beklenen kodlu tabloyla farklı; ilk uyumsuz satır ${mismatch}: ` +
      `beklenen=${JSON.stringify(expectedRows[mismatch - 1])}, gelen=${JSON.stringify(actualRows[mismatch - 1])}`,
  );
}

const formulas = [];
const errors = [];
for (const [address, cell] of Object.entries(sheet)) {
  if (address.startsWith("!")) continue;
  if (cell?.f) formulas.push({ address, formula: cell.f });
  if (typeof cell?.v === "string" && /^#(?:REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!)/.test(cell.v)) {
    errors.push({ address, value: cell.v });
  }
}
if (formulas.length > 0) throw new Error(`Beklenmeyen formül bulundu: ${JSON.stringify(formulas.slice(0, 10))}`);
if (errors.length > 0) throw new Error(`Excel hata değeri bulundu: ${JSON.stringify(errors.slice(0, 10))}`);

const codes = actualRows.slice(1).map((row) => String(row[0]));
if (new Set(codes).size !== codes.length) throw new Error("Ürün Kodu sütununda tekrar bulundu.");
if (codes.some((code) => !code.startsWith("0"))) throw new Error("Başında 0 olmayan Ürün Kodu bulundu.");
if (actualRows[1][0] !== "084202 005") throw new Error(`İlk örnek kod yanlış: ${actualRows[1][0]}`);
if (actualRows[114][0] !== "084402 005") throw new Error(`İlk A4 kodu yanlış: ${actualRows[114][0]}`);

const groupCounts = {};
for (const row of actualRows.slice(1)) groupCounts[row[1]] = (groupCounts[row[1]] ?? 0) + 1;

const sampleRows = [1, 10, 113, 114, 3109, 4449, 5857, 6669, 6701, 6752]
  .map((zeroBasedIndex) => ({ excelRow: zeroBasedIndex + 1, values: actualRows[zeroBasedIndex] }));

console.log(
  JSON.stringify(
    {
      workbookPath,
      sheetNames: workbook.SheetNames,
      range: sheet["!ref"],
      dataRows: actualRows.length - 1,
      uniqueProductCodes: new Set(codes).size,
      leadingZeroCodes: codes.filter((code) => code.startsWith("0")).length,
      formulas: formulas.length,
      errorValues: errors.length,
      groupCounts,
      sampleRows,
      columnWidths: sheet["!cols"]?.map((column) => column.wch ?? null) ?? null,
      productCodeNumberFormat: sheet.A2?.z ?? null,
    },
    null,
    2,
  ),
);
