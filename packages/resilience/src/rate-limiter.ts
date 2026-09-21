interface TokenBucketOptions {
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillIntervalMs: number;
  private buckets: Map<string, BucketState> = new Map();

  private allowedCount = 0;
  private rejectedCount = 0;

  constructor(options: Partial<TokenBucketOptions> = {}) {
    this.maxTokens = options.maxTokens ?? 100;
    this.refillRate = options.refillRate ?? 10;
    this.refillIntervalMs = options.refillIntervalMs ?? 1000;
  }

  tryConsume(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    this.refill(bucket, now);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.allowedCount++;
      return true;
    }

    this.rejectedCount++;
    return false;
  }

  private refill(bucket: BucketState, now: number): void {
    const elapsed = now - bucket.lastRefill;
    const intervals = Math.floor(elapsed / this.refillIntervalMs);

    if (intervals > 0) {
      const tokensToAdd = intervals * this.refillRate;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  updateConfig(maxTokens: number, refillRate: number): void {
    (this as { maxTokens: number }).maxTokens = maxTokens;
    (this as { refillRate: number }).refillRate = refillRate;
  }

  getStats(): { allowed: number; rejected: number; activeKeys: number } {
    return {
      allowed: this.allowedCount,
      rejected: this.rejectedCount,
      activeKeys: this.buckets.size,
    };
  }

  reset(): void {
    this.buckets.clear();
    this.allowedCount = 0;
    this.rejectedCount = 0;
  }

  removeKey(key: string): void {
    this.buckets.delete(key);
  }
}
