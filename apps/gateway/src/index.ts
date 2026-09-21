import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MetricsCollector } from '@resilient/metrics';
import { CircuitBreaker, CircuitBreakerOpenError, RateLimiter, withRetry, LoadBalancer } from '@resilient/resilience';
import { DEFAULT_CONFIG, PORTS, SCENARIO_PRESETS, SERVICE_NAMES } from '@resilient/shared';
import type { GatewayConfig } from '@resilient/shared';
import { logger } from './middlewares/logger';
import { createRateLimiterMiddleware } from './middlewares/rate-limiter';
import { createProxyHandler } from './proxy';

export const metricsCollector = new MetricsCollector();
export let currentConfig: GatewayConfig = structuredClone(DEFAULT_CONFIG);

const circuitBreakers = new Map<string, CircuitBreaker>();
const rateLimiter = new RateLimiter({
  maxTokens: currentConfig.rateLimiter.maxTokens,
  refillRate: currentConfig.rateLimiter.refillRate,
});
const loadBalancers = new Map<string, LoadBalancer>();

function initCircuitBreakers(): void {
  for (const svc of SERVICE_NAMES) {
    if (svc === 'gateway') continue;
    const key = `gateway->${svc}`;
    circuitBreakers.set(
      key,
      new CircuitBreaker(key, {
        threshold: currentConfig.circuitBreaker.threshold,
        resetTimeout: currentConfig.circuitBreaker.resetTimeoutMs,
      })
    );
  }
}

function initLoadBalancers(): void {
  const orderLb = new LoadBalancer('round-robin');
  orderLb.addTarget('order-1', 'localhost', PORTS.order);
  loadBalancers.set('order', orderLb);

  const paymentLb = new LoadBalancer('round-robin');
  paymentLb.addTarget('payment-1', 'localhost', PORTS.payment);
  loadBalancers.set('payment', paymentLb);

  const notificationLb = new LoadBalancer('round-robin');
  notificationLb.addTarget('notification-1', 'localhost', PORTS.notification);
  loadBalancers.set('notification', notificationLb);
}

async function propagateConfig(): Promise<void> {
  const svcConfig = currentConfig.services;
  const targets = [
    { url: `http://localhost:${PORTS.payment}/config`, body: svcConfig.payment },
    { url: `http://localhost:${PORTS.notification}/config`, body: svcConfig.notification },
  ];
  for (const t of targets) {
    try {
      await fetch(t.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(t.body),
      });
    } catch { /* service may be down */ }
  }
}

initCircuitBreakers();
initLoadBalancers();

function getServiceHealth(name: string, startTime: number): {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  requestCount: number;
  errorCount: number;
  uptime: number;
  lastChecked: string;
} {
  return {
    name,
    status: 'healthy',
    responseTime: 0,
    requestCount: 0,
    errorCount: 0,
    uptime: Date.now() - startTime,
    lastChecked: new Date().toISOString(),
  };
}

const app = new Hono();

app.use('*', cors());

// Initialize service health
for (const name of SERVICE_NAMES) {
  metricsCollector.updateServiceHealth(getServiceHealth(name, Date.now()));
}

// Logger middleware
app.use('*', logger(metricsCollector));

// Rate limiter middleware
app.use('*', createRateLimiterMiddleware(rateLimiter, currentConfig));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// SSE metrics endpoint
app.get('/api/metrics', (c) => {
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let alive = true;

      const send = () => {
        if (!alive) return;
        try {
          const snapshot = metricsCollector.getSnapshot();
          const data = `data: ${JSON.stringify(snapshot)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Controller may be closed
        }
      };

      send(); // Initial
      const interval = setInterval(send, 1000);

      c.req.raw.signal.addEventListener('abort', () => {
        alive = false;
        clearInterval(interval);
        try { controller.close(); } catch { /* ignore */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// Config endpoints
app.post('/api/config', async (c) => {
  const body = await c.req.json<Partial<GatewayConfig>>();
  if (body.rateLimiter) {
    currentConfig.rateLimiter = { ...currentConfig.rateLimiter, ...body.rateLimiter };
    rateLimiter.updateConfig(currentConfig.rateLimiter.maxTokens, currentConfig.rateLimiter.refillRate);
  }
  if (body.cache) {
    currentConfig.cache = { ...currentConfig.cache, ...body.cache };
  }
  if (body.circuitBreaker) {
    currentConfig.circuitBreaker = { ...currentConfig.circuitBreaker, ...body.circuitBreaker };
    for (const [key, cb] of circuitBreakers) {
      cb.reset();
    }
  }
  if (body.retry) {
    currentConfig.retry = { ...currentConfig.retry, ...body.retry };
  }
  if (body.services) {
    currentConfig.services = {
      ...currentConfig.services,
      ...body.services,
    };
    propagateConfig();
  }
  return c.json({ success: true, config: currentConfig });
});

// Scenario endpoints
app.get('/api/scenarios', (c) => {
  return c.json(SCENARIO_PRESETS);
});

app.post('/api/scenarios/:name', (c) => {
  const name = c.req.param('name');
  const preset = SCENARIO_PRESETS.find((s) => s.name === name);
  if (!preset) {
    return c.json({ error: 'Scenario not found' }, 404);
  }
  if (preset.config.services) {
    currentConfig.services = {
      ...currentConfig.services,
      ...preset.config.services,
    };
    propagateConfig();
  }
  return c.json({ success: true, activated: name, config: currentConfig });
});

// Load test endpoint
app.post('/api/load-test', async (c) => {
  const body = await c.req.json<{ requests: number; rate: number }>();
  const { requests = 10, rate = 5 } = body;

  let completed = 0;
  let successes = 0;
  let failures = 0;

  const runBatch = async () => {
    const batchSize = Math.min(rate, requests - completed);
    if (batchSize <= 0) return;

    const promises = Array.from({ length: batchSize }, async () => {
      try {
        const res = await fetch(`http://localhost:${PORTS.order}/orders`);
        if (res.ok) successes++;
        else failures++;
      } catch {
        failures++;
      }
      completed++;
    });

    await Promise.allSettled(promises);
  };

  const interval = setInterval(async () => {
    if (completed >= requests) {
      clearInterval(interval);
      return;
    }
    await runBatch();
  }, 1000);

  // Fire first batch immediately
  runBatch();

  return c.json({ started: true, total: requests, rate });
});

// Proxy routes
const proxyHandler = createProxyHandler(currentConfig, circuitBreakers, loadBalancers, metricsCollector);
app.all('/api/orders/*', proxyHandler('order'));
app.all('/api/payments/*', proxyHandler('payment'));
app.all('/api/notifications/*', proxyHandler('notification'));

const PORT = PORTS.gateway;
console.log(`[Gateway] Starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
