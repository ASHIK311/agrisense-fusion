import React, { useState } from 'react';

export default function SimulateReadingModal({ isOpen, onClose, onReadingCreated }) {
  if (!isOpen) return null;

  const [vwc, setVwc] = useState(0.24);
  const [soilTemp, setSoilTemp] = useState(26.5);
  const [soilPh, setSoilPh] = useState(6.4);
  const [airTemp, setAirTemp] = useState(29.8);
  const [rh, setRh] = useState(72.0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      device_id: 'esp32-node-raj-01',
      event_id: `evt-sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      observed_at: new Date().toISOString(),
      soil_moisture_vwc: parseFloat(vwc),
      soil_temp_c: parseFloat(soilTemp),
      air_temp_c: parseFloat(airTemp),
      relative_humidity_pct: parseFloat(rh),
      soil_ph: parseFloat(soilPh),
      calibration_version: 'cal-fdr-2026.1',
      quality_status: 'valid',
      is_simulated: true, // HONESTLY LABELED AS SIMULATED
      raw_payload: {
        simulated: true,
        source: 'Frontend Demonstration Console'
      }
    };

    try {
      const res = await fetch('/api/sensor-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onReadingCreated(data.reading);
        onClose();
      } else {
        setError(data.error || 'Failed to submit sensor reading');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Simulate ESP32 Sensor Telemetry
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', fontSize: '1.4rem' }}>
            &times;
          </button>
        </div>

        <div className="banner banner-warning" style={{ marginBottom: '1rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Simulated Telemetry Warning:</strong> This reading will be permanently flagged as 
            <code>is_simulated: true</code> to maintain scientific integrity and auditability.
          </div>
        </div>

        {error && (
          <div className="banner" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid #ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Soil Moisture VWC (0.0 to 0.65): <strong>{(vwc * 100).toFixed(1)}% VWC</strong></label>
            <input
              type="range"
              min="0.08"
              max="0.45"
              step="0.01"
              value={vwc}
              onChange={(e) => setVwc(e.target.value)}
              className="slider-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Soil Temp (°C):</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={soilTemp}
                onChange={(e) => setSoilTemp(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Soil pH (0-14):</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={soilPh}
                onChange={(e) => setSoilPh(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Ambient Air Temp (°C):</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={airTemp}
                onChange={(e) => setAirTemp(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Relative Humidity (%):</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={rh}
                onChange={(e) => setRh(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Post Reading (POST /api/sensor-readings)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
