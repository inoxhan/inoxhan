import fs from "node:fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("PDF path is required");

const data = new Uint8Array(await fs.readFile(inputPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
const pages = [];

const cleanNorm = (value) =>
  value
    ?.replace(/\s*A[1-5](?:\s*\/\s*A[1-5])*\s*$/i, "")
    .trim() || null;

for (let pageNumber = 2; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const items = content.items
    .filter((item) => "str" in item && item.str.trim())
    .map((item) => ({
      text: item.str.trim(),
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
    }));

  const maxY = Math.max(...items.map((item) => item.y));
  const title = items
    .filter((item) => Math.abs(item.y - maxY) < 2)
    .sort((a, b) => a.x - b.x)
    .map((item) => item.text)
    .join(" ");

  const normValue = (label) => {
    const header = items.find((item) => item.text.toUpperCase() === label);
    if (!header) return null;
    const center = header.x + header.width / 2;
    const candidates = items
      .filter((item) => {
        const itemCenter = item.x + item.width / 2;
        return (
          Math.abs(itemCenter - center) < Math.max(header.width, 40) &&
          item.y < header.y - 4 &&
          item.y > header.y - 110 &&
          !/^A[1-5](?:\s*\/\s*A[1-5])*$/i.test(item.text)
        );
      })
      .sort((a, b) => b.y - a.y);
    return cleanNorm(candidates[0]?.text ?? null);
  };

  const gradeTokens = [];
  for (const item of items.filter((item) => item.y > 630 && item.y < 735)) {
    const matches = item.text.match(/A[1-5](?:\s*\/\s*A[1-5])*/gi) ?? [];
    for (const match of matches) {
      for (const grade of match.split("/").map((value) => value.trim().toUpperCase())) {
        if (!gradeTokens.includes(grade)) gradeTokens.push(grade);
      }
    }
  }

  pages.push({
    page: pageNumber,
    title,
    iso: normValue("ISO"),
    uni: normValue("UNI"),
    din: normValue("DIN"),
    grades: gradeTokens,
  });
}

console.log(JSON.stringify(pages, null, 2));
