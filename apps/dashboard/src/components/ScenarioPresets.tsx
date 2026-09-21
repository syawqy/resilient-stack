import { useState } from 'react';
import { apiPost } from '../lib/api';

interface Scenario {
  name: string;
  description: string;
}

const PRESETS: Scenario[] = [
  { name: 'healthy', description: 'All services running normally' },
  { name: 'payment-failure', description: 'Payment service experiencing failures' },
  { name: 'high-latency', description: 'All services running slowly' },
  { name: 'cascading-failure', description: 'Cascading failure across services' },
  { name: 'notification-down', description: 'Notification service down' },
  { name: 'normal', description: 'Default configuration' },
];

export function ScenarioPresets() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activateScenario = async (name: string) => {
    setLoading(true);
    try {
      await apiPost(`/api/scenarios/${name}`);
      setActiveScenario(name);
    } catch (err) {
      console.error('Failed to activate scenario:', err);
    }
    setLoading(false);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Scenario Presets</h2>
      <div className="scenario-grid">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            className={`scenario-btn ${activeScenario === preset.name ? 'active' : ''}`}
            onClick={() => activateScenario(preset.name)}
            disabled={loading}
          >
            <span className="scenario-name">{preset.name}</span>
            <span className="scenario-desc">{preset.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
