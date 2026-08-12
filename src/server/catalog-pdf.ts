import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { SITE } from "@/lib/constants";

/**
 * PDF katalog üretimi — Playwright Chromium ile /katalog-baski sayfasını basar.
 * Node sunucuda arka planda çalışır; durum storage/katalog/status.json'da tutulur.
 */
const CATALOG_DIR = path.join(process.cwd(), "storage", "katalog");
const STATUS_PATH = path.join(CATALOG_DIR, "status.json");

export interface CatalogStatus {
  state: "idle" | "running" | "done" | "error";
  startedAt?: string;
  finishedAt?: string;
  file?: string;
  sizeBytes?: number;
  error?: string;
}

export async function getCatalogStatus(): Promise<CatalogStatus> {
  try {
    return JSON.parse(await readFile(STATUS_PATH, "utf8")) as CatalogStatus;
  } catch {
    return { state: "idle" };
  }
}

async function setStatus(status: CatalogStatus) {
  await mkdir(CATALOG_DIR, { recursive: true });
  await writeFile(STATUS_PATH, JSON.stringify(status, null, 2), "utf8");
}

export async function getLatestCatalogFile(): Promise<{
  file: string;
  absPath: string;
  sizeBytes: number;
  mtime: Date;
} | null> {
  if (!existsSync(CATALOG_DIR)) return null;
  const files = (await readdir(CATALOG_DIR)).filter(
    (f) => f.startsWith("katalog-") && f.endsWith(".pdf"),
  );
  if (files.length === 0) return null;
  const stats = await Promise.all(
    files.map(async (f) => {
      const s = await stat(path.join(CATALOG_DIR, f));
      return { file: f, absPath: path.join(CATALOG_DIR, f), sizeBytes: s.size, mtime: s.mtime };
    }),
  );
  stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return stats[0];
}

/** Üretimi başlatır; çağıran await ETMEZ (fire-and-forget). */
export async function runCatalogGeneration(): Promise<void> {
  const current = await getCatalogStatus();
  if (current.state === "running") return;

  await setStatus({ state: "running", startedAt: new Date().toISOString() });

  try {
    // devDependency — yalnız sunucu tarafında, istek anında yüklenir
    const { chromium } = await import("playwright");
    const token = process.env.CATALOG_PRINT_TOKEN ?? "";
    const url = `${SITE.url}/katalog-baski?token=${encodeURIComponent(token)}`;

    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[-:]/g, "")
      .replace("T", "-");
    const fileName = `katalog-inoxhan-${stamp}.pdf`;
    const outPath = path.join(CATALOG_DIR, fileName);

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      await page.pdf({
        path: outPath,
        format: "A4",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    } finally {
      await browser.close();
    }

    const s = await stat(outPath);
    await setStatus({
      state: "done",
      startedAt: current.startedAt,
      finishedAt: new Date().toISOString(),
      file: fileName,
      sizeBytes: s.size,
    });
  } catch (err) {
    await setStatus({
      state: "error",
      finishedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
