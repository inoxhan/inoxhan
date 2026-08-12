/**
 * Kurulum verisi — YALNIZCA panel kullanıcısı ve varsayılan ayarlar.
 *
 * Ürün kataloğu buradan DEĞİL, gerçek fotoğraf klasöründen gelir:
 *   npm run import:urunler
 *
 * Çalıştırma: npm run db:seed (idempotent)
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const db = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD;

  if (password) {
    const existing = await db.adminUser.findUnique({ where: { username } });
    if (existing) {
      console.log(`Panel kullanıcısı zaten var: ${username}`);
    } else {
      await db.adminUser.create({
        data: { username, passwordHash: await hashPassword(password) },
      });
      console.log(`Panel kullanıcısı oluşturuldu: ${username}`);
    }
  } else {
    console.warn("ADMIN_PASSWORD .env'de yok — panel kullanıcısı oluşturulmadı.");
  }

  // Ayarlar panelden düzenlenir; burada yalnızca ilk değerleri konur (üzerine yazılmaz)
  const settings: [string, string][] = [
    ["hero_slogan", "0"],
    ["whatsapp_number", process.env.WHATSAPP_NUMBER ?? ""],
    ["notify_email", process.env.NOTIFY_EMAIL ?? ""],
  ];
  for (const [key, value] of settings) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log("Kurulum verisi hazır.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
