import { useState } from 'react';
import { apiPost, apiGet } from '../lib/api';

interface ChaosStats {
  payment?: {
    network: { totalRequests: number; dropped: number; corrupted: number; timedOut: number; dropRate: number };
    cascading: { totalRequests: number; timedOut: number; timeoutRate: number };
    networkConfig: { dropRate: number; baseLatencyMs: number; jitterMs: number; corruptRate: number; timeoutRate: number; timeoutMs: number };
    cascadingConfig: { downstreamDelayMs: number; upstreamTimeoutMs: number; enabled: boolean };
  };
  order?: {
    paymentPool: { active: number; queued: number; totalRequests: number; rejected: number; timedOut: number; utilization: number };
    notifPool: { active: number; queued: number; totalRequests: number; rejected: number; timedOut: number; utilization: number };
  };
}

export function ChaosPanel() {
  const [stats, setStats] = useState<ChaosStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Network chaos controls
  const [dropRate, setDropRate] = useState(0);
  const [baseLatency, setBaseLatency] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [timeoutRate, setTimeoutRate] = useState(0);
  const [cascadingDelay, setCascadingDelay] = useState(0);
  const [cascadingEnabled, setCascadingEnabled] = useState(false);

  // Connection pool controls
  const [poolMax, setPoolMax] = useState(5);
  const [poolQueue, setPoolQueue] = useState(20);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiGet<ChaosStats>('/api/chaos/stats');
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch chaos stats:', e);
    }
    setLoading(false);
  };

  const applyChaos = async () => {
    try {
      await apiPost('/api/chaos/config', {
        payment: {
          network: { dropRate: dropRate / 100, baseLatencyMs: baseLatency, jitterMs: jitter, timeoutRate: timeoutRate / 100 },
          cascading: { enabled: cascadingEnabled, downstreamDelayMs: cascadingDelay, upstreamTimeoutMs: 5000 },
        },
        order: {
          paymentPool: { maxConcurrent: poolMax, maxQueueSize: poolQueue },
          paymentTimeout: { enabled: cascadingEnabled, downstreamDelayMs: cascadingDelay },
        },
      });
      await fetchStats();
    } catch (e) {
      console.error('Failed to apply chaos:', e);
    }
  };

  const resetChaos = async () => {
    setDropRate(0);
    setBaseLatency(0);
    setJitter(0);
    setTimeoutRate(0);
    setCascadingDelay(0);
    setCascadingEnabled(false);
    setPoolMax(5);
    setPoolQueue(20);
    await apiPost('/api/chaos/config', {
      payment: {
        network: { dropRate: 0, baseLatencyMs: 0, jitterMs: 0, timeoutRate: 0 },
        cascading: { enabled: false, downstreamDelayMs: 0 },
      },
      order: {
        paymentPool: { maxConcurrent: 5, maxQueueSize: 20 },
        paymentTimeout: { enabled: false, downstreamDelayMs: 0 },
      },
    });
    await fetchStats();
  };

  const runChaosLoad = async (pattern: string) => {
    try {
      await apiPost('/api/chaos/load-test', {
        pattern,
        totalRequests: 30,
        rate: 10,
      });
      setTimeout(fetchStats, 3000);
    } catch (e) {
      console.error('Failed to run chaos load:', e);
    }
  };

  return (
    <div className="panel chaos-panel">
      <h2 className="panel-title">Chaos Engineering</h2>

      {/* Network Chaos */}
      <div className="chaos-section">
        <h3 className="chaos-section-title">Network Chaos (Payment Service)</h3>
        <div className="chaos-controls">
          <div className="slider-row">
            <label className="slider-label">Connection Drop: {dropRate}%</label>
            <input type="range" min={0} max={100} value={dropRate}
              onChange={(e) => setDropRate(Number(e.target.value))} className="slider-input" />
          </div>
          <div className="slider-row">
            <label className="slider-label">Base Latency: {baseLatency}ms</label>
            <input type="range" min={0} max={3000} step={50} value={baseLatency}
              onChange={(e) => setBaseLatency(Number(e.target.value))} className="slider-input" />
          </div>
          <div className="slider-row">
            <label className="slider-label">Jitter: {jitter}ms</label>
            <input type="range" min={0} max={2000} step={50} value={jitter}
              onChange={(e) => setJitter(Number(e.target.value))} className="slider-input" />
          </div>
          <div className="slider-row">
            <label className="slider-label">Timeout: {timeoutRate}%</label>
            <input type="range" min={0} max={100} value={timeoutRate}
              onChange={(e) => setTimeoutRate(Number(e.target.value))} className="slider-input" />
          </div>
        </div>
      </div>

      {/* Cascading Timeout */}
      <div className="chaos-section">
        <h3 className="chaos-section-title">Cascading Timeout</h3>
        <label className="toggle-row">
          <span className="toggle-label">Enabled</span>
          <input type="checkbox" checked={cascadingEnabled}
            onChange={(e) => setCascadingEnabled(e.target.checked)} className="toggle-input" />
          <span className="toggle-switch" />
        </label>
        <div className="slider-row">
          <label className="slider-label">Downstream Delay: {cascadingDelay}ms</label>
          <input type="range" min={0} max={5000} step={100} value={cascadingDelay}
            onChange={(e) => setCascadingDelay(Number(e.target.value))} className="slider-input" />
        </div>
      </div>

      {/* Connection Pool */}
      <div className="chaos-section">
        <h3 className="chaos-section-title">Connection Pool (Order Service)</h3>
        <div className="slider-row">
          <label className="slider-label">Max Concurrent: {poolMax}</label>
          <input type="range" min={1} max={20} value={poolMax}
            onChange={(e) => setPoolMax(Number(e.target.value))} className="slider-input" />
        </div>
        <div className="slider-row">
          <label className="slider-label">Max Queue: {poolQueue}</label>
          <input type="range" min={0} max={50} value={poolQueue}
            onChange={(e) => setPoolQueue(Number(e.target.value))} className="slider-input" />
        </div>
      </div>

      {/* Actions */}
      <div className="chaos-actions">
        <button className="btn btn-primary" onClick={applyChaos}>Apply Chaos</button>
        <button className="btn btn-secondary" onClick={resetChaos}>Reset All</button>
        <button className="btn btn-secondary" onClick={fetchStats} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Stats'}
        </button>
      </div>

      {/* Load Patterns */}
      <div className="chaos-section">
        <h3 className="chaos-section-title">Load Patterns</h3>
        <div className="chaos-actions">
          <button className="btn btn-danger" onClick={() => runChaosLoad('burst')}>Burst (Flash Sale)</button>
          <button className="btn btn-danger" onClick={() => runChaosLoad('ramp')}>Ramp-Up (Morning)</button>
          <button className="btn btn-danger" onClick={() => runChaosLoad('diurnal')}>Diurnal (Daily Cycle)</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="chaos-stats">
          <h3 className="chaos-section-title">Live Chaos Stats</h3>
          {stats.payment && (
            <div className="chaos-stat-group">
              <span className="chaos-stat-title">Payment Service</span>
              <div className="chaos-stat-row">
                <span>Dropped:</span><span>{stats.payment.network.dropped}/{stats.payment.network.totalRequests}</span>
              </div>
              <div className="chaos-stat-row">
                <span>Timed Out:</span><span>{stats.payment.network.timedOut + stats.payment.cascading.timedOut}</span>
              </div>
              <div className="chaos-stat-row">
                <span>Corrupted:</span><span>{stats.payment.network.corrupted}</span>
              </div>
            </div>
          )}
          {stats.order && (
            <div className="chaos-stat-group">
              <span className="chaos-stat-title">Order Service (Connection Pool)</span>
              <div className="chaos-stat-row">
                <span>Payment Pool:</span>
                <span>{stats.order.paymentPool.active}/{poolMax} active, {stats.order.paymentPool.queued} queued</span>
              </div>
              <div className="chaos-stat-row">
                <span>Rejected:</span><span>{stats.order.paymentPool.rejected}</span>
              </div>
              <div className="chaos-stat-row">
                <span>Pool Timeout:</span><span>{stats.order.paymentPool.timedOut}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
