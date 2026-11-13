import React from 'react';
import { Calendar } from 'lucide-react';

export default function WeatherChart({ weatherHistory = [], attribution }) {
  if (!weatherHistory || weatherHistory.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No NASA weather history loaded. Click &quot;Sync NASA&quot; to retrieve historical records.
      </div>
    );
  }

  // Chart dimensions
  const svgWidth = 840;
  const svgHeight = 280;
  const padding = { top: 25, right: 35, bottom: 45, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Max calculations
  const maxRain = Math.max(10, ...weatherHistory.map((d) => d.precip_mm || 0));
  const minTemp = Math.min(15, ...weatherHistory.map((d) => d.t2m_min || d.t2m || 20));
  const maxTemp = Math.max(38, ...weatherHistory.map((d) => d.t2m_max || d.t2m || 30));

  const n = weatherHistory.length;
  const stepX = graphWidth / Math.max(1, n - 1);

  // Generate Temperature points
  const tempPoints = weatherHistory.map((d, i) => {
    const x = padding.left + i * stepX;
    const temp = d.t2m ?? 25;
    const y = padding.top + graphHeight - ((temp - minTemp) / (maxTemp - minTemp)) * graphHeight;
    return { x, y, temp, date: d.date || d.rawDate };
  });

  const pathD = tempPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Area under curve
  const areaD = `${pathD} L ${tempPoints[tempPoints.length - 1].x},${padding.top + graphHeight} L ${tempPoints[0].x},${padding.top + graphHeight} Z`;

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div
        className="card-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <Calendar size={15} /> NASA POWER Agroclimatology Time-Series
          </span>
          <span className="badge badge-live" style={{ fontSize: '0.72rem' }}>
            {weatherHistory.length} Days Synced
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', background: '#38BDF8', borderRadius: '2px' }} />
            Precipitation (mm)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '14px', height: '3px', background: '#FB923C', borderRadius: '2px' }} />
            Mean Temp (°C)
          </span>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '650px', display: 'block' }}
        >
          <defs>
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.28" />
            </linearGradient>
            <linearGradient id="tempAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB923C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FB923C" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + graphHeight * (1 - pct);
            const tVal = Math.round(minTemp + pct * (maxTemp - minTemp));
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="var(--text-dim)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {tVal}°C
                </text>
              </g>
            );
          })}

          {/* Rainfall Bars */}
          {weatherHistory.map((d, i) => {
            const xCenter = padding.left + i * stepX;
            const barW = Math.min(26, stepX * 0.42);
            const rain = d.precip_mm || 0;
            const barH = (rain / maxRain) * (graphHeight * 0.75);
            const y = padding.top + graphHeight - barH;

            return (
              <g key={i}>
                <rect
                  x={xCenter - barW / 2}
                  y={y}
                  width={barW}
                  height={barH}
                  fill="url(#rainGradient)"
                  rx="3"
                />
                {rain > 0.4 && (
                  <text
                    x={xCenter}
                    y={y - 5}
                    fill="#7DD3FC"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {rain.toFixed(1)}
                  </text>
                )}
                {/* X Axis Date Label */}
                <text
                  x={xCenter}
                  y={svgHeight - 12}
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {d.date ? d.date.slice(5) : ''}
                </text>
              </g>
            );
          })}

          {/* Area under temperature curve */}
          <path d={areaD} fill="url(#tempAreaGradient)" />

          {/* Temperature Line Path */}
          <path d={pathD} fill="none" stroke="#FB923C" strokeWidth="2.8" />

          {/* Temperature Points */}
          {tempPoints.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="4" fill="var(--bg-surface)" stroke="#FB923C" strokeWidth="2.5" />
              <text
                x={pt.x}
                y={pt.y - 8}
                fill="#FDBA74"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                textAnchor="middle"
              >
                {pt.temp.toFixed(1)}°
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div
        style={{
          fontSize: '0.74rem',
          color: 'var(--text-dim)',
          marginTop: '1rem',
          lineHeight: '1.5',
          fontFamily: 'var(--font-mono)',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          SOURCE: NASA Langley Research Center POWER Project (Point grid: 24.3636°N, 88.6241°E ~34.8 km ESE of Godagari centroid 24.469°N, 88.330°E).
        </div>
        <div>
          DISCLOSURE: Regional satellite-derived agroclimatology reanalysis, not in-situ station data. Heat-dryness indicator represents atmospheric desiccation screening.
        </div>
      </div>
    </div>
  );
}
