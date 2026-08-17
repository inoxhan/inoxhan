import { chromium, type Page } from "playwright";

const BASE = "https://inoxhan.vercel.app";

async function olc(page: Page, yol: string) {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const kaynaklar: { tur: string; bayt: number; url: string }[] = [];
  page.on("response", (r) => {
    const h = r.headers();
    kaynaklar.push({
      tur: (h["content-type"] ?? "?").split(";")[0],
      bayt: Number(h["content-length"] ?? 0),
      url: r.url().replace(BASE, ""),
    });
  });

  await page.goto(`${BASE}${yol}`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(2500);

  const grup = new Map<string, { adet: number; bayt: number }>();
  for (const k of kaynaklar) {
    const g = grup.get(k.tur) ?? { adet: 0, bayt: 0 };
    g.adet += 1;
    g.bayt += k.bayt;
    grup.set(k.tur, g);
  }

  console.log(`\n=== ${yol} ===`);
  for (const [tur, g] of [...grup.entries()].sort((a, b) => b[1].bayt - a[1].bayt).slice(0, 5)) {
    console.log(`  ${tur.padEnd(26)} ${String(g.adet).padStart(3)} istek · ${Math.round(g.bayt / 1024)} KB`);
  }
  console.log(
    `  TOPLAM: ${kaynaklar.length} istek · ${Math.round(kaynaklar.reduce((s, k) => s + k.bayt, 0) / 1024)} KB`,
  );
  await client.detach();
}

async function main() {
  const browser = await chromium.launch();

  for (const yol of ["/", "/teklif"]) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await olc(p, yol);
    await p.close();
  }

  // Yazma gecikmesi (CPU 4x yavaş)
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const client = await p.context().newCDPSession(p);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(`${BASE}/teklif`, { waitUntil: "networkidle", timeout: 120_000 });
  const kutu = p.locator('input[aria-label="Ürün ara"]');
  await kutu.click();
  await p.waitForTimeout(3000);

  console.log("\n=== yazma gecikmesi (CPU 4x yavaş) ===");
  const sureler: number[] = [];
  for (const harf of ["9", "3", "3", " ", "8"]) {
    const t = Date.now();
    await kutu.press(harf === " " ? "Space" : harf);
    await p.waitForFunction("document.querySelectorAll('li').length >= 0", null, { timeout: 10_000 });
    sureler.push(Date.now() - t);
  }
  console.log(`  tuş başına: ${sureler.join(", ")} ms`);
  await browser.close();
}

main();
