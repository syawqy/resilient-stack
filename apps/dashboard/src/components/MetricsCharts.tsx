interface MetricsChartsProps {
  requestsPerSecond: number[];
  avgResponseTime: number[];
  errorRate: number[];
  cacheHitRatio: number[];
}

interface MiniChartProps {
  data: number[];
  label: string;
  unit: string;
  color: string;
  max?: number;
}

function MiniChart({ data, label, unit, color, max }: MiniChartProps) {
  const displayMax = max || Math.max(...data, 1);
  const width = 280;
  const height = 80;
  const padding = 4;

  const points = data.map((val, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - (val / displayMax) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const currentValue = data.length > 0 ? data[data.length - 1] : 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-label">{label}</span>
        <span className="chart-value" style={{ color }}>{currentValue.toFixed(1)}{unit}</span>
      </div>
      <svg width={width} height={height} className="chart-svg">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={height - padding - pct * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - pct * (height - 2 * padding)}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        ))}
        {/* Data line */}
        {data.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        {/* Current value dot */}
        {data.length > 0 && (
          <circle
            cx={width - padding}
            cy={height - padding - (currentValue / displayMax) * (height - 2 * padding)}
            r={3}
            fill={color}
          />
        )}
      </svg>
    </div>
  );
}

export function MetricsCharts({
  requestsPerSecond,
  avgResponseTime,
  errorRate,
  cacheHitRatio,
}: MetricsChartsProps) {
  return (
    <div className="metrics-charts">
      <h2 className="panel-title">Metrik Real-time</h2>
      <div className="charts-grid">
        <MiniChart
          data={requestsPerSecond}
          label="Request/detik"
          unit="/s"
          color="var(--blue)"
        />
        <MiniChart
          data={avgResponseTime}
          label="Waktu Respon Rata-rata"
          unit="ms"
          color="var(--cyan)"
        />
        <MiniChart
          data={errorRate.map((v) => v * 100)}
          label="Tingkat Error"
          unit="%"
          color="var(--red)"
          max={100}
        />
        <MiniChart
          data={cacheHitRatio.map((v) => v * 100)}
          label="Cache Hit Ratio"
          unit="%"
          color="var(--green)"
          max={100}
        />
      </div>
    </div>
  );
}
