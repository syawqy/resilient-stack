import { ReactNode } from 'react';

interface StatusGridProps {
  services: Array<{
    name: string;
    status: string;
    responseTime: number;
    requestCount: number;
    errorCount: number;
    uptime: number;
  }>;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'var(--green)';
    case 'degraded': return 'var(--yellow)';
    case 'down': return 'var(--red)';
    default: return 'var(--text-muted)';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'healthy': return 'Sehat';
    case 'degraded': return 'Terkurangi';
    case 'down': return 'Mati';
    default: return 'Tidak Diketahui';
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}j ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function StatusGrid({ services }: StatusGridProps) {
  return (
    <div className="status-grid">
      {services.map((svc) => (
        <div key={svc.name} className="status-card">
          <div className="status-card-header">
            <span
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(svc.status) }}
            />
            <h3 className="status-card-title">{svc.name}</h3>
          </div>
          <div className="status-card-body">
            <div className="status-detail">
              <span className="status-label">Status</span>
              <span className="status-value" style={{ color: getStatusColor(svc.status) }}>
                {getStatusLabel(svc.status)}
              </span>
            </div>
            <div className="status-detail">
              <span className="status-label">Waktu Respon</span>
              <span className="status-value">{svc.responseTime.toFixed(0)}ms</span>
            </div>
            <div className="status-detail">
              <span className="status-label">Total Request</span>
              <span className="status-value">{svc.requestCount}</span>
            </div>
            <div className="status-detail">
              <span className="status-label">Error</span>
              <span className="status-value" style={{ color: svc.errorCount > 0 ? 'var(--red)' : 'var(--green)' }}>
                {svc.errorCount}
              </span>
            </div>
            <div className="status-detail">
              <span className="status-label">Uptime</span>
              <span className="status-value">{formatUptime(svc.uptime)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
