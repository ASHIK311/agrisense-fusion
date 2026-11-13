import React, { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { BarChart3, Table as TableIcon } from 'lucide-react';
import AnimatedChartCard, { prefersReducedMotion, AnimatedCounter } from '../charts/AnimatedChartCard';

export const CROP_KC_CURVES = {
  rice_aman: { label: 'T. Aman Rice', color: '#7cc8a0', points: [1.05, 1.12, 1.2, 1.2, 1.0, 0.7], waterMm: 420 },
  rice_boro: { label: 'Boro Rice', color: '#e47a63', points: [1.05, 1.15, 1.2, 1.2, 1.05, 0.9], waterMm: 1150 },
  maize_rabi: { label: 'Rabi Maize', color: '#60a5fa', points: [0.3, 0.72, 1.18, 1.2, 0.85, 0.35], waterMm: 480 },
  wheat: { label: 'Wheat (BARI Gom)', color: '#f2c879', points: [0.3, 0.68, 1.15, 1.15, 0.75, 0.4], waterMm: 310 },
  mustard: { label: 'Mustard Oilseed', color: '#a197cf', points: [0.35, 0.75, 1.1, 1.05, 0.65, 0.35], waterMm: 210 },
  pulse: { label: 'Mungbean / Lentil', color: '#7cc8a0', points: [0.4, 0.78, 1.05, 1.0, 0.55, 0.35], waterMm: 140 },
};

const STAGES = ['Initial', 'Dev Early', 'Dev Peak', 'Mid-Season', 'Late', 'Harvest'];

function buildCurve(points, width, height, pad, maxKc = 1.35) {
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const coords = points.map((v, idx) => ({
    x: pad.left + (idx / Math.max(1, points.length - 1)) * plotW,
    y: pad.top + plotH - (v / maxKc) * plotH,
    v,
  }));
  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bottomY = (pad.top + plotH).toFixed(1);
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY} L ${coords[0].x.toFixed(1)} ${bottomY} Z`;
  return { line, area, coords };
}

function SeasonalKcBody({ leftKey, rightKey, animateKey }) {
  const [viewMode, setViewMode] = useState('chart');
  const pathARef = useRef(null);
  const pathBRef = useRef(null);
  const dotARef = useRef(null);
  const dotBRef = useRef(null);

  const left = CROP_KC_CURVES[leftKey] || CROP_KC_CURVES.rice_aman;
  const right = CROP_KC_CURVES[rightKey] || CROP_KC_CURVES.rice_boro;

  const width = 620;
  const height = 215;
  const pad = { top: 20, right: 22, bottom: 32, left: 40 };
  const plotH = height - pad.top - pad.bottom;

  const geomA = useMemo(() => buildCurve(left.points, width, height, pad), [left]);
  const geomB = useMemo(() => buildCurve(right.points, width, height, pad), [right]);

  useEffect(() => {
    if (!animateKey) return undefined;
    const paths = [pathARef.current, pathBRef.current].filter(Boolean);
    if (!paths.length) return undefined;

    if (prefersReducedMotion()) {
      paths.forEach((p) => {
        p.style.strokeDasharray = 'none';
        p.style.strokeDashoffset = '0';
      });
      return undefined;
    }

    const ctx = gsap.context(() => {
      paths.forEach((p, idx) => {
        const len = p.getTotalLength?.() || 500;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(p, {
          strokeDashoffset: 0,
          duration: 0.9,
          delay: idx * 0.1,
          ease: 'power2.out',
          onComplete: () => {
            p.style.strokeDasharray = 'none';
          },
        });
      });

      [
        { path: pathARef.current, dot: dotARef.current, dur: 3.6, delay: 0 },
        { path: pathBRef.current, dot: dotBRef.current, dur: 4.1, delay: 0.5 },
      ].forEach(({ path, dot, dur, delay }) => {
        if (!path || !dot) return;
        const len = path.getTotalLength?.() || 0;
        if (len <= 0) return;
        const proxy = { t: 0 };
        gsap.to(proxy, {
          t: 1,
          duration: dur,
          delay,
          repeat: -1,
          ease: 'none',
          onUpdate: () => {
            const pt = path.getPointAtLength(proxy.t * len);
            if (pt) {
              dot.setAttribute('cx', pt.x.toFixed(1));
              dot.setAttribute('cy', pt.y.toFixed(1));
            }
          },
        });
      });
    });

    return () => ctx.revert();
  }, [animateKey, leftKey, rightKey]);

  const waterDelta = Math.abs(right.waterMm - left.waterMm);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
          SIMULATED SCENARIO COMPARISON • NOT FIELD-VALIDATED SAVINGS
        </div>
        <div className="ag-view-toggle" role="group" aria-label="FAO-56 Kc View Mode">
          <button
            type="button"
            className={`ag-view-btn ${viewMode === 'chart' ? 'active' : ''}`}
            aria-pressed={viewMode === 'chart'}
            onClick={() => setViewMode('chart')}
          >
            <BarChart3 size={12} /> Chart
          </button>
          <button
            type="button"
            className={`ag-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            aria-pressed={viewMode === 'table'}
            onClick={() => setViewMode('table')}
          >
            <TableIcon size={12} /> Exact Table
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div className="surface" style={{ padding: '0.55rem 0.75rem', borderLeft: '3px solid #60a5fa' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>LEFT WATER NEED ({left.label})</div>
          <div className="mono" style={{ fontWeight: 800, color: '#60a5fa' }}>
            <AnimatedCounter value={left.waterMm} decimals={0} suffix=" mm" />
          </div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.75rem', borderLeft: '3px solid #60a5fa' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>RIGHT WATER NEED ({right.label})</div>
          <div className="mono" style={{ fontWeight: 800, color: '#60a5fa' }}>
            <AnimatedCounter value={right.waterMm} decimals={0} suffix=" mm" />
          </div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.75rem', borderLeft: '3px solid #f2c879' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>MODELED WATER DELTA</div>
          <div className="mono" style={{ fontWeight: 800, color: '#f2c879' }}>
            <AnimatedCounter value={waterDelta} decimals={0} suffix=" mm diff" />
          </div>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="surface" style={{ padding: '0.75rem' }}>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="FAO-56 Crop Coefficient Kc comparison curve" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {[0.3, 0.6, 0.9, 1.2].map((val) => {
              const y = pad.top + plotH - (val / 1.35) * plotH;
              return (
                <g key={val}>
                  <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(168,165,158,0.16)" strokeDasharray="3 3" />
                  <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-muted)" className="mono">
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            <path d={geomA.area} fill={left.color} fillOpacity="0.12" />
            <path ref={pathARef} d={geomA.line} fill="none" stroke={left.color} strokeWidth="2.6" strokeLinecap="round" />
            <path ref={pathBRef} d={geomB.line} fill="none" stroke={right.color} strokeWidth="2.6" strokeLinecap="round" />

            <circle ref={dotARef} cx={geomA.coords[0].x} cy={geomA.coords[0].y} r="4.5" fill="#edeae4" stroke={left.color} strokeWidth="2" />
            <circle ref={dotBRef} cx={geomB.coords[0].x} cy={geomB.coords[0].y} r="4.5" fill="#edeae4" stroke={right.color} strokeWidth="2" />

            {STAGES.map((stage, idx) => (
              <text key={stage} x={geomA.coords[idx].x} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)" className="mono">
                {stage}
              </text>
            ))}
          </svg>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 3, background: left.color, marginRight: 5, verticalAlign: 'middle' }} />Left: {left.label} (Kc)</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 3, background: right.color, marginRight: 5, verticalAlign: 'middle' }} />Right: {right.label} (Kc)</span>
          </div>
        </div>
      ) : (
        <div className="surface table-container" style={{ padding: '0.4rem' }}>
          <table>
            <thead>
              <tr>
                <th>Growth Stage</th>
                <th>Left · {left.label} (Kc)</th>
                <th>Right · {right.label} (Kc)</th>
                <th>Δ Kc (Left − Right)</th>
              </tr>
            </thead>
            <tbody>
              {STAGES.map((stage, idx) => {
                const lv = left.points[idx];
                const rv = right.points[idx];
                const d = lv - rv;
                return (
                  <tr key={stage}>
                    <td><strong>{stage}</strong></td>
                    <td className="mono" style={{ color: '#7cc8a0', fontWeight: 700 }}>{lv.toFixed(2)}</td>
                    <td className="mono" style={{ color: '#60a5fa', fontWeight: 700 }}>{rv.toFixed(2)}</td>
                    <td className="mono" style={{ color: d < 0 ? '#7cc8a0' : d > 0 ? '#f2c879' : 'var(--text-muted)' }}>
                      {d >= 0 ? `+${d.toFixed(2)}` : d.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td><strong>Est. Seasonal Irrigation</strong></td>
                <td className="mono">{left.waterMm} mm</td>
                <td className="mono">{right.waterMm} mm</td>
                <td className="mono" style={{ fontWeight: 800, color: '#f2c879' }}>
                  {left.waterMm - right.waterMm >= 0 ? `+${left.waterMm - right.waterMm}` : left.waterMm - right.waterMm} mm
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SeasonalKcCurveChart({ leftKey, rightKey }) {
  return (
    <AnimatedChartCard
      title="FAO-56 Crop Coefficient (Kc) & Water Demand Trajectory"
      subtitle="Comparing seasonal evaporative demand multipliers across phenological growth stages"
      unit="Kc (Ini → Mid → End)"
      badgeType="MODEL-DERIVED"
      badgeLabel="FAO-56 PHENOLOGY"
      source="Allen et al. (1998) FAO Paper 56"
    >
      {({ animateKey }) => <SeasonalKcBody leftKey={leftKey} rightKey={rightKey} animateKey={animateKey} />}
    </AnimatedChartCard>
  );
}

function DiseaseRiskBody({ tempC, rhPct, diseases = [], animateKey }) {
  const barRefs = useRef([]);

  useEffect(() => {
    if (!animateKey) return undefined;
    const bars = barRefs.current.filter(Boolean);
    if (!bars.length) return undefined;
    if (prefersReducedMotion()) {
      bars.forEach((b) => {
        b.style.transform = 'scaleX(1)';
      });
      return undefined;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bars,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 0.65, stagger: 0.04, ease: 'power3.out' }
      );
    });
    return () => ctx.revert();
  }, [animateKey]);

  // Temp x RH SVG Matrix: X = Temp (15..40°C), Y = RH (40..100%)
  const mx = 280;
  const my = 185;
  const mp = { top: 14, right: 16, bottom: 26, left: 36 };
  const pw = mx - mp.left - mp.right;
  const ph = my - mp.top - mp.bottom;

  const pinX = mp.left + (Math.min(40, Math.max(15, tempC)) - 15) / 25 * pw;
  const pinY = mp.top + ph - ((Math.min(100, Math.max(40, rhPct)) - 40) / 60) * ph;

  // Fungal Blast/Blight hot zone (22..32°C, RH >= 80%)
  const fX = mp.left + ((22 - 15) / 25) * pw;
  const fW = ((32 - 22) / 25) * pw;
  const fY = mp.top;
  const fH = ((100 - 80) / 60) * ph;

  const topList = diseases.slice(0, 6);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
      {/* Temp x RH Envelope Plot */}
      <div className="surface" style={{ padding: '0.8rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
          MICROCLIMATE SUSCEPTIBILITY ENVELOPE (TEMP × RH)
        </div>
        <svg viewBox={`0 0 ${mx} ${my}`} role="img" aria-label="Temperature vs Relative Humidity disease susceptibility zone" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Grid */}
          {[40, 60, 80, 100].map((rh) => {
            const y = mp.top + ph - ((rh - 40) / 60) * ph;
            return (
              <g key={rh}>
                <line x1={mp.left} y1={y} x2={mx - mp.right} y2={y} stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
                <text x={mp.left - 6} y={y + 3} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" className="mono">{rh}%</text>
              </g>
            );
          })}
          {[15, 25, 35].map((t) => {
            const x = mp.left + ((t - 15) / 25) * pw;
            return (
              <text key={t} x={x} y={my - 7} textAnchor="middle" fontSize="8.5" fill="var(--text-muted)" className="mono">{t}°C</text>
            );
          })}

          {/* High Fungal Window Zone */}
          <rect x={fX} y={fY} width={fW} height={fH} rx="6" fill="rgba(228, 122, 99, 0.16)" stroke="rgba(228, 122, 99, 0.6)" strokeDasharray="4 3" />
          <text x={fX + fW / 2} y={fY + 14} textAnchor="middle" fontSize="8" fontWeight="700" fill="#e47a63" className="mono">
            FUNGAL WINDOW (22–32°C, ≥80% RH)
          </text>

          {/* User Live Crosshair */}
          <line x1={pinX} y1={mp.top} x2={pinX} y2={mp.top + ph} stroke="rgba(96, 165, 250, 0.45)" />
          <line x1={mp.left} y1={pinY} x2={mx - mp.right} y2={pinY} stroke="rgba(96, 165, 250, 0.45)" />
          <circle cx={pinX} cy={pinY} r="9" fill="rgba(96, 165, 250, 0.25)" />
          <circle cx={pinX} cy={pinY} r="4.5" fill="#60a5fa" stroke="#edeae4" strokeWidth="1.5" />
        </svg>
        <div className="mono" style={{ fontSize: '0.7rem', color: '#60a5fa', textAlign: 'center', marginTop: '0.3rem' }}>
          Active Test Point: {tempC}°C • {rhPct}% RH
        </div>
      </div>

      {/* Live Staggered Risk Score Bars */}
      <div className="surface" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          TOP SCREENED ENVIRONMENTAL SUSCEPTIBILITY SCORES
        </div>
        {topList.map((d, idx) => {
          const pct = Math.round((Number(d.risk_score) || 0) * 100);
          const color =
            d.risk_level === 'HIGH' ? '#e47a63' : d.risk_level === 'MODERATE' ? '#f2c879' : '#7cc8a0';
          return (
            <div key={d.disease_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{d.disease_name}</span>
                <span className="mono" style={{ fontWeight: 800, color }}>{pct}% ({d.risk_level})</span>
              </div>
              <div style={{ height: '9px', borderRadius: '999px', background: 'var(--bg-alt)', overflow: 'hidden' }}>
                <div
                  ref={(el) => {
                    barRefs.current[idx] = el;
                  }}
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: color,
                    transition: 'width 0.28s ease, background-color 0.28s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DiseaseRiskEnvelopeChart({ tempC, rhPct, diseases = [], loading = false }) {
  return (
    <AnimatedChartCard
      title="Epidemiological Microclimate Envelope & Screened Risk Ranking"
      subtitle="Live pathogen window screening via GET /api/v1/diseases/screen/environmental"
      unit="% risk index"
      badgeType="LITERATURE-DERIVED"
      badgeLabel="NON-DIAGNOSTIC SCREEN"
      source="BRRI / BARI 60-DOI Corpus Rules"
      loading={loading && diseases.length === 0}
      empty={!loading && diseases.length === 0}
      provenanceNote="Screening index indicates meteorological favorability only (leaf_wetness_hours = null on uncalibrated field hardware)."
    >
      {({ animateKey }) => (
        <DiseaseRiskBody tempC={tempC} rhPct={rhPct} diseases={diseases} animateKey={animateKey} />
      )}
    </AnimatedChartCard>
  );
}
