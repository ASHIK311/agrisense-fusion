import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import AnimatedChartCard, { prefersReducedMotion } from './AnimatedChartCard';

function animateStaggeredBars(bars, horizontal = false) {
  const valid = bars.filter(Boolean);
  if (!valid.length) return () => {};
  if (prefersReducedMotion()) {
    valid.forEach((b) => {
      b.style.transform = horizontal ? 'scaleX(1)' : 'scaleY(1)';
    });
    return () => {};
  }
  const prop = horizontal ? 'scaleX' : 'scaleY';
  const origin = horizontal ? 'left center' : 'bottom center';
  const ctx = gsap.context(() => {
    gsap.fromTo(
      valid,
      { [prop]: 0, transformOrigin: origin },
      { [prop]: 1, duration: 0.72, stagger: 0.045, ease: 'power3.out' }
    );
  });
  return () => ctx.revert();
}

function VegetationBody({ series, animateKey }) {
  const lineRefs = useRef([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 680;
  const height = 235;
  const pad = { top: 20, right: 18, bottom: 38, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const keys = [
    { key: 'ndvi', label: 'NDVI (10m)', color: '#34d399' },
    { key: 'ndmi', label: 'NDMI (B11→10m)', color: '#38bdf8' },
    { key: 'evi', label: 'EVI (10m)', color: '#fbbf24' },
  ];

  const getX = (i) => pad.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
  const getY = (val) => pad.top + plotH - Math.max(0, Math.min(1, (val + 0.2) / 1.1)) * plotH;

  const buildPath = (field) =>
    series
      .map((pt, i) => {
        const val = Number(pt[field] ?? 0);
        return `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(val).toFixed(1)}`;
      })
      .join(' ');

  useEffect(() => {
    if (!animateKey) return undefined;
    const lines = lineRefs.current.filter(Boolean);
    if (prefersReducedMotion()) {
      lines.forEach((l) => {
        l.style.strokeDasharray = 'none';
        l.style.strokeDashoffset = '0';
      });
      return undefined;
    }
    const ctx = gsap.context(() => {
      lines.forEach((l, i) => {
        const len = l.getTotalLength?.() || 500;
        gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(l, { strokeDashoffset: 0, duration: 0.95, delay: i * 0.1, ease: 'power2.out' });
      });
    });
    return () => ctx.revert();
  }, [animateKey, series]);

  const handleMove = (e) => {
    if (!series.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * width;
    let best = 0;
    let bestD = Infinity;
    series.forEach((_, idx) => {
      const d = Math.abs(getX(idx) - svgX);
      if (d < bestD) {
        bestD = d;
        best = idx;
      }
    });
    setHoverIdx(best);
  };

  const hovered = hoverIdx !== null ? series[hoverIdx] : null;
  const yTicks = [-0.2, 0.0, 0.2, 0.4, 0.6, 0.8];
  const xStep = Math.max(1, Math.floor(series.length / 5));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '0.55rem' }}>
        {keys.map((k) => (
          <span key={k.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '14px', height: '2.5px', background: k.color, borderRadius: '2px' }} />
            {k.label}
          </span>
        ))}
      </div>
      <div className="surface" style={{ padding: '0.75rem' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Seasonal vegetation index curves"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIdx(null)}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        >
          {yTicks.map((tv) => {
            const y = getY(tv);
            return (
              <g key={tv}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <text x={pad.left - 8} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--text-dim)" className="mono">
                  {tv.toFixed(1)}
                </text>
              </g>
            );
          })}

          {keys.map((k, idx) => (
            <path
              key={k.key}
              ref={(el) => {
                lineRefs.current[idx] = el;
              }}
              d={buildPath(k.key)}
              fill="none"
              stroke={k.color}
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          ))}

          {series.map((pt, idx) => {
            if (idx % xStep !== 0 && idx !== series.length - 1) return null;
            return (
              <text
                key={pt.date || idx}
                x={getX(idx)}
                y={height - 10}
                textAnchor={idx === 0 ? 'start' : idx === series.length - 1 ? 'end' : 'middle'}
                fontSize="9.5"
                fill="var(--text-dim)"
                className="mono"
              >
                {(pt.date || '').slice(5)}
              </text>
            );
          })}

          {hovered && (
            <g>
              <line x1={getX(hoverIdx)} y1={pad.top} x2={getX(hoverIdx)} y2={pad.top + plotH} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
              {keys.map((k) => (
                <circle
                  key={k.key}
                  cx={getX(hoverIdx)}
                  cy={getY(Number(hovered[k.key] ?? 0))}
                  r="4.2"
                  fill={k.color}
                  stroke="var(--bg-surface)"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          )}
        </svg>

        <div className="mono" style={{ marginTop: '0.45rem', padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'var(--bg-alt)', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          {hovered ? (
            <>
              <span><strong>{hovered.date}</strong> • {hovered.stage}</span>
              <span>
                NDVI <strong style={{ color: '#34d399' }}>{Number(hovered.ndvi).toFixed(2)}</strong> · NDMI <strong style={{ color: '#38bdf8' }}>{Number(hovered.ndmi).toFixed(2)}</strong> · EVI <strong style={{ color: '#fbbf24' }}>{Number(hovered.evi).toFixed(2)}</strong>
              </span>
            </>
          ) : (
            <span>Hover across the 12 cloud-screened Sentinel-2 passes to inspect NDVI, NDMI, and EVI values</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function VegetationTimeSeriesChart({ series = [], source = 'Sentinel-2 L2A (Godagari 12-Pass Phenology)' }) {
  const tableColumns = useMemo(
    () => [
      { key: 'date', label: 'Pass Date', mono: true },
      { key: 'stage', label: 'Phenology Stage' },
      { key: 'ndvi', label: 'NDVI', align: 'right', format: (v) => Number(v).toFixed(2) },
      { key: 'ndmi', label: 'NDMI', align: 'right', format: (v) => Number(v).toFixed(2) },
      { key: 'evi', label: 'EVI', align: 'right', format: (v) => Number(v).toFixed(2) },
    ],
    []
  );

  return (
    <AnimatedChartCard
      title="Seasonal Canopy Vegetation Indices (NDVI / NDMI / EVI)"
      subtitle="Multi-band spectral trajectory across 12 cloud-screened Sentinel-2 passes"
      unit="Index [-0.2..1.0]"
      badgeType="SATELLITE-DERIVED"
      badgeLabel="SENTINEL-2 L2A"
      source={source}
      provenanceNote="Optical indices (NDVI, EVI) computed at 10m native resolution; NDMI incorporates 20m SWIR Band 11 resampled to 10m."
      empty={!series.length}
      tableColumns={tableColumns}
      tableRows={series}
    >
      {({ animateKey }) => <VegetationBody series={series} animateKey={animateKey} />}
    </AnimatedChartCard>
  );
}

function SuitabilityBody({ crops, animateKey }) {
  const barRefs = useRef([]);

  useEffect(() => {
    if (!animateKey) return undefined;
    return animateStaggeredBars(barRefs.current, true);
  }, [animateKey, crops]);

  return (
    <div className="surface" style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {crops.map((c, idx) => (
        <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '125px 1fr 52px', gap: '0.75rem', alignItems: 'center', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</span>
          <div style={{ height: '12px', borderRadius: '999px', background: 'var(--bg-alt)', overflow: 'hidden' }}>
            <div
              ref={(el) => {
                barRefs.current[idx] = el;
              }}
              style={{
                width: `${Math.min(100, Math.max(0, Number(c.score) || 0))}%`,
                height: '100%',
                borderRadius: '999px',
                background: c.color || 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
          </div>
          <span className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)' }}>{c.score}%</span>
        </div>
      ))}
    </div>
  );
}

export function CropSuitabilityComparison({ crops = [] }) {
  return (
    <AnimatedChartCard
      title="BARC AEZ-26 Crop Suitability Distribution"
      subtitle="Normalized multi-criteria suitability scores across Godagari cropping options"
      unit="Score (0–100)"
      badgeType="HISTORICAL BASELINE"
      badgeLabel="BARC AEZ-26"
      source="BARC Crop Zoning Baseline"
      empty={!crops.length}
    >
      {({ animateKey }) => <SuitabilityBody crops={crops} animateKey={animateKey} />}
    </AnimatedChartCard>
  );
}

function ScenarioBody({ scenarios, maxMm, animateKey }) {
  const barRefs = useRef([]);

  useEffect(() => {
    if (!animateKey) return undefined;
    return animateStaggeredBars(barRefs.current, true);
  }, [animateKey]);

  return (
    <div className="surface" style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {scenarios.map((sc, idx) => (
        <div key={sc.label} style={{ display: 'grid', gridTemplateColumns: '155px 1fr 78px', gap: '0.75rem', alignItems: 'center', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sc.label}</span>
          <div style={{ height: '12px', borderRadius: '999px', background: 'var(--bg-alt)', overflow: 'hidden' }}>
            <div
              ref={(el) => {
                barRefs.current[idx] = el;
              }}
              style={{
                width: `${Math.min(100, ((Number(sc.grossMm) || 0) / maxMm) * 100)}%`,
                height: '100%',
                borderRadius: '999px',
                background: sc.color || 'linear-gradient(90deg, #2563eb, #38bdf8)',
                transition: 'width 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
          <span className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#38bdf8' }}>{sc.grossMm} mm</span>
        </div>
      ))}
    </div>
  );
}

export function IrrigationScenarioComparison({ scenarios = [], unit = 'mm / event' }) {
  const maxMm = Math.max(10, ...scenarios.map((s) => Number(s.grossMm || s.netMm || 0)));
  return (
    <AnimatedChartCard
      title="Irrigation Scenario A vs. B Comparison"
      subtitle="Net vs. gross groundwater requirement under competing conveyance efficiencies"
      unit={unit}
      badgeType="MODEL-DERIVED"
      badgeLabel="FAO-56 SCENARIO"
      source="FAO-56 What-If Engine"
      empty={!scenarios.length}
    >
      {({ animateKey }) => <ScenarioBody scenarios={scenarios} maxMm={maxMm} animateKey={animateKey} />}
    </AnimatedChartCard>
  );
}
