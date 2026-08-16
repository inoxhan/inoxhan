import fs from "node:fs";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const workbookPath = process.argv[2];
if (!workbookPath) throw new Error("Excel path is required");

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
    .replace(/\s+/g, "")
    .replace(/\((?:\d+)\)/g, "")
    .replace(/\*+$/g, "")
    .replace(/X/g, "x")
    .replace(/^m/, "M");

const expectedRows = [["DIN Normu", "Açıklama"]];
for (const product of products) {
  const norm = String(product.normLabel ?? "").trim() || "-";
  const grades = product.grades.length > 0 ? product.grades : [""];
  for (const grade of grades) {
    for (const rawVariant of product.variants) {
      const variant = cleanVariant(rawVariant);
      expectedRows.push([
        norm,
        [product.productNameTurkish.trim(), variant, grade].filter(Boolean).join(" "),
      ]);
    }
  }
}

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
    `Excel içeriği kaynak veriden farklı. İlk uyumsuz Excel satırı ${mismatch}; ` +
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

const descriptions = actualRows.slice(1).map((row) => row[1]);
const compositeKeys = actualRows.slice(1).map((row) => `${row[0]}\u0000${row[1]}`);
if (new Set(compositeKeys).size !== compositeKeys.length) {
  throw new Error("DIN Normu + Açıklama birleşiminde yinelenen satır bulundu.");
}

const result = {
  workbookPath,
  sheetNames: workbook.SheetNames,
  range: sheet["!ref"],
  dataRows: actualRows.length - 1,
  a2Rows: descriptions.filter((value) => value.endsWith(" A2")).length,
  a4Rows: descriptions.filter((value) => value.endsWith(" A4")).length,
  ungradedRows: descriptions.filter((value) => !/ A[24]$/.test(value)).length,
  formulas: formulas.length,
  errorValues: errors.length,
  uniqueDinDescriptionPairs: new Set(compositeKeys).size,
  firstDataRow: actualRows[1],
  lastDataRow: actualRows.at(-1),
};

console.log(JSON.stringify(result, null, 2));
