import fs from "node:fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("PDF path is required");

const data = new Uint8Array(await fs.readFile(inputPath));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

for (let pageNumber = 2; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const items = content.items
    .filter((item) => "str" in item && item.str.trim())
    .map((item) => ({ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  for (const item of items) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) < 0.3);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  const candidates = lines
    .filter((line) => line.y < 610 && line.y > 20)
    .map((line) => ({
      ...line,
      items: line.items.sort((a, b) => a.x - b.x),
    }))
    .filter((line) => {
      const first = line.items[0]?.text ?? "";
      const numericCount = line.items.filter((item) => /^(?:M)?\d+(?:,\d+)?(?:x\d+(?:,\d+)?)?$/.test(item.text)).length;
      return line.items[0]?.x < 100 && /^(?:l|I|d|bxh)$/i.test(first) && numericCount >= 2;
    });

  const title = lines.find((line) => line.y > 810)?.items.map((item) => item.text).join(" ") ?? "";
  const summary = candidates.map((line) =>
    `${line.y.toFixed(2)}:${line.items.map((item) => item.text).join("|")}`,
  );
  console.log(`${pageNumber}\t${title}\t${summary.join(" || ")}`);
}
