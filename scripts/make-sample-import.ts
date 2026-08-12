/**
 * İçe aktarma hattını test etmek için örnek veri üretir (DEV aracı):
 *   import\urunler.xlsx           → 3 mevcut + 3 yeni ürün, gerçekçi kolonlar
 *   import\fotograflar\*.jpg/png  → dağınık Türkçe adlı test fotoğrafları
 *
 * Kullanıcının GERÇEK verisi geldiğinde bu script'e gerek kalmaz;
 * dosyalar aynı klasöre aynı isimle konur ve `npm run import` çalıştırılır.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import * as XLSX from "xlsx";

const IMPORT_DIR = path.join(process.cwd(), "import");
const PHOTO_DIR = path.join(IMPORT_DIR, "fotograflar");

const HEADERS = [
  "Ürün Kodu",
  "Ürün Adı",
  "Kategori",
  "Marka",
  "Model",
  "Kısa Açıklama",
  "Kullanım Alanları",
  "Teknik Özellik 1",
  "Teknik Özellik 2",
  "Teknik Özellik 3",
  "Teknik Özellik 4",
];

const ROWS = [
  // Mevcut SKU'lar → güncelleme yolu (idempotency testi)
  [
    "INX-CV-0001",
    "Altıköşe Başlı Cıvata DIN 933 M8x40 A2",
    "Cıvatalar",
    "ProFix",
    "DIN 933",
    "Tam diş, A2 paslanmaz çelik altıköşe başlı cıvata. (Excel'den güncellendi)",
    "İnşaat, Makine İmalatı, Denizcilik",
    "Norm: DIN 933",
    "Ölçü: M8x40",
    "Malzeme: A2-70 Paslanmaz Çelik",
    "Diş: Tam Diş",
  ],
  [
    "INX-SM-0002",
    "Fiberli Kilitli Somun DIN 985 M10",
    "Somunlar",
    "SteelMax",
    "DIN 985",
    "Naylon fiber halkalı kilitli somun.",
    "Otomotiv, Makine",
    "Norm: DIN 985",
    "Ölçü: M10",
    "Kalite: 8",
    "Kaplama: Beyaz Çinko",
  ],
  [
    "INX-VD-0003",
    "Yıldız Havşa Vida DIN 965 M4x16 A2",
    "Vidalar",
    "İnoxLine",
    "DIN 965",
    "Havşa başlı yıldız vida.",
    "Elektronik, Makine",
    "Norm: DIN 965",
    "Ölçü: M4x16",
    "Malzeme: A2",
    "Yuva: PH2",
  ],
  // Yeni SKU'lar → oluşturma yolu
  [
    "INX-KV-0100",
    "Kanca Vida 5x50 Galvaniz",
    "Vidalar",
    "TorkPlus",
    "KV-550",
    "L tipi kanca vida, ahşap dişli.",
    "Askı Sistemleri, Ahşap",
    "Ölçü: 5x50",
    "Kaplama: Galvaniz",
    "Tip: L Kanca",
    "",
  ],
  [
    "INX-PR-0200",
    "Perçin 4x12 Alüminyum",
    "Perçinler",
    "ProFix",
    "PR-412",
    "Kör perçin, alüminyum gövde çelik çivili.",
    "Sac İşleme, Karoser",
    "Ölçü: 4x12",
    "Gövde: Alüminyum",
    "Çivi: Çelik",
    "",
  ],
  [
    "INX-SG-0300",
    "Segman Dış DIN 471 20mm",
    "Segmanlar",
    "SteelMax",
    "DIN 471",
    "Mil için dış segman, yay çeliği.",
    "Makine, Redüktör",
    "Norm: DIN 471",
    "Ölçü: 20 mm",
    "Malzeme: Yay Çeliği",
    "",
  ],
];

/** Test fotoğrafı üretimi — her biri farklı tonda, adları kasıtlı dağınık. */
const PHOTOS: { file: string; hue: [number, number, number] }[] = [
  // SKU dosya adında → doğrudan eşleşme
  { file: "INX-KV-0100 kanca vida.jpg", hue: [70, 80, 90] },
  { file: "inx-pr-0200_percin.png", hue: [90, 85, 75] },
  // SKU yok → ad benzerliğiyle eşleşme
  { file: "Yıldız HAVŞA vida m4X16.png", hue: [60, 75, 95] },
  { file: "segman dış din 471 20mm.jpg", hue: [80, 70, 85] },
  // Hiç eşleşmemeli → eslesmeyen.csv'ye düşmeli
  { file: "bilinmeyen-parça çizim.png", hue: [50, 50, 55] },
];

async function main() {
  await mkdir(PHOTO_DIR, { recursive: true });

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ürünler");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  await writeFile(path.join(IMPORT_DIR, "urunler.xlsx"), buf);

  for (const p of PHOTOS) {
    const [r, g, b] = p.hue;
    const img = sharp({
      create: {
        width: 1400,
        height: 1050,
        channels: 3,
        background: { r: r + 60, g: g + 60, b: b + 60 },
      },
    });
    const out = path.join(PHOTO_DIR, p.file);
    if (p.file.endsWith(".png")) await img.png().toFile(out);
    else await img.jpeg({ quality: 88 }).toFile(out);
  }

  console.log(`Örnek veri hazır: ${ROWS.length} satır Excel + ${PHOTOS.length} fotoğraf.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
