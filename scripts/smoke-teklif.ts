/**
 * Teklif oluşturucunun tarayıcı düzeyi smoke testi (Playwright Chromium) —
 * dev sunucu çalışırken:  npm run smoke:teklif
 *
 * Akış: kategori çipi → fotoğraflı ürün kartı → ölçü paneli (filtre + adet) →
 * arama kutusundan ikinci kalem → sayfa yenile (liste localStorage'da kalmalı) →
 * bilgileri gir → gönder → veritabanında kaydı doğrula.
 *
 * Ürettiği test kaydı sonunda SİLİNİR (telefon: TEST_TEL).
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = process.argv[2] ?? path.join(process.cwd(), "storage", "smoke");
const TEST_TEL = "+905559998877";

const db = new PrismaClient();

let hata = 0;
function kontrol(ad: string, ok: boolean, ek = "") {
  console.log(`${ok ? "  ✓" : "  ✗ BAŞARISIZ"} ${ad}${ek ? ` — ${ek}` : ""}`);
  if (!ok) hata++;
}

async function main() {
  await temizle();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const konsolHatalari: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") konsolHatalari.push(m.text());
  });

  console.log("1) Sayfa ve ürün listesi");
  await page.goto(`${BASE}/teklif`, { waitUntil: "networkidle" });
  const urunSayisi = await page.locator("ul li button[aria-pressed]").count();
  kontrol("54 ürün satırı basıldı", urunSayisi >= 54, `${urunSayisi} satır`);

  await page.getByRole("button", { name: /^Cıvatalar/ }).click();
  const filtreli = await page.locator("ul li button[aria-pressed]").count();
  kontrol("kategori çipi listeyi süzdü", filtreli > 0 && filtreli < urunSayisi, `${filtreli} satır`);

  console.log("2) Ölçü paneli (sağ sütun, sayfa kaymadan)");
  const oncekiScroll = await page.evaluate("Math.round(window.scrollY)");
  await page.locator("ul li button[aria-pressed]").filter({ hasText: "DIN 933" }).first().click();
  const panel = page.locator("#olcu-paneli");
  await panel.waitFor({ state: "visible", timeout: 20_000 });
  await panel.locator("li").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
  const sonrakiScroll = await page.evaluate("Math.round(window.scrollY)");
  kontrol("sayfa aşağı kaymadı", oncekiScroll === sonrakiScroll, `${oncekiScroll} → ${sonrakiScroll}`);

  const panelKutu = await panel.boundingBox();
  const listeKutu = await page.locator("ul li button[aria-pressed]").first().boundingBox();
  kontrol(
    "ölçü paneli sağ sütunda",
    (panelKutu?.x ?? 0) > (listeKutu?.x ?? 0) + 200,
    `panel x=${Math.round(panelKutu?.x ?? 0)}`,
  );

  const olcuSayisi = await panel.locator("li").count();
  kontrol("ailenin ölçüleri listelendi", olcuSayisi > 10, `${olcuSayisi} satır`);

  await panel.locator('input[type="search"]').fill("8x40");
  await page.waitForTimeout(400);
  const suzulen = await panel.locator("li").count();
  kontrol("ölçü filtresi çalıştı", suzulen > 0 && suzulen < olcuSayisi, `${suzulen} satır`);

  const ilkSatir = panel.locator("li").first();
  const adetKutusu = ilkSatir.locator('input[inputmode="numeric"]');
  await adetKutusu.click();
  await adetKutusu.press("Control+a");
  await adetKutusu.press("Backspace");
  kontrol("adet kutusu boşaltılabiliyor", (await adetKutusu.inputValue()) === "");
  await adetKutusu.type("100");
  kontrol("adet doğrudan yazılabiliyor", (await adetKutusu.inputValue()) === "100");
  await ilkSatir.getByRole("button", { name: /listeye ekle/i }).click();
  await page.screenshot({ path: path.join(SHOT_DIR, "teklif-olcu-paneli.png"), fullPage: false });

  console.log("3) Arama kutusundan ikinci kalem (kademeli daraltma)");
  const arama = page.locator('input[aria-label="Ürün ara"]');
  await arama.fill("934");
  await page.waitForTimeout(700);
  const genis = await page.locator("li").filter({ hasText: /DIN 934/ }).count();
  await arama.fill("934 8");
  await page.waitForTimeout(700);
  const dar = await page.locator("li").filter({ hasText: /DIN 934/ }).count();
  kontrol("ikinci kelime sonucu daralttı", dar < genis, `${genis} → ${dar}`);
  const yanlisNorm = await page.locator("li").filter({ hasText: /DIN 933|DIN 931/ }).count();
  kontrol("komşu normlar karışmadı", yanlisNorm === 0, `${yanlisNorm} yabancı satır`);

  await page
    .locator("li")
    .filter({ hasText: /DIN 934/ })
    .first()
    .getByRole("button", { name: /listeye ekle/i })
    .click();

  const kalemSayisi = await page.locator("text=/Teklif Listesi/").count();
  kontrol("liste başlığı göründü", kalemSayisi > 0);

  console.log("4) Yenilemeden sonra liste kalıcı mı");
  await page.reload({ waitUntil: "networkidle" });
  const gonderDugmesi = page.getByRole("button", { name: /Listeyi Gönder/ });
  const etiket = (await gonderDugmesi.textContent()) ?? "";
  kontrol("liste localStorage'dan geri geldi", etiket.includes("2 kalem"), etiket.trim());

  console.log("5) Bilgiler ve gönderim");
  await page.getByLabel("Firma Adı").fill("Smoke Test Metal A.Ş.");
  await page.getByLabel("Telefon").fill("0555 999 88 77");
  await page.getByLabel("Adres").fill("İstanbul, Test Mahallesi, Deneme Sokak No 1, Kadıköy");
  await page.getByLabel("Not", { exact: false }).fill("Otomatik smoke testi kaydıdır.");
  await page.locator('input[type="checkbox"]').check();
  await page.screenshot({ path: path.join(SHOT_DIR, "teklif-liste-form.png"), fullPage: true });
  await gonderDugmesi.click();

  await page.getByText("Talebin Alındı!", { exact: false }).waitFor({ timeout: 30_000 });
  kontrol("gönderim başarı ekranına ulaştı", true);
  await page.screenshot({ path: path.join(SHOT_DIR, "teklif-basarili.png") });

  console.log("6) Veritabanı kaydı");
  const kayit = await db.quoteRequest.findFirst({
    where: { customer: { phone: TEST_TEL } },
    include: { customer: true, items: { include: { variant: true, product: true } } },
    orderBy: { createdAt: "desc" },
  });
  kontrol("talep kaydedildi", Boolean(kayit), kayit?.id ?? "yok");
  kontrol("iki kalem yazıldı", kayit?.items.length === 2, `${kayit?.items.length} kalem`);
  kontrol("varyant kodu bağlandı", Boolean(kayit?.items[0]?.variant?.code), kayit?.items[0]?.variant?.code ?? "yok");
  kontrol("aile (ürün) bağlandı", Boolean(kayit?.items[0]?.product?.sku), kayit?.items[0]?.product?.sku ?? "yok");
  kontrol("adet taşındı", kayit?.items[0]?.quantity === 100, String(kayit?.items[0]?.quantity));
  kontrol("kalite taşındı", ["A2", "A4"].includes(kayit?.items[0]?.quality ?? ""), kayit?.items[0]?.quality ?? "yok");
  kontrol("adres kaydedildi", Boolean(kayit?.customer.address));
  kontrol("kaynak liste", kayit?.source === "liste", kayit?.source ?? "");
  kontrol("konsol hatası yok", konsolHatalari.length === 0, konsolHatalari.slice(0, 2).join(" | "));

  await browser.close();
  await temizle();

  console.log(hata === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${hata} KONTROL BAŞARISIZ`);
  if (hata > 0) process.exitCode = 1;
}

async function temizle() {
  const m = await db.customer.findUnique({ where: { phone: TEST_TEL }, select: { id: true } });
  if (!m) return;
  await db.quoteRequest.deleteMany({ where: { customerId: m.id } });
  await db.customer.delete({ where: { id: m.id } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
