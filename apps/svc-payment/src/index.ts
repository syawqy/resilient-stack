import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PORTS } from '@resilient/shared';
import { simulatePayment } from './simulator';
import { NetworkChaos, CascadingTimeout } from '@resilient/chaos';

const app = new Hono();
app.use('*', cors());

// Shared config
let failRate = 0.1;
let latencyMs = 100;

// Chaos instances
const networkChaos = new NetworkChaos();
const cascadingTimeout = new CascadingTimeout();

// Endpoint to update config
app.post('/config', async (c) => {
  const body = await c.req.json<{
    failRate?: number;
    latencyMs?: number;
    chaos?: {
      network?: Partial<{ dropRate: number; baseLatencyMs: number; jitterMs: number; corruptRate: number; timeoutRate: number; timeoutMs: number }>;
      cascading?: Partial<{ downstreamDelayMs: number; upstreamTimeoutMs: number; enabled: boolean }>;
    };
  }>();
  if (body.failRate !== undefined) failRate = body.failRate;
  if (body.latencyMs !== undefined) latencyMs = body.latencyMs;
  if (body.chaos?.network) networkChaos.updateConfig(body.chaos.network);
  if (body.chaos?.cascading) cascadingTimeout.updateConfig(body.chaos.cascading);
  return c.json({ success: true, failRate, latencyMs });
});

// Chaos stats endpoint
app.get('/chaos/stats', (c) => {
  return c.json({
    network: networkChaos.getStats(),
    cascading: cascadingTimeout.getStats(),
    networkConfig: networkChaos.getConfig(),
    cascadingConfig: cascadingTimeout.getConfig(),
  });
});

// Process payment (with chaos)
app.post('/payments/process', async (c) => {
  const body = await c.req.json<{ orderId: string; amount: number }>();

  console.log(`[PaymentService] Processing payment for order ${body.orderId}, amount: ${body.amount}`);

  // Apply network chaos (may throw ConnectionError, TimeoutError)
  await networkChaos.beforeSend();

  // Apply cascading timeout (may throw CascadingTimeoutError)
  const result = await cascadingTimeout.callDownstream(() =>
    simulatePayment(failRate, latencyMs)
  );

  let response = c.json({
    id: crypto.randomUUID(),
    orderId: body.orderId,
    amount: body.amount,
    status: result.success ? 'success' : 'failed',
    createdAt: new Date().toISOString(),
  });

  // Apply response corruption
  response = networkChaos.afterReceive(response) as any;

  return response;
});

// Health
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'payment', timestamp: new Date().toISOString() });
});

const PORT = PORTS.payment;
console.log(`[PaymentService] Starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
