import nodemailer from "nodemailer";
import { formatPhoneTr } from "@/lib/phone";
import { SITE } from "@/lib/constants";
import { getSetting } from "@/server/settings";

/**
 * Gönderim kanalı, ortam değişkenlerine göre seçilir:
 *
 *   RESEND_API_KEY → Resend HTTP API. Vercel'de tercih edilen yol; sunucusuz
 *                    fonksiyonda SMTP bağlantısı kurmaya (ve soğuk başlangıçta
 *                    el sıkışmayı beklemeye) gerek kalmaz, tek istek yeter.
 *   SMTP_HOST      → klasik SMTP (nodemailer).
 *   hiçbiri        → dev modu: mail gönderilmez, içerik konsola yazılır.
 */
type Kanal = "resend" | "smtp" | "dev";

function kanalSec(): Kanal {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "dev";
}

/** Resend HTTP API — başarılıysa mesaj kimliğini döndürür. */
async function resendIleGonder(mail: {
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<string> {
  const yanit = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mail.from,
      // Resend alıcıyı dizi bekler; NOTIFY_EMAIL virgülle çoklu adres taşıyabilir
      to: mail.to
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      subject: mail.subject,
      text: mail.text,
    }),
    // Teklif kaydı zaten yazıldı; API takılırsa müşteri ekranda beklemesin
    signal: AbortSignal.timeout(15_000),
  });

  const govde = await yanit.text();
  if (!yanit.ok) {
    // Resend hatayı JSON gövdesinde açıklar ({ statusCode, name, message });
    // ham gövdeyi olduğu gibi taşımak "neden gitmedi" sorusunu tek bakışta çözer
    throw new Error(`Resend reddetti (HTTP ${yanit.status}): ${govde}`);
  }
  return (JSON.parse(govde) as { id?: string }).id ?? "(kimlik yok)";
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    // Teklif kaydı zaten yazıldı; erişilemeyen bir SMTP sunucusu yüzünden
    // müşteri "gönderiliyor" ekranında beklemesin
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export interface QuoteNotification {
  quoteId: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  /** Kargo adresi — iki kanallı sistemde formdan gelir (eski akışta yok). */
  address?: string | null;
  items: { label: string; quantity: number; unit: string; quality?: string | null }[];
  note: string | null;
  hasAttachment: boolean;
  source: string;
}

export async function sendQuoteNotification(q: QuoteNotification): Promise<void> {
  const to = await getSetting("notify_email", process.env.NOTIFY_EMAIL);
  const kanal = kanalSec();
  const isDev = kanal === "dev";
  if (!to && !isDev) {
    // Sessizce düşmek, "mail neden gelmiyor" aramasının en pahalı hâliydi
    console.warn(
      `Teklif #${q.quoteId} e-postası atlandı: alıcı yok — NOTIFY_EMAIL ortam değişkenini ` +
        `ya da panelden "notify_email" ayarını doldurun.`,
    );
    return;
  }

  const itemLines = q.items
    .map(
      (i) =>
        `• ${i.label} — ${i.quantity} ${i.unit}${i.quality ? ` — Kalite: ${i.quality}` : ""}`,
    )
    .join("\n");

  const text = [
    `Yeni teklif talebi (#${q.quoteId})`,
    ``,
    `Müşteri : ${q.name}${q.company ? ` — ${q.company}` : ""}`,
    `Telefon : ${formatPhoneTr(q.phone)}`,
    `E-posta : ${q.email ?? "-"}`,
    ...(q.address ? [`Adres   : ${q.address}`] : []),
    `Kaynak  : ${q.source}`,
    ``,
    `Talep:`,
    itemLines,
    q.note ? `\nNot: ${q.note}` : "",
    q.hasAttachment ? `\nEkli dosya var (panelden görüntülenebilir).` : "",
    ``,
    `Panel: ${SITE.url}/panel/teklifler`,
    ``,
    `Hedef: bu talebe 1 SAAT içinde dönüş yapılmalı.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const from = process.env.SMTP_FROM ?? "teklif@inoxhan.local";
  const alici = to || "dev@localhost";
  const subject = `⚡ Yeni Teklif Talebi — ${q.name} (${formatPhoneTr(q.phone)})`;

  if (kanal === "resend") {
    const kimlik = await resendIleGonder({ from, to: alici, subject, text });
    console.log(`Teklif #${q.quoteId} e-postası gönderildi → ${alici} (Resend ${kimlik})`);
    return;
  }

  const info = await getTransport().sendMail({ from, to: alici, subject, text });

  if (isDev) {
    console.log("── DEV E-POSTA (gönderim kanalı yapılandırılmadı) ──");
    console.log((info as { message?: Buffer }).message?.toString() ?? text);
    console.log("────────────────────────────────────────────────────");
  } else {
    // Vercel günlüğünde "gerçekten gönderildi mi" sorusunun tek satırlık cevabı
    console.log(`Teklif #${q.quoteId} e-postası gönderildi → ${alici} (SMTP ${info.messageId})`);
  }
}
