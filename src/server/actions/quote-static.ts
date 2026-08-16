/**
 * submitQuote'un statik dışa aktarım (GitHub Pages) karşılığı — sunucu yok.
 *
 * next.config.ts, STATIC_EXPORT=1 derlemesinde "@/server/actions/quote" importunu
 * turbopack.resolveAlias ile bu modüle çevirir; QuoteForm hiçbir değişiklik görmez.
 * Form verisi hazır bir WhatsApp mesajına ya da e-posta taslağına dönüştürülür.
 */
export type SubmitQuoteResult =
  | { ok: true; quoteId: string }
  | { ok: false; message: string };

function alan(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function submitQuote(formData: FormData): Promise<SubmitQuoteResult> {
  const urun = alan(formData, "productSku") || alan(formData, "productText");
  const kalite = alan(formData, "quality");
  const firma = alan(formData, "company");
  const not = alan(formData, "note");
  const mesaj = [
    "Merhaba, teklif almak istiyorum.",
    "",
    `Ürün: ${urun}`,
    `Adet: ${alan(formData, "quantity")} ${alan(formData, "unit")}`,
    ...(kalite ? [`Kalite: ${kalite}`] : []),
    "",
    `Ad Soyad: ${alan(formData, "name")}`,
    ...(firma ? [`Firma: ${firma}`] : []),
    `Telefon: ${alan(formData, "phone")}`,
    `E-posta: ${alan(formData, "email")}`,
    ...(not ? [`Not: ${not}`] : []),
  ].join("\n");

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const eposta = process.env.NEXT_PUBLIC_QUOTE_EMAIL ?? "";

  if (whatsapp) {
    window.open(
      `https://wa.me/${whatsapp}?text=${encodeURIComponent(mesaj)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return { ok: true, quoteId: "whatsapp" };
  }
  if (eposta) {
    window.location.href = `mailto:${eposta}?subject=${encodeURIComponent(
      `Teklif Talebi — ${urun}`,
    )}&body=${encodeURIComponent(mesaj)}`;
    return { ok: true, quoteId: "eposta" };
  }
  return {
    ok: false,
    message:
      "Şu anda çevrimiçi form kapalı — talebinizi info@inoxhan.com adresine yazabilirsiniz.",
  };
}
