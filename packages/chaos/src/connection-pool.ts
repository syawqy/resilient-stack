/**
 * Connection Pool — semaphore-based concurrent connection limiter
 *
 * In production, services have limited connection pools (DB, HTTP clients).
 * When the pool is exhausted, new requests queue up and eventually timeout.
 * This simulates that behavior.
 */

export interface ConnectionPoolConfig {
  /** Max concurrent connections */
  maxConcurrent: number;
  /** Max requests waiting in queue before rejection */
  maxQueueSize: number;
  /** How long a request waits in queue before timeout (ms) */
  queueTimeoutMs: number;
}

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  maxConcurrent: 10,
  maxQueueSize: 50,
  queueTimeoutMs: 5000,
};

interface WaitingRequest {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class ConnectionPool {
  private config: ConnectionPoolConfig = { ...DEFAULT_CONFIG };
  private active = 0;
  private queue: WaitingRequest[] = [];
  private stats = {
    totalRequests: 0,
    acquired: 0,
    rejected: 0,
    timedOut: 0,
    totalWaitTime: 0,
  };

  constructor(config?: Partial<ConnectionPoolConfig>) {
    Object.assign(this.config, config);
  }

  updateConfig(partial: Partial<ConnectionPoolConfig>): void {
    Object.assign(this.config, partial);
  }

  getConfig(): ConnectionPoolConfig {
    return { ...this.config };
  }

  getStats() {
    return {
      ...this.stats,
      active: this.active,
      queued: this.queue.length,
      utilization: this.active / this.config.maxConcurrent,
    };
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      acquired: 0,
      rejected: 0,
      timedOut: 0,
      totalWaitTime: 0,
    };
  }

  /**
   * Acquire a connection slot. Throws if pool is full and queue is at capacity.
   * Returns a release function when acquired.
   */
  async acquire(): Promise<() => void> {
    this.stats.totalRequests++;

    // Pool has space — acquire immediately
    if (this.active < this.config.maxConcurrent) {
      this.active++;
      this.stats.acquired++;
      return () => this.release();
    }

    // Queue is full — reject
    if (this.queue.length >= this.config.maxQueueSize) {
      this.stats.rejected++;
      throw new PoolExhaustedError(
        `Connection pool exhausted: ${this.active}/${this.config.maxConcurrent} active, ` +
        `${this.queue.length}/${this.config.maxQueueSize} queued`
      );
    }

    // Wait in queue
    return new Promise<() => void>((resolve, reject) => {
      const waitStart = Date.now();

      const timer = setTimeout(() => {
        // Remove from queue
        const idx = this.queue.findIndex((r) => r.timer === timer);
        if (idx !== -1) this.queue.splice(idx, 1);
        this.stats.timedOut++;
        reject(new PoolTimeoutError(
          `Connection pool queue timeout after ${this.config.queueTimeoutMs}ms`
        ));
      }, this.config.queueTimeoutMs);

      this.queue.push({
        resolve: () => {
          clearTimeout(timer);
          const waitTime = Date.now() - waitStart;
          this.stats.totalWaitTime += waitTime;
          this.active++;
          this.stats.acquired++;
          resolve(() => this.release());
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      });
    });
  }

  private release(): void {
    this.active--;
    // Process queue
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next.resolve();
    }
  }

  /** Force-drain all waiting requests (for cleanup) */
  drain(): void {
    for (const req of this.queue) {
      clearTimeout(req.timer);
      req.reject(new Error('Pool drained'));
    }
    this.queue = [];
    this.active = 0;
  }
}

export class PoolExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PoolExhaustedError';
  }
}

export class PoolTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PoolTimeoutError';
  }
}
