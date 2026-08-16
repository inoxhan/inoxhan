# Higgsfield Prompt Paketi — İnoxhan

Bu dosya, sitenin eksik görsel ve videolarını Higgsfield'de üretmek için hazırlanmış
kopyala-yapıştır prompt setidir. Her blok tek bir dosyaya karşılık gelir.

**Toplam 24 üretim:** 19 görsel + 4 video + 1 OG zemini.

---

## 0. Nasıl kullanılır

1. Aşağıdaki bloklardan birini aç, **Prompt** kutusunu Higgsfield'e yapıştır.
2. **Negatif** kutusunu, varsa ayrı negatif alanına yapıştır. Ayrı alan yoksa prompt'un
   sonuna `--no ...` olarak ekle.
3. Bloktaki **oran** ve **min. çözünürlük** değerlerini ayarla. Çıktı belirtilen genişliğin
   altındaysa Higgsfield'in **upscale** adımını çalıştır — bu adım atlanırsa hat uyarı verir
   ve büyük ekranlarda görsel bulanık kalır.
4. İndir, **blokta yazan dosya adıyla** kaydet ve şu klasöre at:

```
import/higgsfield/
  hero/       01-asili.jpg  01-asili-mobil.jpg  01-asili.mp4  02-kilit.jpg  ...
  showreel/   01-hizli.mp4  02-kapsam.mp4  03-teklif.mp4
  sayfa/      hakkimizda-banner.jpg  hakkimizda-tedarik.jpg  ...
  zemin/      zemin-01.jpg  zemin-02.jpg  zemin-03.jpg  og-zemin.jpg
```

Dosya adları hattın sözleşmesidir — değiştirirsen script dosyayı bulamaz. Uzantı `.jpg`
veya `.png` olabilir, fark etmez (sharp ikisini de okur).

### Higgsfield tarafında sabit tutulacak ayarlar

| Ayar | Değer | Neden |
|---|---|---|
| Model | Fotogerçekçi görsel modeli (Soul vb.) | Illüstrasyon/anime modelleri bu iş için uygun değil |
| Stil / preset | Tüm sette **aynı** | 5 hero slaytı bir set gibi görünmeli, yoksa slider'da kopukluk olur |
| Seed | İlk beğendiğin kareyi not al, kalan hero slaytlarında **aynı seed veya style-reference** kullan | Renk ve doku tutarlılığı |
| Upscale | Min. çözünürlüğe ulaşana kadar açık | `withoutEnlargement` nedeniyle küçük kaynak sessizce küçük türev üretir |

---

## 1. Ortak kurallar

### Marka kilidi (her görsel prompt'unun içinde geçer)

Renkler `src/app/globals.css`'ten birebir alınmıştır — uydurma değil, sitede kullanılan
gerçek token'lar:

| Token | Kod | Prompt'taki karşılığı |
|---|---|---|
| `--color-steel-950` | `#0B0D10` | zemin — "near-black background" |
| `--color-photo` | `#0C0C0B` | ürün fotoğraflarının stüdyo zemini (kategori zeminlerinde kullanılır) |
| `--color-signal` | `#E8B54A` | **tek** vurgu — "warm amber accent light" |

### Negatif prompt — hepsinde aynı

```
text, letters, numbers, watermark, logo, brand marks, signage, captions,
people, faces, hands, body parts,
rust, corrosion, patina, brass, gold, copper tint, bronze,
wood, plastic, fabric, warm orange color grade, HDR glow, oversaturation,
cluttered background, busy composition, lens dirt, chromatic aberration
```

İki negatif pazarlık konusu değil:

- **`rust, corrosion`** — paslanmaz çelik tedarikçisinin sitesinde paslı metal, doğrudan
  ürün yalanıdır.
- **`brass, gold, copper, bronze`** — AI modelleri "amber ışık" istediğinde metali de
  sarıya çeviriyor. Paslanmaz **soğuk gri** kalmalı; sarı yalnızca ışıkta olacak.

### Hero kompozisyon kuralı — zorunlu

Hero slaytlarında **karenin sol %45'i boş ve karanlık** kalacak, özne sağa yaslanacak
(yaklaşık x≈%66). Sebep teknik: `HeroSlider.tsx:51` soldan sağa açılan bir karartma
gradyanı basıyor ve slogan metni tam orada oturuyor. Özne sola kaçarsa metnin altında
kalır ve slayt okunmaz olur.

Mobilde kural döner: **üst yarı karanlık**, özne alt-orta. Mobilde metin üstte duruyor.

---

## 2. Varlık listesi

| # | Dosya | Tür | Oran | Min. çözünürlük |
|---|---|---|---|---|
| A1 | `hero/01-asili.jpg` | görsel | 16:9 | 3000 px genişlik |
| A1v | `hero/01-asili.mp4` | video | 16:9 | 1920×1080, ~6 sn |
| A1m | `hero/01-asili-mobil.jpg` | görsel | 2:3 dikey | 1440×2160 |
| A2 | `hero/02-kilit.jpg` + `-mobil` | görsel ×2 | 16:9 / 2:3 | 3000 px / 1440×2160 |
| A3 | `hero/03-yiv.jpg` + `-mobil` | görsel ×2 | 16:9 / 2:3 | 3000 px / 1440×2160 |
| A4 | `hero/04-akis.jpg` + `-mobil` | görsel ×2 | 16:9 / 2:3 | 3000 px / 1440×2160 |
| A5 | `hero/05-yuzey.jpg` + `-mobil` | görsel ×2 | 16:9 / 2:3 | 3000 px / 1440×2160 |
| B1-3 | `showreel/0N-*.mp4` | video ×3 | 16:9 | 1920×1080, ~5 sn |
| C1 | `sayfa/hakkimizda-banner.jpg` | görsel | 21:9 | 2560 px genişlik |
| C2-4 | `sayfa/hakkimizda-{tedarik,lojistik,kalite}.jpg` | görsel ×3 | 3:2 | 1800 px genişlik |
| C5 | `sayfa/iletisim.jpg` | görsel | 3:2 | 1800 px genişlik |
| D1-3 | `zemin/zemin-0N.jpg` | görsel ×3 | 4:3 | 1600 px genişlik |
| D4 | `zemin/og-zemin.jpg` | görsel | 1.91:1 | 2400 px genişlik |

---

# A. Hero slaytları

Sloganlar değişmiyor — her blokta hangi slogana ait olduğu yazıyor ki kadraj ile metin
uyumunu gözden geçirebilesin.

## A1 — `hero/01-asili.jpg`  ·  16:9  ·  ≥3000 px

> Slogan: **"Liste Fiyatından Almaktan Sıkılmadın mı?"**
> Bu kare aynı zamanda A1v videosunun kaynak karesi olacak — beğendiğin çıktıyı sakla.

**Prompt**
```
Cinematic wide shot of a dozen stainless steel hex bolts, nuts and washers suspended
weightlessly in a pitch-black void, arranged in a loose depth-staggered cluster occupying
the RIGHT half of the frame, the left 45 percent of the frame completely empty black
negative space, one hero hex bolt in razor-sharp focus at the right third, the remaining
pieces falling into progressive bokeh toward the back, brushed 316L stainless steel with
cool cyan-grey speculars, a single warm amber rim light #E8B54A grazing from the upper
right edge, deep near-black background #0B0D10, low-key studio lighting, 85mm lens, f/2.8,
shallow depth of field, faint dust motes catching the light, photorealistic industrial
still life, ultra high contrast, minimal
```

**Negatif** → bölüm 1'deki ortak liste.

## A1v — `hero/01-asili.mp4`  ·  16:9  ·  1920×1080  ·  ~6 sn  ·  sessiz

Higgsfield'in **image-to-video** akışını kullan, kaynak olarak A1 çıktısını ver.

**Kamera hareketi:** çok yavaş yakınlaşma veya hafif yörünge kayması. Higgsfield'in
kamera preset'lerinden yavaş olanı seç (isimler arayüzde değişebilir — "Dolly In",
"Slow Orbit", "Float" gibi bir şey). **Crash zoom, whip pan, shake gibi sert hareketler
kullanma** — arka planda döngüyle oynayacak, sert hareket metnin okunmasını bozar.

**Prompt**
```
The suspended stainless steel fasteners drift almost imperceptibly in the black void,
the hero hex bolt rotating very slowly on its own axis, the amber rim light sliding
gently across its brushed facets, dust motes floating upward, camera drifting forward
in a slow continuous push, no cuts, no sudden movement, cinematic, photorealistic
```

**Not — döngü:** Higgsfield kusursuz döngü vermez. `hazirla-video.ts` klibi ters
kopyasıyla birleştirip (ping-pong) dikişsiz döngü üretecek, o yüzden başı ve sonu
eşleşmese sorun değil. Sadece **6 saniyeyi geçme** — ping-pong süreyi ikiye katlıyor.

## A1m — `hero/01-asili-mobil.jpg`  ·  2:3 dikey  ·  ≥1440×2160

**Prompt**
```
Vertical cinematic composition of stainless steel hex bolts, nuts and washers suspended
weightlessly in a pitch-black void, the cluster gathered in the LOWER THIRD of the frame,
the entire upper half of the frame empty black negative space, one hero hex bolt in
razor-sharp focus low center, the rest falling into bokeh, brushed 316L stainless steel
with cool cyan-grey speculars, a single warm amber rim light #E8B54A from the upper right,
deep near-black background #0B0D10, low-key studio lighting, 85mm, f/2.8, shallow depth
of field, dust motes, photorealistic industrial still life, ultra high contrast, minimal
```

## A2 — `hero/02-kilit.jpg`  ·  16:9  ·  ≥3000 px

> Slogan: **"Güçlü Bağlantılar, Güvenli Ticaret."**

**Prompt**
```
Extreme macro photograph of a stainless steel hex nut threading onto a bolt, the
metal-on-metal contact point in razor-sharp focus, brushed 316L surface texture clearly
visible, the subject positioned in the RIGHT third of the frame, the left 45 percent of
the frame falling into deep empty shadow, near-black background #0B0D10, a single warm
amber rim light #E8B54A raking from the upper right, cool cyan-grey speculars on the
steel, low-key studio lighting, 100mm macro lens, f/4, shallow depth of field,
photorealistic industrial product photography, high contrast
```

## A2m — `hero/02-kilit-mobil.jpg`  ·  2:3 dikey  ·  ≥1440×2160

**Prompt**
```
Vertical extreme macro photograph of a stainless steel hex nut threading onto a bolt,
the contact point in razor-sharp focus positioned in the LOWER THIRD of the frame, the
upper half of the frame empty deep shadow, brushed 316L surface texture, near-black
background #0B0D10, a single warm amber rim light #E8B54A from the upper right, cool
cyan-grey speculars, low-key studio lighting, 100mm macro, f/4, shallow depth of field,
photorealistic industrial product photography, high contrast
```

## A3 — `hero/03-yiv.jpg`  ·  16:9  ·  ≥3000 px

> Slogan: **"Tedarikten Teslimata, Tüm Süreç Tek Noktada."**
> Fikir: derinlemesine uzayan yiv, "uçtan uca süreç"in görsel karşılığı.

**Prompt**
```
Extreme macro looking down the length of a stainless steel threaded rod, the helical
thread ridges receding into darkness in steep dramatic perspective, the vanishing point
near the right edge of the frame, the left 45 percent of the frame in empty black shadow,
a single narrow beam of cool white light raking across the thread crests, one warm amber
#E8B54A specular glint at the sharpest point of focus, brushed 316L micro-texture visible
on the flanks, near-black background #0B0D10, 100mm macro, f/5.6, razor-thin focal plane,
photorealistic, extreme contrast, minimal
```

## A3m — `hero/03-yiv-mobil.jpg`  ·  2:3 dikey  ·  ≥1440×2160

**Prompt**
```
Vertical extreme macro of a stainless steel threaded rod running from the bottom of the
frame upward into darkness, the helical thread ridges receding in steep perspective, the
sharpest thread crests in the LOWER THIRD, the upper half dissolving into empty black,
a narrow beam of cool white light raking across the crests, one warm amber #E8B54A
specular glint at the focal point, brushed 316L micro-texture, near-black background
#0B0D10, 100mm macro, f/5.6, razor-thin focal plane, photorealistic, extreme contrast
```

## A4 — `hero/04-akis.jpg`  ·  16:9  ·  ≥3000 px

> Slogan: **"20 Yıllık Deneyimle Sınırları Aşan Çözümler."**

**Prompt**
```
Cinematic shot of stainless steel fasteners streaming diagonally through black space from
the lower left to the upper right, motion blur streaking on the fastest elements, three or
four pieces frozen razor-sharp near the right third of the frame, the left 45 percent of
the frame empty black negative space, brushed steel with cool cyan-grey speculars, faint
warm amber #E8B54A light trails accenting the movement, near-black background #0B0D10,
long exposure feel, 50mm lens, photorealistic industrial motion photography, high
contrast, dynamic energy
```

## A4m — `hero/04-akis-mobil.jpg`  ·  2:3 dikey  ·  ≥1440×2160

**Prompt**
```
Vertical cinematic shot of stainless steel fasteners streaming upward through black space
from the bottom of the frame, motion blur streaking on the fastest elements, two or three
pieces frozen razor-sharp in the LOWER THIRD, the upper half empty black negative space,
brushed steel with cool cyan-grey speculars, faint warm amber #E8B54A light trails,
near-black background #0B0D10, long exposure feel, 50mm, photorealistic industrial motion
photography, high contrast
```

## A5 — `hero/05-yuzey.jpg`  ·  16:9  ·  ≥3000 px

> Slogan: **"Siz İhtiyacınızı Söyleyin, Gerisini İnoxhan'a Bırakın."**
> En sakin slayt — sette nefes alma noktası. Sloganın uzunluğu boş alan istiyor.

**Prompt**
```
Extreme close-up of a brushed stainless steel surface photographed at a shallow raking
angle, fine parallel grain lines running horizontally across the frame, the surface
filling the right two thirds and falling into total darkness toward the left 45 percent,
a soft cool light gradient travelling across the grain, a single warm amber #E8B54A
reflection band near the right edge, one out-of-focus hex bolt head resting on the surface
at the far right, near-black #0B0D10, 100mm macro, f/8, photorealistic material study,
high contrast, minimal, calm
```

## A5m — `hero/05-yuzey-mobil.jpg`  ·  2:3 dikey  ·  ≥1440×2160

**Prompt**
```
Vertical extreme close-up of a brushed stainless steel surface at a shallow raking angle,
fine parallel grain lines running across the LOWER HALF of the frame, the upper half
falling into total darkness, a soft cool light gradient travelling across the grain, a
single warm amber #E8B54A reflection band low in the frame, one out-of-focus hex bolt head
resting on the surface at the bottom right, near-black #0B0D10, 100mm macro, f/8,
photorealistic material study, high contrast, minimal, calm
```

---

# B. Showreel — 54 ürün klibi (image-to-video)

**Bu bölüm metin prompt'uyla ÜRETİLMEZ.** İlk sürümde öyle denendi ve başarısız oldu:
"paslanmaz bağlantı elemanı" denince model kafasındaki klişeyi çiziyor — cıvata ve somun.
Katalogda kelebek somun, ay segman, gupilya, zincir, gijon, düz kama, tırtıklı rondela var;
üstelik Dübeller kategorisinin üç ürününün DIN normu bile yok, AI'ın onları doğru üretme
ihtimali sıfır.

Yerine: **her ürünün gerçek stüdyo fotoğrafı image-to-video'ya verilir.** Geometri
fotoğraftan geldiği için uydurulmuyor.

## Hazırlık

```powershell
npm run hazirla:yukleme
```

`import/higgsfield/urun-kaynak/` altına 54 fotoğrafı hedef adlarıyla kopyalar
(`din-933.webp`, `wedge-anchor.webp` …) ve yanına işaretlenebilir bir `LISTE.txt` yazar.

## Her ürün için aynı üç adım

1. `urun-kaynak/` içindeki `.webp` dosyasını Higgsfield'e yükle → **image-to-video**
2. Aşağıdaki **tek** hareket prompt'unu yapıştır (54'ünde de aynı)
3. Çıktıyı **aynı adla** `.mp4` kaydet → `import/higgsfield/urun/` klasörüne at

## Tek hareket prompt'u — 54'ünde de değişmeden

Ürün adı bilinçli olarak GEÇMİYOR: ürün zaten görselde. Adı yazmak modeli görseli
"düzeltmeye" itiyor ve geometriyi bozuyor. Tek değişken kaynak fotoğraf.

```
The metal part rotates very slowly on its own axis, a cool light sweeping across its
machined surfaces and threads, subtle specular highlights travelling over the steel,
faint dust motes drifting in the air, camera pushing in very slowly, the pure black
background stays completely unchanged, no new objects appear, nothing enters the frame,
photorealistic, cinematic, macro product cinematography, no text, no people, no logos
```

**Ayarlar — 54'ünde de sabit:**

| Ayar | Değer | Neden |
|---|---|---|
| Süre | 4-5 sn | Hat 6 sn'ye tamamlıyor; uzunu boşuna kredi |
| Kamera preset | Yavaş olan (Dolly In / Slow Orbit / Float) | Sert hareket ızgarada göz yoruyor |
| Preset & seed | Tüm sette **aynı** | 54 klip tek set gibi görünmeli |

**Crash zoom, whip pan, shake kullanma.** Klipler 9×6'lık bir ızgarada aynı anda oynuyor;
sert hareket orada kaos yaratıyor.

## Sonra

```powershell
npm run hazirla:showreel
```

Üç klibi montajlar: **hız** (54 ürün hızlanarak, her birinde norm kodu) → **kapsam**
(54'ünün duvarı, kamera süzülüp geri çekiliyor) → **karar** (duvardan tek ürüne dalış).

**Hepsini birden yapman gerekmiyor.** Kaç klip varsa onlar kullanılır, olmayan üründe
duran fotoğrafa düşülür — sıfır klible bile çalışır. Önce 8-10 tane yapıp sonuca bak.

## Kalite kontrol

Bir klibi reddet, eğer:

- Ürün kadrajdan **taşıyorsa** — hat kutuya %15 pay veriyor, fazlası kesilir
- Zemin **siyah kalmamışsa** (ışık patlaması, duman, renk kaymışsa) — ızgarada o hücre
  komşularından ayrı düşer
- Model ürünü **değiştirmişse**: diş yönü dönmüş, başlık şekli bozulmuş, parça sayısı
  artmış. Katalogda norm satan bir sitede bunu teknik müşteri fark eder.

---

# C. Hakkımızda + İletişim görselleri

Hepsi **soyut**. Tesis, depo, konteyner, forklift, ekip yok — sitede gösterilen her şey
İnoxhan'ın sahip olduğu bir kapasite gibi okunur ve AI ile üretilmiş bir depo, sahip
olunmayan bir tesisi göstermek olur.

## C1 — `sayfa/hakkimizda-banner.jpg`  ·  21:9  ·  ≥2560 px

Sayfanın en üstündeki koyu başlık bandına girecek. Başlık metni sol tarafta duruyor —
**aynı sol boşluk kuralı geçerli.**

**Prompt**
```
Ultra-wide cinematic panorama of a brushed stainless steel surface stretching across the
frame like a dark horizon, a slow cool light gradient washing from the right, the left 45
percent falling into deep empty shadow, a few out-of-focus stainless steel fasteners
resting far right at the edge of the light, a single restrained warm amber #E8B54A glow
low on the right, near-black background #0B0D10, low-key studio lighting, wide lens,
shallow depth of field, photorealistic material study, high contrast, calm, minimal
```

## C2 — `sayfa/hakkimizda-tedarik.jpg`  ·  3:2  ·  ≥1800 px

> Bölüm: **Araştırma / Tedarik**

**Prompt**
```
Overhead shot of many different stainless steel fasteners — hex bolts, nuts, washers,
socket screws — sorted into neat groups on a matte near-black surface, each group
distinctly separated, even cool overhead light with a single warm amber #E8B54A accent
raking from one side, brushed 316L steel, near-black background #0C0C0B, medium format
look, f/8, photorealistic industrial flat lay, high contrast, orderly, minimal
```

## C3 — `sayfa/hakkimizda-lojistik.jpg`  ·  3:2  ·  ≥1800 px

> Bölüm: **Lojistik / Teslimat** — hareket fikri soyut anlatılacak, araç veya tesis yok.

**Prompt**
```
Abstract long-exposure photograph of stainless steel fasteners in motion across black
space, light trails tracing continuous paths through the frame from one edge to the other,
one bolt frozen sharp at the intersection of the trails, cool cyan-grey light streaks with
a single warm amber #E8B54A trail among them, near-black background #0B0D10, low-key
cinematic lighting, photorealistic motion study, high contrast, sense of speed and
direction
```

## C4 — `sayfa/hakkimizda-kalite.jpg`  ·  3:2  ·  ≥1800 px

> Bölüm: **Kalite / Norm** — ölçüm fikri. Kadranda rakam okunmamalı, negatif listede
> `numbers` var; cetvel çizgileri **odak dışı** kalsın.

**Prompt**
```
Extreme macro of polished caliper jaws closing on the shank of a stainless steel bolt,
the measuring contact point in razor-sharp focus, the caliper scale completely out of
focus and unreadable, brushed 316L steel against polished tool steel, a single warm amber
#E8B54A rim light, cool cyan speculars, near-black background #0B0D10, 100mm macro, f/4,
razor-thin depth of field, photorealistic precision engineering photography, high contrast
```

## C5 — `sayfa/iletisim.jpg`  ·  3:2  ·  ≥1800 px

İletişim sayfası sakin olmalı — form ve iletişim bilgisi öne çıkacak, görsel arkada durur.

**Prompt**
```
Quiet minimal composition, a single stainless steel hex bolt lying on a brushed steel
surface in a wide empty dark frame, most of the frame intentionally empty, one soft cool
light pool around the bolt fading into near-black, a faint warm amber #E8B54A reflection
on the surface, near-black background #0B0D10, 85mm, f/5.6, shallow depth of field,
photorealistic, high contrast, calm, spacious, minimal
```

---

# D. Kategori zeminleri + OG zemini

## D1-D3 — `zemin/zemin-01.jpg` … `zemin-03.jpg`  ·  4:3  ·  ≥1600 px

Bunlar **arka plan**, resmin kendisi değil. Üstlerine 54 ürünün gerçek stüdyo fotoğrafı
bindirilecek (`hazirla-kategori.ts`), böylece kullanıcı "Somunlar"a bakarken gerçek bir
somun görmeye devam eder — sadece arkası zenginleşir.

**Bu yüzden kritik: karenin ortası boş olmalı.** Ortada bir nesne varsa ürün fotoğrafının
altında kalır ve kirli görünür.

**D1 — dokusal**
```
Abstract dark background texture, brushed stainless steel surface with fine parallel grain
lines, lit by a soft cool light falling from the upper left and fading into deep shadow at
the edges, the CENTER of the frame deliberately empty and evenly dark with no objects,
strong vignette, near-black #0C0C0B, subtle warm amber #E8B54A glow in one corner only,
photorealistic material texture, high contrast, minimal, empty
```

**D2 — ışıklı**
```
Abstract dark background, a wide soft pool of cool light spreading across a matte
near-black surface from the upper right and dissolving into deep shadow, the CENTER of the
frame deliberately empty and evenly dark with no objects, faint metallic sheen in the
light falloff, strong vignette, near-black #0C0C0B, a restrained warm amber #E8B54A haze
at one edge, photorealistic studio backdrop, high contrast, minimal, empty
```

**D3 — derinlikli**
```
Abstract dark background with a subtle sense of depth, out-of-focus metallic bokeh
scattered around the outer edges of the frame, the CENTER of the frame deliberately empty
and evenly dark with no objects, cool cyan-grey highlights in the bokeh, one warm amber
#E8B54A bokeh point, strong vignette, near-black #0C0C0B, 85mm f/1.8 background plate,
photorealistic, high contrast, minimal, empty
```

## D4 — `zemin/og-zemin.jpg`  ·  1.91:1 (1200×630)  ·  ≥2400 px

Üstüne İnoxhan logosu ve `"İhtiyacını gönder, 15-30 dakika içinde teklifini al."` metni
basılacak (`hazirla-og.ts`). **Sol yarısı boş kalmalı.**

**Prompt**
```
Wide dark banner composition, stainless steel hex bolts and nuts resting in a shallow
diagonal arrangement along the RIGHT edge of the frame, the entire LEFT HALF empty
near-black space with no objects, a soft cool light falling from the upper right, brushed
316L steel with cyan-grey speculars, a single warm amber #E8B54A rim accent, near-black
background #0B0D10, low-key studio lighting, wide lens, shallow depth of field,
photorealistic industrial banner photography, high contrast, minimal
```

---

# 3. Kalite kontrol — indirmeden önce bak

Bir kareyi **reddet** ve yeniden üret, eğer:

- [ ] Görselde **harf, rakam, filigran veya marka izi** var (AI modelleri metal üstüne
      sahte damga yazmaya bayılıyor — cıvata başlarını ayrıca kontrol et).
- [ ] Metal **sarıya/pirince** kaçmış. Paslanmaz soğuk gri kalmalı; sarı yalnızca ışıkta.
- [ ] **Pas, leke, oksitlenme** izi var.
- [ ] Hero'da **sol %45 yeterince karanlık değil** — sloganın altında kalır. Test: görseli
      aç, sol yarısını elinle kapat; kalan kısım tek başına anlamlı duruyor mu?
- [ ] Mobil karede **üst yarı karanlık değil**.
- [ ] Çözünürlük tablodaki minimumun altında. (Upscale et, yeniden üretmene gerek yok.)
- [ ] Kategori zeminlerinde (D1-D3) **kare ortasında nesne var**.
- [ ] Diş yivleri **fiziksel olarak imkânsız** görünüyor — yivler birbirine karışmış,
      adım tutarsız. Soyut karelerde tolerans var ama A2/A3 gibi makro karelerde teknik
      müşteri bunu fark eder.

---

# 4. Bundan sonra ne oluyor

Dosyalar `import/higgsfield/` altına düştüğünde iki komut her şeyi siteye sokacak:

```powershell
npm run hazirla:medya    # görselleri AVIF/WebP türevlerine çevirir, hero'yu 2.33:1 kırpar
npm run hazirla:video    # MP4 + WebM + poster üretir, döngüyü dikişsiz hale getirir
```

Bu iki script henüz yazılmadı — prompt paketini onayladıktan sonra kurulacaklar.
Hepsini birden üretmen şart değil; **önce A1-A5 hero setini üret**, siteye bağlayıp
sonucu gör, sonra kalanına geç.
