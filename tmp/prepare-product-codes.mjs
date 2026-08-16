import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const workbookPath = path.resolve(
  "outputs",
  "01a00b62-ba26-7821-bb51-3fd88344f2f3",
  "din-84-ilk-urun-ornek.xlsx",
);
const outputPath = path.resolve("tmp", "product-code-data.json");
const extractionPaths = [
  path.resolve("tmp", "catalog-extract-02-19.json"),
  path.resolve("tmp", "catalog-extract-20-37.json"),
  path.resolve("tmp", "catalog-extract-38-55.json"),
];

const groupPages = {
  "VİDA": [2, 11, 24, 25, 26, 27, 40, 41, 42, 43, 47, 48, 49, 50, 51],
  "GUPİLYA": [3],
  "RONDELA": [4, 5, 34, 35],
  "SOMUN": [6, 7, 18, 19, 22, 23, 29, 30, 32, 33, 38],
  "CİVATA": [8, 12, 13, 20, 21, 37, 39, 44],
  "SEGMAN": [9, 10, 36],
  "SETSKUR": [14, 15, 16, 17],
  "GİJON": [28],
  "PİM": [31],
  "PUL": [45],
  "KAMA": [46],
  "DÜBEL": [52, 53, 54],
  "ZİNCİR": [55],
};

const groupByPage = new Map();
for (const [group, pages] of Object.entries(groupPages)) {
  for (const page of pages) {
    if (groupByPage.has(page)) throw new Error(`Sayfa ${page} birden fazla gruba atanmış.`);
    groupByPage.set(page, group);
  }
}
for (let page = 2; page <= 55; page += 1) {
  if (!groupByPage.has(page)) throw new Error(`Sayfa ${page} için Grup Kodu yok.`);
}

const products = extractionPaths
  .flatMap((filePath) => JSON.parse(fs.readFileSync(filePath, "utf8")))
  .sort((left, right) => left.page - right.page);

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const cleanVariant = (value) =>
  cleanText(value)
    .replace(/\s+/g, "")
    .replace(/\((?:\d+)\)/g, "")
    .replace(/\*+$/g, "")
    .replace(/X/g, "x")
    .replace(/^m/, "M");

const padMeasure = (rawPart, width) => {
  const part = rawPart.replace(/^M/i, "");
  const fraction = part.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return `I${fraction[1].padStart(2, "0")}/${fraction[2].padStart(2, "0")}`;
  }

  const decimal = part.match(/^(\d+)(?:,(\d+))?$/);
  if (!decimal) throw new Error(`Kodlanamayan ölçü bileşeni: '${rawPart}'`);
  const whole = decimal[1].padStart(width, "0");
  return decimal[2] ? `${whole},${decimal[2]}` : whole;
};

const dinSegment = (product) => {
  const norm = cleanText(product.normLabel);
  if (!norm) return `0P${String(product.page).padStart(3, "0")}`;
  const compact = norm.replace(/^DIN\s*/i, "").replace(/\s+/g, "").toUpperCase();
  if (!compact) throw new Error(`Sayfa ${product.page}: DIN kodu çözümlenemedi.`);
  return `0${compact}`;
};

const singleMeasureWidth = (product) => {
  const integerParts = product.variants
    .filter((variant) => !variant.includes("x") && !variant.includes("/"))
    .map((variant) => cleanVariant(variant).replace(/^M/i, "").split(",")[0]);
  return Math.max(2, ...integerParts.map((part) => part.length));
};

const productCode = (product, variant, grade) => {
  const gradeDigit = grade ? grade.replace(/^A/i, "") : "0";
  if (!/^[024]$/.test(gradeDigit)) {
    throw new Error(`Sayfa ${product.page}: kalite kodu çözümlenemedi '${grade}'.`);
  }

  const dimensions = cleanVariant(variant).replace(/^M/i, "").split("x");
  if (dimensions.length < 1 || dimensions.length > 3) {
    throw new Error(`Sayfa ${product.page}: ölçü ekseni desteklenmiyor '${variant}'.`);
  }

  const primary = dimensions
    .slice(0, -1)
    .map((part) => padMeasure(part, 2))
    .join("x");
  if (dimensions.length === 1) {
    return `${dinSegment(product)}${gradeDigit}${padMeasure(dimensions[0], singleMeasureWidth(product))}`;
  }

  const length = padMeasure(dimensions.at(-1), 3);
  return `${dinSegment(product)}${gradeDigit}${primary} ${length}`;
};

const expectedCurrentRows = [["DIN Normu", "Açıklama"]];
const codeRows = [];
const detailedRows = [];
const pageRanges = [];

for (const product of products) {
  const pageStartRow = detailedRows.length + 2;
  const norm = cleanText(product.normLabel) || "-";
  const grades = product.grades.length > 0 ? product.grades : [""];
  const groupCode = groupByPage.get(product.page);

  for (const grade of grades) {
    for (const rawVariant of product.variants) {
      const variant = cleanVariant(rawVariant);
      const description = [cleanText(product.productNameTurkish), variant, grade]
        .filter(Boolean)
        .join(" ");
      const code = productCode(product, variant, grade);
      expectedCurrentRows.push([norm, description]);
      codeRows.push([code, groupCode]);
      detailedRows.push({
        excelRow: detailedRows.length + 2,
        page: product.page,
        grade: grade || null,
        variant,
        productCode: code,
        groupCode,
        dinNormu: norm,
        description,
      });
    }
  }

  pageRanges.push({
    page: product.page,
    groupCode,
    startRow: pageStartRow,
    endRow: detailedRows.length + 1,
  });
}

const workbook = XLSX.readFile(workbookPath, { cellDates: false, cellFormula: true });
if (JSON.stringify(workbook.SheetNames) !== JSON.stringify(["Ürünler"])) {
  throw new Error(`Beklenmeyen çalışma sayfaları: ${workbook.SheetNames.join(", ")}`);
}
const currentRows = XLSX.utils.sheet_to_json(workbook.Sheets["Ürünler"], {
  header: 1,
  defval: "",
});
if (JSON.stringify(currentRows) !== JSON.stringify(expectedCurrentRows)) {
  let mismatch = -1;
  const max = Math.max(currentRows.length, expectedCurrentRows.length);
  for (let index = 0; index < max; index += 1) {
    if (JSON.stringify(currentRows[index]) !== JSON.stringify(expectedCurrentRows[index])) {
      mismatch = index + 1;
      break;
    }
  }
  throw new Error(`Mevcut Excel kaynak katalog satırlarıyla uyuşmuyor; ilk fark satır ${mismatch}.`);
}

const codes = detailedRows.map((row) => row.productCode);
if (new Set(codes).size !== codes.length) {
  const seen = new Set();
  const duplicates = codes.filter((code) => (seen.has(code) ? true : (seen.add(code), false)));
  throw new Error(`Yinelenen Ürün Kodu bulundu: ${[...new Set(duplicates)].slice(0, 20).join(", ")}`);
}
if (codes.some((code) => !code.startsWith("0"))) {
  throw new Error("Başında 0 olmayan Ürün Kodu bulundu.");
}
if (detailedRows[0]?.productCode !== "084202 005") {
  throw new Error(`Kullanıcı örneği üretilemedi: ${detailedRows[0]?.productCode}`);
}

const firstA4 = detailedRows.find(
  (row) => row.page === 2 && row.grade === "A4" && row.variant === "M2x5",
);
if (firstA4?.productCode !== "084402 005") {
  throw new Error(`A4 örneği üretilemedi: ${firstA4?.productCode}`);
}

const groupCounts = Object.fromEntries(
  [...new Set(detailedRows.map((row) => row.groupCode))]
    .sort((left, right) => left.localeCompare(right, "tr"))
    .map((group) => [group, detailedRows.filter((row) => row.groupCode === group).length]),
);

const payload = {
  workbookPath,
  existingHeaders: ["DIN Normu", "Açıklama"],
  headers: ["Ürün Kodu", "Grup Kodu"],
  rows: codeRows,
  summary: {
    dataRows: detailedRows.length,
    uniqueProductCodes: new Set(codes).size,
    firstCode: detailedRows[0].productCode,
    firstA4Code: firstA4.productCode,
    lastCode: detailedRows.at(-1).productCode,
    groupCounts,
    pageRanges,
    samples: {
      decimalMetric: detailedRows.find((row) => row.page === 2 && row.variant === "M2,5x4" && row.grade === "A2"),
      singleMetric: detailedRows.find((row) => row.page === 22 && row.variant === "M2" && row.grade === "A2"),
      inchMetric: detailedRows.find((row) => row.page === 33 && row.variant === "5/16" && row.grade === "A2"),
      threeDimensions: detailedRows.find((row) => row.page === 46 && row.variant === "4x4x8" && row.grade === "A2"),
      normless: detailedRows.find((row) => row.page === 52),
      chain: detailedRows.find((row) => row.page === 55 && row.grade === "A2"),
    },
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.summary, null, 2));
