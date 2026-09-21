import { EventEmitter } from 'events';
import type {
  RequestMetrics,
  CacheMetrics,
  RateLimitMetrics,
  CircuitBreakerInfo,
  ServiceHealth,
  MetricsSnapshot,
} from '@resilient/shared';
import { MAX_REQUESTS_STORED } from '@resilient/shared';

export class MetricsCollector extends EventEmitter {
  private requests: RequestMetrics[] = [];
  private services: Map<string, ServiceHealth> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerInfo> = new Map();
  private cacheMetrics: CacheMetrics = { hits: 0, misses: 0, hitRatio: 0, size: 0 };
  private rateLimitMetrics: RateLimitMetrics = { allowed: 0, rejected: 0, activeKeys: 0 };

  private startTime = Date.now();

  recordRequest(metrics: RequestMetrics): void {
    this.requests.push(metrics);
    if (this.requests.length > MAX_REQUESTS_STORED) {
      this.requests = this.requests.slice(-MAX_REQUESTS_STORED);
    }

    const service = this.services.get(metrics.service);
    if (service) {
      service.requestCount++;
      if (!metrics.success) {
        service.errorCount++;
      }
      service.responseTime = metrics.responseTime;
      service.lastChecked = new Date().toISOString();
    }

    this.emit('request', metrics);
  }

  updateServiceHealth(health: ServiceHealth): void {
    this.services.set(health.name, health);
    this.emit('service-health', health);
  }

  updateCircuitBreaker(info: CircuitBreakerInfo): void {
    const key = `${info.service}->${info.target}`;
    this.circuitBreakers.set(key, info);
    this.emit('circuit-breaker', info);
  }

  updateCacheMetrics(metrics: CacheMetrics): void {
    this.cacheMetrics = metrics;
    this.emit('cache', metrics);
  }

  updateRateLimitMetrics(metrics: RateLimitMetrics): void {
    this.rateLimitMetrics = metrics;
    this.emit('rate-limit', metrics);
  }

  getSnapshot(): MetricsSnapshot {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const recentRequests = this.requests.filter(
      (r) => new Date(r.timestamp).getTime() > oneSecondAgo
    );
    const requestsPerSecond = recentRequests.length;

    const allResponseTimes = this.requests.slice(-100).map((r) => r.responseTime);
    const avgResponseTime =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
        : 0;

    const recentWindow = this.requests.slice(-100);
    const errorCount = recentWindow.filter((r) => !r.success).length;
    const errorRate = recentWindow.length > 0 ? errorCount / recentWindow.length : 0;

    return {
      requests: this.requests.slice(-50),
      services: Array.from(this.services.values()),
      circuitBreakers: Array.from(this.circuitBreakers.values()),
      cache: this.cacheMetrics,
      rateLimit: this.rateLimitMetrics,
      requestsPerSecond,
      avgResponseTime,
      errorRate,
    };
  }

  onEvent(event: string, callback: (...args: unknown[]) => void): void {
    this.on(event, callback);
  }
}
