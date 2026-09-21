/**
 * Load Patterns — realistic traffic generators
 *
 * Production traffic is NOT uniform random. It follows patterns:
 * - Burst: sudden spike (flash sale, viral post)
 * - Ramp-up: gradual increase (morning traffic)
 * - Diurnal: daily cycle (peak at noon, low at night)
 */

export interface LoadPatternResult {
  /** Total requests sent */
  totalRequests: number;
  /** Successful requests */
  successes: number;
  /** Failed requests */
  failures: number;
  /** Duration in ms */
  durationMs: number;
  /** Requests per second achieved */
  actualRps: number;
}

type RequestFn = () => Promise<{ ok: boolean }>;

/**
 * Burst: send `count` requests as fast as possible
 * Simulates flash sale / viral traffic spike
 */
export async function burstPattern(
  fn: RequestFn,
  count: number,
  concurrency: number = 10
): Promise<LoadPatternResult> {
  const start = Date.now();
  let successes = 0;
  let failures = 0;

  // Process in batches
  for (let i = 0; i < count; i += concurrency) {
    const batchSize = Math.min(concurrency, count - i);
    const results = await Promise.allSettled(
      Array.from({ length: batchSize }, () => fn())
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.ok) successes++;
      else failures++;
    }
  }

  const durationMs = Date.now() - start;
  return {
    totalRequests: count,
    successes,
    failures,
    durationMs,
    actualRps: durationMs > 0 ? (count / (durationMs / 1000)) : 0,
  };
}

/**
 * Ramp-up: start at `startRate` req/s, increase to `endRate` over `durationMs`
 * Simulates morning traffic increase
 */
export async function rampUpPattern(
  fn: RequestFn,
  totalRequests: number,
  startRate: number,
  endRate: number,
  durationMs: number
): Promise<LoadPatternResult> {
  const startTime = Date.now();
  let successes = 0;
  let failures = 0;
  let sent = 0;

  while (sent < totalRequests) {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const currentRate = startRate + (endRate - startRate) * progress;
    const intervalMs = 1000 / Math.max(currentRate, 0.1);

    try {
      const result = await fn();
      sent++;
      if (result.ok) successes++;
      else failures++;
    } catch {
      sent++;
      failures++;
    }

    // Wait for the appropriate interval
    const nextSendTime = startTime + sent * (1000 / ((startRate + endRate) / 2));
    const waitMs = nextSendTime - Date.now();
    if (waitMs > 0) await sleep(waitMs);
  }

  const duration = Date.now() - startTime;
  return {
    totalRequests: sent,
    successes,
    failures,
    durationMs: duration,
    actualRps: duration > 0 ? (sent / (duration / 1000)) : 0,
  };
}

/**
 * Diurnal: simulate a daily traffic cycle
 * Multiple peaks and valleys over time (compressed into seconds)
 */
export async function diurnalPattern(
  fn: RequestFn,
  cycles: number = 2,
  baseRate: number = 1,
  peakRate: number = 10,
  cycleDurationMs: number = 10000
): Promise<LoadPatternResult> {
  const start = Date.now();
  let successes = 0;
  let failures = 0;
  let sent = 0;
  const totalDuration = cycles * cycleDurationMs;

  while (Date.now() - start < totalDuration) {
    const elapsed = Date.now() - start;
    const cycleProgress = (elapsed % cycleDurationMs) / cycleDurationMs;

    // Sinusoidal pattern: peak at 0.25 (noon), valley at 0.75 (midnight)
    const sinValue = Math.sin(cycleProgress * Math.PI * 2 - Math.PI / 2);
    const normalized = (sinValue + 1) / 2; // 0 to 1
    const currentRate = baseRate + (peakRate - baseRate) * normalized;
    const intervalMs = 1000 / Math.max(currentRate, 0.1);

    try {
      const result = await fn();
      sent++;
      if (result.ok) successes++;
      else failures++;
    } catch {
      sent++;
      failures++;
    }

    await sleep(intervalMs);
  }

  const duration = Date.now() - start;
  return {
    totalRequests: sent,
    successes,
    failures,
    durationMs: duration,
    actualRps: duration > 0 ? (sent / (duration / 1000)) : 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
