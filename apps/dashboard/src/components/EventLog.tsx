import { useEventLog } from '../hooks/useEventLog';

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'error': return 'log-error';
    case 'warning': return 'log-warning';
    case 'success': return 'log-success';
    default: return 'log-info';
  }
}

export function EventLog() {
  const entries = useEventLog(50);

  return (
    <div className="panel event-log-panel">
      <h2 className="panel-title">Log Peristiwa</h2>
      <div className="event-log">
        {entries.length === 0 ? (
          <p className="empty-message">Menunggu peristiwa...</p>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={`log-entry ${getSeverityClass(entry.severity)}`}>
              <span className="log-timestamp">
                {new Date(entry.timestamp).toLocaleTimeString('id-ID')}
              </span>
              <span className="log-type">[{entry.type}]</span>
              <span className="log-message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
