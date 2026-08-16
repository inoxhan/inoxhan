/**
 * Higgsfield'e yüklenecek ürün fotoğraflarını tek klasörde toplar.
 *
 *   npm run hazirla:yukleme
 *
 * Çıktı: import/higgsfield/urun-kaynak/
 *   din-933.webp, din-934.webp, ... (54 dosya)
 *   LISTE.txt  — hangisini yaptığını işaretleyebilmen için sıralı liste
 *
 * Neden ayrı klasör: dosya adı, üreteceğin klibin adıyla BİREBİR aynı. `din-933.webp`
 * yükle → çıktıyı `din-933.mp4` kaydet → `import/higgsfield/urun/` altına at. Adlandırma
 * hatası ihtimali kalmıyor; `hazirla-showreel.ts` eşleştirmeyi bu ada göre yapıyor.
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/server/db";
import { urunleriGetir } from "./lib/urun-listesi";

const CIKTI = path.join(process.cwd(), "import", "higgsfield", "urun-kaynak");
const HEDEF = path.join(process.cwd(), "import", "higgsfield", "urun");

async function main() {
  await mkdir(CIKTI, { recursive: true });
  // Klip klasörünü de şimdiden aç — kullanıcı nereye atacağını aramasın.
  await mkdir(HEDEF, { recursive: true });

  const urunler = await urunleriGetir();
  if (urunler.length === 0) {
    console.error("Ürün bulunamadı — önce npm run import:urunler");
    process.exit(1);
  }

  const satirlar: string[] = [];
  let kopyalanan = 0;
  let eksik = 0;
  let oncekiKategori = "";

  for (const [i, u] of urunler.entries()) {
    if (!existsSync(u.fotograf)) {
      console.warn(`  ! ${u.slug}: fotoğraf yok (${path.basename(u.fotograf)})`);
      eksik++;
      continue;
    }
    await copyFile(u.fotograf, path.join(CIKTI, `${u.slug}.webp`));
    kopyalanan++;

    if (u.kategori !== oncekiKategori) {
      satirlar.push("", `── ${u.kategori.toLocaleUpperCase("tr-TR")} ──`);
      oncekiKategori = u.kategori;
    }
    // Sabit genişlikli sütunlar: liste düz metin editöründe hizalı dursun
    satirlar.push(
      `[ ] ${String(i + 1).padStart(2, "0")}  ${`${u.slug}.webp`.padEnd(26)}` +
        `${u.etiket.padEnd(22)}${u.ad}`,
    );
  }

  await writeFile(
    path.join(CIKTI, "LISTE.txt"),
    [
      // BOM: Windows'ta bazı editörler BOM'suz UTF-8'i ANSI sanıp Türkçe harfleri bozuyor
      "﻿İNOXHAN — SHOWREEL ÜRÜN KLİPLERİ",
      "",
      `${kopyalanan} ürün. Her biri için:`,
      "  1. Bu klasördeki .webp dosyasını Higgsfield'e yükle (image-to-video)",
      "  2. Hareket prompt'unu yapıştır (54'ünde de AYNI prompt)",
      "  3. Çıktıyı AYNI isimle .mp4 olarak kaydet → import/higgsfield/urun/ klasörüne at",
      "",
      "Hepsini birden yapman gerekmiyor. Kaç tane varsa onlar kullanılır,",
      "olmayan üründe duran fotoğrafa düşülür. Önce 8-10 tane yapıp",
      "npm run hazirla:showreel ile sonuca bak.",
      "",
      ...satirlar,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\n${kopyalanan} fotoğraf kopyalandı → import/higgsfield/urun-kaynak/`);
  if (eksik > 0) console.log(`${eksik} üründe fotoğraf eksik.`);
  console.log("Klipleri import/higgsfield/urun/ altına at, sonra: npm run hazirla:showreel");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
