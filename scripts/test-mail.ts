/**
 * SMTP ayarlarını gerçek bir gönderimle sınar —  npm run test:mail
 *
 * Teklif akışının tamamını çalıştırmadan yalnız posta kanalını dener: önce
 * sunucuya bağlanıp kimlik doğrular (verify), sonra gerçek alıcıya örnek bir
 * teklif bildirimi atar. Hata mesajları Türkçeleştirilir — Google'ın
 * "535-5.7.8 Username and Password not accepted" gibi çıktıları tek başına
 * neyin yanlış olduğunu söylemiyor.
 *
 * Veritabanına dokunmaz, kayıt oluşturmaz.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

/** .env'i tsx altında elle okuruz — bu script Next çalışma zamanı dışındadır. */
function envYukle() {
  try {
    const icerik = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const satir of icerik.split(/\r?\n/)) {
      const t = satir.trim();
      if (!t || t.startsWith("#")) continue;
      const esit = t.indexOf("=");
      if (esit < 0) continue;
      const anahtar = t.slice(0, esit).trim();
      if (process.env[anahtar]) continue;
      process.env[anahtar] = t.slice(esit + 1).trim().replace(/^"|"$/g, "");
    }
  } catch {
    console.error("! .env okunamadı — proje kökünden çalıştırdığınızdan emin olun");
  }
}

function ipucu(hata: unknown): string {
  const kod = (hata as { code?: string })?.code ?? "";
  const mesaj = String((hata as { message?: string })?.message ?? hata);

  if (kod === "EAUTH" || mesaj.includes("535")) {
    return [
      "Kullanıcı adı / şifre kabul edilmedi.",
      "  • SMTP_PASS, hesap şifreniz DEĞİL, 16 haneli uygulama şifresidir.",
      "  • Uygulama şifresi KURUMSAL hesapta üretilmeli: info@inoxhan.com ile giriş",
      "    yapıp Google Hesabı > Güvenlik > 2 Adımlı Doğrulama (açık olmalı) >",
      "    Uygulama Şifreleri.",
      "  • Şifreyi boşluksuz yapıştırın (Google 4'erli gruplar hâlinde gösterir).",
      "  • Google Workspace yöneticisi uygulama şifrelerini kapatmış olabilir —",
      "    Admin Console > Güvenlik > Kimlik Doğrulama bölümünden açılması gerekir.",
    ].join("\n");
  }
  if (kod === "ETIMEDOUT" || kod === "ESOCKET" || kod === "ECONNECTION") {
    return [
      "Sunucuya bağlanılamadı.",
      "  • SMTP_HOST doğru mu? (Google Workspace: smtp.gmail.com)",
      "  • SMTP_PORT 465 (SSL) ya da 587 (STARTTLS) olmalı.",
      "  • Kurumsal ağ/güvenlik duvarı giden 465/587 portunu kapatmış olabilir.",
    ].join("\n");
  }
  if (kod === "EENVELOPE") {
    return "Gönderen ya da alıcı adresi reddedildi — SMTP_FROM ve NOTIFY_EMAIL değerlerini kontrol edin.";
  }
  return "Beklenmedik hata — tam çıktı aşağıda.";
}

/**
 * Gerçek alıcıyı çözer — sendQuoteNotification ile AYNI sırayla: önce veritabanı
 * (Setting.notify_email), sonra NOTIFY_EMAIL. Bu sıra atlanırsa test .env'deki
 * adrese mail atıp "çalışıyor" der, üretim ise başka bir kutuya gönderir.
 */
async function aliciCoz(): Promise<{ adres: string; kaynak: string }> {
  const db = new PrismaClient();
  try {
    const row = await db.setting.findUnique({ where: { key: "notify_email" } });
    if (row?.value) return { adres: row.value, kaynak: "veritabanı (Setting.notify_email)" };
  } catch {
    console.warn("! veritabanına bakılamadı — NOTIFY_EMAIL ile devam ediliyor\n");
  } finally {
    await db.$disconnect().catch(() => {});
  }
  return { adres: process.env.NOTIFY_EMAIL ?? "", kaynak: ".env NOTIFY_EMAIL" };
}

/** Resend HTTP API ile örnek bildirim — src/server/email.ts ile aynı uç nokta. */
async function resendDene(anahtar: string, from: string, to: string) {
  console.log("1) Resend API'ye istek gönderiliyor...");
  const yanit = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${anahtar}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((a) => a.trim()).filter(Boolean),
      subject: "⚡ Inoxhan e-posta testi — teklif bildirimi örneği",
      text: ORNEK_METIN,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const govde = await yanit.text();
  if (!yanit.ok) {
    console.error(`\n✗ BAŞARISIZ — Resend reddetti (HTTP ${yanit.status})\n`);
    if (yanit.status === 401 || yanit.status === 403) {
      console.error("API anahtarı kabul edilmedi.");
      console.error("  • RESEND_API_KEY 're_' ile başlamalı; anahtarı yeniden kopyalayın.");
    } else if (govde.includes("domain") || govde.includes("from")) {
      console.error("Gönderen adresi kabul edilmedi.");
      console.error(`  • ${from} adresinin alan adı Resend'de DOĞRULANMIŞ olmalı.`);
      console.error("  • Resend > Domains ekranında inoxhan.com 'Verified' görünüyor mu?");
      console.error("  • DNS kayıtlarının yayılması 10-30 dakika sürebilir.");
    }
    console.error("\n--- ham yanıt ---");
    console.error(govde);
    process.exitCode = 1;
    return;
  }

  const kimlik = (JSON.parse(govde) as { id?: string }).id ?? "(kimlik yok)";
  console.log(`   ✓ gönderildi — kimlik: ${kimlik}`);
  console.log(`\nTAMAM. ${to} kutusunu kontrol edin (spam klasörüne de bakın).`);
}

const ORNEK_METIN = [
  "Bu bir testtir; gerçek bir müşteri talebi değildir.",
  "",
  "Bu e-postayı görüyorsanız site artık teklif bildirimlerini gönderebilir.",
  "Gerçek bildirimler şu biçimde gelir:",
  "",
  "Müşteri : Örnek Metal A.Ş.",
  "Telefon : 0555 123 45 67",
  "Talep   : • DIN 933 M8x40 — 500 adet — Kalite: A2",
].join("\n");

async function main() {
  envYukle();

  const resendKey = process.env.RESEND_API_KEY ?? "";
  const host = process.env.SMTP_HOST ?? "";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const from = process.env.SMTP_FROM || user;
  const { adres: to, kaynak } = await aliciCoz();

  // Kanal seçimi email.ts'teki kanalSec() ile birebir aynı sırada olmalı
  const kanal = resendKey ? "Resend HTTP API" : host ? "SMTP" : "(yapılandırılmamış)";

  console.log("E-posta ayarları");
  console.log(`  Kanal   : ${kanal}`);
  if (resendKey) {
    console.log(`  Anahtar : ${resendKey.slice(0, 3)}… ${resendKey.length} karakter`);
  } else {
    console.log(`  Sunucu  : ${host || "(boş)"}:${port} ${port === 465 ? "(SSL)" : "(STARTTLS)"}`);
    console.log(`  Kullanıcı: ${user || "(boş)"}`);
    console.log(`  Şifre   : ${pass ? `${pass.length} karakter` : "(BOŞ)"}`);
  }
  console.log(`  Gönderen: ${from || "(boş)"}`);
  console.log(`  Alıcı   : ${to || "(BOŞ)"}  ← ${kaynak}\n`);

  // Kurumsal kimlik zorunlu: site hiçbir koşulda kişisel bir Gmail hesabından
  // gönderim yapmaz. Bu kural bir kez elle ihlal edildiği için burada makine
  // seviyesinde tutuluyor — kurumsal adresler (@inoxhan.com) etkilenmez.
  const kisisel = [user, from].filter((a) => a.toLowerCase().endsWith("@gmail.com"));
  if (kisisel.length) {
    console.error(`✗ Kişisel Gmail adresi kullanılamaz: ${[...new Set(kisisel)].join(", ")}`);
    console.error("  SMTP_FROM kurumsal kutu olmalı (ör. info@inoxhan.com).");
    process.exitCode = 1;
    return;
  }
  if (!to) {
    console.error("✗ Alıcı boş — bildirimin gideceği kutu belli değil.");
    process.exitCode = 1;
    return;
  }
  if (resendKey) {
    if (!from) {
      console.error("✗ SMTP_FROM boş — Resend gönderen adresi olmadan kabul etmez.");
      process.exitCode = 1;
      return;
    }
    try {
      await resendDene(resendKey, from, to);
    } catch (hata) {
      console.error("\n✗ BAŞARISIZ — Resend'e ulaşılamadı\n");
      console.error(hata);
      process.exitCode = 1;
    }
    return;
  }
  if (!host) {
    console.error("✗ Gönderim kanalı yok — site e-posta göndermez, sadece konsola yazar.");
    console.error("  Beklenen: .env içinde RESEND_API_KEY dolu olsun (tercih edilen yol),");
    console.error("  ya da klasik SMTP için SMTP_HOST/SMTP_USER/SMTP_PASS girilsin.");
    console.error("  Ayrıntı: .env.example");
    process.exitCode = 1;
    return;
  }
  if (!pass) {
    console.error("✗ SMTP_PASS boş — uygulama şifresini girmeden gönderim yapılamaz.");
    console.error(`  ${user || "kurumsal kutu"} ile giriş yapıp:`);
    console.error("  Google Hesabı > Güvenlik > 2 Adımlı Doğrulama > Uygulama Şifreleri");
    process.exitCode = 1;
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });

  try {
    console.log("1) Sunucuya bağlanılıyor ve kimlik doğrulanıyor...");
    await transport.verify();
    console.log("   ✓ bağlantı ve kimlik doğrulama başarılı\n");

    console.log("2) Örnek teklif bildirimi gönderiliyor...");
    const info = await transport.sendMail({
      from,
      to,
      subject: "⚡ Inoxhan SMTP testi — teklif bildirimi örneği",
      text: ORNEK_METIN,
    });
    console.log(`   ✓ gönderildi — messageId: ${info.messageId}`);
    console.log(`\nTAMAM. ${to} kutusunu kontrol edin (spam klasörüne de bakın).`);
  } catch (hata) {
    console.error("\n✗ BAŞARISIZ\n");
    console.error(ipucu(hata));
    console.error("\n--- ham hata ---");
    console.error(hata);
    process.exitCode = 1;
  }
}

main();
