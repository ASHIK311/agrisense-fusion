import React from 'react';

export default function Esp32ApiDoc() {
  const examplePayload = {
    device_id: "esp32-node-raj-01",
    event_id: "evt-f89a3182-1082-45a2-8921-998124fa0123",
    observed_at: "2026-10-10T14:30:00Z",
    soil_moisture_vwc: 0.235,
    soil_temp_c: 26.8,
    air_temp_c: 29.4,
    relative_humidity_pct: 73.5,
    soil_ph: 6.4,
    calibration_version: "cal-fdr-2026.1",
    quality_status: "valid",
    is_simulated: false
  };

  const curlExample = `curl -X POST http://localhost:5000/api/sensor-readings \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: env-configured-token" \\
  -d '${JSON.stringify(examplePayload, null, 2)}'`;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
          ESP32 IoT Ingestion API Contract
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Standardized HTTPS REST specification for edge probe hardware (Capacitive FDR soil moisture, DS18B20 soil temp, SHT31 ambient humidity).
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">
          <span>API Specification: <code>POST /api/sensor-readings</code></span>
          <span className="badge badge-live">Active Endpoint</span>
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <p style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            The ingestion pipeline enforces strict validation rules:
          </p>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
            <li><strong>Idempotency:</strong> Rejects duplicate <code>event_id</code> with HTTP 409 Conflict.</li>
            <li><strong>Physical Bounds:</strong> VWC restricted to [0.0, 1.0], temperatures to [-10°C, 65°C], pH to [0, 14].</li>
            <li><strong>Auditability:</strong> Enforces explicit <code>is_simulated</code> boolean flag.</li>
            <li><strong>Backward Compatibility:</strong> Also exposed at <code>POST /api/v1/sensor-readings</code>.</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            cURL Example for Edge Hardware / Gateway:
          </label>
          <pre style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            overflowX: 'auto',
            fontSize: '0.8rem',
            color: '#34d399',
            marginTop: '0.4rem'
          }}>
            {curlExample}
          </pre>
        </div>
      </div>
    </div>
  );
}
