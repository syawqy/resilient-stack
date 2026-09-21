export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'random';

export interface Order {
  id: string;
  productId: string;
  quantity: number;
  total: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'order-created' | 'payment-processed' | 'payment-failed';
  message: string;
  status: 'sent' | 'failed' | 'queued';
  createdAt: string;
  retryCount: number;
}

export interface RequestMetrics {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  service: string;
  success: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
}

export interface RateLimitMetrics {
  allowed: number;
  rejected: number;
  activeKeys: number;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  requestCount: number;
  errorCount: number;
  uptime: number;
  lastChecked: string;
}

export interface CircuitBreakerInfo {
  service: string;
  target: string;
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime: string | null;
}

export interface MetricsSnapshot {
  requests: RequestMetrics[];
  services: ServiceHealth[];
  circuitBreakers: CircuitBreakerInfo[];
  cache: CacheMetrics;
  rateLimit: RateLimitMetrics;
  requestsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface ServiceConfig {
  failRate: number;
  latencyMs: number;
  forceFail?: boolean;
}

export interface GatewayConfig {
  rateLimiter: {
    enabled: boolean;
    maxTokens: number;
    refillRate: number;
  };
  cache: {
    enabled: boolean;
    ttlMs: number;
  };
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    resetTimeoutMs: number;
  };
  retry: {
    enabled: boolean;
    maxRetries: number;
    baseDelayMs: number;
  };
  services: {
    payment: ServiceConfig;
    notification: ServiceConfig;
    order: ServiceConfig;
  };
}

export interface ScenarioPreset {
  name: string;
  description: string;
  config: Partial<GatewayConfig>;
}
