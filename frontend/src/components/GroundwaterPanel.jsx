import React from 'react';

export default function GroundwaterPanel({ groundwater, farm }) {
  const depth = groundwater?.depth_below_surface_m || 26.4;
  const critical = groundwater?.critical_threshold_m || 28.0;
  const buffer = Math.max(0, critical - depth).toFixed(1);
  const drawdownRate = groundwater?.annual_drawdown_rate_m || 0.65;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Barind Tract Deep Tubewell Aquifer Monitoring
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Groundwater level monitoring for deep irrigation tubewells (DTW) across Barind Multipurpose Development Authority (BMDA) zones.
        </p>
      </div>

      {/* Honest Label Banner */}
      <div className="banner banner-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <strong>Hydrological Caution:</strong> Groundwater water-table measurements are labelled demonstration readings. 
          Total regional aquifer storage cannot and must not be inferred from a single monitoring point.
        </div>
      </div>

      <div className="grid-cards">
        <div className="card">
          <div className="card-title">
            <span>Water Depth Below Surface</span>
            <span className="badge badge-demo">Simulated DTW</span>
          </div>
          <div className="card-value">
            {depth} <span className="card-unit">metres</span>
          </div>
          <div className="card-subtext">
            Well ID: <strong>{groundwater?.well_identifier || 'DTW-BMDA-GODAGARI-42'}</strong>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Critical Drawdown Margin</span>
            <span className="badge badge-danger">Warning Level</span>
          </div>
          <div className="card-value" style={{ color: '#fbbf24' }}>
            {buffer} <span className="card-unit">m to critical</span>
          </div>
          <div className="card-subtext">
            Critical suction limit threshold: <strong>{critical} metres</strong>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Annual Depletion Rate</span>
            <span className="badge badge-danger">High Risk</span>
          </div>
          <div className="card-value">
            +{drawdownRate} <span className="card-unit">m/year</span>
          </div>
          <div className="card-subtext">
            Driven by continuous dry-season Boro rice flood irrigation.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Aquifer Sustainability Alert</span>
            <span className="badge badge-live">Recommendation</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171', marginTop: '0.4rem' }}>
            Shift from Boro Monoculture
          </div>
          <div className="card-subtext">
            Switching to Mustard-Mungbean-Aman reduces deep extraction by ~65%.
          </div>
        </div>
      </div>

      {/* Visual Depth Gauge */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-title">
          <span>Aquifer Water Table Profile</span>
          <span className="badge badge-demo">Illustrative Profile</span>
        </div>
        <div style={{ padding: '1rem 0' }}>
          <div style={{ height: '36px', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex' }}>
            <div style={{ width: `${(depth / 35) * 100}%`, background: '#3b82f6', height: '100%', transition: 'width 0.5s ease' }}></div>
            <div style={{ position: 'absolute', right: `${(1 - (critical / 35)) * 100}%`, top: 0, bottom: 0, width: '3px', background: '#ef4444' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>Ground Surface (0m)</span>
            <span style={{ color: '#60a5fa' }}>Current Depth ({depth}m)</span>
            <span style={{ color: '#ef4444' }}>Critical Threshold ({critical}m)</span>
            <span>Bedrock (35m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
