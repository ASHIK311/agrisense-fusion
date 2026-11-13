import React, { useState } from 'react';
import { Zap, AlertTriangle, X } from 'lucide-react';

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
        source: 'Frontend Demonstration Console',
      },
    };

    try {
      const res = await fetch('/api/sensor-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Zap size={18} style={{ color: 'var(--accent-terracotta)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Simulate ESP32 Sensor Telemetry
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.5rem' }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="surface"
          style={{
            padding: '0.8rem 1rem',
            borderLeft: '4px solid var(--accent-amber)',
            marginBottom: '1.25rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <div>
            <strong>Simulated Telemetry Notice:</strong> This reading will be permanently flagged as{' '}
            <code>is_simulated: true</code> to maintain scientific integrity and auditability.
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(214, 95, 88, 0.1)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '8px',
              color: 'var(--accent-danger)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
              Soil Moisture (VWC: 0.05 to 0.50): <strong className="mono" style={{ color: 'var(--accent-water)' }}>{(vwc * 100).toFixed(1)}% VWC</strong>
            </label>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.01"
              value={vwc}
              onChange={(e) => setVwc(e.target.value)}
              className="slider-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Soil Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={soilTemp}
                onChange={(e) => setSoilTemp(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Air Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={airTemp}
                onChange={(e) => setAirTemp(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Relative Humidity (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={rh}
                onChange={(e) => setRh(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Soil pH (4.0 – 9.0)
              </label>
              <input
                type="number"
                step="0.1"
                value={soilPh}
                onChange={(e) => setSoilPh(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.65rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 1rem' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1.25rem' }}
            >
              {submitting ? 'Persisting Telemetry...' : 'Inject & Persist Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
