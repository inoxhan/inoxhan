import fs from "node:fs";

const files = fs
  .readdirSync("tmp")
  .filter((name) => name.startsWith("catalog-extract-") && name.endsWith(".json"))
  .sort();

const pages = files
  .flatMap((file) => JSON.parse(fs.readFileSync(`tmp/${file}`, "utf8")))
  .sort((a, b) => a.page - b.page);

function normCode(product) {
  if (!product.normLabel) return `0P${String(product.page).padStart(3, "0")}`;
  const core = product.normLabel
    .replace(/^DIN\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  return `0${core}`;
}

function componentCode(raw, width) {
  const value = String(raw).trim().replace(/^M/i, "");
  let match = value.match(/^(\d+)(?:,(\d+))?$/);
  if (match) {
    return `${match[1].padStart(width, "0")}${match[2] ? `,${match[2]}` : ""}`;
  }
  match = value.match(/^(\d+)\/(\d+)$/);
  if (match) {
    return `I${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}`;
  }
  throw new Error(`Unsupported component: ${raw}`);
}

function sku(product, grade, variant) {
  const parts = variant.split("x");
  const prefix = `${normCode(product)}${grade ? grade.replace(/^A/i, "") : "0"}`;
  if (parts.length === 1) {
    const maxInteger = Math.max(
      ...product.variants
        .filter((value) => !value.includes("x") && !value.includes("/"))
        .map((value) => Number.parseInt(value.replace(/^M/i, "").split(",")[0], 10)),
    );
    const width = maxInteger >= 100 ? 3 : 2;
    return `${prefix}${componentCode(parts[0], width)}`;
  }
  if (parts.length === 2) {
    return `${prefix}${componentCode(parts[0], 2)} ${componentCode(parts[1], 3)}`;
  }
  if (parts.length === 3) {
    return `${prefix}${componentCode(parts[0], 2)}x${componentCode(parts[1], 2)} ${componentCode(parts[2], 3)}`;
  }
  throw new Error(`Unsupported variant: ${variant}`);
}

const rows = [];
for (const product of pages) {
  const grades = product.grades.length ? product.grades : [""];
  for (const grade of grades) {
    for (const variant of product.variants) {
      rows.push({
        page: product.page,
        norm: product.normLabel,
        grade,
        variant,
        code: sku(product, grade, variant),
      });
    }
  }
}

const byCode = new Map();
for (const row of rows) {
  const matches = byCode.get(row.code) ?? [];
  matches.push(row);
  byCode.set(row.code, matches);
}

const duplicates = [...byCode.entries()].filter(([, matches]) => matches.length > 1);
const sortMismatches = [];
for (const product of pages) {
  const grades = product.grades.length ? product.grades : [""];
  for (const grade of grades) {
    const original = product.variants.map((variant) => sku(product, grade, variant));
    const sorted = [...original].sort((a, b) => a.localeCompare(b, "tr", { numeric: false }));
    if (original.some((code, index) => code !== sorted[index])) {
      sortMismatches.push({ page: product.page, grade, original: original.slice(0, 5), sorted: sorted.slice(0, 5) });
    }
  }
}
const samplePages = new Set([2, 4, 7, 33, 34, 35, 40, 46, 52, 53, 54, 55]);
const samples = [];
for (const page of samplePages) {
  const matches = rows.filter((row) => row.page === page);
  if (matches.length) {
    samples.push(matches[0]);
    if (matches.length > 1) samples.push(matches.at(-1));
  }
}

console.log(
  JSON.stringify(
    {
      pages: pages.length,
      rows: rows.length,
      uniqueCodes: byCode.size,
      duplicateCodeCount: duplicates.length,
      duplicateExamples: duplicates.slice(0, 10),
      withinProductSortMismatchCount: sortMismatches.length,
      sortMismatchExamples: sortMismatches.slice(0, 10),
      samples,
    },
    null,
    2,
  ),
);
