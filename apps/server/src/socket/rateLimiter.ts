export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  consume(key: string, maxHits: number, windowMs: number, now: number = Date.now()): boolean {
    const cutoff = now - windowMs;
    const existing = this.hits.get(key) ?? [];
    const recent = existing.filter((ts) => ts > cutoff);

    if (recent.length >= maxHits) {
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  clearKey(key: string): void {
    this.hits.delete(key);
  }
}
