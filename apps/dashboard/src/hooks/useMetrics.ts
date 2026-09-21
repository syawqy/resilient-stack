import { useState, useEffect, useRef } from 'react';
import { createSSE } from '../lib/api';

interface MetricsSnapshot {
  requests: Array<{
    id: string;
    timestamp: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    service: string;
    success: boolean;
  }>;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastChecked: string;
  }>;
  circuitBreakers: Array<{
    service: string;
    target: string;
    state: string;
    failures: number;
    successes: number;
    lastFailureTime: string | null;
  }>;
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
  };
  rateLimit: {
    allowed: number;
    rejected: number;
    activeKeys: number;
  };
  requestsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
}

const DEFAULT_SNAPSHOT: MetricsSnapshot = {
  requests: [],
  services: [],
  circuitBreakers: [],
  cache: { hits: 0, misses: 0, hitRatio: 0, size: 0 },
  rateLimit: { allowed: 0, rejected: 0, activeKeys: 0 },
  requestsPerSecond: 0,
  avgResponseTime: 0,
  errorRate: 0,
};

export function useMetrics(): MetricsSnapshot {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot>(DEFAULT_SNAPSHOT);
  const historyRef = useRef<{ requestsPerSecond: number[]; avgResponseTime: number[]; errorRate: number[]; cacheHitRatio: number[] }>({
    requestsPerSecond: [],
    avgResponseTime: [],
    errorRate: [],
    cacheHitRatio: [],
  });

  useEffect(() => {
    const es = createSSE('/api/metrics', (data) => {
      const newSnapshot = data as MetricsSnapshot;

      // Keep history for charts (last 30 data points)
      const h = historyRef.current;
      h.requestsPerSecond.push(newSnapshot.requestsPerSecond);
      h.avgResponseTime.push(newSnapshot.avgResponseTime);
      h.errorRate.push(newSnapshot.errorRate);
      h.cacheHitRatio.push(newSnapshot.cache.hitRatio);

      if (h.requestsPerSecond.length > 30) h.requestsPerSecond.shift();
      if (h.avgResponseTime.length > 30) h.avgResponseTime.shift();
      if (h.errorRate.length > 30) h.errorRate.shift();
      if (h.cacheHitRatio.length > 30) h.cacheHitRatio.shift();

      setSnapshot({
        ...newSnapshot,
        _history: historyRef.current,
      } as MetricsSnapshot & { _history: typeof historyRef.current });
    });

    return () => es.close();
  }, []);

  return snapshot;
}

export function useMetricsHistory() {
  const historyRef = useRef<{ requestsPerSecond: number[]; avgResponseTime: number[]; errorRate: number[]; cacheHitRatio: number[] }>({
    requestsPerSecond: [],
    avgResponseTime: [],
    errorRate: [],
    cacheHitRatio: [],
  });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const es = createSSE('/api/metrics', (data) => {
      const snapshot = data as MetricsSnapshot;
      const h = historyRef.current;
      h.requestsPerSecond.push(snapshot.requestsPerSecond);
      h.avgResponseTime.push(snapshot.avgResponseTime);
      h.errorRate.push(snapshot.errorRate);
      h.cacheHitRatio.push(snapshot.cache.hitRatio);

      if (h.requestsPerSecond.length > 30) h.requestsPerSecond.shift();
      if (h.avgResponseTime.length > 30) h.avgResponseTime.shift();
      if (h.errorRate.length > 30) h.errorRate.shift();
      if (h.cacheHitRatio.length > 30) h.cacheHitRatio.shift();

      forceUpdate((n) => n + 1);
    });

    return () => es.close();
  }, []);

  return historyRef.current;
}

export type { MetricsSnapshot };
