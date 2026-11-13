import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import AnimatedChartCard, { prefersReducedMotion, AnimatedCounter } from './AnimatedChartCard';

function ElevationProfileBody({ profile, stats, animateKey }) {
  const pathRef = useRef(null);
  const areaRef = useRef(null);

  const width = 620;
  const height = 210;
  const pad = { top: 18, right: 16, bottom: 30, left: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const elevs = profile.map((p) => p.elevationM);
  const minE = Math.floor(Math.min(...elevs) - 1);
  const maxE = Math.ceil(Math.max(...elevs) + 1);
  const spanE = Math.max(1, maxE - minE);

  const coords = profile.map((p, idx) => {
    const x = pad.left + (idx / Math.max(1, profile.length - 1)) * plotW;
    const y = pad.top + plotH - ((p.elevationM - minE) / spanE) * plotH;
    return { x, y, ...p };
  });

  const lineD = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bottomY = (pad.top + plotH).toFixed(1);
  const areaD = coords.length ? `${lineD} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY} L ${coords[0].x.toFixed(1)} ${bottomY} Z` : '';

  useEffect(() => {
    if (!animateKey || !pathRef.current) return undefined;
    const reduced = prefersReducedMotion();
    if (reduced) {
      pathRef.current.style.strokeDasharray = 'none';
      pathRef.current.style.strokeDashoffset = '0';
      if (areaRef.current) areaRef.current.style.opacity = '1';
      return undefined;
    }
    const len = pathRef.current.getTotalLength?.() || 600;
    const ctx = gsap.context(() => {
      gsap.set(pathRef.current, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(pathRef.current, { strokeDashoffset: 0, duration: 1.05, ease: 'power2.out' });
      if (areaRef.current) {
        gsap.fromTo(areaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.9, delay: 0.18 });
      }
    });
    return () => ctx.revert();
  }, [animateKey, profile]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div className="surface" style={{ padding: '0.55rem 0.7rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>MIN ELEVATION</div>
          <div className="mono" style={{ fontWeight: 800, color: '#2DD4BF' }}><AnimatedCounter value={stats.minM} suffix=" m" /></div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.7rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>MAX ELEVATION</div>
          <div className="mono" style={{ fontWeight: 800, color: '#34d399' }}><AnimatedCounter value={stats.maxM} suffix=" m" /></div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.7rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>TERRACE RELIEF</div>
          <div className="mono" style={{ fontWeight: 800, color: '#fbbf24' }}><AnimatedCounter value={stats.reliefM} suffix=" m" /></div>
        </div>
      </div>

      <div className="surface" style={{ padding: '0.75rem' }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="West to East DEM elevation cross section" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="demAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((t) => {
            const y = pad.top + plotH * (1 - t);
            const label = (minE + spanE * t).toFixed(0);
            return (
              <g key={t}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(52,211,153,0.16)" strokeDasharray="3 3" />
                <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-muted)" className="mono">{label}m</text>
              </g>
            );
          })}
          <path ref={areaRef} d={areaD} fill="url(#demAreaGrad)" className="chart-live-area" />
          <path ref={pathRef} d={lineD} fill="none" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d={lineD} fill="none" stroke="#a7f3d0" strokeWidth="3.0" strokeLinecap="round" strokeLinejoin="round" className="chart-live-tracer" />
          {coords.length > 0 && (
            <circle
              cx={coords[Math.floor(coords.length / 2)].x}
              cy={coords[Math.floor(coords.length / 2)].y}
              r="5.5"
              fill="none"
              stroke="#34d399"
              strokeWidth="1.6"
              className="chart-live-beacon"
            />
          )}
          <text x={pad.left} y={height - 8} fontSize="9.5" fill="var(--text-muted)" className="mono">West ({profile[0]?.distanceKm} km)</text>
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)" className="mono">Center Pin (0 km)</text>
          <text x={width - pad.right} y={height - 8} textAnchor="end" fontSize="9.5" fill="var(--text-muted)" className="mono">East (+{profile[profile.length - 1]?.distanceKm} km)</text>
        </svg>
      </div>
    </div>
  );
}

function SlopeHistogramBody({ histogram, stats, animateKey }) {
  const barRefs = useRef([]);
  const maxPct = Math.max(25, ...histogram.map((b) => b.pct));

  useEffect(() => {
    if (!animateKey) return undefined;
    const bars = barRefs.current.filter(Boolean);
    if (!bars.length) return undefined;
    if (prefersReducedMotion()) {
      bars.forEach((b) => {
        b.style.transform = 'scaleY(1)';
      });
      return undefined;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bars,
        { scaleY: 0, transformOrigin: 'bottom center' },
        { scaleY: 1, duration: 0.72, stagger: 0.045, ease: 'power3.out' }
      );
    });
    return () => ctx.revert();
  }, [animateKey, histogram]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div className="surface" style={{ padding: '0.55rem 0.7rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>MEAN SLOPE</div>
          <div className="mono" style={{ fontWeight: 800, color: '#2DD4BF' }}><AnimatedCounter value={stats.meanSlopeDeg} decimals={2} suffix="°" /></div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.7rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>90TH PCTL SLOPE</div>
          <div className="mono" style={{ fontWeight: 800, color: '#fbbf24' }}><AnimatedCounter value={stats.p90SlopeDeg} decimals={2} suffix="°" /></div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.7rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>RMS ROUGHNESS</div>
          <div className="mono" style={{ fontWeight: 800, color: '#34d399' }}><AnimatedCounter value={stats.roughnessM} decimals={2} suffix=" m" /></div>
        </div>
      </div>

      <div className="surface" style={{ padding: '0.9rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${histogram.length}, minmax(0, 1fr))`, gap: '0.5rem', height: '140px', alignItems: 'end' }}>
          {histogram.map((item, idx) => {
            const hPct = Math.max(4, (item.pct / maxPct) * 100);
            return (
              <div key={item.bin} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem' }}>
                <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{item.pct}%</span>
                <div
                  ref={(el) => {
                    barRefs.current[idx] = el;
                  }}
                  title={`${item.bin} slope bin: ${item.pct}% of terrain grid (${item.count} cells)`}
                  style={{
                    width: '100%',
                    height: `${hPct * 0.78}%`,
                    borderRadius: '6px 6px 3px 3px',
                    background: 'linear-gradient(180deg, #34d399 0%, #0d9488 100%)',
                    boxShadow: '0 0 12px rgba(52, 211, 153, 0.24)',
                  }}
                />
                <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{item.bin}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TerrainProfileAndSlopeCards({ demData, loading, onRetry }) {
  const unavailable =
    !loading && (!demData || !demData.available)
      ? `Real SRTM / Terrarium 30m DEM tiles are currently unavailable (${demData?.error || 'not reachable offline'}). Per scientific integrity guardrails, elevation cross-sections and slope distributions are withheld instead of fabricated.`
      : '';

  const profileCols = [
    { key: 'distanceKm', label: 'Offset (km)', align: 'right', format: (v) => `${Number(v).toFixed(2)} km` },
    { key: 'elevationM', label: 'Elevation (m ASL)', align: 'right', format: (v) => `${Number(v).toFixed(1)} m` },
  ];

  const slopeCols = [
    { key: 'bin', label: 'Slope Bin' },
    { key: 'pct', label: 'Area Share (%)', align: 'right', format: (v) => `${Number(v).toFixed(1)}%` },
    { key: 'count', label: 'Grid Cells', align: 'right' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
      <AnimatedChartCard
        title="Elevation Cross-Section Profile (West → East)"
        subtitle="Centre transect decoded from AWS Terrarium 30m SRTM elevation tiles"
        unit="m ASL / km"
        badgeType="REAL DEM"
        badgeLabel={demData?.available ? 'SRTM TERRARIUM DEM' : 'DEM GATE ACTIVE'}
        source="AWS Open Data Terrain Tiles"
        loading={loading}
        unavailableMessage={unavailable}
        tableColumns={profileCols}
        tableRows={demData?.centreProfile || []}
        headerRight={
          onRetry && (
            <button type="button" className="btn btn-secondary" onClick={onRetry} style={{ padding: '0.24rem 0.6rem', fontSize: '0.7rem' }}>
              Retry DEM Fetch
            </button>
          )
        }
        provenanceNote={demData?.provenance_disclosure}
      >
        {({ animateKey }) => (
          <ElevationProfileBody profile={demData.centreProfile} stats={demData.stats} animateKey={animateKey} />
        )}
      </AnimatedChartCard>

      <AnimatedChartCard
        title="Terrace Slope Distribution Histogram"
        subtitle="Slope angle distribution across 0° to 25°+ bins for surface runoff & ponding context"
        unit="% area"
        badgeType="REAL DEM"
        badgeLabel={demData?.available ? 'COMPUTED GRADIENT' : 'DEM GATE ACTIVE'}
        source="AWS Open Data Terrain Tiles"
        loading={loading}
        unavailableMessage={unavailable}
        tableColumns={slopeCols}
        tableRows={demData?.slopeHistogram || []}
      >
        {({ animateKey }) => (
          <SlopeHistogramBody histogram={demData.slopeHistogram} stats={demData.stats} animateKey={animateKey} />
        )}
      </AnimatedChartCard>
    </div>
  );
}
