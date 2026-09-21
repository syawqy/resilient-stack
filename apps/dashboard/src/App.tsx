import { useState } from 'react';
import { Layout } from './components/Layout';
import { StatusGrid } from './components/StatusGrid';
import { MetricsCharts } from './components/MetricsCharts';
import { CircuitBreakerPanel } from './components/CircuitBreakerPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { LoadTestPanel } from './components/LoadTestPanel';
import { EventLog } from './components/EventLog';
import { ScenarioPresets } from './components/ScenarioPresets';
import { useMetrics, useMetricsHistory } from './hooks/useMetrics';

export function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const snapshot = useMetrics();
  const history = useMetricsHistory();

  return (
    <Layout activeView={activeView} onNavigate={setActiveView}>
      {activeView === 'dashboard' && (
        <div className="dashboard-view">
          <div className="dashboard-top">
            <StatusGrid services={snapshot.services} />
          </div>
          <div className="dashboard-mid">
            <MetricsCharts
              requestsPerSecond={history.requestsPerSecond}
              avgResponseTime={history.avgResponseTime}
              errorRate={history.errorRate}
              cacheHitRatio={history.cacheHitRatio}
            />
            <CircuitBreakerPanel circuitBreakers={snapshot.circuitBreakers} />
          </div>
          <div className="dashboard-bottom">
            <EventLog />
          </div>
        </div>
      )}

      {activeView === 'config' && (
        <div className="config-view">
          <ConfigPanel />
        </div>
      )}

      {activeView === 'load-test' && (
        <div className="loadtest-view">
          <LoadTestPanel />
        </div>
      )}

      {activeView === 'scenarios' && (
        <div className="scenarios-view">
          <ScenarioPresets />
        </div>
      )}
    </Layout>
  );
}
