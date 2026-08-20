# İnoxhan — Hızlı Teklif Sitesi

Paslanmaz çelik bağlantı elemanları için teklif toplama odaklı kurumsal site.
E-ticaret değildir: **fiyat gösterilmez**, tüm akış "Teklif Al"a çıkar.
Vaat: **"İhtiyacını gönder, 15-30 dakika içinde teklifini al."**
Bu süre `src/lib/constants.ts` içindeki `SLA` sabitinden de okunur — panelin SLA renk
eşikleri (uyarı 15 dk, aşım 30 dk) aynı kaynaktan gelir.

Katalog 54 ürün / 8 kategori içerir; tüm ürünler DIN veya ISO normuna sahiptir ve
**A2 (AISI 304)** ile **A4 (AISI 316)** kalitelerde sunulur. Ürün kodu = norm kodu
(`DIN 933`, `ISO 7380`). Müşteri kaliteyi ürün sayfasından seçer; seçim teklif
formuna, e-postaya, panele ve CRM webhook'una taşınır.

## Teknoloji

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 6 + SQLite (dev) →
Postgres (prod) · React Three Fiber (3D hero) · MiniSearch (toleranslı arama) · iron-session
(panel) · Nodemailer (SMTP) · sharp (AVIF/WebP) · Playwright (PDF katalog + smoke test) ·
pdf.js (basılı katalogdan teknik çizim çıkarma, yalnız geliştirme betiklerinde)

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
silinir; panel kullanıcısı ile ayarlar korunur), ardından `npm run import:urunler` ve
`npm run import:cizim`.

Elde Excel varsa alternatif hat: `npm run import:excel` (bkz. `scripts/import-excel.ts`).

## Teknik çizimler (basılı katalogdan)

Ürün sayfalarındaki **teknik çizim** ve **ölçü tablosu** görselleri, basılı İnoxhan
kataloğunun PDF'inden çıkarılır. Hat üç adımdır:

```bash
npm run katalog:render     # PDF sayfaları → import/katalog-sayfalar/ (450 DPI PNG)
npm run katalog:cizim      # çizim + ölçü tablosu bölgelerini kes, boya, logo bas
npm run import:cizim       # DIN koduyla ürünlere eşleştir, türev üret, veritabanına yaz
```

Kaynak PDF varsayılan olarak `~\Desktop\katalog.pdf`; `import\katalog.pdf` varsa o kullanılır,
`-- --pdf=<yol>` ile de verilebilir. Ara çıktılar `import\` altındadır (git'e dahil değil).

- **Bölge tespiti ölçümle yapılır**, sabit koordinatla değil: mavi başlık bantları, gri
  ISO/UNI/DIN bloğu ve ızgara çizgileri bulunur; boş tablo satırları kırpılır. Eşikler
  render çözünürlüğüne göre ölçeklenir. Tespitin tutmadığı sayfa olursa
  `scripts\katalog-cizim-cikar.ts` içindeki `DUZELTME` tablosuna elle kutu yazılır.
  Kontrol görselleri: `npm run katalog:cizim -- --hata-ayikla`.
- **Renk:** çizimler site paletine (steel-900 → beyaz duotone) çevrilir.
- **Logo:** her görselin sağ altına İnoxhan filigranı basılır; ölçü tablosunda rakamları
  kapatmasın diye tablonun altına şerit eklenir.
- **Eşleştirme** DIN kodu üzerindendir (yoksa ISO, o da yoksa İngilizce ad). Fotoğraf
  dosyası numarası ile PDF sayfa numarası çapraz kontrol edilir; **çelişki olursa hiçbir şey
  yazılmaz**. Rapor için: `npm run import:cizim -- --rapor`.

Mevcut katalogda 54 ürünün tamamı eşleşir (yalnız PDF'in kapak sayfasının karşılığı yoktur).

## Logo

`inoxhan-logo.png` beyaz zeminlidir. `npm run hazirla:logo` beyaz zemini saydama çevirir
(luma rampası + beyaza karşı unmultiply, sonra içerik kutusuna kırpma), **"INOX" harflerini
beyaza boyar** ("HAN" metalik kalır) ve `public\media\brand\` altına yazar: renkli sürüm
(header, footer, PDF kapağı) ve tek renk `-mono` sürüm (beyaz zeminli teknik çizimlerin
filigranı).

INOX/HAN sınırı sabit koordinatla değil ÖLÇÜLEREK bulunur: yatay cetvel satırları ayıklanır,
harf bandındaki sütun boşluklarından X ile H arası tespit edilir. Boşluk sayısı 6 çıkmazsa
betik durur — yanlış yerden bölüp logoyu bozmaz.

## Ana sayfa hero slider'ı

Hero, `src/lib/constants.ts` içindeki **`HERO_SLIDES`** tablosundan beslenir. Her slaytın
sloganı, alt metni ve arka plan medyası vardır:

Tüm alanlar **uzantısız `basePath`**'tir; uzantıyı ve boyut ekini `HeroMedia` bileşeni ekler.

| `media.kind` | Anlamı |
|---|---|
| `image` | `public/media/hero/{src}-{md\|lg\|xl}.{avif\|webp}` — 1280 / 1920 / 2560 px |
| `video` | `public/media/video/{src}.{webm\|mp4}` + `{poster}-{md\|lg\|xl}.{avif\|webp}` |
| `3d` | Prosedürel three.js sahnesi — `asili`, `vitrin`, `akis` (bkz. `HeroScene.tsx`) |

`srcMobile` (opsiyonel, 2:3 dikey — 720 / 1080 / 1440 px): 768px altında bunun türevleri
servis edilir. Yatay kadraj dar ekranda ortadan kırpıldığı için sağa yaslanmış özne
kayboluyordu. Video slaytlarında mobil videoyu **hiç indirmez**, doğrudan bu görseli gösterir.

Geçiş: ok butonları, noktalar, otomatik (7 sn), dokunmatik kaydırma, klavye ok tuşları ve
yatay fare tekerleği. Dikey sayfa scroll'u bilinçli olarak ele geçirilmez. Bu davranış
`useCarousel` kancasındadır ve ana sayfadaki showreel bölümüyle ortaktır.

Yalnız aktif slaytın medyası mount edilir. Video yalnız ≥768px'te ve hareket azaltma
tercihi yokken oynar; diğer hâllerde poster karesi gösterilir.

`3d` ana sayfada **artık kullanılmıyor** — bileşenler (`Hero3D`, `HeroScene`,
`FastenerModels`) duruyor, `HERO_SLIDES`'a tek satır yazarak geri alınabilir.

> Beş slaytın da görselleri şu an **yer tutucudur** — `npm run hazirla:hero` ürün
> fotoğraflarından üretir. Gerçek medya `import/higgsfield/` altına düşüp
> `npm run hazirla:medya` çalıştırılınca **aynı dosya adlarının üzerine yazılır**;
> `HERO_SLIDES`'a dokunmak gerekmez.

## Medya üretim hattı (Higgsfield)

Prompt paketi ve dosya adlandırma sözleşmesi: **`docs/higgsfield-promptlar.md`**.
Üretilen dosyalar `import/higgsfield/{hero,showreel,sayfa,zemin}/` altına atılır.

| Komut | Ne yapar |
|---|---|
| `npm run hazirla:medya` | Hero (yatay 2.33:1 + mobil 2:3) ve sayfa görsellerinin AVIF/WebP türevleri |
| `npm run hazirla:video` | Hero videosu (dikişsiz döngü) + varsa hazır showreel klipleri: H.264 MP4 + VP9 WebM + poster |
| `npm run hazirla:yukleme` | 54 ürün fotoğrafını `import/higgsfield/urun-kaynak/` altına hedef adlarıyla kopyalar |
| `npm run hazirla:showreel` | Showreel'in üç klibini 54 ürünün medyasından montajlar (+ katalog arka planı) |
| `npm run hazirla:katalog-video` | YALNIZ katalog sayfasının arka plan videosunu üretir — showreel'e dokunmaz |
| `npm run hazirla:kategori` | Soyut zemin + gerçek ürün fotoğrafı bileşiği (`screen` karışımı) |
| `npm run hazirla:og` | `src/app/opengraph-image.png` — zemin + logo + slogan |

Eksik kaynak hata değildir: uyarı basılıp geçilir, sayfalar da her yerleşim noktasında
dosya var mı diye bakar (`src/server/sayfa-medya.ts`). Böylece varlıklar parça parça
eklenebilir; showreel klipleri yokken kategori fotoğraflarına, video yokken poster
görseline düşülür.

**Çözünürlük tuzağı:** türev fonksiyonları `withoutEnlargement: true` kullanıyor — dar bir
kaynak DOĞRU İSİMLİ ama küçük bir `-xl` dosyası üretir, hata vermez, büyük ekranda sessizce
bulanık kalır. `hazirla:medya` bunu yakalayıp uyarır; çözümü Higgsfield'de upscale etmektir.

ffmpeg sistemde kurulu olmak zorunda değil — binary `ffmpeg-static` paketiyle geliyor.

### Showreel — iki üretici

Showreel'in üç klibi (`01-hizli`, `02-kapsam`, `03-teklif`) iki yoldan üretilebilir;
ikisi de aynı çıktı adlarına yazar, **en son çalıştırılan kazanır**:

- `npm run hazirla:video` — `import/higgsfield/showreel/` altındaki **hazır klipleri**
  kodlar (şu an sitede olan bu: kullanıcının Higgsfield'de ürettiği üç sinematik klip)
- `npm run hazirla:showreel` — 54 ürünün gerçek fotoğraflarından **montajlar**

`/katalog` sayfasının arka plan videosu için de aynı ikili düzen geçerli:
`import/higgsfield/katalog/katalog.mp4` varsa `hazirla:video` onu kodlar (şu an sitede
olan bu), yoksa `hazirla:katalog-video` 54 ürünlük duvardan yazısız bir süzülme montajlar.
Video hiç yoksa bant düz koyu kalır; mobil videoyu hiç indirmez, poster gösterir.

### Montaj — neden metin prompt'uyla AI klip değil

İlk sürümde showreel'in üç klibi Higgsfield'e metin prompt'uyla yazdırıldı ve reddedildi:
model "paslanmaz bağlantı elemanı" denince klişeyi çiziyor — cıvata ve somun. Katalogdaki
54 üründen yalnız 10'u o klişe; kalanı kelebek somun, ay segman, gupilya, zincir, gijon,
düz kama, tırtıklı rondela. Dübeller kategorisinin üç ürününün DIN normu bile yok.

Şimdiki yol: **54 ürünün gerçek stüdyo fotoğrafı** kaynak. `hazirla:showreel` üçünü de
bunlardan montajlar — *hız* (54 ürün hızlanarak, her birinde norm kodu), *kapsam*
(9×6 duvar, kamera süzülüp geri çekiliyor), *karar* (duvardan tek ürüne dalış).

İstersen her ürünün fotoğrafı Higgsfield **image-to-video**'ya verilip hareketlendirilir
(`import/higgsfield/urun/{slug}.mp4`); geometri fotoğraftan geldiği için uydurulmuyor.
Klip yoksa o üründe duran fotoğraf kullanılır — **sıfır klible de çalışır**, yani 54
üretimi parça parça yapabilirsin. Reçete: `docs/higgsfield-promptlar.md` → B bölümü.

Izgaranın düzgün görünmesi tek bir işleme bağlı: her ürünün siyah zemini kırpılıp içerik
kutusu ölçülüyor (`sharp.trim()`, zemin saf siyah). Ham hâlde zincir hücreyi doldururken
ay segman ortada minik kalıyordu — ikisi de 1254×1254 kare geliyor, sorun kadrajda değil
ürünün kadraj içindeki ölçeğinde. Kutu %15 paylandırılıyor: AI klibinde nesne hafif
oynayabilir, taşmasın. Klip varsa kutu **klibin kendi ilk karesinden** ölçülüyor —
Higgsfield çıktısının oranı kaynaktan farklı olabiliyor (1254×1254 → 1280×720 gibi).

## PDF katalog

Panel → Katalog → "Katalog Üret". Kapak + içindekiler + kategori bölümleri + ürün başına
teknik çizim ve QR kod (ürünün web sayfasına gider). Çıktı `storage\katalog\` altına düşer;
sitede `/katalog` sayfasından ve `/api/katalog.pdf`ten indirilir.
Güncel ölçüm: 54 ürün → 20 sayfa, ~2,7 sn, ~11 MB. Boyutun büyük kısmı ürün fotoğraflarıdır
(Chromium baskıda kayıpsız gömüyor); teknik çizimlerin payı ~1,6 MB. Ölçü tabloları baskıya
girmez — yalnız web sayfasında, tam çözünürlükte "Büyüt" bağlantısıyla sunulur.

## Bildirimler

- **E-posta — kanal seçimi** (`kanalSec`, `src/server/email.ts`): `RESEND_API_KEY`
  doluysa **Resend HTTP API**, değilse `SMTP_HOST` doluysa **SMTP**, ikisi de
  boşsa **dev modu** (gönderim yok, içerik konsola yazılır). Ayar değiştirdikten
  sonra `npm run test:mail` ile doğrulayın — script hangi kanal seçildiğini,
  gerçek alıcıyı ve hatanın Türkçe açıklamasını basar.
- **Resend (yürürlükteki kanal):** `RESEND_API_KEY` (resend.com > API Keys) +
  `SMTP_FROM=info@inoxhan.com`. Gönderenin alan adı Resend'de **doğrulanmış**
  olmalı; DNS kayıtları Squarespace'te tutuluyor (`inoxhan.com` NS kayıtları
  `*.squarespacedns.com`). Resend'in eklediği kayıtlar `send.inoxhan.com` alt
  alanı ve `resend._domainkey` üzerinde olduğu için kök alandaki Google Workspace
  MX kaydına (`smtp.google.com`) dokunmaz — gelen posta etkilenmez.
- **Neden SMTP değil:** Google Workspace hesabında uygulama şifresi üretilemiyor
  (yönetici ayarı kapalı), `smtp-relay.gmail.com` ise sabit IP istiyor; Vercel'in
  çıkış IP'si sabit değil. SMTP alanları yedek kanal olarak kodda duruyor.
- **Kişisel Gmail kullanılmaz.** Site yalnız kurumsal kimliğinden gönderir;
  `npm run test:mail`, `SMTP_FROM` (veya `SMTP_USER`) bir `@gmail.com` adresiyse
  çalışmayı reddeder.
- **Alıcı:** `NOTIFY_EMAIL` (virgülle birden çok adres) yalnız **yedek** değerdir.
  `Setting` tablosundaki `notify_email` satırı doluysa **o kazanır** (`getSetting`
  önce veritabanına bakar) ve bu satırı düzenleyecek bir panel ekranı **henüz yok** —
  ortam değişkenini değiştirip "neden hâlâ eski adrese gidiyor" diye aramamak için
  önce veritabanına bakın:
  `npx prisma studio` → `Setting` → `notify_email`. Şu anki değer `info@inoxhan.com`.
  Statik sürümde müşteriye gösterilen adres ayrı bir değişkendir
  (`PUBLIC_QUOTE_EMAIL`), çünkü o değer herkese açık HTML'e gömülür.
- **WhatsApp:** `WHATSAPP_NUMBER` (biçim: `9053XXXXXXXX`) girilince sitedeki tüm
  WhatsApp butonları görünür olur.
- **CRM:** `CRM_WEBHOOK_URL` + `CRM_WEBHOOK_SECRET` girilince her teklif HMAC-SHA256
  imzalı JSON olarak POST edilir (`x-inoxhan-signature` başlığı).

Bildirimler `Promise.allSettled` içinde çalışır: e-posta patlasa bile teklif
veritabanına yazılmış olur ve panelde görünür — talep kaybolmaz.

## Vercel (sunucu sürümü — asıl yayın)

E-posta bildirimi, yönetim paneli, veritabanı kaydı ve fotoğraflı teklif
oluşturucu **yalnız sunucu sürümünde** çalışır. GitHub Pages sürümü sunucu
çalıştırmadığı için teklif formu ziyaretçinin kendi posta programını açan bir
`mailto:` bağlantısına düşer — o akışta size hiçbir zaman otomatik mail gelmez.

1. [vercel.com/new](https://vercel.com/new) → `inoxhan/inoxhan` deposunu içe aktarın.
   Framework otomatik "Next.js" gelir, build ayarlarına dokunmayın
   (`postinstall` zaten `prisma generate` çalıştırır).
2. **Environment Variables** (Production + Preview): `DATABASE_URL`, `DIRECT_URL`,
   `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `RESEND_API_KEY`,
   `SMTP_FROM`, `NOTIFY_EMAIL`, `CATALOG_PRINT_TOKEN`,
   `NEXT_PUBLIC_SITE_URL` (gerçek alan adı — QR kodlar ve SEO bunu kullanır).
   İsteğe bağlı: `WHATSAPP_NUMBER`, `CRM_WEBHOOK_*`, `BLOB_READ_WRITE_TOKEN`.
   - `STATIC_EXPORT` ve `NEXT_PUBLIC_STATIC` **tanımlanmamalı** — tanımlanırsa
     Vercel de statik sürümü derler ve sorun aynen sürer.
   - `SITE_PASSWORD` **doluysa** site parola penceresiyle kapalı kalır
     (`src/proxy.ts`); herkese açmak için değişkeni hiç eklemeyin ya da silin.
3. Veritabanı zaten Neon'da; ilk dağıtımdan sonra migration için
   `npx prisma migrate deploy` (yerelden `DIRECT_URL` ile) yeterlidir.
4. Dağıtım sonrası `/teklif` üzerinden gerçek bir talep gönderip Vercel
   günlüklerinde `Teklif #... e-postası gönderildi` satırını arayın.

Vercel'de bilinçli sınırlar: dosya sistemi salt okunur olduğu için katalog PDF'i
sunucuda üretilmez (yerelde üretilip `public/katalog.pdf` olarak commit edilir,
bkz. `src/app/api/katalog.pdf/route.ts`); dosya ekleri `BLOB_READ_WRITE_TOKEN`
varsa Vercel Blob'a yazılır (`src/server/storage.ts`).

**Fonksiyon bölgesi `fra1` OLMALI** (`vercel.json` → `regions`). Neon veritabanı
`eu-central-1` (Frankfurt); fonksiyon Vercel'in varsayılan `iad1` (Washington DC)
bölgesinde çalışırsa her sorgu Atlantik'i geçer. Ölçüldü: `iad1` iken
`/urunler` **1741 ms**, önbelleğe düşen ürün sayfası **98 ms**. `x-vercel-id`
başlığındaki ikinci alan çalışan bölgeyi verir (`fra1::iad1::…` = yanlış).

## Performans

Ölçüm aracı: `tsx tmp/olcum.ts` benzeri Playwright betiği (kalıcı değil) ya da
tarayıcı ağ sekmesi. 20 Ağustos 2026 canlı ölçümü (masaüstü, soğuk önbellek):

| Sayfa | TTFB | LCP | Toplam | Not |
|---|---|---|---|---|
| `/urunler/[kategori]/[slug]` | 98 ms | 700 ms | 1.142 KB | SSG — hedef bu |
| `/` | 359 ms | 3.316 ms | 2.192 KB | 806 KB hero videosu |
| `/teklif` | 1.359 ms | 2.392 ms | 1.544 KB | 995 KB JS |
| `/urunler` | 1.741 ms | 2.016 ms | 1.620 KB | 188 KB HTML |

Bilinen ağırlıklar ve durumları:

- **Fonksiyon bölgesi** — düzeltildi (`vercel.json`, yukarı bakın). Dinamik
  sayfalardaki TTFB'nin büyük kısmı buydu.
- **three.js / @react-three (941 KB derleme parçası)** — `HeroMedia` yalnız
  `media.kind === "3d"` slaytında `Hero3D`'yi boyar ve `HERO_SLIDES` içinde
  öyle bir slayt YOK. `next/dynamic` + `ssr:false` sayesinde tarayıcıya
  **inmiyor** (ağ ölçümünde yok), ama depoda/derlemede duruyor. 3D hero
  planlanmıyorsa `three`, `@react-three/fiber`, `@react-three/drei`
  bağımlılıkları ve `Hero3D`/`HeroScene` silinebilir.
- **Fontlar (171 KB, 4 dosya, her sayfada)** — Inter + Space Grotesk, ikisi de
  `latin` + `latin-ext`. Türkçe (ş, ğ, ı, İ) `latin-ext` istediği için subset
  kırpılamaz; tek aileye inmek tasarım kararıdır.
- **Hero videosu (806 KB)** — açılışı takmasın diye `requestIdleCallback` ile
  erteleniyor, yine de ana sayfanın en ağır tek dosyası.
- **RSC ön yüklemesi** — `/urunler`'de 32 ek istek / 257 KB. Ürün kartlarında
  `<Link prefetch={false}>` bunu keser; karşılığında gezinme biraz yavaşlar.

## GitHub Pages (statik vitrin)

`npm run derle:statik` → `out/` klasörünü üretir → içeriği `gh-pages` dalına itilir →
site `https://inoxhan.github.io/inoxhan/` adresinde yayınlanır.

Statik sürüm tam siteyi değil, sunucusuz çalışabilen vitrini yayınlar:

- **Çalışır:** tüm sayfalar, 54 ürün + teknik çizimler, arama (istemci tarafı indeks),
  katalog PDF indirme, ürün sayfasından teklif ön seçimi (query istemcide okunur),
  SEO (sitemap/robots + ürün sayfalarında JSON-LD).
- **Çalışmaz / düşer:** yönetim paneli ve API yoktur; teklif formu WhatsApp/e-posta
  taslağına düşer (`src/server/actions/quote-static.ts`); analitik ve dosya eki kapalıdır;
  marka filtresi ve sayfalama tek sayfada toplanır.

Ayrıntı: `scripts/derle-statik.ts`. Teklif alıcısı `.env` `NOTIFY_EMAIL`
(boşsa `info@inoxhan.com` gömülür); WhatsApp için `WHATSAPP_NUMBER` doldurup
yeniden derleyin. Kalıcı çözüm için aşağıdaki VPS bölümü geçerlidir.

## Teklif oluşturucu (sunucu sürümü)

- **/teklif** — tek sayfa: fotoğraflı ürün ızgarası (54 aile, kategori çipleriyle) →
  karta tıklayınca ızgaranın altında o ailenin ölçüleri açılır (A2/A4 süzgeci, adet) →
  sağda yapışkan liste → altında iletişim formu. Sayfa hiç değişmez.
  Kod bilen müşteri üstteki arama kutusundan (~6.750 ölçü varyantı,
  `npm run import:varyantlar -- --file <xlsx>`) doğrudan ekler.
  Liste localStorage'da yaşar (`useQuoteCart`), gönderim `submitQuoteList`.
- Katalogda olmayan ihtiyaç serbest metin satırından eklenir; ürününü hiç bulamayan
  müşteri `info@inoxhan.com` adresine yazar (fotoğraf/dosya kanalı kaldırıldı).
- Kayıtlar panelde: teklif kalemleri varyant kodlu, müşteri adresli; vergi no/TC
  teklifte sorulmaz, sipariş aşamasında panel müşteri kartından işlenir.
- Veritabanı: Neon Postgres (`DATABASE_URL` pooled + `DIRECT_URL`); statik GitHub
  Pages sürümü bu sistemi içermez (eski tek formlu akış korunur).

## Teklif sonucu ve aylık rapor

- Sonuç **türetilir, saklanmaz** (`src/lib/quote-outcome.ts`): fiyat verildikten
  sonra `LOST_AFTER_HOURS` (48) saat içinde "Sipariş Oldu" işaretlenmezse talep
  **Fiyat tutmadı**; hiç cevaplanmadan aynı süre geçerse **Yanıtsız kapandı** olur.
  Cron/arka plan işi yoktur, kural her okumada uygulanır.
- Panelde `Sipariş Oldu` düğmesi `QuoteRequest.orderedAt` damgasını basar; teklif
  listesinde "Fiyat tutmadı" ve "Yanıtsız" sekmeleri bu kuralın SQL karşılığıdır.
- **/panel/raporlar?ay=YYYY-MM** — aylık özet, en çok sorulan ürünler (ölçü
  kırılımlı), sorulmuş ama verilmemiş ürünler, firma dökümü, kategori/grup dağılımı,
  cevap performansı. Her tablo `/api/panel/rapor?ay=&tablo=` üzerinden CSV
  (UTF-8 BOM + `;` — Türkçe Excel doğru açar).
- Agregasyon saf fonksiyonda (`src/lib/report-aggregate.ts`, fixture testli); sorgu
  `src/server/reports.ts` (ay sınırları TR saatine göre, `RAPOR_LIMIT` 5.000 talep).
- Rapor sayfasını gerçek veriyle denemek için: `npm run ornek:teklif` (YALNIZ dev
  veritabanında — örnek müşteri/talep üretir).

## Sunucuya taşıma (VPS)

1. `prisma/schema.prisma` içinde `provider = "postgresql"` yapın, `DATABASE_URL`'i güncelleyin,
   `npx prisma migrate dev --name postgres-init` ile taze migration alın.
2. `NEXT_PUBLIC_SITE_URL`'i gerçek alan adıyla değiştirin (QR kodlar ve SEO bunu kullanır).
3. `npm ci && npx playwright install chromium --with-deps && npm run build && npm start`
   (Playwright PDF üretimi için dev bağımlılıklarıyla kurulum gerekir).
4. Reverse proxy olarak Caddy/Nginx; `storage\` ve `public\media\` kalıcı disk üzerinde olmalı.
