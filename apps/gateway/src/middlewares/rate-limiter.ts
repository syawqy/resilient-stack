import type { Context, Next } from 'hono';
import type { RateLimiter } from '@resilient/resilience';
import type { GatewayConfig } from '@resilient/shared';

export function createRateLimiterMiddleware(rateLimiter: RateLimiter, config: GatewayConfig) {
  return async (c: Context, next: Next) => {
    // Skip rate limiting for health and SSE endpoints
    if (c.req.path === '/api/health' || c.req.path === '/api/metrics') {
      return next();
    }

    if (!config.rateLimiter.enabled) {
      return next();
    }

    const key = c.req.header('x-forwarded-for') || 'default';

    if (!rateLimiter.tryConsume(key)) {
      console.log(`[RateLimiter] Request rejected for key: ${key}`);
      return c.json({ error: 'Rate limit exceeded', retryAfter: 1 }, 429);
    }

    return next();
  };
}
