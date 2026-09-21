interface CircuitBreakerPanelProps {
  circuitBreakers: Array<{
    service: string;
    target: string;
    state: string;
    failures: number;
    successes: number;
    lastFailureTime: string | null;
  }>;
}

function getStateStyle(state: string): { bg: string; text: string } {
  switch (state) {
    case 'closed': return { bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--green)' };
    case 'open': return { bg: 'rgba(248, 113, 113, 0.15)', text: 'var(--red)' };
    case 'half-open': return { bg: 'rgba(251, 191, 36, 0.15)', text: 'var(--yellow)' };
    default: return { bg: 'var(--surface)', text: 'var(--text-muted)' };
  }
}

function getStateLabel(state: string): string {
  switch (state) {
    case 'closed': return 'Tertutup';
    case 'open': return 'Terbuka';
    case 'half-open': return 'Setengah Terbuka';
    default: return state;
  }
}

export function CircuitBreakerPanel({ circuitBreakers }: CircuitBreakerPanelProps) {
  return (
    <div className="panel">
      <h2 className="panel-title">Pemutus Sirkuit</h2>
      {circuitBreakers.length === 0 ? (
        <p className="empty-message">Belum ada data pemutus sirkuit</p>
      ) : (
        <div className="cb-grid">
          {circuitBreakers.map((cb) => {
            const style = getStateStyle(cb.state);
            return (
              <div key={`${cb.service}-${cb.target}`} className="cb-card" style={{ backgroundColor: style.bg }}>
                <div className="cb-header">
                  <span className="cb-pair">{cb.service} → {cb.target}</span>
                  <span className="cb-state" style={{ color: style.text }}>
                    {getStateLabel(cb.state)}
                  </span>
                </div>
                <div className="cb-body">
                  <div className="cb-stat">
                    <span className="cb-stat-label">Gagal</span>
                    <span className="cb-stat-value">{cb.failures}</span>
                  </div>
                  <div className="cb-stat">
                    <span className="cb-stat-label">Berhasil</span>
                    <span className="cb-stat-value">{cb.successes}</span>
                  </div>
                  {cb.lastFailureTime && (
                    <div className="cb-stat">
                      <span className="cb-stat-label">Terakhir Gagal</span>
                      <span className="cb-stat-value cb-stat-small">
                        {new Date(cb.lastFailureTime).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
