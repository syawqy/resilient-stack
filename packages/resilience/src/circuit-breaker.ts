type CircuitBreakerState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  threshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  lastFailureTime: string | null;
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures = 0;
  private successes = 0;
  private halfOpenCalls = 0;
  private lastFailureTime: string | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly threshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxCalls: number;
  private readonly serviceName: string;

  constructor(serviceName: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.serviceName = serviceName;
    this.threshold = options.threshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 10000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls ?? 3;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics & { state: CircuitBreakerState; service: string } {
    return {
      state: this.state,
      service: this.serviceName,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalRequests: this.failures + this.successes,
      totalFailures: this.failures,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new CircuitBreakerOpenError(this.serviceName);
    }

    if (this.state === 'half-open') {
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError(this.serviceName);
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.halfOpenMaxCalls) {
        this.transitionTo('closed');
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.successes = 0;
    this.lastFailureTime = new Date().toISOString();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failures >= this.threshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'closed') {
      this.failures = 0;
      this.halfOpenCalls = 0;
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
    } else if (newState === 'open') {
      this.halfOpenCalls = 0;
      this.successes = 0;
      this.resetTimer = setTimeout(() => {
        this.transitionTo('half-open');
      }, this.resetTimeout);
    } else if (newState === 'half-open') {
      this.halfOpenCalls = 0;
      this.successes = 0;
    }

    console.log(`[CircuitBreaker] ${this.serviceName}: ${oldState} -> ${newState}`);
  }

  reset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = null;
  }
}

export class CircuitBreakerOpenError extends Error {
  public readonly serviceName: string;

  constructor(serviceName: string) {
    super(`Circuit breaker is OPEN for service: ${serviceName}`);
    this.serviceName = serviceName;
    this.name = 'CircuitBreakerOpenError';
  }
}
