import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Order } from '@resilient/shared';
import { PORTS } from '@resilient/shared';
import { orderStore } from './store';
import { orderCache } from './cache';
import { ConnectionPool, CascadingTimeout } from '@resilient/chaos';

const app = new Hono();
app.use('*', cors());

// Connection pool — limits concurrent downstream calls
const paymentPool = new ConnectionPool({ maxConcurrent: 5, maxQueueSize: 20, queueTimeoutMs: 8000 });
const notifPool = new ConnectionPool({ maxConcurrent: 3, maxQueueSize: 10, queueTimeoutMs: 5000 });

// Cascading timeout for payment calls
const paymentTimeout = new CascadingTimeout({ enabled: false, downstreamDelayMs: 0, upstreamTimeoutMs: 5000 });

// Chaos config endpoint
app.post('/chaos/config', async (c) => {
  const body = await c.req.json<{
    paymentPool?: { maxConcurrent?: number; maxQueueSize?: number; queueTimeoutMs?: number };
    notifPool?: { maxConcurrent?: number; maxQueueSize?: number; queueTimeoutMs?: number };
    paymentTimeout?: { enabled?: boolean; downstreamDelayMs?: number; upstreamTimeoutMs?: number };
  }>();
  if (body.paymentPool) paymentPool.updateConfig(body.paymentPool);
  if (body.notifPool) notifPool.updateConfig(body.notifPool);
  if (body.paymentTimeout) paymentTimeout.updateConfig(body.paymentTimeout);
  return c.json({
    paymentPool: paymentPool.getStats(),
    notifPool: notifPool.getStats(),
    paymentTimeout: paymentTimeout.getStats(),
  });
});

// Chaos stats
app.get('/chaos/stats', (c) => {
  return c.json({
    paymentPool: paymentPool.getStats(),
    notifPool: notifPool.getStats(),
    paymentTimeout: paymentTimeout.getStats(),
    paymentPoolConfig: paymentPool.getConfig(),
    notifPoolConfig: notifPool.getConfig(),
  });
});

// Get all orders (with cache)
app.get('/orders', async (c) => {
  const cacheKey = 'orders:all';
  const cached = orderCache.get<Order[]>(cacheKey);
  if (cached) {
    console.log('[OrderService] Cache hit for GET /orders');
    return c.json(cached);
  }

  const orders = orderStore.getAll();
  orderCache.set(cacheKey, orders, 3000);
  console.log('[OrderService] Cache miss for GET /orders, cached for 3s');
  return c.json(orders);
});

// Create order (with connection pool + cascading timeout)
app.post('/orders', async (c) => {
  const body = await c.req.json<{ productId: string; quantity: number; total: number }>();
  const order = orderStore.create({
    productId: body.productId,
    quantity: body.quantity,
    total: body.total,
  });

  // Invalidate cache
  orderCache.delete('orders:all');

  // Call payment service (with connection pool)
  try {
    const release = await paymentPool.acquire();
    try {
      const paymentRes = await paymentTimeout.callDownstream(() =>
        fetch(`http://localhost:${PORTS.payment}/payments/process`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, amount: order.total }),
          signal: AbortSignal.timeout(10000),
        })
      );
      const paymentData = await paymentRes.json<{ status: string }>();

      if (paymentData.status === 'success') {
        orderStore.updateStatus(order.id, 'paid');
      } else {
        orderStore.updateStatus(order.id, 'failed');
      }
    } finally {
      release();
    }
  } catch (error) {
    console.error('[OrderService] Payment service error:', error);
    orderStore.updateStatus(order.id, 'failed');
  }

  // Notify (with connection pool)
  try {
    const release = await notifPool.acquire();
    try {
      await fetch(`http://localhost:${PORTS.notification}/notifications/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'order-created',
          message: `Order ${order.id} created for product ${order.productId}`,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } finally {
      release();
    }
  } catch (error) {
    console.error('[OrderService] Notification service error:', error);
  }

  return c.json(order, 201);
});

// Get order by ID
app.get('/orders/:id', (c) => {
  const id = c.req.param('id');
  const order = orderStore.getById(id);
  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }
  return c.json(order);
});

// Health
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'order', timestamp: new Date().toISOString() });
});

const PORT = PORTS.order;
console.log(`[OrderService] Starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
