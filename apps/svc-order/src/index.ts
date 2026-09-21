import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Order } from '@resilient/shared';
import { PORTS } from '@resilient/shared';
import { orderStore } from './store';
import { orderCache } from './cache';

const app = new Hono();
app.use('*', cors());

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

// Create order
app.post('/orders', async (c) => {
  const body = await c.req.json<{ productId: string; quantity: number; total: number }>();
  const order = orderStore.create({
    productId: body.productId,
    quantity: body.quantity,
    total: body.total,
  });

  // Invalidate cache
  orderCache.delete('orders:all');

  // Call payment service
  try {
    const paymentRes = await fetch(`http://localhost:${PORTS.payment}/payments/process`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, amount: order.total }),
    });
    const paymentData = await paymentRes.json<{ status: string }>();

    if (paymentData.status === 'success') {
      orderStore.updateStatus(order.id, 'paid');
    } else {
      orderStore.updateStatus(order.id, 'failed');
    }
  } catch (error) {
    console.error('[OrderService] Payment service error:', error);
    orderStore.updateStatus(order.id, 'failed');
  }

  // Notify
  try {
    await fetch(`http://localhost:${PORTS.notification}/notifications/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'order-created',
        message: `Order ${order.id} created for product ${order.productId}`,
      }),
    });
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
