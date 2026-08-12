/**
 * Tarayıcı düzeyi smoke testi (Playwright Chromium) — dev sunucu çalışırken:
 *   npx tsx scripts/smoke-e2e.ts [screenshotDir]
 *
 * Kontroller:
 *  1. Desktop ana sayfa: 3D canvas mount olur, konsol hatası yok
 *  2. Mobil ana sayfa: canvas MOUNT OLMAZ (poster yolu), konsol hatası yok
 *  3. Katalog: toleranslı arama "cıvta" sonuç bulur
 *  4. Panel: yanlış şifre reddedilir, doğru şifre girer, SLA kırmızı satır görünür
 *  5. Teklif formu: ürün ön-seçimli gönderim → "Talebin Alındı!"
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = process.argv[2] ?? path.join(process.cwd(), "storage", "smoke");

function env(key: string): string {
  const m = readFileSync(path.join(process.cwd(), ".env"), "utf8").match(
    new RegExp(`^${key}="?([^"\r\n]*)"?`, "m"),
  );
  return m?.[1] ?? "";
}

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ✓" : "  ✗ BAŞARISIZ"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const browser = await chromium.launch();

  // ── 1. Desktop ana sayfa ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500); // 3D lazy chunk
    const canvas = await page.locator("canvas").count();
    check("desktop: 3D canvas mount edildi", canvas >= 1, `${canvas} canvas`);
    check("desktop: konsol hatası yok", errors.length === 0, errors.slice(0, 3).join(" | "));
    await page.screenshot({ path: path.join(SHOT_DIR, "home-desktop.png") });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOT_DIR, "home-desktop-scroll.png") });
    await ctx.close();
  }

  // ── 2. Mobil ana sayfa ──
  {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const canvas = await page.locator("canvas").count();
    check("mobil: canvas mount EDİLMEDİ (poster yolu)", canvas === 0, `${canvas} canvas`);
    check("mobil: konsol hatası yok", errors.length === 0, errors.slice(0, 3).join(" | "));
    const bars = await page.locator('a:has-text("Hızlı Teklif Al")').all();
    let barVisible = false;
    for (const b of bars) if (await b.isVisible()) barVisible = true;
    check("mobil: başparmak teklif barı görünür", barVisible);
    await page.screenshot({ path: path.join(SHOT_DIR, "home-mobile.png") });
    await ctx.close();
  }

  // ── 3. Katalog toleranslı arama ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/urunler`, { waitUntil: "networkidle" });
    await page.fill('input[type="search"]', "cıvta");
    await page.waitForTimeout(1200);
    const resultText = await page.locator("text=sonuç bulundu").textContent();
    const count = Number(resultText?.match(/(\d+)/)?.[1] ?? 0);
    check('arama: yazım hatalı "cıvta" sonuç buldu', count > 0, `${count} sonuç`);
    await page.screenshot({ path: path.join(SHOT_DIR, "search-civta.png") });
    await ctx.close();
  }

  // ── 4. Panel giriş + SLA ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/panel/giris`, { waitUntil: "networkidle" });
    await page.fill('input[name="username"]', env("ADMIN_USERNAME") || "admin");
    await page.fill('input[name="password"]', "yanlis-sifre-123");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    const err = await page.locator("text=hatalı").count();
    check("panel: yanlış şifre reddedildi", err > 0);

    // React 19 form action sonrası alanları sıfırlar — ikisini de yeniden doldur
    await page.fill('input[name="username"]', env("ADMIN_USERNAME") || "admin");
    await page.fill('input[name="password"]', env("ADMIN_PASSWORD"));
    await page.click('button[type="submit"]');
    await page.waitForURL("**/panel", { timeout: 15000 });
    check("panel: doğru şifre ile giriş", page.url().endsWith("/panel"));

    await page.goto(`${BASE}/panel/teklifler`, { waitUntil: "networkidle" });
    const timer = await page.locator("text=Geçen süre").count();
    check("panel: canlı SLA sayacı görünür", timer > 0, `${timer} satır`);
    const overdue = await page.locator(".text-status-overdue").count();
    check("panel: 60+ dk geciken kırmızı vurgulu", overdue > 0);
    await page.screenshot({ path: path.join(SHOT_DIR, "panel-teklifler.png") });
    await ctx.close();
  }

  // ── 5. Teklif formu gönderimi ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/teklif?urun=INX-SM-0001&kaynak=product`, {
      waitUntil: "networkidle",
    });
    const chip = await page.locator("text=INX-SM-0001").count();
    check("form: ürün ön-seçimi geldi", chip > 0);
    await page.fill('input[name="name"]', "E2E Test Kullanıcı");
    await page.fill('input[name="phone"]', "0533 111 22 33");
    await page.fill('input[name="email"]', "e2e@example.com");
    await page.fill('input[name="quantity"]', "100");
    await page.check('input[name="kvkk"]');
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Talebin Alındı", { timeout: 15000 });
    check("form: gönderim başarılı — 'Talebin Alındı!'", true);
    await page.screenshot({ path: path.join(SHOT_DIR, "quote-success.png") });
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? "\nTÜM SMOKE TESTLERİ GEÇTİ" : `\n${failures} TEST BAŞARISIZ`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
