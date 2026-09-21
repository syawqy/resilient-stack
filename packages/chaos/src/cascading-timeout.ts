/**
 * Cascading Timeout — simulates timeout propagation through service chains
 *
 * In real microservices:
 * Service A → Service B → Service C (slow DB)
 *
 * If C is slow, B's requests pile up, B's connection pool fills,
 * B starts timing out, A's requests to B pile up, A's pool fills.
 * This is the "cascading timeout" pattern.
 */

export interface CascadingTimeoutConfig {
  /** Simulated downstream service delay (ms) */
  downstreamDelayMs: number;
  /** Upstream timeout (ms) — if downstream exceeds this, upstream fails */
  upstreamTimeoutMs: number;
  /** Whether cascading is enabled */
  enabled: boolean;
}

const DEFAULT_CONFIG: CascadingTimeoutConfig = {
  downstreamDelayMs: 0,
  upstreamTimeoutMs: 5000,
  enabled: false,
};

export class CascadingTimeout {
  private config: CascadingTimeoutConfig = { ...DEFAULT_CONFIG };
  private stats = {
    totalRequests: 0,
    timedOut: 0,
    succeeded: 0,
    avgDownstreamDelay: 0,
    totalDelay: 0,
  };

  updateConfig(partial: Partial<CascadingTimeoutConfig>): void {
    Object.assign(this.config, partial);
  }

  getConfig(): CascadingTimeoutConfig {
    return { ...this.config };
  }

  getStats() {
    return {
      ...this.stats,
      timeoutRate: this.stats.totalRequests > 0
        ? this.stats.timedOut / this.stats.totalRequests
        : 0,
    };
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      timedOut: 0,
      succeeded: 0,
      avgDownstreamDelay: 0,
      totalDelay: 0,
    };
  }

  /**
   * Simulate a downstream call with cascading timeout.
   * Returns the response or throws a timeout error.
   */
  async callDownstream<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled || this.config.downstreamDelayMs === 0) {
      return fn();
    }

    this.stats.totalRequests++;

    // Race between the actual call and the timeout
    try {
      const result = await Promise.race([
        fn().then((r) => ({ ok: true as const, r })),
        sleep(this.config.downstreamDelayMs).then(() => {
          throw new CascadingTimeoutError(
            `Downstream timeout after ${this.config.downstreamDelayMs}ms`
          );
        }),
      ]);

      this.stats.succeeded++;
      this.stats.totalDelay += this.config.downstreamDelayMs;
      this.stats.avgDownstreamDelay = this.stats.totalDelay / this.stats.totalRequests;
      return result.r;
    } catch (err) {
      if (err instanceof CascadingTimeoutError) {
        this.stats.timedOut++;
        throw err;
      }
      throw err;
    }
  }
}

export class CascadingTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CascadingTimeoutError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
