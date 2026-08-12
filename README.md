# İnoxhan — Hızlı Teklif Sitesi

Paslanmaz çelik bağlantı elemanları için teklif toplama odaklı kurumsal site.
E-ticaret değildir: **fiyat gösterilmez**, tüm akış "Teklif Al"a çıkar.
Vaat: **"İhtiyacını gönder, en geç 1 saat içinde teklifini al."**

Katalog 54 ürün / 8 kategori içerir; tüm ürünler DIN veya ISO normuna sahiptir ve
**A2 (AISI 304)** ile **A4 (AISI 316)** kalitelerde sunulur. Ürün kodu = norm kodu
(`DIN 933`, `ISO 7380`). Müşteri kaliteyi ürün sayfasından seçer; seçim teklif
formuna, e-postaya, panele ve CRM webhook'una taşınır.

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

## Ürün verisi

Ürünlerin **tamamı fotoğraf klasöründen** üretilir; ayrı bir Excel gerekmez. Kaynak:
`resimler ve açıklamalar\` (git'e dahil değildir, ~70 MB).

Dosya adı biçimi — tüm bilgi buradan okunur:

```
21 - INOX ALTIKÖŞE BAŞLI METRİK DİŞ TAM PASO CIVATA - DIN 933 - ISO 4017.png
05 - INOX YAYLI RONDELA - DIN 127 B.png            → sadece DIN
39 - INOX BOMBE BAŞLI İMBUS CIVATA - ISO 7380.png  → sadece ISO
52 - INOX ÇAKMA DÜBEL - DROP IN ANCHOR.png         → norm yok, global İngilizce ad
```

Ürün kodu DIN'den, yoksa ISO'dan, o da yoksa global İngilizce addan üretilir.
Teknik özellik olarak yalnızca **dosya adındaki norm bilgisi + paslanmaz malzeme +
A2/A4 kalite** yazılır; ölçü ve kullanım alanı gibi alanlar bilinçli olarak **boş bırakılır**
(panelden doldurulur — sistem asla veri uydurmaz).

```bash
npm run import:urunler -- --dry   # önizleme, veritabanına yazmaz
npm run import:urunler            # içe aktar (SKU ile upsert, tekrarı güvenli)
npm run import:urunler -- --force # görsel türevlerini yeniden üret
```

**Yeni ürün grubu eklemek:** fotoğrafları aynı adlandırmayla bir klasöre koyun, klasör adını
`scripts/import-urunler.ts` içindeki `SOURCE_DIRS` listesine ve dosya numaralarını `CATEGORIES`
tablosuna ekleyin, script'i tekrar çalıştırın. Kategori tablosunda karşılığı olmayan dosya
varsa script yazmadan önce uyarır.

**Sıfırdan başlatmak:** `npm run temizle -- --yes` (ürünler, kategoriler, talepler ve medya
silinir; panel kullanıcısı ile ayarlar korunur), ardından `npm run import:urunler`.

Elde Excel varsa alternatif hat: `npm run import:excel` (bkz. `scripts/import-excel.ts`).

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
