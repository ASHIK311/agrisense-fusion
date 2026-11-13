import React, { useState } from 'react';
import { ChevronDown, Database, Lock, ShieldAlert, AlertTriangle, Cpu, Gauge } from 'lucide-react';
import ProvenanceBadge from '../ProvenanceBadge';

const HONEST_LIMITS = [
  {
    id: 'species-422',
    code: 'HTTP 422 BLOCKED',
    title: 'Crop-Species Classification',
    reason: 'Sentinel-2 classifies 4 land-cover classes (84.63% ± 3.81% CV), but fine-grained crop species (Wheat vs. Mustard) require DAE cadastral field polygons.',
    icon: Lock,
    color: '#ef4444',
  },
  {
    id: 'yield-501',
    code: 'HTTP 501 EXCLUDED',
    title: 'ML Crop Yield Prediction',
    reason: 'Candidate yield ML model scored R² < 0 relative to historical mean baselines and was intentionally excluded rather than deploying noisy forecasts.',
    icon: ShieldAlert,
    color: '#f59e0b',
  },
  {
    id: 'forecast-501',
    code: 'HTTP 501 EXCLUDED',
    title: 'Multi-Day Weather Forecast',
    reason: 'NASA POWER provides historical MERRA-2/CERES reanalysis (with ~34.8 km ESE offset from Godagari). Synoptic NWP weather forecasting is not implemented.',
    icon: AlertTriangle,
    color: '#f59e0b',
  },
  {
    id: 'es-null',
    code: 'Es = null',
    title: 'Bare-Soil Evaporation Split',
    reason: 'FAO-56 water balance runs in Single-Kc mode; bare-soil evaporation (Es) remains null until weighing micro-lysimeters are deployed.',
    icon: Database,
    color: '#38bdf8',
  },
  {
    id: 'leaf-wetness',
    code: 'leaf_wetness_hours = null',
    title: 'Foliar Disease Diagnosis',
    reason: 'Pathology KB (17 diseases, 60 DOIs) screens microclimatic suitability only; physical leaf-wetness sensors and spore traps are absent.',
    icon: ShieldAlert,
    color: '#e08a5f',
  },
  {
    id: 'proxy-sim',
    code: 'SIMULATED & PROXY',
    title: 'ESP32 Tier 1 & BMDA Well Gauge',
    reason: 'ESP32 FDR v2 records (5,760) carry is_simulated = true (uncalibrated). BMDA 26.4m / 28.0m well drawdown is a synthetic regional proxy.',
    icon: Gauge,
    color: '#a78bfa',
  },
];

const CALIBRATION_TIERS = [
  {
    tier: 'TIER 1 (ACTIVE)',
    name: 'Simulated / Uncalibrated Prototype',
    status: 'Current M3 Sensor State',
    desc: 'Synthetic ESP32 + Capacitive FDR v2 telemetry (5,760 source records; 500 fast-cache seed) explicitly flagged is_simulated = true and UNCALIBRATED.',
    color: 'var(--m-flare)',
  },
  {
    tier: 'TIER 2',
    name: 'Bench Dielectric Reference',
    status: 'Lab Protocol Defined',
    desc: 'Two-point air/water permittivity verification and temperature compensation against DS18B20 probe.',
    color: 'var(--m-terracotta)',
  },
  {
    tier: 'TIER 3',
    name: 'Barind Clay-Loam Gravimetric Curve',
    status: 'Field Campaign Planned',
    desc: 'Oven-dry gravimetric core sampling (105°C, 24h) across Godagari terraced clay-loam horizons (0–50 cm).',
    color: 'var(--m-sky)',
  },
  {
    tier: 'TIER 4',
    name: 'Dual-Kc Micro-Lysimeter Validation',
    status: 'Required for Es != null',
    desc: 'In-field weighing lysimeters to separate bare-soil evaporation (Es) from basal crop transpiration (Kcb).',
    color: 'var(--m-violet)',
  },
  {
    tier: 'TIER 5',
    name: 'BMDA Regional Operational Telemetry',
    status: 'Target Production Scale',
    desc: 'Automated LoRaWAN / cellular field nodes linked with live BMDA piezometric tubewell loggers.',
    color: 'var(--m-emerald)',
  },
];

const DATASET_GROUPS = [
  {
    group: 'Earth Observation & Terrain',
    accent: '#34d399',
    items: [
      { name: 'Sentinel-2 MSI Level-2A BOA', provider: 'ESA Copernicus', res: '10m optical · 20m B11→10m', status: 'LIVE (12 passes)' },
      { name: 'NASA POWER MERRA-2 + CERES', provider: 'NASA LaRC', res: '0.5°×0.625° · 1.0° (1,827d)', status: 'LIVE + CACHE' },
      { name: 'AWS Terrarium SRTM DEM Tiles', provider: 'NASA SRTM · AWS', res: '~30 m elevation & slope', status: 'LIVE PROXY' },
    ],
  },
  {
    group: 'In-Situ Soil & Aquifer Proxies',
    accent: '#e08a5f',
    items: [
      { name: 'ESP32 Capacitive FDR v2 Dataset', provider: 'AgriSense Edge Prototype', res: '5,760 records (500 seed)', status: 'SIMULATED' },
      { name: 'BMDA Piezometer Reference', provider: 'Jahan et al. 2010 / BMDA', res: '26.4m / 28.0m limit', status: 'SYNTHETIC PROXY' },
      { name: 'Open-Meteo Flood / River Discharge', provider: 'GloFAS / Open-Meteo', res: 'Regional basin grid', status: 'LIVE FALLBACK' },
    ],
  },
  {
    group: 'Agronomy & Pathology Literature',
    accent: '#38bdf8',
    items: [
      { name: 'BARC AEZ-26 Suitability & Calendars', provider: 'BARC / DAE Bangladesh', res: 'Upazila historical rating', status: 'HISTORICAL' },
      { name: 'Crop Pathology DOI Corpus', provider: 'Peer-Reviewed Journals', res: '17 diseases · 60 DOIs', status: '48 FT / 5 ABS / 7 META' },
      { name: 'FAO-56 Parity Benchmarks', provider: 'Allen et al. (1998)', res: '4 Barind seasonal cases', status: 'VERIFIED < 1e-6' },
    ],
  },
];

export default function HonestLimitsAndDatasets() {
  const [showAllDatasets, setShowAllDatasets] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Honest Limits Bento Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <strong className="font-display" style={{ fontSize: '1.08rem', color: 'var(--text-main)' }}>
            Where Our System Stops (Explicit Non-Claim Gates)
          </strong>
          <ProvenanceBadge type="ASSUMPTION" label="ZERO FABRICATED OUTPUTS" compact />
        </div>
        <div className="methods-bento-grid">
          {HONEST_LIMITS.map((lim) => {
            const Icon = lim.icon;
            return (
              <div key={lim.id} className="methods-bento-cell" style={{ borderTop: `2.5px solid ${lim.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.45rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'grid',
                        placeItems: 'center',
                        background: `${lim.color}1c`,
                        border: `1px solid ${lim.color}44`,
                        color: lim.color,
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    {lim.title}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.63rem',
                      fontWeight: 800,
                      color: lim.color,
                      padding: '0.16rem 0.48rem',
                      borderRadius: '999px',
                      background: `${lim.color}16`,
                      border: `1px solid ${lim.color}38`,
                    }}
                  >
                    {lim.code}
                  </span>
                </div>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.52, margin: 0 }}>
                  {lim.reason}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 5-Tier Sensor & Hydrological Calibration Roadmap */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-terracotta)' }}>
        <div className="methods-card-band">
          <strong className="font-display" style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
            5-Tier Sensor &amp; Hydrological Calibration Roadmap
          </strong>
          <span className="badge badge-simulated">Currently at Tier 1 (Uncalibrated Prototype)</span>
        </div>
        <div style={{ padding: '1.15rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          {CALIBRATION_TIERS.map((t) => (
            <div key={t.tier} className="surface tilt-card" style={{ borderTop: `2px solid ${t.color}`, padding: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', gap: '0.4rem' }}>
                <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 800, color: t.color }}>{t.tier}</span>
                <span className="methods-chip" style={{ fontSize: '0.6rem', padding: '0.12rem 0.42rem' }}>{t.status}</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>{t.name}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Every Dataset & Open Governance Registry */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-sky)' }}>
        <div className="methods-card-band">
          <div>
            <strong className="font-display" style={{ fontSize: '0.98rem' }}>
              Every Dataset, Instrument Resolution &amp; Validation Status
            </strong>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Full transparency across satellite, reanalysis, simulated edge hardware, and literature sources.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAllDatasets((v) => !v)}
            aria-expanded={showAllDatasets}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
          >
            <Database size={13} />
            <span>{showAllDatasets ? 'Hide Full Lineage Table' : 'View Full Lineage Table'}</span>
            <ChevronDown size={13} style={{ transform: showAllDatasets ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>
        </div>

        <div style={{ padding: '1.15rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
          {DATASET_GROUPS.map((grp) => (
            <div key={grp.group} className="surface" style={{ padding: '1rem', borderTop: `2px solid ${grp.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.7rem', fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: grp.accent }} />
                {grp.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {grp.items.map((item) => (
                  <div key={item.name} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</span>
                      <span className="mono" style={{ fontSize: '0.62rem', color: grp.accent, fontWeight: 700, whiteSpace: 'nowrap' }}>{item.status}</span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {item.provider} · {item.res}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {showAllDatasets && (
          <div className="table-container" style={{ padding: '0 1.25rem 1.25rem' }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Domain</th>
                  <th scope="col">Dataset / Standard</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Resolution / Scale</th>
                  <th scope="col">Operational Status</th>
                </tr>
              </thead>
              <tbody>
                {DATASET_GROUPS.flatMap((g) =>
                  g.items.map((it) => (
                    <tr key={it.name}>
                      <td>{g.group}</td>
                      <td><strong>{it.name}</strong></td>
                      <td>{it.provider}</td>
                      <td className="mono">{it.res}</td>
                      <td className="mono">{it.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
