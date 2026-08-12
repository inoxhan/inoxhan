import { db } from "@/server/db";

/**
 * Ayar okuma — önce veritabanı (panelden yönetilir), boşsa env değişkeni.
 * Böylece kullanıcı WhatsApp numarası gibi değerleri deploy'suz değiştirebilir.
 */
export async function getSetting(key: string, envFallback?: string): Promise<string> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch {
    // tablo henüz yoksa (ilk migrate öncesi) sessizce env'e düş
  }
  return envFallback ?? "";
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
