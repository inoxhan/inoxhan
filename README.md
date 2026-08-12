# İnoxhan — Hızlı Teklif Sitesi

Hırdavat / bağlantı elemanları için teklif toplama odaklı kurumsal site.
E-ticaret değildir: **fiyat gösterilmez**, tüm akış "Teklif Al"a çıkar.
Vaat: **"İhtiyacını gönder, en geç 1 saat içinde teklifini al."**

## Teknoloji

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 6 + SQLite (dev) →
Postgres (prod) · React Three Fiber (3D hero) · MiniSearch (toleranslı arama) · iron-session
(panel) · Nodemailer (SMTP) · sharp (AVIF/WebP) · Playwright (PDF katalog + smoke test)

## Geliştirme

```bash
npm run dev          # http://localhost:3000
npm test             # birim testleri (slug, telefon, arama)
npm run db:studio    # veritabanı arayüzü
npm run db:seed      # örnek verileri yeniden yükle
npx tsx scripts/smoke-e2e.ts   # tarayıcı smoke testleri (dev server açıkken)
```

Panel: `/panel` — kullanıcı adı ve şifre `.env` içinde (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).
İlk kurulumda `.env.example`'ı `.env` olarak kopyalayıp doldurun; `SESSION_SECRET`,
`ADMIN_PASSWORD` ve `CATALOG_PRINT_TOKEN` rastgele üretilmelidir.

## Gerçek ürün verisini içe aktarma (456 ürün)

1. Excel dosyasını `import\urunler.xlsx` olarak koyun
   (örnek biçim: mevcut `import\urunler.xlsx` — kolonlar: Ürün Kodu, Ürün Adı, Kategori,
   Marka, Model, Kısa Açıklama, Kullanım Alanları, Teknik Özellik 1..N).
   Kolon adları farklıysa `scripts/import-excel.ts` başındaki `COLUMNS` haritasını uyarlayın.
2. Fotoğrafları `import\fotograflar\` içine koyun. Dosya adında ürün kodu (SKU) geçiyorsa
   doğrudan eşleşir; geçmiyorsa ürün adına benzerlikle eşlenir.
3. Çalıştırın: `npm run import` (önizleme: `npm run import -- --dry`)
4. Eşleşmeyenleri kontrol edin: `import\eslesmeyen.csv`
   (dosyaları yeniden adlandırıp `npm run import` tekrar çalıştırılabilir — güvenlidir,
   SKU üzerinden günceller, kopya oluşturmaz).

## PDF katalog

Panel → Katalog → "Katalog Üret". Kapak + içindekiler + kategori bölümleri + ürün başına
QR kod (ürünün web sayfasına gider). Çıktı `storage\katalog\` altına düşer;
sitede `/katalog` sayfasından ve `/api/katalog.pdf`ten indirilir.

## Bildirimler

- **E-posta:** `.env` içinde `SMTP_*` ve `NOTIFY_EMAIL` doldurulunca aktif olur
  (boşken e-postalar konsola yazılır).
- **WhatsApp:** `WHATSAPP_NUMBER` (biçim: `9053XXXXXXXX`) girilince sitedeki tüm
  WhatsApp butonları görünür olur.
- **CRM:** `CRM_WEBHOOK_URL` + `CRM_WEBHOOK_SECRET` girilince her teklif HMAC-SHA256
  imzalı JSON olarak POST edilir (`x-inoxhan-signature` başlığı).

## Sunucuya taşıma (VPS)

1. `prisma/schema.prisma` içinde `provider = "postgresql"` yapın, `DATABASE_URL`'i güncelleyin,
   `npx prisma migrate dev --name postgres-init` ile taze migration alın.
2. `NEXT_PUBLIC_SITE_URL`'i gerçek alan adıyla değiştirin (QR kodlar ve SEO bunu kullanır).
3. `npm ci && npx playwright install chromium --with-deps && npm run build && npm start`
   (Playwright PDF üretimi için dev bağımlılıklarıyla kurulum gerekir).
4. Reverse proxy olarak Caddy/Nginx; `storage\` ve `public\media\` kalıcı disk üzerinde olmalı.
