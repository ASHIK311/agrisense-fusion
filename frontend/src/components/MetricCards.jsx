import React from 'react';

export default function MetricCards({ farm, field, weather, sensor, physics }) {
  const latestW = weather?.latest || {};
  const latestS = sensor?.latestReading || {};
  const moisturePct = latestS.soil_moisture_vwc !== null && latestS.soil_moisture_vwc !== undefined
    ? (latestS.soil_moisture_vwc * 100).toFixed(1)
    : '--';

  const waterStatus = physics?.waterStatus || 'unknown';
  const getWaterBadge = (status) => {
    switch (status) {
      case 'optimal':
        return <span className="badge badge-live">Adequate (No Stress)</span>;
      case 'stress_warning':
        return <span className="badge badge-demo">Depletion Stress (&gt;50% RAW)</span>;
      case 'wilting_danger':
        return <span className="badge badge-danger">Critical Drought Deficit</span>;
      case 'saturated':
        return <span className="badge badge-live">Field Capacity (Saturated)</span>;
      default:
        return <span className="badge badge-demo">Computing...</span>;
    }
  };

  return (
    <div>
      {/* Telemetry Stream Information Bar */}
      <div style={{
        background: 'rgba(11, 20, 38, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{farm?.name}</strong>
              <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>ACTIVE FIELD</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
              GPS: {farm?.latitude}°N, {farm?.longitude}°E | ELEV: {farm?.elevation_m}m | SOIL: {field?.soil_type_label || field?.soil_type}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-dim)' }}>NASA OBSERVATION DATE:</span>{' '}
            <strong style={{ color: 'var(--neon-cyan)' }}>{latestW?.date || 'Latest Available'}</strong>
            <br />
            <span style={{ color: 'var(--text-dim)' }}>SENSOR INGESTION:</span>{' '}
            <span style={{ color: '#ffffff' }}>{latestS?.observed_at ? new Date(latestS.observed_at).toLocaleTimeString() : '--'}</span>
          </div>
        </div>
      </div>

      {/* Grid of 4 Key Agronomic Telemetry Cards */}
      <div className="grid-cards">
        {/* Card 1: Soil Moisture & Water Status */}
        <div className="card">
          <div className="card-title">
            <span>Soil Moisture (VWC)</span>
            {sensor?.isSimulated ? (
              <span className="badge badge-demo">Simulated</span>
            ) : (
              <span className="badge badge-live">Physical Probe</span>
            )}
          </div>
          <div className="card-value">
            {moisturePct} <span className="card-unit">% VWC</span>
          </div>

          {/* Moisture Gauge Bar */}
          <div style={{ marginTop: '0.75rem', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, (Number(moisturePct) / 45) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              borderRadius: '3px'
            }}></div>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
            {getWaterBadge(waterStatus)}
          </div>
          <div className="card-subtext">
            Root-Zone Depletion: <strong style={{ color: '#ffffff' }}>{physics?.depletion_mm ?? '--'} mm</strong> ({physics?.depletion_pct ?? '--'}% of TAW)
          </div>
        </div>

        {/* Card 2: Soil Thermal & pH */}
        <div className="card">
          <div className="card-title">
            <span>Soil Thermal &amp; pH</span>
            {sensor?.isSimulated ? (
              <span className="badge badge-demo">Simulated</span>
            ) : (
              <span className="badge badge-live">Physical Probe</span>
            )}
          </div>
          <div className="card-value">
            {latestS.soil_temp_c !== undefined ? latestS.soil_temp_c : '--'}{' '}
            <span className="card-unit">°C</span>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Soil Reaction:</span>
            <span style={{ fontWeight: 700, color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>pH {latestS.soil_ph ?? '--'}</span>
          </div>
          <div className="card-subtext">
            Sensor Depth: <strong>0.15m (Root Zone)</strong> | Cal: {latestS.calibration_version || 'cal-fdr-2026.1'}
          </div>
        </div>

        {/* Card 3: NASA POWER Air Temp & Humidity */}
        <div className="card">
          <div className="card-title">
            <span>NASA Air Temperature</span>
            {weather?.isRealNasaData ? (
              <span className="badge badge-live">NASA POWER</span>
            ) : (
              <span className="badge badge-demo">Fallback Record</span>
            )}
          </div>
          <div className="card-value">
            {latestW.t2m !== undefined ? latestW.t2m : '--'}{' '}
            <span className="card-unit">°C</span>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Min / Max Range:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{latestW.t2m_min ?? '--'}° / {latestW.t2m_max ?? '--'}°C</span>
          </div>
          <div className="card-subtext">
            RH: <strong style={{ color: '#ffffff' }}>{latestW.rh2m ?? '--'}%</strong> | Wind (u10): <strong style={{ color: '#ffffff' }}>{latestW.ws10m ?? '--'} m/s</strong>
          </div>
        </div>

        {/* Card 4: FAO-56 Reference ET0 & Crop ETc */}
        <div className="card">
          <div className="card-title">
            <span>Atmospheric Demand (ET₀)</span>
            <span className="badge badge-live">FAO-56 PM</span>
          </div>
          <div className="card-value">
            {physics?.et0_mm_day ?? '--'}{' '}
            <span className="card-unit">mm/day</span>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Crop ETc (Kc={physics?.cropKc}):</span>
            <strong style={{ color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>{physics?.etc_mm_day ?? '--'} mm/day</strong>
          </div>
          <div className="card-subtext">
            Solar Irradiance: <strong style={{ color: '#ffffff' }}>{latestW.solar_mj ?? '--'} MJ/m²/day</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
