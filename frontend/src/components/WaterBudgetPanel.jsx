import React from 'react';

export default function WaterBudgetPanel({ physics, weather, field }) {
  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Physics-Based Water Engine (FAO-56 Penman-Monteith)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Combines satellite-derived meteorological demand (NASA POWER) with root-zone moisture depletion 
          using standardized FAO-56 dual-boundary equations.
        </p>
      </div>

      <div className="grid-cards">
        <div className="card">
          <div className="card-title">
            <span>Atmospheric Demand (ET₀)</span>
            <span className="badge badge-live">Penman-Monteith</span>
          </div>
          <div className="card-value">
            {physics?.et0_mm_day ?? '--'} <span className="card-unit">mm/day</span>
          </div>
          <div className="card-subtext">
            Evaporative demand from a standardized reference grass surface.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Crop Water Demand (ETc)</span>
            <span className="badge badge-live">Kc = {physics?.cropKc ?? 1.0}</span>
          </div>
          <div className="card-value">
            {physics?.etc_mm_day ?? '--'} <span className="card-unit">mm/day</span>
          </div>
          <div className="card-subtext">
            ETc = Kc × ET₀ for the current crop growth stage.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Root-Zone Depletion (Dr)</span>
            <span className="badge badge-demo">Current Deficit</span>
          </div>
          <div className="card-value">
            {physics?.depletion_mm ?? '--'} <span className="card-unit">mm</span>
          </div>
          <div className="card-subtext">
            Total Available Water (TAW): <strong>{physics?.taw_mm ?? '--'} mm</strong>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Irrigation Recommendation</span>
            <span className="badge badge-live">Decision Rule</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.35rem', color: physics?.depletion_pct > 50 ? '#fbbf24' : '#34d399' }}>
            {physics?.depletion_pct > 50 ? 'Irrigation Triggered' : 'Sufficient Reserve'}
          </div>
          <div className="card-subtext">
            {physics?.depletion_pct > 50
              ? `Apply approx. ${physics?.depletion_mm} mm to return root zone to field capacity.`
              : 'Soil moisture is above 50% RAW threshold. No irrigation required today.'}
          </div>
        </div>
      </div>

      {/* Scientific Assumptions & Transparency Box */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-title">
          <span>Mathematical Model Specifications &amp; Approximations</span>
          <span className="badge badge-live">Traceable</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <p><strong>1. Wind Height Conversion:</strong> NASA POWER records wind velocity at 10 metres (u10). We apply the logarithmic wind profile: u2 = u10 × [4.87 / ln(67.8 × 10 - 5.42)] ≈ 0.748 × u10.</p>
          <p><strong>2. Net Radiation Approximation:</strong> Calculated using incoming solar flux (ALLSKY_SFC_SW_DWN) with reference albedo 0.23 and longwave adjustment (Rn ≈ 0.75 × Rns). Daily soil heat flux G ≈ 0.</p>
          <p><strong>3. Root-Zone Moisture:</strong> TAW = 1000 × (theta_FC - theta_WP) × Zr and Dr = 1000 × (theta_FC - theta) × Zr.</p>
          <p><strong>4. Direct Soil Evaporation:</strong> In accordance with blueprint section 3.5, direct soil evaporation (Es) is kept null and not fabricated without calibrated dual-coefficient lysimeter observations.</p>
        </div>
      </div>
    </div>
  );
}
