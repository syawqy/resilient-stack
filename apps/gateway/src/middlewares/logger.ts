import type { Context, Next } from 'hono';
import type { MetricsCollector } from '@resilient/metrics';

export function logger(collector: MetricsCollector) {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const responseTime = Date.now() - start;
    const statusCode = c.res.status;
    const success = statusCode < 400;

    collector.recordRequest({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method,
      path,
      statusCode,
      responseTime,
      service: 'gateway',
      success,
    });

    console.log(`[Logger] ${method} ${path} ${statusCode} ${responseTime}ms`);
  };
}
