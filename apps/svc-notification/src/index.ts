import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PORTS } from '@resilient/shared';
import type { Notification } from '@resilient/shared';
import { notificationQueue } from './queue';

const app = new Hono();
app.use('*', cors());

// Shared config
let failRate = 0.15;
let latencyMs = 50;

// Endpoint to update config
app.post('/config', async (c) => {
  const body = await c.req.json<{ failRate?: number; latencyMs?: number }>();
  if (body.failRate !== undefined) failRate = body.failRate;
  if (body.latencyMs !== undefined) latencyMs = body.latencyMs;
  return c.json({ success: true, failRate, latencyMs });
});

// Send notification
app.post('/notifications/send', async (c) => {
  const body = await c.req.json<{ type: string; message: string }>();

  console.log(`[NotificationService] Sending notification: ${body.message}`);

  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  const notification: Notification = {
    id: crypto.randomUUID(),
    type: body.type as Notification['type'],
    message: body.message,
    status: Math.random() > failRate ? 'sent' : 'failed',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  notificationQueue.add(notification);

  return c.json(notification, notification.status === 'failed' ? 500 : 200);
});

// List all notifications
app.get('/notifications', (c) => {
  return c.json(notificationQueue.getAll());
});

// Dead letter queue
app.get('/notifications/queue', (c) => {
  return c.json(notificationQueue.getDeadLetter());
});

// Health
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'notification', timestamp: new Date().toISOString() });
});

const PORT = PORTS.notification;
console.log(`[NotificationService] Starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
