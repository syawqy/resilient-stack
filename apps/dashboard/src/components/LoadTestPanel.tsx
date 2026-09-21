import { useState } from 'react';
import { apiPost } from '../lib/api';

export function LoadTestPanel() {
  const [requestCount, setRequestCount] = useState(10);
  const [rate, setRate] = useState(5);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const startLoadTest = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await apiPost<{ started: boolean; total: number; rate: number }>(
        '/api/load-test',
        { requests: requestCount, rate }
      );
      setLastResult(`Dimulai: ${res.total} request, ${res.rate}/detik`);
    } catch (err) {
      setLastResult(`Gagal: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
    setTimeout(() => setRunning(false), 2000);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Uji Beban</h2>

      <div className="load-test-form">
        <div className="slider-row">
          <label className="slider-label">
            Jumlah Request: {requestCount}
          </label>
          <input
            type="range"
            min={1}
            max={200}
            value={requestCount}
            onChange={(e) => setRequestCount(Number(e.target.value))}
            className="slider-input"
          />
        </div>

        <div className="slider-row">
          <label className="slider-label">
            Laju: {rate} request/detik
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="slider-input"
          />
        </div>

        <button
          className="btn btn-danger"
          onClick={startLoadTest}
          disabled={running}
        >
          {running ? 'Memproses...' : 'Jalankan Uji Beban'}
        </button>

        {lastResult && (
          <div className="load-test-result">{lastResult}</div>
        )}
      </div>
    </div>
  );
}
