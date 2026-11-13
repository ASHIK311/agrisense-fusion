import React, { useState } from 'react';
import { ChevronDown, CloudSun, Cpu, Droplets, Layers, ShieldAlert, Wheat } from 'lucide-react';
import ProvenanceBadge from '../ProvenanceBadge';
import { AnimatedCounter } from '../charts/AnimatedChartCard';
import { WeatherAtmosphereOverlay, WindRotorGlyph } from '../charts/WeatherMicroVisuals';

function M1MiniViz() {
  const bars = [
    { label: '5-Fold CV', val: 84.63, color: 'var(--m-emerald)' },
    { label: 'Block C', val: 85.77, color: 'var(--m-sky)' },
    { label: 'Interior', val: 90.64, color: '#10b981' },
    { label: 'Boundary', val: 75.92, color: 'var(--m-flare)' },
  ];
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.9rem 1rem' }}>
      <div className="methods-scan-beam" aria-hidden="true" />
      {bars.map((b) => (
        <div key={b.label} style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '68px 1fr 52px', alignItems: 'center', gap: '0.5rem', fontSize: '0.68rem' }}>
          <span className="mono" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{b.label}</span>
          <div style={{ height: '7px', borderRadius: '999px', background: 'var(--bg-surface)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: `${b.val}%`, height: '100%', background: b.color, borderRadius: '999px', transition: 'width 0.7s ease' }} />
          </div>
          <span className="mono" style={{ textAlign: 'right', color: b.color, fontWeight: 700 }}>{b.val}%</span>
        </div>
      ))}
    </div>
  );
}

function M2MiniViz({ latestWeather }) {
  const windMs = Number(latestWeather?.ws10m ?? latestWeather?.wind_speed_10m ?? 2.8);
  const rainMm = Number(latestWeather?.precip_mm ?? latestWeather?.rainfall ?? 1.4);
  const tMax = Number(latestWeather?.t2m_max ?? latestWeather?.temp_max_c ?? 34.2);
  const rh = Number(latestWeather?.rh2m ?? 58);

  return (
    <div style={{ position: 'relative', height: '122px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Live running wind + rain canvas animations from Water & Soil weather visuals */}
      <WeatherAtmosphereOverlay type="wind" value={windMs} />
      <WeatherAtmosphereOverlay type="rain" value={Math.max(1.2, rainMm)} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mono" style={{ fontSize: '0.67rem', fontWeight: 700, color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <WindRotorGlyph speedMs={windMs} size={17} />
          <span>WIND {windMs.toFixed(1)} m/s (10m)</span>
        </span>
        <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--m-flare)', fontWeight: 700 }}>
          RAIN {rainMm.toFixed(1)} mm/d
        </span>
      </div>

      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
        {[
          { k: 'Tmax', v: `${tMax.toFixed(1)}°C`, c: 'var(--m-terracotta)' },
          { k: 'RH2M', v: `${rh.toFixed(0)}%`, c: 'var(--m-sky)' },
          { k: 'Offset', v: '34.8 km', c: 'var(--m-flare)' },
        ].map((p) => (
          <div key={p.k} style={{ padding: '0.32rem 0.45rem', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>{p.k}</div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 800, color: p.c }}>{p.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function M3MiniViz({ latestSensor }) {
  const vwcPct = Number(
    latestSensor?.soil_moisture_pct ??
      (latestSensor?.soil_moisture_vwc !== undefined ? latestSensor.soil_moisture_vwc * 100 : 25.4)
  );
  const markerLeft = Math.max(4, Math.min(96, ((vwcPct - 12) / (46 - 12)) * 100));
  const stops = [
    { label: 'PWP', pct: 16.5, color: 'var(--m-rose)' },
    { label: 'Trig', pct: 24.4, color: 'var(--m-flare)' },
    { label: 'FC', pct: 32.3, color: 'var(--m-sky)' },
    { label: 'Sat', pct: 43.5, color: 'var(--m-emerald)' },
  ];
  return (
    <div style={{ padding: '0.95rem 1rem', height: '122px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>VWC Profile (Zr = 0.50m)</span>
        <span style={{ color: 'var(--m-flare)', fontWeight: 700 }}>LIVE SIM: {vwcPct.toFixed(1)}%</span>
      </div>

      <div style={{ position: 'relative', margin: '0.25rem 0' }}>
        <div style={{ height: '13px', borderRadius: '999px', background: 'linear-gradient(90deg, rgba(244,63,94,0.48) 0%, rgba(251,191,36,0.48) 36%, rgba(56,189,248,0.48) 66%, rgba(52,211,153,0.52) 100%)', border: '1px solid var(--border-subtle)' }} />
        <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: `${markerLeft}%`, top: '50%', width: '20px', height: '20px', transform: 'translate(-50%, -50%)', overflow: 'visible' }} aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="var(--m-flare)" strokeWidth="1.6" className="methods-pulse-dot" />
          <circle cx="12" cy="12" r="4.5" fill="var(--m-flare)" stroke="var(--bg-canvas)" strokeWidth="1.5" />
        </svg>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', fontSize: '0.66rem' }}>
        {stops.map((s) => (
          <div key={s.label} className="mono">
            <div style={{ fontWeight: 800, color: s.color }}>{s.pct}%</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function M4MiniViz() {
  const crops = [
    { name: 'T. Aman', pct: 78.92, color: '#10b981' },
    { name: 'Maize', pct: 73.44, color: '#34d399' },
    { name: 'Wheat', pct: 57.41, color: '#38bdf8' },
    { name: 'T. Aus', pct: 40.98, color: '#f59e0b' },
    { name: 'Boro', pct: 40.51, color: '#ef4444' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.45rem', alignItems: 'end', height: '122px', padding: '0.8rem 1rem 0.6rem' }}>
      {crops.map((c) => (
        <div key={c.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '0.22rem' }}>
          <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{c.pct.toFixed(0)}%</span>
          <div style={{ width: '100%', maxWidth: '24px', height: `${Math.max(18, c.pct * 0.72)}%`, borderRadius: '5px 5px 2px 2px', background: c.color, opacity: 0.9, boxShadow: `0 0 10px -2px ${c.color}` }} />
          <span className="mono" style={{ fontSize: '0.61rem', color: 'var(--text-dim)' }}>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

function M5MiniViz({ waterBalance }) {
  const et0 = Number(waterBalance?.et0_mm_day ?? waterBalance?.reference_et0 ?? 4.78);
  return (
    <div style={{ position: 'relative', height: '122px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <WeatherAtmosphereOverlay type="et0" value={et0} />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--m-sky)' }}>ACTIVE ET₀ FLUX</span>
        <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--m-flare)' }}>{et0.toFixed(2)} mm/d</span>
      </div>
      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', textAlign: 'center' }}>
        {[
          { title: 'Parity Δ', val: '< 1e-6', sub: 'Py vs JS', color: 'var(--m-sky)' },
          { title: 'TAW', val: '79.0 mm', sub: 'Zr = 0.50 m', color: 'var(--m-emerald)' },
          { title: 'Es Mode', val: 'null', sub: 'Single-Kc', color: 'var(--m-flare)' },
        ].map((it) => (
          <div key={it.title} style={{ padding: '0.42rem 0.3rem', borderRadius: '9px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="mono" style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>{it.title}</div>
            <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 800, color: it.color, marginTop: '0.1rem' }}>{it.val}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{it.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function M6MiniViz() {
  const r = 34;
  const c = 2 * Math.PI * r;
  const ftLen = (48 / 60) * c;
  const absLen = (5 / 60) * c;
  const metaLen = (7 / 60) * c;

  return (
    <div style={{ height: '122px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0 }}>
        <svg viewBox="0 0 92 92" style={{ width: '100%', height: '100%' }}>
          <circle cx="46" cy="46" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 4" className="methods-slow-spin" />
          <g transform="rotate(-90 46 46)">
            <circle cx="46" cy="46" r={r} fill="none" stroke="#34d399" strokeWidth="7" strokeDasharray={`${ftLen} ${c}`} />
            <circle cx="46" cy="46" r={r} fill="none" stroke="#f59e0b" strokeWidth="7" strokeDasharray={`${absLen} ${c}`} strokeDashoffset={-ftLen} />
            <circle cx="46" cy="46" r={r} fill="none" stroke="#38bdf8" strokeWidth="7" strokeDasharray={`${metaLen} ${c}`} strokeDashoffset={-(ftLen + absLen)} />
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
              <AnimatedCounter value={60} decimals={0} />
            </div>
            <div className="mono" style={{ fontSize: '0.56rem', color: 'var(--text-dim)' }}>DOIs</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.32rem', fontSize: '0.69rem' }}>
        {[
          { n: 48, label: 'Full-Text Verified', color: '#34d399' },
          { n: 5, label: 'Abstract Verified', color: '#f59e0b' },
          { n: 7, label: 'Metadata Indexed', color: '#38bdf8' },
        ].map((t) => (
          <div key={t.label} className="mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.color }} />
              {t.label}
            </span>
            <strong style={{ color: t.color }}>{t.n}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubsystemFactorCards({ dashboardData, onInspect }) {
  const [openMap, setOpenMap] = useState({});

  const cards = [
    {
      id: 'm1',
      num: '01',
      title: 'Satellite & Canopy LULC (M1)',
      icon: Layers,
      accent: 'var(--m-emerald)',
      badgeType: 'SATELLITE-DERIVED',
      badgeLabel: 'SENTINEL-2 L2A',
      desc: '15-feature Random Forest across 12 cloud-screened Sentinel-2 scenes (10m optical B2/B3/B4/B8 + 20m Band 11 resampled to 10m).',
      chips: ['84.63% ± 3.81% CV', '90.64% Interior', 'HTTP 422 Species Gate'],
      math: 'NDVI = (B8 − B4) / (B8 + B4) | NDMI = (B8 − B11) / (B8 + B11) | Crop species classification returns HTTP 422 until DAE cadastral polygons are collected.',
      viz: <M1MiniViz />,
    },
    {
      id: 'm2',
      num: '02',
      title: 'NASA POWER Climate (M2)',
      icon: CloudSun,
      accent: 'var(--m-flare)',
      badgeType: 'NASA POWER',
      badgeLabel: 'MERRA-2 + CERES',
      desc: '1,827-day daily agroclimatology archive tethered at 24.3636°N, 88.6241°E (~34.8 km ESE of Godagari) with -999 missing-value filtering.',
      chips: ['0.5°×0.625° MERRA-2', '1.0° CERES', 'HTTP 501 Forecast Gate'],
      math: 'es(T) = 0.6108·exp(17.27T / (T + 237.3)) | VPD = es − ea | Heat-Dryness rule: Tmax ≥ 35°C ∧ RH2M ≤ 50% ∧ Rain ≤ 1 mm.',
      viz: <M2MiniViz latestWeather={dashboardData?.latestWeather} />,
    },
    {
      id: 'm3',
      num: '03',
      title: 'Soil & ESP32 Edge Telemetry (M3)',
      icon: Cpu,
      accent: 'var(--m-terracotta)',
      badgeType: 'SIMULATED',
      badgeLabel: 'TIER 1 UNCALIBRATED',
      desc: 'Synthetic ESP32 + Capacitive FDR v2 telemetry (5,760 CSV records; 500 fast-cache seed) enforcing UUID idempotency (HTTP 409) & bounds (HTTP 422).',
      chips: ['is_simulated: true', 'VWC ∈ [0.0, 1.0]', 'HTTP 409 Deduplication'],
      math: 'Provisional Barind clay-loam thresholds: θ_sat = 43.5%, θ_FC = 32.3%, θ_RAW = 24.4%, θ_PWP = 16.5% (gravimetric calibration pending).',
      viz: <M3MiniViz latestSensor={dashboardData?.latestSensor} />,
    },
    {
      id: 'm4',
      num: '04',
      title: 'BARC Suitability & Crop MCDA (M4)',
      icon: Wheat,
      accent: '#22c55e',
      badgeType: 'HISTORICAL BASELINE',
      badgeLabel: 'BARC AEZ-26',
      desc: 'Couples BARC historical suitability scores with deterministic 4-criterion MCDA ranking across Barind crop sequences.',
      chips: ['4-Slider Normalization', 'Reason Codes', 'HTTP 501 Yield Gate'],
      math: 'Score = Σ (wᵢ · sᵢ) / Σ wᵢ for {Water, Soil Health, Heat, Profit} | ML yield forecasting excluded (R² < 0 vs historical mean).',
      viz: <M4MiniViz />,
    },
    {
      id: 'm5',
      num: '05',
      title: 'FAO-56 Water Balance (M5)',
      icon: Droplets,
      accent: 'var(--m-sky)',
      badgeType: 'MODEL-DERIVED',
      badgeLabel: 'PENMAN-MONTEITH',
      desc: 'Exact FAO-56 reference ET₀ and root-zone depletion (Dr) verified across Python and Node.js engines with zero silent divergence.',
      chips: ['u₂ = 0.748·u₁₀', 'TAW = 79.0 mm', 'Es = null (Single-Kc)'],
      math: 'ET₀ = [0.408·Δ·(Rn−G) + γ·(900/(T+273))·u₂·(es−ea)] / [Δ + γ·(1 + 0.34·u₂)] | TAW = 1000·(θ_FC − θ_WP)·Zr.',
      viz: <M5MiniViz waterBalance={dashboardData?.waterBalance} />,
    },
    {
      id: 'm6',
      num: '06',
      title: 'Pathology Knowledge Base (M6)',
      icon: ShieldAlert,
      accent: '#f43f5e',
      badgeType: 'LITERATURE-DERIVED',
      badgeLabel: '17 DISEASES · 60 DOIs',
      desc: 'Environmental susceptibility rules across 17 Bangladesh crop diseases backed by 60 peer-reviewed DOI papers; strictly non-diagnostic.',
      chips: ['48 Full-Text DOIs', '5 Abstract / 7 Meta', 'leaf_wetness = null'],
      math: 'Screens temperature, RH%, and soil VWC/temp windows only; physical leaf_wetness_hours and spore traps are unmeasured (null).',
      viz: <M6MiniViz />,
    },
  ];

  const toggle = (id) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
    if (onInspect) onInspect('subsystems');
  };

  return (
    <div className="methods-subsystem-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const isOpen = Boolean(openMap[card.id]);
        return (
          <article
            key={card.id}
            className="card tilt-card"
            style={{
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderTop: `2px solid ${card.accent}`,
            }}
          >
            <div className="methods-viz-slot">{card.viz}</div>

            <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '9px',
                      border: '1px solid var(--border-subtle)',
                      display: 'grid',
                      placeItems: 'center',
                      color: card.accent,
                      background: 'var(--bg-alt)',
                    }}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>{card.num}</span>
                </span>
                <ProvenanceBadge type={card.badgeType} label={card.badgeLabel} compact />
              </div>

              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {card.title}
              </h3>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                {card.desc}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.15rem' }}>
                {card.chips.map((c) => (
                  <span
                    key={c}
                    className="mono"
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.16rem 0.5rem',
                      borderRadius: '999px',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-alt)',
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => toggle(card.id)}
                aria-expanded={isOpen}
                style={{
                  marginTop: 'auto',
                  paddingTop: '0.55rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'transparent',
                  border: 'none',
                  paddingLeft: 0,
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: card.accent,
                }}
              >
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                <span>{isOpen ? 'Hide formula & API gate' : 'See the math & API gate'}</span>
              </button>

              {isOpen && (
                <div
                  className="mono"
                  style={{
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.71rem',
                    lineHeight: 1.55,
                    color: 'var(--m-flare, #f2c879)',
                  }}
                >
                  {card.math}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
