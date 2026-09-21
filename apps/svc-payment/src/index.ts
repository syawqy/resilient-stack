import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PORTS } from '@resilient/shared';
import { simulatePayment, setForceFailMode } from './simulator';

const app = new Hono();
app.use('*', cors());

// Shared config
let failRate = 0.1;
let latencyMs = 100;

// Endpoint to update config
app.post('/config', async (c) => {
  const body = await c.req.json<{ failRate?: number; latencyMs?: number; forceFail?: boolean }>();
  if (body.failRate !== undefined) failRate = body.failRate;
  if (body.latencyMs !== undefined) latencyMs = body.latencyMs;
  if (body.forceFail !== undefined) setForceFailMode(body.forceFail);
  return c.json({ success: true, failRate, latencyMs });
});

// Process payment
app.post('/payments/process', async (c) => {
  const body = await c.req.json<{ orderId: string; amount: number }>();

  console.log(`[PaymentService] Processing payment for order ${body.orderId}, amount: ${body.amount}`);

  const result = await simulatePayment(failRate, latencyMs);

  return c.json({
    id: crypto.randomUUID(),
    orderId: body.orderId,
    amount: body.amount,
    status: result.success ? 'success' : 'failed',
    createdAt: new Date().toISOString(),
  });
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
