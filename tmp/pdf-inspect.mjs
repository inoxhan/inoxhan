import fs from "node:fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const inputPath = process.argv[2];
const pageNumber = Number(process.argv[3] ?? "1");
const mode = process.argv[4] ?? "items";
if (!inputPath) throw new Error("PDF path is required");

const data = new Uint8Array(await fs.readFile(inputPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
const page = await pdf.getPage(pageNumber);
const viewport = page.getViewport({ scale: 1 });
const content = await page.getTextContent();

const items = content.items
  .filter((item) => "str" in item && item.str.trim())
  .map((item) => ({
    text: item.str,
    x: Number(item.transform[4].toFixed(2)),
    y: Number(item.transform[5].toFixed(2)),
    width: Number(item.width.toFixed(2)),
    height: Number(item.height.toFixed(2)),
    fontName: item.fontName,
  }))
  .sort((a, b) => b.y - a.y || a.x - b.x);

if (mode === "lines") {
  const grouped = [];
  for (const item of items) {
    let line = grouped.find((candidate) => Math.abs(candidate.y - item.y) < 0.25);
    if (!line) {
      line = { y: item.y, items: [] };
      grouped.push(line);
    }
    line.items.push(item);
  }
  for (const line of grouped.sort((a, b) => b.y - a.y)) {
    line.items.sort((a, b) => a.x - b.x);
    console.log(`${line.y.toFixed(2)}\t${line.items.map((item) => `${item.x}:${item.text}`).join(" | ")}`);
  }
} else {
  console.log(JSON.stringify({ pages: pdf.numPages, pageNumber, width: viewport.width, height: viewport.height, items }, null, 2));
}
