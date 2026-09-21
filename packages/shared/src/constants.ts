import type { GatewayConfig, ScenarioPreset } from './types';

export const PORTS = {
  gateway: 4000,
  order: 4001,
  payment: 4002,
  notification: 4003,
} as const;

export const SERVICE_NAMES = ['gateway', 'order', 'payment', 'notification'] as const;

export const MAX_REQUESTS_STORED = 500;

export const SSE_PUSH_INTERVAL_MS = 1000;

export const DEFAULT_CONFIG: GatewayConfig = {
  rateLimiter: {
    enabled: true,
    maxTokens: 100,
    refillRate: 10,
  },
  cache: {
    enabled: true,
    ttlMs: 5000,
  },
  circuitBreaker: {
    enabled: true,
    threshold: 3,
    resetTimeoutMs: 10000,
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    baseDelayMs: 200,
  },
  services: {
    payment: { failRate: 0.1, latencyMs: 100 },
    notification: { failRate: 0.15, latencyMs: 50 },
    order: { failRate: 0.05, latencyMs: 30 },
  },
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    name: 'healthy',
    description: 'All services running normally',
    config: {
      services: {
        payment: { failRate: 0.01, latencyMs: 50, forceFail: false },
        notification: { failRate: 0.01, latencyMs: 30 },
        order: { failRate: 0.01, latencyMs: 20 },
      },
    },
  },
  {
    name: 'payment-failure',
    description: 'Payment service experiencing failures',
    config: {
      services: {
        payment: { failRate: 0.8, latencyMs: 500, forceFail: false },
        notification: { failRate: 0.01, latencyMs: 30 },
        order: { failRate: 0.01, latencyMs: 20 },
      },
    },
  },
  {
    name: 'high-latency',
    description: 'All services running slowly under high load',
    config: {
      services: {
        payment: { failRate: 0.05, latencyMs: 2000, forceFail: false },
        notification: { failRate: 0.05, latencyMs: 1500 },
        order: { failRate: 0.05, latencyMs: 1000 },
      },
    },
  },
  {
    name: 'cascading-failure',
    description: 'Cascading failure across all services',
    config: {
      services: {
        payment: { failRate: 0.9, latencyMs: 1500 },
        notification: { failRate: 0.8, latencyMs: 1000 },
        order: { failRate: 0.6, latencyMs: 800 },
      },
    },
  },
  {
    name: 'notification-down',
    description: 'Notification service unavailable',
    config: {
      services: {
        payment: { failRate: 0.01, latencyMs: 50 },
        notification: { failRate: 1.0, latencyMs: 200 },
        order: { failRate: 0.01, latencyMs: 20 },
      },
    },
  },
  {
    name: 'normal',
    description: 'Default configuration with moderate error rates',
    config: {
      services: {
        payment: { failRate: 0.1, latencyMs: 100, forceFail: false },
        notification: { failRate: 0.15, latencyMs: 50 },
        order: { failRate: 0.05, latencyMs: 30 },
      },
    },
  },
];
