import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const outputDir = path.resolve(
  "outputs",
  "01a00b62-ba26-7821-bb51-3fd88344f2f3",
);
const outputPath = path.join(outputDir, "din-84-ilk-urun-ornek.xlsx");
const temporaryOutputPath = path.join(outputDir, "full-catalog.building.tmp");
const summaryPath = path.resolve("tmp", "full-catalog-build-summary.json");
const extractionPaths = [
  path.resolve("tmp", "catalog-extract-02-19.json"),
  path.resolve("tmp", "catalog-extract-20-37.json"),
  path.resolve("tmp", "catalog-extract-38-55.json"),
];

const parseJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const cleanVariant = (value) =>
  cleanText(value)
    .replace(/\s+/g, "")
    .replace(/\((?:\d+)\)/g, "")
    .replace(/\*+$/g, "")
    .replace(/X/g, "x")
    .replace(/^m/, "M");

const dimensionNumber = (part) => {
  const fraction = part.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    // Katalogda metriklerden sonra verilen inç ölçülerini kendi grubunda sona sırala.
    return 1_000_000 + Number(fraction[1]) / Number(fraction[2]);
  }
  return Number(part.replace(",", "."));
};

const numericDimensions = (variant) =>
  variant
    .replace(/^M/, "")
    .split("x")
    .map(dimensionNumber);

const compareDimensionVectors = (left, right) => {
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const difference = (left[index] ?? -Infinity) - (right[index] ?? -Infinity);
    if (difference !== 0) return difference;
  }
  return 0;
};

const products = extractionPaths
  .flatMap((filePath) => {
    if (!fs.existsSync(filePath)) throw new Error(`Eksik çıkarım dosyası: ${filePath}`);
    const parsed = parseJson(filePath);
    if (!Array.isArray(parsed)) throw new Error(`Çıkarım dosyası dizi değil: ${filePath}`);
    return parsed;
  })
  .sort((left, right) => Number(left.page) - Number(right.page));

const expectedPages = Array.from({ length: 54 }, (_, index) => index + 2);
const actualPages = products.map((product) => Number(product.page));
if (JSON.stringify(actualPages) !== JSON.stringify(expectedPages)) {
  throw new Error(`Sayfa listesi 2–55 aralığını eksiksiz ve tekil kapsamıyor: ${actualPages.join(", ")}`);
}

const noGradePages = new Set([7, 52, 53, 54]);
const a2OnlyPages = new Set([9, 10]);
const normlessPages = new Set([52, 53, 54]);
const allowedModes = new Set(["matrix", "single", "special"]);
const normalizedProducts = [];

for (const rawProduct of products) {
  const page = Number(rawProduct.page);
  const productNameTurkish = cleanText(rawProduct.productNameTurkish);
  const normLabel = cleanText(rawProduct.normLabel);
  const grades = Array.isArray(rawProduct.grades)
    ? rawProduct.grades.map((grade) => cleanText(grade).toUpperCase())
    : [];
  const variantMode = cleanText(rawProduct.variantMode).toLowerCase();
  const variants = Array.isArray(rawProduct.variants)
    ? rawProduct.variants.map(cleanVariant)
    : [];

  if (!productNameTurkish || /[�ÃÅÄ]/.test(productNameTurkish)) {
    throw new Error(`Sayfa ${page}: ürün adı boş veya bozuk kodlanmış.`);
  }
  if (!allowedModes.has(variantMode)) {
    throw new Error(`Sayfa ${page}: geçersiz varyant modu '${variantMode}'.`);
  }
  if (normlessPages.has(page) !== !normLabel) {
    throw new Error(`Sayfa ${page}: norm alanı katalogla uyuşmuyor ('${normLabel}').`);
  }

  const expectedGrades = noGradePages.has(page)
    ? []
    : a2OnlyPages.has(page)
      ? ["A2"]
      : ["A2", "A4"];
  if (JSON.stringify(grades) !== JSON.stringify(expectedGrades)) {
    throw new Error(
      `Sayfa ${page}: kalite sırası hatalı. Beklenen ${JSON.stringify(expectedGrades)}, gelen ${JSON.stringify(grades)}.`,
    );
  }
  if (variants.length === 0) throw new Error(`Sayfa ${page}: varyant listesi boş.`);
  if (new Set(variants).size !== variants.length) {
    throw new Error(`Sayfa ${page}: yinelenen ölçü varyantı bulundu.`);
  }

  const vectors = variants.map((variant) => numericDimensions(variant));
  for (let index = 0; index < variants.length; index += 1) {
    if (vectors[index].some((value) => !Number.isFinite(value))) {
      throw new Error(`Sayfa ${page}: çözümlenemeyen ölçü '${variants[index]}'.`);
    }
    if (index > 0 && compareDimensionVectors(vectors[index - 1], vectors[index]) > 0) {
      throw new Error(
        `Sayfa ${page}: ölçü sırası küçükten büyüğe değil ('${variants[index - 1]}' → '${variants[index]}').`,
      );
    }
  }

  normalizedProducts.push({
    page,
    productNameTurkish,
    normLabel: normLabel || "-",
    grades,
    variantMode,
    variants,
    notes: cleanText(rawProduct.notes),
  });
}

const rows = [["DIN Normu", "Açıklama"]];
const pageRanges = [];
const compositeKeys = new Set();
let a2Rows = 0;
let a4Rows = 0;
let ungradedRows = 0;

for (const product of normalizedProducts) {
  const pageStartRow = rows.length + 1;
  const gradeGroups = product.grades.length > 0 ? product.grades : [""];
  const gradeRanges = [];

  for (const grade of gradeGroups) {
    const gradeStartRow = rows.length + 1;
    for (const variant of product.variants) {
      const description = [product.productNameTurkish, variant, grade].filter(Boolean).join(" ");
      const key = `${product.normLabel}\u0000${description}`;
      if (compositeKeys.has(key)) {
        throw new Error(`Yinelenen DIN+açıklama satırı: ${product.normLabel} | ${description}`);
      }
      compositeKeys.add(key);
      rows.push([product.normLabel, description]);
      if (grade === "A2") a2Rows += 1;
      else if (grade === "A4") a4Rows += 1;
      else ungradedRows += 1;
    }
    gradeRanges.push({
      grade: grade || null,
      startRow: gradeStartRow,
      endRow: rows.length,
      count: product.variants.length,
    });
  }

  pageRanges.push({
    page: product.page,
    productNameTurkish: product.productNameTurkish,
    normLabel: product.normLabel,
    variantMode: product.variantMode,
    baseVariantCount: product.variants.length,
    startRow: pageStartRow,
    endRow: rows.length,
    outputRowCount: rows.length - pageStartRow + 1,
    gradeRanges,
  });
}

if (process.argv.includes("--validate-only")) {
  console.log(
    JSON.stringify(
      {
        productPages: normalizedProducts.length,
        baseVariants: normalizedProducts.reduce((sum, product) => sum + product.variants.length, 0),
        dataRows: rows.length - 1,
        a2Rows,
        a4Rows,
        ungradedRows,
        uniqueDinDescriptionPairs: compositeKeys.size,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const worksheet = XLSX.utils.aoa_to_sheet(rows);
worksheet["!cols"] = [{ wch: 18 }, { wch: 68 }];
worksheet["!rows"] = [
  { hpt: 26 },
  ...Array.from({ length: rows.length - 1 }, () => ({ hpt: 20 })),
];
worksheet["!autofilter"] = { ref: `A1:B${rows.length}` };
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
  orientation: "landscape",
  fitToWidth: 1,
  fitToHeight: 0,
  paperSize: 9,
};

const workbook = XLSX.utils.book_new();
workbook.Props = {
  Title: "INOXHAN Katalog Ürün Yerleştirme Formu",
  Subject: "katalog.pdf sayfa 2–55 ürün ve ölçü listesi",
  Author: "INOXHAN",
  Comments: "Katalogdaki dolu ölçü hücreleri kullanılmış; A2 listeleri tamamlandıktan sonra A4 listeleri verilmiştir.",
};
XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

fs.mkdirSync(outputDir, { recursive: true });
XLSX.writeFile(workbook, temporaryOutputPath, {
  bookType: "xlsx",
  compression: true,
  bookSST: true,
});

const checkWorkbook = XLSX.readFile(temporaryOutputPath, { cellDates: false });
if (JSON.stringify(checkWorkbook.SheetNames) !== JSON.stringify(["Ürünler"])) {
  throw new Error(`Çalışma sayfası adı doğrulanamadı: ${checkWorkbook.SheetNames.join(", ")}`);
}
const checkSheet = checkWorkbook.Sheets["Ürünler"];
const checkRows = XLSX.utils.sheet_to_json(checkSheet, { header: 1, defval: "" });
if (JSON.stringify(checkRows) !== JSON.stringify(rows)) {
  throw new Error("Geçici Excel dosyasının hücre içeriği kaynak satırlarla birebir uyuşmuyor.");
}

const errorValues = [];
for (const [address, cell] of Object.entries(checkSheet)) {
  if (address.startsWith("!")) continue;
  if (typeof cell?.v === "string" && /^#(?:REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!)/.test(cell.v)) {
    errorValues.push({ address, value: cell.v });
  }
}
if (errorValues.length > 0) {
  throw new Error(`Excel hata değeri bulundu: ${JSON.stringify(errorValues.slice(0, 10))}`);
}

fs.copyFileSync(temporaryOutputPath, outputPath);
fs.rmSync(temporaryOutputPath);

const summary = {
  outputPath,
  sourcePdf: "C:\\Users\\timur\\Desktop\\katalog.pdf",
  sheetNames: checkWorkbook.SheetNames,
  productPages: normalizedProducts.length,
  baseVariants: normalizedProducts.reduce((sum, product) => sum + product.variants.length, 0),
  dataRows: rows.length - 1,
  a2Rows,
  a4Rows,
  ungradedRows,
  uniqueDinDescriptionPairs: compositeKeys.size,
  firstDataRow: rows[1],
  lastDataRow: rows.at(-1),
  autofilter: checkSheet["!autofilter"]?.ref ?? null,
  pageRanges,
};
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
