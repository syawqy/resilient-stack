import { useState } from 'react';
import { apiPost } from '../lib/api';

interface Scenario {
  name: string;
  description: string;
}

const PRESETS: Scenario[] = [
  { name: 'healthy', description: 'Semua layanan berjalan normal' },
  { name: 'payment-failure', description: 'Layanan pembayaran mengalami gangguan' },
  { name: 'high-latency', description: 'Semua layanan lambat' },
  { name: 'cascading-failure', description: 'Kegagalan berantai' },
  { name: 'notification-down', description: 'Layanan notifikasi mati' },
  { name: 'normal', description: 'Konfigurasi default' },
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
      <h2 className="panel-title">Skenario Preset</h2>
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
