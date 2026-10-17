// Fixed-window limiter for one server instance. Signed-in users are limited in the database
// (usage_counters), which works across instances; this in-memory limiter covers guests and is
// a best-effort guard only. Swap for a shared store (Postgres or Redis) before scaling out.
export class WindowLimiter {
  private hits = new Map<string, { start: number; count: number }>();
  constructor(private limit: number, private windowMs: number) {}

  take(key: string, now = Date.now()): { ok: boolean; remaining: number; resetAt: number } {
    const w = this.hits.get(key);
    if (!w || now - w.start >= this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      if (this.hits.size > 10_000) this.prune(now);
      return { ok: true, remaining: this.limit - 1, resetAt: now + this.windowMs };
    }
    if (w.count >= this.limit) return { ok: false, remaining: 0, resetAt: w.start + this.windowMs };
    w.count += 1;
    return { ok: true, remaining: this.limit - w.count, resetAt: w.start + this.windowMs };
  }

  private prune(now: number) {
    for (const [k, w] of this.hits) if (now - w.start >= this.windowMs) this.hits.delete(k);
  }
}
