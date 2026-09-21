import { useState, useEffect, useRef } from 'react';
import { createSSE } from '../lib/api';

interface LogEntry {
  timestamp: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export function useEventLog(maxEntries: number = 100): LogEntry[] {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const entriesRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    const es = createSSE('/api/metrics', (data) => {
      const snapshot = data as {
        requests: Array<{
          timestamp: string;
          method: string;
          path: string;
          statusCode: number;
          responseTime: number;
          service: string;
          success: boolean;
        }>;
        services: Array<{ name: string; status: string }>;
        circuitBreakers: Array<{ service: string; state: string }>;
      };

      // Create log entries from recent requests
      const recentReqs = snapshot.requests.slice(-3);
      for (const req of recentReqs) {
        const severity: LogEntry['severity'] =
          req.statusCode >= 500 ? 'error' :
          req.statusCode >= 400 ? 'warning' :
          req.success ? 'success' : 'info';

        const entry: LogEntry = {
          timestamp: req.timestamp,
          type: 'request',
          message: `${req.method} ${req.path} [${req.statusCode}] ${req.responseTime}ms - ${req.service}`,
          severity,
        };

        entriesRef.current = [entry, ...entriesRef.current].slice(0, maxEntries);
      }

      // Add circuit breaker state changes
      for (const cb of snapshot.circuitBreakers) {
        if (cb.state === 'open') {
          const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            type: 'circuit-breaker',
            message: `Circuit breaker OPEN: ${cb.service}`,
            severity: 'error',
          };
          entriesRef.current = [entry, ...entriesRef.current].slice(0, maxEntries);
        }
      }

      setEntries([...entriesRef.current]);
    });

    return () => es.close();
  }, [maxEntries]);

  return entries;
}
