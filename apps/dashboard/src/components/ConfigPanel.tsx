import { useState } from 'react';
import { apiPost } from '../lib/api';

interface ConfigPanelProps {
  onConfigChange?: () => void;
}

export function ConfigPanel({ onConfigChange }: ConfigPanelProps) {
  const [rateLimiterEnabled, setRateLimiterEnabled] = useState(true);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(true);
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [paymentFailRate, setPaymentFailRate] = useState(10);
  const [paymentLatency, setPaymentLatency] = useState(100);
  const [notifFailRate, setNotifFailRate] = useState(15);
  const [notifLatency, setNotifLatency] = useState(50);
  const [saving, setSaving] = useState(false);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await apiPost('/api/config', {
        rateLimiter: { enabled: rateLimiterEnabled },
        cache: { enabled: cacheEnabled },
        circuitBreaker: { enabled: circuitBreakerEnabled },
        retry: { enabled: retryEnabled },
        services: {
          payment: { failRate: paymentFailRate / 100, latencyMs: paymentLatency },
          notification: { failRate: notifFailRate / 100, latencyMs: notifLatency },
        },
      });
      onConfigChange?.();
    } catch (err) {
      console.error('Failed to save config:', err);
    }
    setSaving(false);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Live Configuration</h2>

      <div className="config-toggles">
        <label className="toggle-row">
          <span className="toggle-label">Rate Limiter</span>
          <input
            type="checkbox"
            checked={rateLimiterEnabled}
            onChange={(e) => setRateLimiterEnabled(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch" />
        </label>

        <label className="toggle-row">
          <span className="toggle-label">Cache</span>
          <input
            type="checkbox"
            checked={cacheEnabled}
            onChange={(e) => setCacheEnabled(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch" />
        </label>

        <label className="toggle-row">
          <span className="toggle-label">Circuit Breaker</span>
          <input
            type="checkbox"
            checked={circuitBreakerEnabled}
            onChange={(e) => setCircuitBreakerEnabled(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch" />
        </label>

        <label className="toggle-row">
          <span className="toggle-label">Retry</span>
          <input
            type="checkbox"
            checked={retryEnabled}
            onChange={(e) => setRetryEnabled(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch" />
        </label>
      </div>

      <h3 className="config-section-title">Payment Service</h3>
      <div className="config-sliders">
        <div className="slider-row">
          <label className="slider-label">
            Fail Rate: {paymentFailRate}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={paymentFailRate}
            onChange={(e) => setPaymentFailRate(Number(e.target.value))}
            className="slider-input"
          />
        </div>
        <div className="slider-row">
          <label className="slider-label">
            Latency: {paymentLatency}ms
          </label>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={paymentLatency}
            onChange={(e) => setPaymentLatency(Number(e.target.value))}
            className="slider-input"
          />
        </div>
      </div>

      <h3 className="config-section-title">Notification Service</h3>
      <div className="config-sliders">
        <div className="slider-row">
          <label className="slider-label">
            Fail Rate: {notifFailRate}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={notifFailRate}
            onChange={(e) => setNotifFailRate(Number(e.target.value))}
            className="slider-input"
          />
        </div>
        <div className="slider-row">
          <label className="slider-label">
            Latency: {notifLatency}ms
          </label>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={notifLatency}
            onChange={(e) => setNotifLatency(Number(e.target.value))}
            className="slider-input"
          />
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={saveConfig}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}
