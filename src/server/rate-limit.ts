/**
 * Basit bellek içi token bucket — tek Node süreci için yeterli (VPS hedefi).
 * Süreç yeniden başlayınca sıfırlanır; kalıcı sayaç gerekmez.
 */
const buckets = new Map<string, { tokens: number; last: number }>();

export function rateLimit(
  key: string,
  opts: { capacity: number; refillPerMinute: number },
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: opts.capacity, last: now };
  const elapsedMin = (now - bucket.last) / 60_000;
  bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedMin * opts.refillPerMinute);
  bucket.last = now;
  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  // bellek büyümesin: 10k anahtardan sonra eskileri temizle
  if (buckets.size > 10_000) {
    const cutoff = now - 10 * 60_000;
    for (const [k, v] of buckets) if (v.last < cutoff) buckets.delete(k);
  }
  return true;
}
