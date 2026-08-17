/**
 * Rapor sayfasını gerçek veriyle denemek için örnek talep üreteci —
 * `npm run ornek:teklif -- --onayla` (YALNIZ geliştirme veritabanında).
 *
 * İçinde bulunulan aya yayılmış, farklı sonuçlara düşen talepler yazar:
 * siparişe dönen, 48 saati geçip "fiyat tutmadı" olan, hiç cevaplanmayan ve
 * hâlâ açık olan. Ürünler veritabanındaki gerçek varyantlardan seçilir.
 *
 * Ürettiği kayıtları geri almak: `npm run ornek:teklif -- --temizle`
 * (telefonu +90555000XXXX olan örnek müşteriler ve talepleri silinir).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Örnek müşteri telefon öneki — temizleme bu önekten gider. */
const ORNEK_TEL_ONEK = "+90555000";

type Kalem =
  | {
      variantId: string;
      productId: string | null;
      quantity: number;
      unit: string;
      quality: string;
      order: number;
    }
  | { freeText: string; quantity: number; unit: string; order: number };

const FIRMALAR = [
  { name: "Ali Veli", company: "Akım Metal San. Tic.", city: "İstanbul" },
  { name: "Ayşe Yıldız", company: null, city: "İzmir" },
  { name: "Mehmet Kaya", company: "Kaya Makine", city: "Bursa" },
  { name: "Zeynep Demir", company: "Demir Yapı", city: "Ankara" },
  { name: "Hakan Şahin", company: "Şahin Tesisat", city: "Kocaeli" },
];

/** [gün önce, durum, siparişe döndü mü] — ay içine yayılmış senaryolar */
const SENARYOLAR: { gunOnce: number; status: string; siparis: boolean; cevapDk: number | null }[] = [
  { gunOnce: 26, status: "SIPARIS", siparis: true, cevapDk: 22 },
  { gunOnce: 24, status: "CEVAPLANAN", siparis: false, cevapDk: 35 },
  { gunOnce: 20, status: "CEVAPLANAN", siparis: false, cevapDk: 18 },
  { gunOnce: 17, status: "SIPARIS", siparis: true, cevapDk: 12 },
  { gunOnce: 14, status: "YENI", siparis: false, cevapDk: null },
  { gunOnce: 11, status: "CEVAPLANAN", siparis: false, cevapDk: 1500 },
  { gunOnce: 8, status: "SIPARIS", siparis: true, cevapDk: 26 },
  { gunOnce: 6, status: "CEVAPLANAN", siparis: false, cevapDk: 40 },
  { gunOnce: 4, status: "BEKLEYEN", siparis: false, cevapDk: null },
  { gunOnce: 0, status: "YENI", siparis: false, cevapDk: null },
];

async function temizle() {
  const musteriler = await db.customer.findMany({
    where: { phone: { startsWith: ORNEK_TEL_ONEK } },
    select: { id: true },
  });
  const ids = musteriler.map((m) => m.id);
  if (ids.length === 0) {
    console.log("Silinecek örnek kayıt yok.");
    return;
  }
  const { count } = await db.quoteRequest.deleteMany({ where: { customerId: { in: ids } } });
  await db.customer.deleteMany({ where: { id: { in: ids } } });
  console.log(`${count} örnek talep ve ${ids.length} örnek müşteri silindi.`);
}

async function uret() {
  // Aile başına bir temsilci: rapor tabloları tek ürüne yığılmasın
  const temsilciler = await db.variant.findMany({
    where: { isActive: true, productId: { not: null } },
    select: { id: true, code: true, productId: true },
    distinct: ["productId"],
    orderBy: { code: "asc" },
    take: 20,
  });
  // Bir ailenin birkaç ölçüsü: "en çok sorulan" satırının ölçü kırılımı dolsun
  const ayniAile = temsilciler[0]
    ? await db.variant.findMany({
        where: { isActive: true, productId: temsilciler[0].productId },
        select: { id: true, code: true, productId: true },
        take: 4,
      })
    : [];
  const varyantlar = [...temsilciler, ...ayniAile];
  if (varyantlar.length === 0) {
    console.error(
      "Varyant yok — önce `npm run import:urunler` ve `npm run import:varyantlar` çalıştırın.",
    );
    process.exitCode = 1;
    return;
  }

  const musteriler = [];
  for (const [i, f] of FIRMALAR.entries()) {
    const phone = `${ORNEK_TEL_ONEK}${String(1000 + i).slice(-4)}`;
    musteriler.push(
      await db.customer.upsert({
        where: { phone },
        update: {},
        create: {
          name: f.name,
          company: f.company,
          phone,
          email: null,
          address: `${f.city}, örnek mahalle, no 1 (rapor denemesi)`,
        },
      }),
    );
  }

  const simdi = Date.now();
  let sayac = 0;

  for (const [i, s] of SENARYOLAR.entries()) {
    const musteri = musteriler[i % musteriler.length];
    const createdAt = new Date(simdi - s.gunOnce * 24 * 60 * 60 * 1000 - i * 37 * 60 * 1000);
    const respondedAt = s.cevapDk === null ? null : new Date(createdAt.getTime() + s.cevapDk * 60_000);
    const orderedAt = s.siparis && respondedAt ? new Date(respondedAt.getTime() + 3 * 3600_000) : null;

    // Her talebe 1-4 kalem: listenin başındaki varyantlar bilinçli olarak daha sık
    // seçilir ki "en çok sorulan" tablosu anlamlı bir sıralama göstersin
    const kalemSayisi = 1 + (i % 4);
    const kalemler: Kalem[] = Array.from({ length: kalemSayisi }, (_, j) => {
      const v = varyantlar[(i * 3 + j * 7) % varyantlar.length];
      return {
        variantId: v.id,
        productId: v.productId,
        quantity: (j + 1) * 25 + i * 5,
        unit: "adet",
        quality: j % 2 === 0 ? "A2" : "A4",
        order: j,
      };
    });

    // Bir talep de katalog dışı ihtiyaç içersin (serbest metin raporda ayrı görünür)
    if (i === 5) {
      kalemler.push({
        freeText: "8'lik dübel, siyah (örnek serbest kalem)",
        quantity: 10,
        unit: "adet",
        order: kalemler.length,
      });
    }

    await db.quoteRequest.create({
      data: {
        customerId: musteri.id,
        status: s.status,
        source: "liste",
        note: i % 3 === 0 ? "Rapor denemesi için üretilmiş örnek taleptir." : null,
        createdAt,
        respondedAt,
        orderedAt,
        items: { create: kalemler },
      },
    });
    sayac += 1;
  }

  console.log(`${sayac} örnek talep üretildi. Panel: /panel/raporlar`);
}

async function main() {
  const argv = process.argv.slice(2);
  const dbUrl = process.env.DATABASE_URL ?? "";
  const host = dbUrl.replace(/^.*@/, "").split("/")[0] || "(bilinmiyor)";

  if (argv.includes("--temizle")) {
    console.log(`Veritabanı: ${host}`);
    await temizle();
    return;
  }

  if (!argv.includes("--onayla")) {
    console.log(
      [
        "Bu script veritabanına ÖRNEK talepler yazar — yalnız geliştirme veritabanında kullanın.",
        `Hedef veritabanı: ${host}`,
        "",
        "Çalıştırmak için:  npm run ornek:teklif -- --onayla",
        "Geri almak için :  npm run ornek:teklif -- --temizle",
      ].join("\n"),
    );
    return;
  }

  console.log(`Veritabanı: ${host}`);
  await uret();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
