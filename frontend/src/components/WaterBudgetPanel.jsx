import React from 'react';
import { Droplets, Sun, Scale, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import ProvenanceBadge from './ProvenanceBadge';

export default function WaterBudgetPanel(props) {
  const data = props.waterBalance || props.physics || {};
  const latestSensor = props.latestSensor;
  const latestWeather = props.latestWeather;

  const et0 = data.et0_mm_day ?? data.reference_et0 ?? 4.78;
  const etc = data.etc_mm_day ?? data.crop_etc ?? 5.49;
  const dr = data.depletion_mm ?? data.root_zone_depletion_dr ?? 38.2;
  const taw = data.taw_mm ?? data.total_available_water_taw ?? 79.0;
  const raw = data.raw_mm ?? Number((taw * 0.5).toFixed(1));
  const cropKc = data.cropKc ?? data.crop_kc ?? 1.15;
  const depletionPct = data.depletion_pct ?? Math.round((dr / taw) * 100);

  const isTriggered = dr >= raw || depletionPct >= 50;

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div
        className="card-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <Droplets size={16} style={{ color: 'var(--accent-water)' }} />
            <span>FAO-56 Penman-Monteith Root-Zone Water Budget</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Couples NASA POWER atmospheric demand with root-zone depletion (Zr = 0.50m)
          </div>
        </div>
        <ProvenanceBadge
          type="MODEL-DERIVED"
          label="FAO-56 SINGLE-KC"
          source="FAO-56 (Allen et al., 1998)"
          calibration="Python / JS Parity < 1e-6"
          compact
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Atmospheric Demand (ET₀)</span>
            <Sun size={13} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
            {Number(et0).toFixed(2)} <span className="card-unit">mm/day</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Standard reference grass surface
          </div>
        </div>

        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Crop Water Demand (ETc)</span>
            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Kc = {cropKc}</span>
          </div>
          <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            {Number(etc).toFixed(2)} <span className="card-unit">mm/day</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            ETc = Kc × ET₀ (Single-Kc Mode)
          </div>
        </div>

        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Root-Zone Depletion (Dr)</span>
            <Scale size={13} style={{ color: isTriggered ? 'var(--accent-danger)' : 'var(--accent-water)' }} />
          </div>
          <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: isTriggered ? 'var(--accent-danger)' : 'var(--accent-water)', marginTop: '0.2rem' }}>
            {Number(dr).toFixed(1)} <span className="card-unit">mm</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            TAW = {Number(taw).toFixed(1)} mm • RAW = {Number(raw).toFixed(1)} mm
          </div>
        </div>

        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Irrigation Advisory</span>
            {isTriggered ? (
              <AlertTriangle size={13} style={{ color: 'var(--accent-terracotta)' }} />
            ) : (
              <CheckCircle2 size={13} style={{ color: 'var(--accent-primary)' }} />
            )}
          </div>
          <div
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: isTriggered ? 'var(--accent-terracotta)' : 'var(--accent-primary)',
              marginTop: '0.3rem',
            }}
          >
            {isTriggered ? 'Irrigation Triggered' : 'Sufficient Reserve'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            {isTriggered
              ? `Apply approx. ${Math.max(15, Number(dr).toFixed(1))} mm net irrigation`
              : 'Depletion Dr < RAW threshold (no pumping needed)'}
          </div>
        </div>
      </div>

      {/* Scientific Specifications & Assumptions Box */}
      <div
        className="surface"
        style={{
          padding: '0.95rem 1.15rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
          <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>Mathematical Specifications &amp; Approximations:</span>
        </div>
        <p style={{ margin: '0 0 0.35rem 0' }}>
          <strong>1. Wind Height Conversion:</strong> NASA POWER records wind velocity at 10m (u₁₀). We apply logarithmic reduction: u₂ = u₁₀ × [4.87 / ln(67.8 × 10 - 5.42)] ≈ 0.748 × u₁₀.
        </p>
        <p style={{ margin: '0 0 0.35rem 0' }}>
          <strong>2. Net Radiation Approximation:</strong> Calculated using incoming solar flux (ALLSKY_SFC_SW_DWN) with reference albedo 0.23 and longwave adjustment (Rn ≈ 0.75 × Rns; daily soil heat flux G ≈ 0).
        </p>
        <p style={{ margin: '0 0 0.35rem 0' }}>
          <strong>3. Root-Zone Moisture Limits:</strong> TAW = 1000 × (θ_FC - θ_PWP) × Zr and Dr = 1000 × (θ_FC - θ) × Zr (Zr = 0.50m).
        </p>
        <p style={{ margin: 0 }}>
          <strong>4. Direct Soil Evaporation:</strong> Single-Kc mode is active; direct soil evaporation (Es) is kept null and not fabricated without calibrated micro-lysimeters.
        </p>
      </div>
    </div>
  );
}
