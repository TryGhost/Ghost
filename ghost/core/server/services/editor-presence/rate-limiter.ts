interface Bucket {
  windowStart: number;
  count: number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

/** Fixed-window counter per key, held in process memory. */
export class FixedWindowLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(options: RateLimitOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  take(key: string): RateLimitDecision {
    const now = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      bucket = { windowStart: now, count: 0 };
      this.buckets.set(key, bucket);
      this.sweep(now);
    }
    if (bucket.count >= this.limit) {
      return { allowed: false, retryAfterMs: bucket.windowStart + this.windowMs - now };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  private sweep(now: number): void {
    if (this.buckets.size < 1000) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}
