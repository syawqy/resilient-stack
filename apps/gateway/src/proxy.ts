import type { Context } from 'hono';
import type { CircuitBreaker, CircuitBreakerOpenError } from '@resilient/resilience';
import type { LoadBalancer } from '@resilient/resilience';
import type { MetricsCollector } from '@resilient/metrics';
import type { GatewayConfig } from '@resilient/shared';
import { PORTS } from '@resilient/shared';
import { withRetry } from '@resilient/resilience';

const SERVICE_PORTS: Record<string, number> = {
  order: PORTS.order,
  payment: PORTS.payment,
  notification: PORTS.notification,
};

export function createProxyHandler(
  config: GatewayConfig,
  circuitBreakers: Map<string, CircuitBreaker>,
  loadBalancers: Map<string, LoadBalancer>,
  collector: MetricsCollector
) {
  return (serviceName: string) => {
    return async (c: Context) => {
      const start = Date.now();
      const path = c.req.path;
      const method = c.req.method;

      // Build the downstream URL
      const targetPath = path.replace(/^\/api\//, '/');
      const port = SERVICE_PORTS[serviceName];
      const url = `http://localhost:${port}${targetPath}`;

      try {
        const cbKey = `gateway->${serviceName}`;
        const cb = circuitBreakers.get(cbKey);
        const lb = loadBalancers.get(serviceName);

        let response: Response;

        const doFetch = async (): Promise<Response> => {
          const headers: Record<string, string> = {};
          const contentType = c.req.header('content-type');
          if (contentType) headers['content-type'] = contentType;

          return fetch(url, {
            method,
            headers,
            body: method !== 'GET' && method !== 'HEAD' ? await c.req.raw.text() : undefined,
          });
        };

        if (config.circuitBreaker.enabled && cb) {
          try {
            response = await cb.execute(doFetch);
          } catch (err) {
            if (err instanceof Error && err.name === 'CircuitBreakerOpenError') {
              console.log(`[Proxy] Circuit breaker OPEN for ${serviceName}`);
              collector.recordRequest({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                method,
                path,
                statusCode: 503,
                responseTime: Date.now() - start,
                service: serviceName,
                success: false,
              });
              return c.json({ error: `Service ${serviceName} unavailable (circuit breaker open)` }, 503);
            }
            throw err;
          }
        } else if (config.retry.enabled) {
          response = await withRetry(doFetch, {
            maxRetries: config.retry.maxRetries,
            baseDelay: config.retry.baseDelayMs,
            maxDelay: 5000,
          });
        } else {
          response = await doFetch();
        }

        // Record metrics
        collector.recordRequest({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          method,
          path,
          statusCode: response.status,
          responseTime: Date.now() - start,
          service: serviceName,
          success: response.ok,
        });

        // Forward the response
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            'content-type': response.headers.get('content-type') || 'application/json',
          },
        });
      } catch (error) {
        const responseTime = Date.now() - start;
        console.error(`[Proxy] Error proxying to ${serviceName}:`, error);

        collector.recordRequest({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          method,
          path,
          statusCode: 502,
          responseTime,
          service: serviceName,
          success: false,
        });

        return c.json(
          { error: `Failed to proxy to ${serviceName}: ${error instanceof Error ? error.message : 'unknown error'}` },
          502
        );
      }
    };
  };
}
