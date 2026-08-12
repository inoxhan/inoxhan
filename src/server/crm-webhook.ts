import { createHmac } from "node:crypto";
import { getSetting } from "@/server/settings";

/**
 * Generic CRM webhook adaptörü — CRM markası netleşince eşleme buraya eklenir.
 * Her teklifte HMAC-SHA256 imzalı JSON POST atılır; 3 deneme, artan bekleme.
 */
export interface CrmQuotePayload {
  event: "quote.created";
  quoteId: string;
  createdAt: string;
  customer: { name: string; company: string | null; phone: string; email: string | null };
  items: { sku: string | null; label: string; quantity: number; unit: string }[];
  note: string | null;
  source: string;
}

const RETRY_DELAYS_MS = [1000, 3000, 9000];

export async function postQuoteToCrm(payload: CrmQuotePayload): Promise<void> {
  const url = await getSetting("crm_webhook_url", process.env.CRM_WEBHOOK_URL);
  if (!url) return;
  const secret = await getSetting("crm_webhook_secret", process.env.CRM_WEBHOOK_SECRET);

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) {
    headers["x-inoxhan-signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (res.ok) return;
      console.warn(`CRM webhook ${res.status} döndü (deneme ${attempt + 1})`);
    } catch (err) {
      console.warn(`CRM webhook hatası (deneme ${attempt + 1}):`, err);
    }
    if (attempt < RETRY_DELAYS_MS.length - 1) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  console.error(`CRM webhook 3 denemede ulaşılamadı: teklif ${payload.quoteId}`);
}
