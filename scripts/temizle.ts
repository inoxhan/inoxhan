/**
 * Veritabanı ve medya temizliği — ürün kataloğunu ve test kayıtlarını sıfırlar.
 *
 *   npm run temizle          → onay sorar
 *   npm run temizle -- --yes → doğrudan siler
 *
 * KORUNUR: AdminUser (panel girişi) ve Setting (WhatsApp, e-posta vb. ayarlar).
 * Teklif kalemlerindeki ürün referansları silinmeden önce serbest metne çevrilir,
 * böylece bir teklif geçmişi korunmak istenirse ürün adı kaybolmaz.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CONFIRMED = process.argv.includes("--yes");

/** İçeriği silinecek, kendisi kalacak klasörler */
const CLEAR_DIRS = [
  "public/media/products",
  "public/media/technical", // katalogdan çıkarılan teknik çizim/ölçü tablosu türevleri
  "import/fotograflar",
  "storage/uploads",
  "storage/katalog",
  "storage/smoke",
];

/** Tek tek silinecek dosyalar (içe aktarma testinden kalanlar) */
const REMOVE_FILES = ["import/urunler.xlsx", "import/eslesmeyen.csv"];

async function main() {
  const counts = {
    urun: await db.product.count(),
    kategori: await db.category.count(),
    marka: await db.brand.count(),
    teklif: await db.quoteRequest.count(),
    musteri: await db.customer.count(),
    olay: await db.analyticsEvent.count(),
  };

  console.log("Silinecek kayıtlar:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log("Korunacak: panel kullanıcısı ve ayarlar\n");

  if (!CONFIRMED) {
    console.log("Onay için: npm run temizle -- --yes");
    return;
  }

  // Teklif kalemlerinde ürün adını serbest metne taşı (FK kısıtı + geçmiş kaybı olmasın)
  const items = await db.quoteItem.findMany({
    where: { productId: { not: null } },
    include: { product: true },
  });
  for (const item of items) {
    await db.quoteItem.update({
      where: { id: item.id },
      data: {
        productId: null,
        freeText: item.product ? `${item.product.name} (${item.product.sku})` : item.freeText,
      },
    });
  }

  // Katalog verisi (bağımlılık sırasıyla)
  await db.productSpec.deleteMany();
  await db.productImage.deleteMany();
  await db.productDrawing.deleteMany();
  await db.productDocument.deleteMany();
  await db.product.deleteMany();
  await db.brand.deleteMany();
  await db.category.deleteMany();

  // Test amaçlı oluşturulmuş talep/müşteri/analitik kayıtları
  await db.quoteItem.deleteMany();
  await db.quoteRequest.deleteMany();
  await db.customer.deleteMany();
  await db.analyticsEvent.deleteMany();

  // Medya ve test dosyaları
  for (const dir of CLEAR_DIRS) {
    await rm(path.join(process.cwd(), dir), { recursive: true, force: true });
  }
  for (const file of REMOVE_FILES) {
    await rm(path.join(process.cwd(), file), { force: true });
  }

  console.log(
    "Temizlik tamam. Sıradaki adımlar: npm run import:urunler && npm run import:cizim",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
