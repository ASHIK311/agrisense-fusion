import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import AnimatedChartCard, { prefersReducedMotion, AnimatedCounter } from '../charts/AnimatedChartCard';

function AquiferHorizonBody({ baseDepthM, criticalM, drawRateA, drawRateB, animateKey }) {
  const pathARef = useRef(null);
  const pathBRef = useRef(null);

  const width = 620;
  const height = 205;
  const pad = { top: 20, right: 24, bottom: 30, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const years = [0, 1, 2, 3, 4, 5];
  const ptsA = years.map((yr) => Number((baseDepthM + drawRateA * yr).toFixed(2)));
  const ptsB = years.map((yr) => Number((baseDepthM + drawRateB * yr).toFixed(2)));

  const minDepth = Math.floor(Math.min(baseDepthM, ...ptsB) - 0.8);
  const maxDepth = Math.ceil(Math.max(criticalM + 1.2, ...ptsA));
  const span = Math.max(2, maxDepth - minDepth);

  // Depth goes DOWN on Y axis as water table drops deeper toward cavitation
  const toCoord = (yr, depth) => ({
    x: pad.left + (yr / 5) * plotW,
    y: pad.top + ((depth - minDepth) / span) * plotH,
  });

  const coordsA = ptsA.map((d, i) => toCoord(i, d));
  const coordsB = ptsB.map((d, i) => toCoord(i, d));
  const critY = toCoord(0, criticalM).y;

  const dA = coordsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const dB = coordsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const yearsToCritA = drawRateA > 0 ? Math.max(0, (criticalM - baseDepthM) / drawRateA).toFixed(1) : '∞';
  const yearsToCritB = drawRateB > 0 ? Math.max(0, (criticalM - baseDepthM) / drawRateB).toFixed(1) : 'Stable';

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
        gsap.to(p, { strokeDashoffset: 0, duration: 1.0, delay: idx * 0.12, ease: 'power2.out' });
      });
    });
    return () => ctx.revert();
  }, [animateKey, drawRateA, drawRateB, baseDepthM]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div className="surface" style={{ padding: '0.55rem 0.75rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>SCENARIO A 5-YR DEPTH</div>
          <div className="mono" style={{ fontWeight: 800, color: '#ef4444' }}>
            <AnimatedCounter value={ptsA[5]} decimals={1} suffix=" m" />
          </div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>Hits 28m in ~{yearsToCritA} yrs</div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.75rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>SCENARIO B 5-YR DEPTH</div>
          <div className="mono" style={{ fontWeight: 800, color: '#10b981' }}>
            <AnimatedCounter value={ptsB[5]} decimals={1} suffix=" m" />
          </div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>
            {yearsToCritB === 'Stable' ? 'No cavitation breach' : `28m horizon: ~${yearsToCritB} yrs`}
          </div>
        </div>
        <div className="surface" style={{ padding: '0.55rem 0.75rem' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>YEAR-5 HEAD SAVED</div>
          <div className="mono" style={{ fontWeight: 800, color: '#38bdf8' }}>
            <AnimatedCounter value={Math.max(0, ptsA[5] - ptsB[5])} decimals={2} suffix=" m" />
          </div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>Avoided linear drawdown</div>
        </div>
      </div>

      <div className="surface" style={{ padding: '0.75rem' }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="5-Year BMDA groundwater drawdown comparison" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Grid */}
          {[0, 0.33, 0.66, 1].map((t) => {
            const val = minDepth + span * t;
            const y = pad.top + t * plotH;
            return (
              <g key={t}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 3" />
                <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-muted)" className="mono">
                  {val.toFixed(1)}m
                </text>
              </g>
            );
          })}

          {/* 28.0m Critical Cavitation Line */}
          <line x1={pad.left} y1={critY} x2={width - pad.right} y2={critY} stroke="#ef4444" strokeWidth="1.6" strokeDasharray="6 4" />
          <text x={width - pad.right} y={critY - 6} textAnchor="end" fontSize="9.5" fontWeight="700" fill="#ef4444" className="mono">
            Critical Centrifugal Suction Limit ({criticalM.toFixed(1)} m)
          </text>

          {/* Trajectories */}
          <path ref={pathARef} d={dA} fill="none" stroke="#f87171" strokeWidth="2.4" strokeLinecap="round" />
          <path ref={pathBRef} d={dB} fill="none" stroke="#34d399" strokeWidth="2.6" strokeLinecap="round" />

          {years.map((yr, idx) => (
            <g key={yr}>
              <circle cx={coordsA[idx].x} cy={coordsA[idx].y} r="3.4" fill="#ef4444" />
              <circle cx={coordsB[idx].x} cy={coordsB[idx].y} r="3.6" fill="#10b981" />
              <text x={coordsA[idx].x} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)" className="mono">
                Yr {yr}
              </text>
            </g>
          ))}
        </svg>

        <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#f87171', marginRight: 5, verticalAlign: 'middle' }} />Scenario A (+{drawRateA.toFixed(2)} m/yr)</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#34d399', marginRight: 5, verticalAlign: 'middle' }} />Scenario B (+{drawRateB.toFixed(2)} m/yr scaled proxy)</span>
        </div>
      </div>
    </div>
  );
}

export default function AquiferHorizonProjectionCard({
  groundwater,
  leftGrossMm,
  rightGrossMm,
}) {
  const baseDepthM = Number(groundwater?.depth_below_surface_m ?? 26.4);
  const criticalM = Number(groundwater?.critical_threshold_m ?? 28.0);
  const baseRate = Number(groundwater?.annual_drawdown_rate_m ?? 0.65);

  // Proportional linear scaling hypothesis vs Boro-baseline reference (1171 mm => 0.65 m/yr)
  const drawRateA = Number((baseRate * (leftGrossMm / 1171)).toFixed(2));
  const drawRateB = Number((baseRate * (rightGrossMm / 1171)).toFixed(2));

  return (
    <AnimatedChartCard
      title="5-Year BMDA Tubewell Drawdown Horizon (Linear Scaling Proxy)"
      subtitle="Projected water-table approach toward 28.0 m centrifugal pump suction limit"
      unit="metres BGL"
      badgeType="SYNTHETIC PROXY"
      badgeLabel="SYNTHETIC LINEAR PROJECTION"
      source="BMDA Regional Trendline Proxy (Jahan et al., 2010)"
      provenanceNote="Disclosure: Linear proportionality hypothesis from published +0.65 m/yr BMDA drawdown trend — strictly not a 3D MODFLOW hydrogeological groundwater flow simulation."
    >
      {({ animateKey }) => (
        <AquiferHorizonBody
          baseDepthM={baseDepthM}
          criticalM={criticalM}
          drawRateA={drawRateA}
          drawRateB={drawRateB}
          animateKey={animateKey}
        />
      )}
    </AnimatedChartCard>
  );
}
