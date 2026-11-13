import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import AnimatedChartCard, { prefersReducedMotion, AnimatedCounter } from './AnimatedChartCard';

function RootZoneBody({ vwcPct, dr, taw, raw, animateKey }) {
  const fillBarRef = useRef(null);
  const depleBarRef = useRef(null);

  const clampedVwc = Math.max(0, Math.min(50, Number(vwcPct) || 24.4));
  const vwcRatio = (clampedVwc / 50) * 100;
  const drRatio = Math.max(0, Math.min(100, (Number(dr) / Math.max(1, Number(taw))) * 100));
  const rawRatio = Math.max(0, Math.min(100, (Number(raw) / Math.max(1, Number(taw))) * 100));

  useEffect(() => {
    if (!animateKey) return undefined;
    const reduced = prefersReducedMotion();
    if (reduced) {
      if (fillBarRef.current) fillBarRef.current.style.height = `${vwcRatio}%`;
      if (depleBarRef.current) depleBarRef.current.style.width = `${drRatio}%`;
      return undefined;
    }
    const ctx = gsap.context(() => {
      if (fillBarRef.current) {
        gsap.fromTo(fillBarRef.current, { height: '0%' }, { height: `${vwcRatio}%`, duration: 0.9, ease: 'power3.out' });
      }
      if (depleBarRef.current) {
        gsap.fromTo(depleBarRef.current, { width: '0%' }, { width: `${drRatio}%`, duration: 0.85, delay: 0.12, ease: 'power3.out' });
      }
    });
    return () => ctx.revert();
  }, [animateKey, vwcRatio, drRatio]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
      {/* Animated Vertical Soil Column Moisture Gauge */}
      <div className="surface" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
        <div
          style={{
            width: '54px',
            minHeight: '190px',
            borderRadius: '10px',
            background: '#050e21',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            ref={fillBarRef}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${vwcRatio}%`,
              background: 'linear-gradient(180deg, #38bdf8 0%, #2563eb 65%, #1e3a8a 100%)',
              boxShadow: '0 0 18px rgba(56, 189, 248, 0.35)',
            }}
          />
          {/* Threshold lines inside column (scale 0..50% VWC) */}
          {[
            { label: 'Sat', vwc: 43.5, color: '#38bdf8' },
            { label: 'FC', vwc: 32.3, color: '#22d3ee' },
            { label: 'Trig', vwc: 24.4, color: '#fbbf24' },
            { label: 'PWP', vwc: 16.5, color: '#f87171' },
          ].map((m) => (
            <div
              key={m.label}
              title={`${m.label}: ${m.vwc}% VWC`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${(m.vwc / 50) * 100}%`,
                borderTop: `1.5px dashed ${m.color}`,
              }}
            />
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Root-Zone Moisture Status (Zr = 0.50 m)</div>
            <div className="mono" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.15rem' }}>
              <AnimatedCounter value={clampedVwc} decimals={1} suffix="% VWC" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem', fontSize: '0.75rem' }}>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
              <span>θ_sat (Saturation)</span><strong>43.5%</strong>
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', color: '#22d3ee' }}>
              <span>θ_FC (Field Capacity)</span><strong>32.3%</strong>
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
              <span>θ_trigger (RAW)</span><strong>24.4%</strong>
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
              <span>θ_PWP (Wilting)</span><strong>16.5%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Depletion Progress vs RAW Trigger */}
      <div className="surface" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.8rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Root-Zone Depletion (Dr) vs. RAW Trigger
          </div>
          <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: dr >= raw ? '#f87171' : '#34d399', marginTop: '0.2rem' }}>
            <AnimatedCounter value={dr} decimals={1} suffix=" mm" />{' '}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              / {Number(taw).toFixed(1)} mm TAW
            </span>
          </div>
        </div>

        <div>
          <div style={{ position: 'relative', height: '16px', borderRadius: '999px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div
              ref={depleBarRef}
              style={{
                height: '100%',
                width: `${drRatio}%`,
                background: dr >= raw
                  ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                  : 'linear-gradient(90deg, #0ea5e9 0%, #34d399 100%)',
                borderRadius: '999px',
              }}
            />
            <div
              title={`RAW Trigger (${Number(raw).toFixed(1)} mm)`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${rawRatio}%`,
                width: '2px',
                background: '#fbbf24',
              }}
            />
          </div>
          <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            <span>0 mm (FC)</span>
            <span style={{ color: '#fbbf24' }}>RAW Trigger = {Number(raw).toFixed(1)} mm</span>
            <span>{Number(taw).toFixed(1)} mm</span>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {dr >= raw
            ? 'Root-zone depletion has crossed RAW threshold; water stress coefficient Ks drops below 1.0 unless irrigated.'
            : `Remaining safe moisture buffer before RAW stress onset: ${(Math.max(0, raw - dr)).toFixed(1)} mm.`}
        </div>
      </div>
    </div>
  );
}

export default function RootZoneWaterProfile({ vwcPct, dr, taw, raw }) {
  return (
    <AnimatedChartCard
      title="Root-Zone Water Profile & Depletion Dynamics"
      subtitle="Soil moisture horizon relative to provisional Barind clay-loam thresholds (Zr = 0.50m)"
      unit="% VWC / mm"
      badgeType="ASSUMPTION"
      badgeLabel="FAO-56 + SIMULATED VWC"
      source="FAO-56 Physics Engine & M3 Simulated Probe"
      provenanceNote="Thresholds (43.5% Sat, 32.3% FC, 24.4% Trigger, 16.5% PWP) are provisional Barind clay-loam parameters; live probe feed carries is_simulated: true."
    >
      {({ animateKey }) => (
        <RootZoneBody vwcPct={vwcPct} dr={dr} taw={taw} raw={raw} animateKey={animateKey} />
      )}
    </AnimatedChartCard>
  );
}
