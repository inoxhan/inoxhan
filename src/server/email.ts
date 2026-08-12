import nodemailer from "nodemailer";
import { formatPhoneTr } from "@/lib/phone";
import { SITE } from "@/lib/constants";
import { getSetting } from "@/server/settings";

/**
 * SMTP env ile yapılandırılır; SMTP_HOST boşsa e-posta gönderilmez,
 * içerik konsola yazılır (dev modu).
 */
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
  });
}

export interface QuoteNotification {
  quoteId: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  items: { label: string; quantity: number; unit: string }[];
  note: string | null;
  hasAttachment: boolean;
  source: string;
}

export async function sendQuoteNotification(q: QuoteNotification): Promise<void> {
  const to = await getSetting("notify_email", process.env.NOTIFY_EMAIL);
  const isDev = !process.env.SMTP_HOST;
  if (!to && !isDev) return;

  const itemLines = q.items
    .map((i) => `• ${i.label} — ${i.quantity} ${i.unit}`)
    .join("\n");

  const text = [
    `Yeni teklif talebi (#${q.quoteId})`,
    ``,
    `Müşteri : ${q.name}${q.company ? ` — ${q.company}` : ""}`,
    `Telefon : ${formatPhoneTr(q.phone)}`,
    `E-posta : ${q.email ?? "-"}`,
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

  const transport = getTransport();
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM ?? "teklif@inoxhan.local",
    to: to || "dev@localhost",
    subject: `⚡ Yeni Teklif Talebi — ${q.name} (${formatPhoneTr(q.phone)})`,
    text,
  });

  if (isDev) {
    console.log("── DEV E-POSTA (SMTP yapılandırılmadı) ──");
    console.log((info as { message?: Buffer }).message?.toString() ?? text);
    console.log("──────────────────────────────────────────");
  }
}
