import React, { useState } from 'react';
import {
  Droplets,
  Layers,
  Box,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import DualInspector from './DualInspector';
import WaterBudgetPanel from './WaterBudgetPanel';
import ThreeLandscapeStage from './ThreeLandscapeStage';

const PROVISIONAL_THRESHOLDS = [
  { label: 'Saturation (θ_sat)', vwcPct: 43.5, color: '#0284C7', note: 'Provisional clay-loam pore saturation assumption' },
  { label: 'Field Capacity (θ_FC)', vwcPct: 32.3, color: '#06B6D4', note: 'Upper drained storage limit (TAW top boundary)' },
  { label: 'Irrigation Trigger (θ_RAW)', vwcPct: 24.4, color: '#D99A36', note: 'p = 0.50 depletion fraction threshold (Dr = RAW)' },
  { label: 'Permanent Wilting Point (θ_PWP)', vwcPct: 16.5, color: '#D65F58', note: 'Lower extractable water limit (TAW = 79.0 mm at Zr=0.50m)' },
];

export default function RootZonePhysicsWorkspace({
  waterBalance,
  latestSensor,
  latestWeather,
  embeddedSection = 'all',
}) {
  const [localCutawayMode, setLocalCutawayMode] = useState('2d'); // '2d' | '3d'
  const [efficiencyScenario, setEfficiencyScenario] = useState(85); // 70 vs 85%
  const cutawayMode =
    embeddedSection === 'cutaway-2d'
      ? '2d'
      : embeddedSection === 'cutaway-3d'
        ? '3d'
        : localCutawayMode;
  const isEmbedded = embeddedSection !== 'all';

  const et0 = waterBalance?.et0_mm_day ?? waterBalance?.reference_et0 ?? 4.78;
  const kc = waterBalance?.kc ?? waterBalance?.cropKc ?? 1.15;
  const etc = waterBalance?.etc_mm_day ?? waterBalance?.crop_etc ?? Number((et0 * kc).toFixed(2));
  const taw = waterBalance?.taw_mm ?? waterBalance?.total_available_water_taw ?? 79.0;
  const raw = waterBalance?.raw_mm ?? 39.5;
  const dr = waterBalance?.depletion_mm ?? waterBalance?.root_zone_depletion_dr ?? 38.2;
  const ks = dr > raw ? Number(((taw - dr) / (taw - raw)).toFixed(3)) : 1.0;
  const currentVwcPct = latestSensor?.soil_moisture_vwc
    ? Number((latestSensor.soil_moisture_vwc * 100).toFixed(1))
    : latestSensor?.soil_moisture_pct ?? 25.4;

  // Net irrigation requirement to refill root zone to Field Capacity (or maintain safe buffer)
  const netIrrigationMm = Math.max(0, Number((dr - 10.0).toFixed(1)));
  const grossAt70 = Number((netIrrigationMm / 0.7).toFixed(1));
  const grossAt85 = Number((netIrrigationMm / 0.85).toFixed(1));
  const waterSavedMm = Number((grossAt70 - grossAt85).toFixed(1));

  const showCutawayCard =
    embeddedSection === 'all' ||
    embeddedSection === 'cutaway-2d' ||
    embeddedSection === 'cutaway-3d';
  const showThresholds =
    embeddedSection === 'all' || embeddedSection === 'thresholds';
  const showEfficiency =
    embeddedSection === 'all' || embeddedSection === 'efficiency';
  const showChain =
    embeddedSection === 'all' ||
    embeddedSection === 'cutaway-2d' ||
    embeddedSection === 'cutaway-3d' ||
    embeddedSection === 'efficiency';
  const showBudget = embeddedSection === 'all' || embeddedSection === 'budget';
  const showDualInspector =
    embeddedSection === 'all' || embeddedSection === 'equations-ai';

  const renderThresholdCards = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Provisional Soil Moisture Thresholds (Zr = 0.50m)
        </strong>
        <ProvenanceBadge type="ASSUMPTION" label="PROVISIONAL BARIND CLAY-LOAM" compact />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {PROVISIONAL_THRESHOLDS.map((th) => (
          <div
            key={th.label}
            className="surface"
            style={{
              borderLeft: `4px solid ${th.color}`,
              padding: '0.55rem 0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{th.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{th.note}</div>
            </div>
            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: th.color, whiteSpace: 'nowrap' }}>
              {th.vwcPct}% VWC
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEfficiencyCard = () => (
    <div className="surface" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <strong style={{ fontSize: '0.8rem', color: 'var(--accent-water)', textTransform: 'uppercase' }}>
          Distribution Efficiency Scenario: 70% vs 85%
        </strong>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[70, 85].map((eff) => (
            <button
              key={eff}
              type="button"
              onClick={() => setEfficiencyScenario(eff)}
              style={{
                padding: '0.26rem 0.68rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                borderRadius: '6px',
                background: efficiencyScenario === eff ? 'var(--accent-water)' : 'var(--bg-surface)',
                color: efficiencyScenario === eff ? '#FFFFFF' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {eff}% Eff
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', fontSize: '0.78rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>NET DEPLETION</div>
          <div className="mono" style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '0.18rem', fontSize: '0.96rem' }}>
            {netIrrigationMm} mm
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>GROSS @ 70% vs 85%</div>
          <div className="mono" style={{ fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.18rem', fontSize: '0.96rem' }}>
            {grossAt70} vs {grossAt85} mm
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>AQUIFER SAVING</div>
          <div className="mono" style={{ fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.18rem', fontSize: '0.96rem' }}>
            -{waterSavedMm} mm/event
          </div>
        </div>
      </div>
    </div>
  );

  const renderChainBar = () => (
    <div
      style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        background: 'var(--bg-alt)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.76rem',
      }}
      className="mono"
    >
      <span style={{ color: 'var(--accent-water)', fontWeight: 800 }}>FAO-56 CHAIN:</span>
      <span>1. ET₀ = {Number(et0).toFixed(2)} mm/d</span>
      <span>→</span>
      <span>2. Kc = {kc}</span>
      <span>→</span>
      <span>3. ETc = {Number(etc).toFixed(2)} mm/d</span>
      <span>→</span>
      <span>4. TAW = {Number(taw).toFixed(1)} mm</span>
      <span>→</span>
      <span>5. RAW = {Number(raw).toFixed(1)} mm</span>
      <span>→</span>
      <span style={{ color: 'var(--accent-terracotta)', fontWeight: 800 }}>6. Dr = {Number(dr).toFixed(1)} mm</span>
      <span>→</span>
      <span>7. Ks = {ks}</span>
      <span>→</span>
      <span style={{ color: 'var(--accent-water)', fontWeight: 800 }}>
        8. Gross Irrig ({efficiencyScenario}%) = {efficiencyScenario === 85 ? grossAt85 : grossAt70} mm
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {(showCutawayCard || showThresholds || showEfficiency) && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                <span className="badge badge-model">
                  <Droplets size={13} /> Subsystem M5 • Vadose Hydrology
                </span>
                <ProvenanceBadge
                  type="MODEL-DERIVED"
                  label="FAO-56 PENMAN-MONTEITH • PYTHON/JS PARITY < 1e-6"
                  source="FAO Irrigation & Drainage Paper No. 56 (Allen et al., 1998)"
                  resolution="Daily Root-Zone Balance (Zr = 0.50m)"
                  calibration="Deterministic parity < 1e-6 | Provisional VWC thresholds"
                  missingVariables="Es = null (single-Kc mode; dual-Kc lysimeter uncalibrated)"
                  compact
                />
              </div>
              <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
                {embeddedSection === 'efficiency'
                  ? 'Conveyance & Distribution Efficiency (70% vs 85%)'
                  : embeddedSection === 'thresholds'
                    ? 'Provisional Barind Clay-Loam Moisture Thresholds'
                    : embeddedSection === 'cutaway-3d'
                      ? 'WebGL 3D Soil Column Pedon (0.0m – 0.50m)'
                      : 'Root-Zone Soil Moisture Cutaway & FAO-56 Water Balance'}
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Physical water balance calculation for Barind terraces: Daily ET₀, ETc, root depletion Dr, and aquifer suction limit.
              </p>
            </div>

            {!isEmbedded && (
              <div
                role="group"
                aria-label="Root-Zone Cutaway View Mode"
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-alt)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.2rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setLocalCutawayMode('2d')}
                  aria-pressed={cutawayMode === '2d'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.38rem 0.8rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: cutawayMode === '2d' ? 'var(--bg-surface)' : 'transparent',
                    color: cutawayMode === '2d' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    boxShadow: cutawayMode === '2d' ? 'var(--shadow-xs)' : 'none',
                  }}
                >
                  <Layers size={14} /> 2D Scientific Profile (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalCutawayMode('3d')}
                  aria-pressed={cutawayMode === '3d'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.38rem 0.8rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: cutawayMode === '3d' ? 'var(--bg-surface)' : 'transparent',
                    color: cutawayMode === '3d' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    boxShadow: cutawayMode === '3d' ? 'var(--shadow-xs)' : 'none',
                  }}
                >
                  <Box size={14} /> WebGL 3D Soil Column Pedon
                </button>
              </div>
            )}
          </div>

          {showCutawayCard && (
            <div style={{ display: 'grid', gridTemplateColumns: isEmbedded ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <div
                style={{
                  background: '#050E21',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  overflow: 'hidden',
                }}
              >
                {cutawayMode === '2d' ? (
                  <svg
                    role="img"
                    aria-label="2D Root-Zone Soil Moisture Cutaway Profile"
                    viewBox="0 0 540 270"
                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: isEmbedded ? '360px' : 'none' }}
                  >
                    <rect x="20" y="12" width="500" height="44" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.4)" rx="4" />
                    <text x="32" y="32" fill="#FBBF24" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">
                      ATMOSPHERIC DEMAND: ET₀ = {Number(et0).toFixed(2)} mm/d × Kc ({kc}) → ETc = {Number(etc).toFixed(2)} mm/d
                    </text>
                    <text x="32" y="47" fill="#7DD3FC" fontSize="9.5" fontFamily="var(--font-mono)">
                      Single-Kc Mode Active (Soil Evaporation Es = null — requires dual-Kc lysimeter)
                    </text>
                    <rect x="20" y="66" width="500" height="145" fill="#1C1917" stroke="#C87952" strokeWidth="1.5" rx="4" />
                    <line x1="25" y1="80" x2="515" y2="80" stroke="#0284C7" strokeDasharray="4 3" />
                    <text x="32" y="77" fill="#38BDF8" fontSize="9" fontFamily="var(--font-mono)">
                      θ_sat = 43.5% VWC (Provisional Assumption)
                    </text>
                    <line x1="25" y1="112" x2="515" y2="112" stroke="#06B6D4" strokeWidth="1.5" />
                    <text x="32" y="108" fill="#22D3EE" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="700">
                      θ_FC = 32.3% VWC (TAW Upper Bound = {Number(taw).toFixed(1)} mm)
                    </text>
                    <line x1="25" y1="152" x2="515" y2="152" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="6 3" />
                    <text x="32" y="148" fill="#FBBF24" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="700">
                      θ_trigger = 24.4% VWC (RAW = {Number(raw).toFixed(1)} mm) • Current = {currentVwcPct}%
                    </text>
                    <line x1="25" y1="195" x2="515" y2="195" stroke="#E36F67" strokeWidth="1.5" />
                    <text x="32" y="191" fill="#F87171" fontSize="9.5" fontFamily="var(--font-mono)" fontWeight="700">
                      θ_PWP = 16.5% VWC (Permanent Wilting Point)
                    </text>
                    <rect x="20" y="220" width="500" height="38" fill="#071936" stroke="#38BDF8" rx="4" />
                    <text x="32" y="243" fill="#38BDF8" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">
                      DEEP TUBEWELL AQUIFER PROXY: 26.4m Depth (Centrifugal Suction Limit: 28.0m)
                    </text>
                  </svg>
                ) : (
                  <div style={{ height: isEmbedded ? '360px' : '280px', width: '100%' }}>
                    <ThreeLandscapeStage
                      variant="pedon"
                      height={isEmbedded ? 360 : 280}
                      moisturePct={currentVwcPct}
                      depletionMm={dr}
                    />
                  </div>
                )}
              </div>

              {!isEmbedded && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.9rem' }}>
                  {renderThresholdCards()}
                  {renderEfficiencyCard()}
                </div>
              )}
            </div>
          )}

          {isEmbedded && showThresholds && renderThresholdCards()}
          {isEmbedded && showEfficiency && renderEfficiencyCard()}
          {showChain && renderChainBar()}
        </div>
      )}

      {showBudget && (
        <WaterBudgetPanel waterBalance={waterBalance} latestSensor={latestSensor} latestWeather={latestWeather} />
      )}

      {showDualInspector && (
        <DualInspector
          title="FAO-56 Physics Engine vs. Grounded RAG AI Dual-Inspector"
          deterministicTitle="FAO-56 Penman-Monteith & Root-Zone Depletion Trace"
          deterministicBadge="MODEL-DERIVED"
          equationOrRule={'ET0 = [0.408*Δ*(Rn - G) + γ*(900/(T+273))*u2*(es - ea)] / [Δ + γ*(1 + 0.34*u2)]\nETc = Kc * ET0 | TAW = 1000*(θ_FC - θ_PWP)*Zr | RAW = p * TAW | Ks = (TAW - Dr)/(TAW - RAW)'}
          inputs={[
            { label: 'θ_FC / θ_PWP', value: '32.3% / 16.5% VWC' },
            { label: 'Root Depth Zr', value: '0.50 m' },
            { label: 'Crop Coeff Kc', value: String(kc) },
            { label: 'Simulated VWC', value: `${currentVwcPct}%` },
          ]}
          outputs={[
            { label: 'Reference ET0', value: `${Number(et0).toFixed(2)} mm/day` },
            { label: 'Crop ETc', value: `${Number(etc).toFixed(2)} mm/day` },
            { label: 'TAW / RAW', value: `${Number(taw).toFixed(1)} / ${Number(raw).toFixed(1)} mm` },
            { label: 'Depletion Dr / Ks', value: `${Number(dr).toFixed(1)} mm / ${ks}` },
          ]}
          assumptions={[
            'Soil moisture thresholds (Sat 43.5%, FC 32.3%, Trigger 24.4%, PWP 16.5% VWC) are provisional Barind clay-loam assumptions.',
            'Soil evaporation Es = null because single-Kc mode is active and dual-Kc micro-lysimeters are not yet field-calibrated.',
            'Python reference implementation and Node.js runtime engine verified to < 1e-6 numerical parity.',
          ]}
          ragTitle="FAO-56 & Barind Irrigation Literature Synthesis"
          ragSummary="According to FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998) and Barind Multipurpose Development Authority (BMDA) field studies, scheduling irrigation when root-zone depletion (Dr) reaches Readily Available Water (RAW = 39.5 mm) and upgrading distribution efficiency from 70% (earthen channels) to 85% (buried PVC pipe / AWD) reduces gross groundwater extraction per irrigation event by ~17.6% while maintaining Ks = 1.0."
          citations={[
            {
              title: 'Crop Evapotranspiration — Guidelines for Computing Crop Water Requirements (FAO Paper 56)',
              authority: 'Allen et al., 1998 (FAO)',
              doi: '10.1016/j.agwat.2005.07.003',
            },
            {
              title: 'Groundwater Depletion and Sustainability in the High Barind Tract',
              authority: 'Jahan et al., 2010',
              doi: '10.1007/s12594-010-0083-0',
            },
          ]}
          suggestedPrompt="Explain the FAO-56 root-zone water balance calculation for Godagari Upazila, including the provisional soil moisture thresholds (43.5%, 32.3%, 24.4%, 16.5% VWC) and 70% vs 85% irrigation efficiency."
        />
      )}
    </div>
  );
}
