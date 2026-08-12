/**
 * İnoxhan seed — gerçekçi örnek verilerle site iskeletini besler.
 * Gerçek 456 ürün Faz 5'te scripts/import-excel.ts ile içe aktarılacak;
 * bu seed yeniden çalıştırılabilir (slug/sku ile upsert).
 *
 * Çalıştırma: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { slugifyTr } from "../src/lib/slugify-tr";
import { hashPassword } from "../src/server/password";

const db = new PrismaClient();

const MEDIA_DIR = path.join(process.cwd(), "public", "media", "products");

/** Görsel türev üretim sözleşmesi — import pipeline (Faz 5) ile aynı. */
const VARIANTS = [
  { suffix: "sm", width: 480 },
  { suffix: "md", width: 960 },
  { suffix: "lg", width: 1600 },
] as const;

interface SeedProduct {
  sku: string;
  name: string;
  brand: string;
  model: string;
  shortDesc: string;
  useAreas: string;
  specs: [string, string][];
}

interface SeedCategory {
  name: string;
  order: number;
  /** Placeholder görseldeki kısa etiket */
  label: string;
  products: SeedProduct[];
}

const CATEGORIES: SeedCategory[] = [
  {
    name: "Cıvatalar",
    order: 1,
    label: "CIVATA",
    products: [
      {
        sku: "INX-CV-0001",
        name: "Altıköşe Başlı Cıvata DIN 933 M8x40 A2",
        brand: "ProFix",
        model: "DIN 933",
        shortDesc:
          "Tam diş, A2 paslanmaz çelik altıköşe başlı cıvata. Korozyona dayanıklı, iç ve dış mekân kullanımına uygun.",
        useAreas: "İnşaat, Makine İmalatı, Denizcilik",
        specs: [
          ["Norm", "DIN 933"],
          ["Ölçü", "M8x40"],
          ["Malzeme", "A2-70 Paslanmaz Çelik"],
          ["Diş", "Tam Diş"],
        ],
      },
      {
        sku: "INX-CV-0002",
        name: "Altıköşe Başlı Cıvata DIN 931 M10x80 8.8",
        brand: "SteelMax",
        model: "DIN 931",
        shortDesc:
          "Yarım diş, 8.8 kalite çelik cıvata. Yüksek çekme dayanımı gerektiren bağlantılar için.",
        useAreas: "Çelik Konstrüksiyon, Makine, Otomotiv",
        specs: [
          ["Norm", "DIN 931"],
          ["Ölçü", "M10x80"],
          ["Kalite", "8.8"],
          ["Kaplama", "Beyaz Çinko"],
        ],
      },
      {
        sku: "INX-CV-0003",
        name: "İmbus Cıvata DIN 912 M6x30 12.9",
        brand: "TorkPlus",
        model: "DIN 912",
        shortDesc:
          "Silindirik başlı, alyan soketli imbus cıvata. 12.9 kalite, yüksek mukavemetli uygulamalar için.",
        useAreas: "Makine İmalatı, Kalıp, Otomasyon",
        specs: [
          ["Norm", "DIN 912"],
          ["Ölçü", "M6x30"],
          ["Kalite", "12.9"],
          ["Yüzey", "Siyah Oksit"],
        ],
      },
      {
        sku: "INX-CV-0004",
        name: "Altıköşe Flanşlı Cıvata DIN 6921 M8x25",
        brand: "ProFix",
        model: "DIN 6921",
        shortDesc:
          "Flanşlı gövdesiyle pul gerektirmeyen, titreşime dayanıklı cıvata.",
        useAreas: "Otomotiv, Beyaz Eşya, Profil Sistemleri",
        specs: [
          ["Norm", "DIN 6921"],
          ["Ölçü", "M8x25"],
          ["Kalite", "10.9"],
          ["Kaplama", "Galvaniz"],
        ],
      },
    ],
  },
  {
    name: "Somunlar",
    order: 2,
    label: "SOMUN",
    products: [
      {
        sku: "INX-SM-0001",
        name: "Altıköşe Somun DIN 934 M8 A2",
        brand: "ProFix",
        model: "DIN 934",
        shortDesc: "A2 paslanmaz çelik standart altıköşe somun.",
        useAreas: "İnşaat, Makine, Denizcilik",
        specs: [
          ["Norm", "DIN 934"],
          ["Ölçü", "M8"],
          ["Malzeme", "A2 Paslanmaz Çelik"],
          ["Anahtar Ağzı", "13 mm"],
        ],
      },
      {
        sku: "INX-SM-0002",
        name: "Fiberli Kilitli Somun DIN 985 M10",
        brand: "SteelMax",
        model: "DIN 985",
        shortDesc:
          "Naylon fiber halkalı, titreşimle gevşemeye dayanıklı kilitli somun.",
        useAreas: "Otomotiv, Makine, Tarım Ekipmanları",
        specs: [
          ["Norm", "DIN 985"],
          ["Ölçü", "M10"],
          ["Kalite", "8"],
          ["Kaplama", "Beyaz Çinko"],
        ],
      },
      {
        sku: "INX-SM-0003",
        name: "Kelebek Somun DIN 315 M6",
        brand: "İnoxLine",
        model: "DIN 315",
        shortDesc: "El ile sıkılıp sökülebilen kelebek somun.",
        useAreas: "Mobilya, Reklam Panoları, Hobi",
        specs: [
          ["Norm", "DIN 315"],
          ["Ölçü", "M6"],
          ["Malzeme", "A2 Paslanmaz Çelik"],
          ["Tip", "Kelebek"],
        ],
      },
      {
        sku: "INX-SM-0004",
        name: "Kaynak Somunu DIN 929 M8",
        brand: "SteelMax",
        model: "DIN 929",
        shortDesc: "Sac üzerine projeksiyon kaynağı ile monte edilen altıköşe kaynak somunu.",
        useAreas: "Otomotiv, Sac İşleme, Beyaz Eşya",
        specs: [
          ["Norm", "DIN 929"],
          ["Ölçü", "M8"],
          ["Malzeme", "Kaynaklanabilir Çelik"],
          ["Yüzey", "Kaplamasız"],
        ],
      },
    ],
  },
  {
    name: "Vidalar",
    order: 3,
    label: "VİDA",
    products: [
      {
        sku: "INX-VD-0001",
        name: "Sunta Vidası 4x40 Sarı Kaplama",
        brand: "TorkPlus",
        model: "SV-440",
        shortDesc:
          "Keskin uçlu, derin dişli sunta vidası. Yıldız (PZ2) yuvalı.",
        useAreas: "Mobilya, Ahşap İmalat, Dekorasyon",
        specs: [
          ["Ölçü", "4x40"],
          ["Yuva", "PZ2 Yıldız"],
          ["Kaplama", "Sarı Çinko"],
          ["Uç", "Keskin"],
        ],
      },
      {
        sku: "INX-VD-0002",
        name: "Matkap Uçlu Vida DIN 7504K 4.8x19",
        brand: "SteelMax",
        model: "DIN 7504K",
        shortDesc:
          "Ön delme gerektirmeyen, altıköşe başlı matkap uçlu vida.",
        useAreas: "Çatı-Cephe, Çelik Konstrüksiyon, HVAC",
        specs: [
          ["Norm", "DIN 7504K"],
          ["Ölçü", "4.8x19"],
          ["Baş", "Altıköşe (8 mm)"],
          ["Kaplama", "Beyaz Çinko"],
        ],
      },
      {
        sku: "INX-VD-0003",
        name: "Yıldız Havşa Vida DIN 965 M4x16 A2",
        brand: "İnoxLine",
        model: "DIN 965",
        shortDesc: "Havşa başlı, yıldız yuvalı makine vidası. A2 paslanmaz.",
        useAreas: "Elektronik, Makine, Aydınlatma",
        specs: [
          ["Norm", "DIN 965"],
          ["Ölçü", "M4x16"],
          ["Malzeme", "A2 Paslanmaz Çelik"],
          ["Yuva", "PH2 Yıldız"],
        ],
      },
      {
        sku: "INX-VD-0004",
        name: "Alçıpan Vidası 3.5x25 Fosfat",
        brand: "TorkPlus",
        model: "AV-3525",
        shortDesc: "İnce dişli, fosfat kaplı alçıpan vidası. Trompet başlı.",
        useAreas: "Alçıpan, Asma Tavan, Bölme Duvar",
        specs: [
          ["Ölçü", "3.5x25"],
          ["Diş", "İnce"],
          ["Kaplama", "Siyah Fosfat"],
          ["Baş", "Trompet PH2"],
        ],
      },
    ],
  },
  {
    name: "Dübeller",
    order: 4,
    label: "DÜBEL",
    products: [
      {
        sku: "INX-DB-0001",
        name: "Plastik Dübel 8 mm",
        brand: "ProFix",
        model: "PD-8",
        shortDesc: "Genel amaçlı, tırnaklı plastik dübel. Beton ve tuğlaya uygun.",
        useAreas: "İnşaat, Montaj, Dekorasyon",
        specs: [
          ["Çap", "8 mm"],
          ["Uzunluk", "40 mm"],
          ["Malzeme", "Naylon (PA6)"],
          ["Vida Ölçüsü", "4.5–6 mm"],
        ],
      },
      {
        sku: "INX-DB-0002",
        name: "Çelik Çakma Dübel M6x40",
        brand: "SteelMax",
        model: "CD-M6",
        shortDesc: "Beton içine çakılarak monte edilen çelik dübel.",
        useAreas: "Asma Tavan, Tesisat Askı, Çelik Konstrüksiyon",
        specs: [
          ["Ölçü", "M6x40"],
          ["Malzeme", "Çelik"],
          ["Kaplama", "Beyaz Çinko"],
          ["Montaj", "Çakmalı"],
        ],
      },
      {
        sku: "INX-DB-0003",
        name: "Kimyasal Dübel 300 ml",
        brand: "ProFix",
        model: "KD-300",
        shortDesc:
          "Ağır yük bağlantıları için vinilester esaslı kimyasal ankraj.",
        useAreas: "Çelik Konstrüksiyon, Güneş Enerjisi, Ankraj",
        specs: [
          ["Hacim", "300 ml"],
          ["Tip", "Vinilester"],
          ["Kürlenme", "25°C'de 45 dk"],
          ["Sertifika", "ETA Onaylı"],
        ],
      },
      {
        sku: "INX-DB-0004",
        name: "Beton Vidası 7.5x60",
        brand: "TorkPlus",
        model: "BV-7560",
        shortDesc: "Dübelsiz doğrudan betona monte edilen özel dişli vida.",
        useAreas: "Doğrama, Çerçeve Montajı, İnşaat",
        specs: [
          ["Ölçü", "7.5x60"],
          ["Baş", "Havşa Torx T30"],
          ["Kaplama", "Beyaz Çinko"],
          ["Montaj", "Dübelsiz"],
        ],
      },
    ],
  },
  {
    name: "Rondelalar",
    order: 5,
    label: "RONDELA",
    products: [
      {
        sku: "INX-RD-0001",
        name: "Düz Rondela DIN 125 M8 A2",
        brand: "İnoxLine",
        model: "DIN 125",
        shortDesc: "A2 paslanmaz standart düz rondela (pul).",
        useAreas: "Genel Montaj, Makine, İnşaat",
        specs: [
          ["Norm", "DIN 125"],
          ["Ölçü", "M8"],
          ["Malzeme", "A2 Paslanmaz Çelik"],
          ["Dış Çap", "16 mm"],
        ],
      },
      {
        sku: "INX-RD-0002",
        name: "Yaylı Rondela DIN 127 M10",
        brand: "SteelMax",
        model: "DIN 127",
        shortDesc: "Titreşimli bağlantılarda gevşemeyi önleyen yaylı rondela.",
        useAreas: "Makine, Otomotiv, Tarım",
        specs: [
          ["Norm", "DIN 127"],
          ["Ölçü", "M10"],
          ["Malzeme", "Yay Çeliği"],
          ["Kaplama", "Beyaz Çinko"],
        ],
      },
      {
        sku: "INX-RD-0003",
        name: "Geniş Rondela DIN 9021 M8",
        brand: "ProFix",
        model: "DIN 9021",
        shortDesc: "Yükü geniş alana yayan büyük dış çaplı rondela.",
        useAreas: "Ahşap Bağlantı, Sac, Karoser",
        specs: [
          ["Norm", "DIN 9021"],
          ["Ölçü", "M8"],
          ["Dış Çap", "24 mm"],
          ["Kaplama", "Galvaniz"],
        ],
      },
      {
        sku: "INX-RD-0004",
        name: "Tırtıllı Rondela DIN 6798-A M6",
        brand: "TorkPlus",
        model: "DIN 6798-A",
        shortDesc: "Dış tırnaklı, kendinden kilitli emniyet rondelası.",
        useAreas: "Elektrik Panoları, Elektronik, Makine",
        specs: [
          ["Norm", "DIN 6798-A"],
          ["Ölçü", "M6"],
          ["Tip", "Dış Tırnaklı"],
          ["Malzeme", "Yay Çeliği"],
        ],
      },
    ],
  },
  {
    name: "Tesisat Bağlantı",
    order: 6,
    label: "TESİSAT",
    products: [
      {
        sku: "INX-TS-0001",
        name: 'Paslanmaz Boru Kelepçesi 1/2"',
        brand: "İnoxLine",
        model: "BK-12",
        shortDesc: "Kauçuk yataklı, M8 somunlu paslanmaz boru kelepçesi.",
        useAreas: "Sıhhi Tesisat, HVAC, Yangın Tesisatı",
        specs: [
          ["Ölçü", '1/2" (20-23 mm)'],
          ["Malzeme", "Paslanmaz Çelik"],
          ["Yatak", "EPDM Kauçuk"],
          ["Bağlantı", "M8 Somun"],
        ],
      },
      {
        sku: "INX-TS-0002",
        name: 'Pirinç Rakor 3/4"',
        brand: "ProFix",
        model: "RK-34",
        shortDesc: "Sökülebilir bağlantılar için üç parçalı pirinç rakor.",
        useAreas: "Sıhhi Tesisat, Doğalgaz, Kalorifer",
        specs: [
          ["Ölçü", '3/4"'],
          ["Malzeme", "Pirinç (CW617N)"],
          ["Bağlantı", "İç-Dış Diş"],
          ["Basınç", "PN16"],
        ],
      },
      {
        sku: "INX-TS-0003",
        name: 'Paslanmaz T Fitting 1/2"',
        brand: "İnoxLine",
        model: "TF-12",
        shortDesc: "304 kalite paslanmaz çelik dişli T bağlantı parçası.",
        useAreas: "Endüstriyel Tesisat, Gıda, Kimya",
        specs: [
          ["Ölçü", '1/2"'],
          ["Malzeme", "AISI 304"],
          ["Diş", "BSP"],
          ["Basınç", "PN25"],
        ],
      },
      {
        sku: "INX-TS-0004",
        name: 'Küresel Vana 1/2" PN25',
        brand: "SteelMax",
        model: "KV-12",
        shortDesc: "Tam geçişli, kelebek kollu pirinç küresel vana.",
        useAreas: "Sıhhi Tesisat, Kalorifer, Basınçlı Hava",
        specs: [
          ["Ölçü", '1/2"'],
          ["Basınç", "PN25"],
          ["Gövde", "Nikel Kaplı Pirinç"],
          ["Küre", "Krom Kaplı"],
        ],
      },
    ],
  },
];

/** Kategori başına nötr çelik-gri placeholder görsel üretir (AVIF + WebP, 3 boyut). */
async function generatePlaceholder(catSlug: string, label: string) {
  const svg = `
  <svg width="1600" height="1200" viewBox="0 0 1600 1200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1F252C"/>
        <stop offset="0.5" stop-color="#333C46"/>
        <stop offset="1" stop-color="#14181D"/>
      </linearGradient>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#8B97A3" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#D2D8DE" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#8B97A3" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="1200" fill="url(#bg)"/>
    <rect x="500" y="0" width="380" height="1200" fill="url(#sheen)" transform="skewX(-12)"/>
    <circle cx="800" cy="560" r="240" fill="none" stroke="#4A5561" stroke-width="6"/>
    <circle cx="800" cy="560" r="150" fill="none" stroke="#4A5561" stroke-width="4" stroke-dasharray="18 12"/>
    <text x="800" y="940" text-anchor="middle" font-family="Arial, sans-serif" font-size="88"
      font-weight="bold" letter-spacing="22" fill="#8B97A3">${label}</text>
    <text x="800" y="1010" text-anchor="middle" font-family="Arial, sans-serif" font-size="34"
      letter-spacing="10" fill="#4A5561">ÖRNEK GÖRSEL</text>
  </svg>`;

  const src = sharp(Buffer.from(svg));
  const basePath = `media/products/ph-${catSlug}`;

  for (const v of VARIANTS) {
    const resized = src.clone().resize(v.width, Math.round((v.width * 3) / 4));
    await resized
      .clone()
      .avif({ quality: 55 })
      .toFile(path.join(MEDIA_DIR, `ph-${catSlug}-${v.suffix}.avif`));
    await resized
      .clone()
      .webp({ quality: 72 })
      .toFile(path.join(MEDIA_DIR, `ph-${catSlug}-${v.suffix}.webp`));
  }
  return basePath;
}

async function main() {
  await mkdir(MEDIA_DIR, { recursive: true });

  // Markalar
  const brandNames = ["ProFix", "SteelMax", "İnoxLine", "TorkPlus"];
  const brands = new Map<string, string>();
  for (const name of brandNames) {
    const slug = slugifyTr(name);
    const brand = await db.brand.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    brands.set(name, brand.id);
  }

  // Kategoriler + ürünler
  let productCount = 0;
  for (const cat of CATEGORIES) {
    const catSlug = slugifyTr(cat.name);
    const basePath = await generatePlaceholder(catSlug, cat.label);

    const category = await db.category.upsert({
      where: { slug: catSlug },
      update: { name: cat.name, order: cat.order, imagePath: basePath },
      create: { name: cat.name, slug: catSlug, order: cat.order, imagePath: basePath },
    });

    for (const p of cat.products) {
      const slug = slugifyTr(`${p.brand} ${p.name}`);
      const product = await db.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          slug,
          model: p.model,
          shortDesc: p.shortDesc,
          useAreas: p.useAreas,
          categoryId: category.id,
          brandId: brands.get(p.brand),
        },
        create: {
          sku: p.sku,
          name: p.name,
          slug,
          model: p.model,
          shortDesc: p.shortDesc,
          useAreas: p.useAreas,
          categoryId: category.id,
          brandId: brands.get(p.brand),
        },
      });

      // Spec ve görselleri tazele (idempotent)
      await db.productSpec.deleteMany({ where: { productId: product.id } });
      await db.productSpec.createMany({
        data: p.specs.map(([key, value], i) => ({
          productId: product.id,
          key,
          value,
          order: i,
        })),
      });

      await db.productImage.deleteMany({ where: { productId: product.id } });
      await db.productImage.create({
        data: {
          productId: product.id,
          basePath,
          alt: p.name,
          isMain: true,
          order: 0,
          width: 1600,
          height: 1200,
        },
      });
      productCount++;
    }
  }

  // Panel yöneticisi
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const passwordHash = await hashPassword(password);
    await db.adminUser.upsert({
      where: { username },
      update: {},
      create: { username, passwordHash },
    });
  } else {
    console.warn("ADMIN_PASSWORD .env'de yok — panel kullanıcısı oluşturulmadı.");
  }

  // Varsayılan ayarlar
  const settings: [string, string][] = [
    ["hero_slogan", "0"],
    ["whatsapp_number", process.env.WHATSAPP_NUMBER ?? ""],
    ["notify_email", process.env.NOTIFY_EMAIL ?? ""],
  ];
  for (const [key, value] of settings) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Demo teklifler — panel SLA renklerini test etmek için (biri 70 dk önce)
  const demoCustomer = await db.customer.upsert({
    where: { phone: "+905001112233" },
    update: {},
    create: {
      name: "Demo Müşteri",
      company: "Örnek İnşaat Ltd.",
      phone: "+905001112233",
      email: "demo@example.com",
    },
  });

  const existingDemo = await db.quoteRequest.count({
    where: { customerId: demoCustomer.id },
  });
  if (existingDemo === 0) {
    const anyProduct = await db.product.findFirst({ where: { sku: "INX-CV-0001" } });
    await db.quoteRequest.create({
      data: {
        customerId: demoCustomer.id,
        status: "YENI",
        note: "Şantiye için acil ihtiyaç. (Demo kayıt — SLA gecikme testi)",
        source: "product",
        createdAt: new Date(Date.now() - 70 * 60 * 1000), // 70 dk önce → kırmızı
        items: {
          create: [
            { productId: anyProduct?.id, quantity: 500, unit: "adet" },
          ],
        },
      },
    });
    await db.quoteRequest.create({
      data: {
        customerId: demoCustomer.id,
        status: "YENI",
        note: "Fotoğraftaki ürünün muadili olur mu? (Demo kayıt)",
        source: "floating",
        items: {
          create: [{ freeText: "8'lik dübel, siyah, 1000 adet", quantity: 1000 }],
        },
      },
    });
  }

  console.log(
    `Seed tamam: ${CATEGORIES.length} kategori, ${brandNames.length} marka, ${productCount} ürün, 2 demo teklif.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
