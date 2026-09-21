/**
 * Network Chaos — simulates real network failures
 *
 * Unlike simple Math.random() fail rates, this models actual network
 * conditions: connection drops, variable latency, partial failures.
 */

export interface NetworkChaosConfig {
  /** Probability of dropping a connection entirely (0-1) */
  dropRate: number;
  /** Base latency in ms added to every request */
  baseLatencyMs: number;
  /** Random jitter added to latency (0 = no jitter) */
  jitterMs: number;
  /** Probability of returning a corrupted/partial response (0-1) */
  corruptRate: number;
  /** Probability of connection timeout (0-1) */
  timeoutRate: number;
  /** Timeout duration in ms when timeout triggers */
  timeoutMs: number;
}

const DEFAULT_CONFIG: NetworkChaosConfig = {
  dropRate: 0,
  baseLatencyMs: 0,
  jitterMs: 0,
  corruptRate: 0,
  timeoutRate: 0,
  timeoutMs: 5000,
};

export class NetworkChaos {
  private config: NetworkChaosConfig = { ...DEFAULT_CONFIG };
  private stats = {
    totalRequests: 0,
    dropped: 0,
    corrupted: 0,
    timedOut: 0,
    totalLatencyAdded: 0,
  };

  updateConfig(partial: Partial<NetworkChaosConfig>): void {
    Object.assign(this.config, partial);
  }

  getConfig(): NetworkChaosConfig {
    return { ...this.config };
  }

  getStats() {
    return {
      ...this.stats,
      dropRate: this.stats.totalRequests > 0
        ? this.stats.dropped / this.stats.totalRequests
        : 0,
    };
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      dropped: 0,
      corrupted: 0,
      timedOut: 0,
      totalLatencyAdded: 0,
    };
  }

  /**
   * Apply network chaos before a request is sent.
   * Throws if the connection should be dropped or timed out.
   */
  async beforeSend(): Promise<void> {
    this.stats.totalRequests++;

    // Connection drop — refuse before sending
    if (Math.random() < this.config.dropRate) {
      this.stats.dropped++;
      throw new NetworkError('ECONNREFUSED', 'Connection refused by network chaos');
    }

    // Connection timeout — simulate no response
    if (Math.random() < this.config.timeoutRate) {
      this.stats.timedOut++;
      await sleep(this.config.timeoutMs);
      throw new NetworkError('ETIMEDOUT', `Connection timed out after ${this.config.timeoutMs}ms (chaos)`);
    }

    // Add base latency + jitter
    const jitter = this.config.jitterMs > 0
      ? Math.random() * this.config.jitterMs
      : 0;
    const totalDelay = this.config.baseLatencyMs + jitter;
    if (totalDelay > 0) {
      this.stats.totalLatencyAdded += totalDelay;
      await sleep(totalDelay);
    }
  }

  /**
   * Apply chaos after receiving a response.
   * May corrupt the response body.
   */
  afterReceive(response: Response): Response {
    if (Math.random() < this.config.corruptRate) {
      this.stats.corrupted++;
      // Return a corrupted response
      return new Response(
        JSON.stringify({ error: 'CORRUPTED_RESPONSE', data: null, checksum: 'invalid' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-chaos-corrupted': 'true' },
        }
      );
    }
    return response;
  }
}

export class NetworkError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
