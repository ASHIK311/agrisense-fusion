import React, { useEffect, useRef, useState } from 'react';
import ProvenanceBadge from '../ProvenanceBadge';

const STORY_STEPS = [
  {
    id: 'orbit',
    num: '01',
    title: 'Sentinel-2 Multispectral Pass',
    body: 'Every 5–10 days, Copernicus Sentinel-2 captures 10m optical bands (B2, B3, B4, B8) and 20m SWIR Band 11 (resampled to 10m). A 15-feature Random Forest classifies land cover (84.63% ± 3.81% spatial CV), while crop-species identification remains honestly gated (HTTP 422).',
    source: 'ESA Sentinel-2 L2A · 12 Cloud-Screened Scenes',
    badge: 'SATELLITE-DERIVED',
    accent: '#34d399',
    highlightLayer: 1,
    metricLabel: 'Block C Interior / Edge',
    metricVal: '90.64% / 75.92%',
  },
  {
    id: 'climate',
    num: '02',
    title: 'NASA POWER Atmospheric Cell',
    body: 'Daily Tmax, Tmin, RH2M, solar radiation (ALLSKY_SFC_SW_DWN), and 10m wind velocity arrive from NASA Langley MERRA-2 (0.5°×0.625°) and CERES (1.0°) at 24.3636°N, 88.6241°E (~34.8 km ESE of Godagari). Missing values (-999) are strictly converted to null.',
    source: 'NASA POWER · 1,827 Daily Rows',
    badge: 'NASA POWER',
    accent: 'var(--m-flare)',
    highlightLayer: 0,
    metricLabel: 'Spatial Tether Offset',
    metricVal: '~34.8 km ESE',
  },
  {
    id: 'soil',
    num: '03',
    title: 'Simulated ESP32 Subsurface Probe',
    body: 'Field soil volumetric water content (VWC), temperature, and pH enter via HTTPS POST /api/sensor-readings with UUID event deduplication (HTTP 409) and physical bounds enforcement. Every prototype record carries is_simulated = true and UNCALIBRATED status.',
    source: '5,760 Source Records · Tier 1 Prototype',
    badge: 'SIMULATED',
    accent: 'var(--m-terracotta)',
    highlightLayer: 2,
    metricLabel: 'Irrigation Trigger',
    metricVal: '24.4% VWC (RAW)',
  },
  {
    id: 'physics',
    num: '04',
    title: 'Deterministic FAO-56 Physics',
    body: 'Wind is log-transformed from 10m to 2m (u₂ = 0.748·u₁₀), vapor pressure deficit is computed via Tetens, and Penman-Monteith yields daily ET₀. Root-zone depletion Dr is tracked against TAW (79.0 mm at Zr=0.50m) with Es held null in single-Kc mode.',
    source: 'Allen et al. (1998) · Parity Δ < 1e-6',
    badge: 'MODEL-DERIVED',
    accent: 'var(--m-sky)',
    highlightLayer: 3,
    metricLabel: 'Python ↔ Node Parity',
    metricVal: 'Δ ≤ 0.05 mm/d',
  },
  {
    id: 'mcda',
    num: '05',
    title: 'Explainable Crop Rotation MCDA',
    body: 'Instead of opaque yield predictions (excluded with HTTP 501), BARC AEZ-26 historical baselines combine with 4 farmer weights (Water, Soil Health, Heat Resilience, Profit) to rank low-drawdown Barind rotations like Mustard → Mungbean → T. Aman.',
    source: 'BARC AEZ-26 · Deterministic MCDA',
    badge: 'HISTORICAL BASELINE',
    accent: 'var(--m-emerald)',
    highlightLayer: 1,
    metricLabel: 'Aquifer Proxy Margin',
    metricVal: '26.4m / 28.0m Limit',
  },
  {
    id: 'gates',
    num: '06',
    title: 'Honest Scientific Boundaries',
    body: 'Every value keeps its provenance tag: Computed, Historical, Simulated, Proxy, or Blocked. What sensors do not measure yet (leaf_wetness_hours, Es, field-level cadastral labels) stays null or HTTP 422/501—never fabricated.',
    source: 'Forensic Audit Governance · M1–M6',
    badge: 'MODEL-DERIVED',
    accent: 'var(--m-violet)',
    highlightLayer: -1,
    metricLabel: 'Gated Endpoints',
    metricVal: 'HTTP 422 & 501',
  },
];

const STRATA = [
  { id: 0, label: '01 · Atmosphere & Solar Flux', sub: 'NASA POWER MERRA-2 / CERES (~34.8 km ESE)', color: 'var(--m-flare)', y: 24 },
  { id: 1, label: '02 · Sentinel-2 Canopy Layer', sub: '10m Optical + 20m B11 Resampled • 84.63% ± 3.81% CV', color: 'var(--m-emerald)', y: 92 },
  { id: 2, label: '03 · Terraced Surface & ESP32 Node', sub: 'Godagari AEZ-26 Clay-Loam • is_simulated: true', color: 'var(--m-terracotta)', y: 160 },
  { id: 3, label: '04 · Root-Zone (Zr=0.5m) & Aquifer Proxy', sub: 'TAW 79.0 mm • BMDA Synthetic Proxy 26.4m / 28.0m', color: 'var(--m-sky)', y: 228 },
];

export default function StickyFieldStory() {
  const [activeIdx, setActiveIdx] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.stepIdx);
            if (Number.isFinite(idx)) setActiveIdx(idx);
          }
        });
      },
      { rootMargin: '-38% 0px -42% 0px', threshold: 0.1 }
    );
    stepRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const current = STORY_STEPS[activeIdx] || STORY_STEPS[0];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
      }}
    >
      {/* Left: Scroll Narrative Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {STORY_STEPS.map((step, idx) => {
          const isActive = idx === activeIdx;
          return (
            <div
              key={step.id}
              ref={(el) => {
                stepRefs.current[idx] = el;
              }}
              data-step-idx={idx}
              onClick={() => setActiveIdx(idx)}
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                borderTop: `2px solid ${isActive ? step.accent : 'var(--border-subtle)'}`,
                opacity: isActive ? 1 : 0.72,
                transform: isActive ? 'translateX(4px)' : 'none',
                transition: 'opacity 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
              }}
            >
              <div className="methods-card-band" style={{ padding: '0.58rem 1.15rem' }}>
                <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 800, color: step.accent }}>
                  STEP {step.num} · {step.metricVal}
                </span>
                <ProvenanceBadge type={step.badge} compact />
              </div>
              <div style={{ padding: '1rem 1.25rem 1.15rem' }}>
                <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.58, margin: 0 }}>
                  {step.body}
                </p>
                <div style={{ marginTop: '0.65rem' }}>
                  <span className="methods-chip">{step.source}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Sticky 4-Strata Field Twin Visualizer */}
      <div style={{ position: 'sticky', top: '8.2rem' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `2px solid ${current.accent}` }}>
          <div className="methods-card-band">
            <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 800, color: current.accent }}>
              ACTIVE LAYER · {current.num} / 06
            </span>
            <span className="methods-chip">
              {current.metricLabel}: <strong style={{ color: 'var(--text-main)' }}>{current.metricVal}</strong>
            </span>
          </div>
          <div style={{ padding: '1.1rem 1.25rem' }}>

          <div className="surface" style={{ padding: '0.85rem', borderRadius: '14px' }}>
            <svg viewBox="0 0 460 300" role="img" aria-label="4-layer Barind field digital twin stratigraphy" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Vertical telemetry spine */}
              <line x1="36" y1="36" x2="36" y2="262" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="4 4" />
              {STRATA.map((st) => {
                const focused = current.highlightLayer === -1 || current.highlightLayer === st.id;
                const active = current.highlightLayer === st.id;
                return (
                  <g
                    key={st.id}
                    style={{
                      opacity: focused ? 1 : 0.3,
                      transform: active ? 'translateX(6px)' : 'none',
                      transition: 'opacity 0.35s ease, transform 0.35s ease',
                    }}
                  >
                    <circle cx="36" cy={st.y + 24} r={active ? 7 : 5} fill={st.color} />
                    <rect
                      x="58"
                      y={st.y}
                      width="382"
                      height="50"
                      rx="11"
                      fill="var(--bg-alt)"
                      stroke={active ? st.color : 'var(--border-subtle)'}
                      strokeWidth={active ? 2 : 1}
                    />
                    <rect x="58" y={st.y} width="6" height="50" rx="3" fill={st.color} />
                    <text x="76" y={st.y + 21} fontSize="11.5" fontWeight="700" fill="var(--text-main)" className="font-display">
                      {st.label}
                    </text>
                    <text x="76" y={st.y + 38} fontSize="9.5" fill="var(--text-muted)" className="mono">
                      {st.sub}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.75rem 0.9rem',
              borderRadius: '10px',
              background: 'var(--bg-alt)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: current.accent }}>{current.title}:</strong> {current.source}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
