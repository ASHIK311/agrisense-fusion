import React from 'react';
import { Droplets, AlertTriangle, ShieldAlert } from 'lucide-react';
import ProvenanceBadge from './ProvenanceBadge';

export default function GroundwaterPanel({ groundwater, farm }) {
  const depth = groundwater?.depth_below_surface_m || 26.4;
  const critical = groundwater?.critical_threshold_m || 28.0;
  const buffer = Math.max(0, critical - depth).toFixed(1);
  const drawdownRate = groundwater?.annual_drawdown_rate_m || 0.65;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}>
            <Droplets size={16} style={{ color: 'var(--accent-water)' }} />
            <span>Barind Deep Tubewell Aquifer Monitoring &amp; Drawdown Proxy</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Groundwater level monitoring for deep irrigation tubewells (DTW) across BMDA zones in Godagari Upazila.
          </p>
        </div>
        <ProvenanceBadge
          type="SYNTHETIC PROXY"
          label="BMDA REGIONAL PROXY"
          source="Jahan et al. (2010) & BMDA Monitoring"
          calibration="Synthetic proxy based on published regional drawdown rates"
          compact
        />
      </div>

      {/* Honest Label Banner */}
      <div
        className="surface"
        style={{
          padding: '0.9rem 1.1rem',
          borderLeft: '4px solid var(--accent-amber)',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
        }}
      >
        <strong>Synthetic Proxy Disclosure:</strong> Groundwater table measurements are synthetic proxy readings derived from published BMDA trend information (<code>is_simulated: true</code>). The 28.0m critical threshold marks the centrifugal pump suction limit in AEZ-26; depths beyond 28m cause pump cavitation and irrigation failure. This is not a live automated telemetry feed.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Water Depth Below Surface</div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
            {depth} <span className="card-unit">metres</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Well ID: <strong>{groundwater?.well_identifier || 'DTW-BMDA-GODAGARI-42'}</strong>
          </div>
        </div>

        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Critical Drawdown Margin</div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
            {buffer} <span className="card-unit">m to critical</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Critical suction limit: <strong>{critical} metres</strong>
          </div>
        </div>

        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Annual Depletion Rate</div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-terracotta)', marginTop: '0.2rem' }}>
            +{drawdownRate} <span className="card-unit">m/year</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Driven by continuous dry-season Boro rice flood irrigation
          </div>
        </div>

        <div className="surface tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aquifer Sustainability Alert</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-danger)', marginTop: '0.3rem' }}>
            Shift from Boro Monoculture
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Recommended: Pulse/Mustard/T. Aman rotation
          </div>
        </div>
      </div>
    </div>
  );
}
