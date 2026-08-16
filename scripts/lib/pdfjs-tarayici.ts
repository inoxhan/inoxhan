/**
 * pdf.js'i Playwright Chromium içinde çalıştıran ortak oturum.
 *
 * Node tarafındaki pdf.js native `canvas` derlemesi istiyor; tarayıcı içinde çalıştırmak
 * ek bağımlılık gerektirmiyor. ES modülleri `file://` üzerinden CORS'a takıldığı için
 * kütüphane, worker ve PDF sahte bir `https://pdfjs.local` kökeninden route ile servis edilir.
 *
 * `window` erişimi yalnız BU dosyada; çağıranlar `render()` / `metin()` ile çalışır.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const KOKEN = "https://pdfjs.local";
const PDFJS_DIR = path.join(process.cwd(), "node_modules", "pdfjs-dist", "build");

/** Sayfadaki tek bir metin parçası ve PDF kullanıcı uzayındaki konumu. */
export interface MetinOge {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// pdf.js'in tarayıcı içindeki yüzeyi — yalnız kullandığımız kadarı tiplenir.
interface PdfViewport {
  width: number;
  height: number;
}
interface PdfSayfa {
  getViewport(o: { scale: number }): PdfViewport;
  render(o: {
    canvas: HTMLCanvasElement;
    viewport: PdfViewport;
    background: string;
  }): { promise: Promise<void> };
  getTextContent(): Promise<{
    items: Array<{ str?: string; transform: number[]; width: number; height: number }>;
  }>;
  cleanup(): void;
}
interface PdfBelge {
  numPages: number;
  getPage(n: number): Promise<PdfSayfa>;
}
interface PdfPencere {
  __doc: PdfBelge;
  __hazir?: boolean;
  pdfjsLib: {
    getDocument(o: { url: string }): { promise: Promise<PdfBelge> };
    GlobalWorkerOptions: { workerSrc: string };
  };
}

export interface PdfOturum {
  sayfaSayisi: number;
  /** Sayfayı verilen ölçekte PNG olarak render eder. scale 1 = 72 DPI. */
  render(n: number, scale: number): Promise<Buffer>;
  /** Sayfadaki metin parçalarını konumlarıyla döndürür. */
  metin(n: number): Promise<MetinOge[]>;
  kapat(): Promise<void>;
}

export async function pdfAc(pdfYolu: string): Promise<PdfOturum> {
  const [pdfKaynak, workerKaynak, pdfIcerik] = await Promise.all([
    readFile(path.join(PDFJS_DIR, "pdf.min.mjs"), "utf8"),
    readFile(path.join(PDFJS_DIR, "pdf.worker.min.mjs"), "utf8"),
    readFile(pdfYolu),
  ]);

  const browser = await chromium.launch();
  const page: Page = await browser.newPage();

  await page.route(`${KOKEN}/**`, async (route) => {
    const yol = new URL(route.request().url()).pathname;
    if (yol === "/") return route.fulfill({ contentType: "text/html", body: "<!doctype html><body>" });
    if (yol === "/pdf.mjs") return route.fulfill({ contentType: "text/javascript", body: pdfKaynak });
    if (yol === "/pdf.worker.mjs")
      return route.fulfill({ contentType: "text/javascript", body: workerKaynak });
    if (yol === "/katalog.pdf")
      return route.fulfill({ contentType: "application/pdf", body: pdfIcerik });
    return route.fulfill({ status: 404, body: "" });
  });

  await page.goto(`${KOKEN}/`);
  await page.addScriptTag({
    type: "module",
    content: `
      import * as pdfjs from "/pdf.mjs";
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
      window.pdfjsLib = pdfjs;
      window.__hazir = true;
    `,
  });
  await page.waitForFunction("window.__hazir === true", null, { timeout: 30_000 });

  const sayfaSayisi = await page.evaluate(async () => {
    const w = window as unknown as PdfPencere;
    w.__doc = await w.pdfjsLib.getDocument({ url: "/katalog.pdf" }).promise;
    return w.__doc.numPages;
  });

  return {
    sayfaSayisi,

    async render(n, scale) {
      const dataUrl = await page.evaluate(
        async ({ n, scale }) => {
          const w = window as unknown as PdfPencere;
          const sayfa = await w.__doc.getPage(n);
          const vp = sayfa.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(vp.width);
          canvas.height = Math.ceil(vp.height);
          await sayfa.render({ canvas, viewport: vp, background: "#ffffff" }).promise;
          const url = canvas.toDataURL("image/png");
          sayfa.cleanup();
          canvas.width = canvas.height = 0; // belleği bırak, 55 sayfa birikmesin
          return url;
        },
        { n, scale },
      );
      return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    },

    async metin(n) {
      return page.evaluate(async (n) => {
        const w = window as unknown as PdfPencere;
        const sayfa = await w.__doc.getPage(n);
        const tc = await sayfa.getTextContent();
        const cikti = tc.items
          .filter((i): i is { str: string; transform: number[]; width: number; height: number } =>
            typeof i.str === "string",
          )
          .map((i) => ({
            str: i.str,
            x: i.transform[4],
            y: i.transform[5],
            w: i.width,
            h: i.height,
          }));
        sayfa.cleanup();
        return cikti;
      }, n);
    },

    kapat: () => browser.close(),
  };
}
