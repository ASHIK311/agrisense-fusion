import React from 'react';

export default function Header({
  farms,
  selectedFarmId,
  onSelectFarm,
  weatherStatus,
  isSimulatedReading,
  onRefreshNasa,
  onOpenSimulateModal,
  isRefreshing,
  videoMode,
  onToggleVideoMode
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="logo-group">
          <div className="mission-badge">
            <span className="dot dot-green"></span>
            NASA SPACE APPS 2026
          </div>
          <div>
            <h1 className="app-title">
              AgriSense <span>Fusion</span>
            </h1>
            <p className="app-subtitle">
              Field Shift: Earth Observation Agroclimatology &amp; Edge Sensing Command Center
            </p>
          </div>
        </div>

        <div className="header-actions">
          {/* Farm Location Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TARGET:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.84rem' }}
              value={selectedFarmId}
              onChange={(e) => onSelectFarm(e.target.value)}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.district})
                </option>
              ))}
            </select>
          </div>

          {/* NASA Status Indicator */}
          {weatherStatus?.isRealNasaData ? (
            <span className="badge badge-live" title="Direct live response from NASA POWER API">
              <span className="dot dot-green"></span>
              NASA POWER Live
            </span>
          ) : (
            <span className="badge badge-demo" title="NASA POWER delayed/timeout fallback">
              <span className="dot dot-amber"></span>
              NASA Fallback
            </span>
          )}

          {/* Sensor Status Indicator */}
          {isSimulatedReading ? (
            <span className="badge badge-demo" title="ESP32 reading is synthetic demonstration data">
              <span className="dot dot-amber"></span>
              ESP32: Demo Sim
            </span>
          ) : (
            <span className="badge badge-live" title="ESP32 hardware live telemetry">
              <span className="dot dot-green"></span>
              ESP32: Active
            </span>
          )}

          {/* Video Background Mode Toggle */}
          <button
            className="btn btn-video-toggle"
            onClick={onToggleVideoMode}
            title="Toggle background video footage between Earth Orbit, NASA GSFC Satellite, and Static Mode"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Feed: {videoMode === 'earth' ? 'Earth Orbit' : videoMode === 'satellite' ? 'NASA Satellite' : 'Static Dark'}
          </button>

          {/* Refresh NASA Data Button */}
          <button
            className="btn btn-secondary"
            onClick={onRefreshNasa}
            disabled={isRefreshing}
            title="Query latest available daily records from NASA POWER"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            {isRefreshing ? 'Syncing...' : 'Sync NASA'}
          </button>

          {/* Simulate ESP32 Reading Button */}
          <button
            className="btn btn-primary"
            onClick={onOpenSimulateModal}
            title="Inject a labelled simulated ESP32 reading to test ingestion & physics"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Simulate Reading
          </button>
        </div>
      </div>
    </header>
  );
}
