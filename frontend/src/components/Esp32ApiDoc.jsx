import React from 'react';
import { Terminal, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ProvenanceBadge from './ProvenanceBadge';

export default function Esp32ApiDoc() {
  const examplePayload = {
    device_id: 'esp32-node-raj-01',
    event_id: 'evt-f89a3182-1082-45a2-8921-998124fa0123',
    observed_at: '2026-10-10T14:30:00Z',
    soil_moisture_vwc: 0.235,
    soil_temp_c: 26.8,
    air_temp_c: 29.4,
    relative_humidity_pct: 73.5,
    soil_ph: 6.4,
    calibration_version: 'cal-fdr-2026.1',
    quality_status: 'valid',
    is_simulated: false,
  };

  const curlExample = `curl -X POST http://localhost:5000/api/sensor-readings \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: env-configured-token" \\
  -d '${JSON.stringify(examplePayload, null, 2)}'`;

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
            <Terminal size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>ESP32 IoT Ingestion API Specification &amp; Hardware Contract</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Standardized HTTPS REST specification for edge probe hardware (Capacitive FDR soil moisture, DS18B20 soil temp, SHT31 ambient humidity).
          </p>
        </div>
        <ProvenanceBadge type="MODEL-DERIVED" label="POST /api/sensor-readings" compact />
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
        <p style={{ marginBottom: '0.45rem' }}>The ingestion pipeline enforces strict validation rules:</p>
        <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
          <li><strong>Idempotency:</strong> Rejects duplicate <code>event_id</code> with HTTP 409 Conflict.</li>
          <li><strong>Physical Bounds:</strong> VWC restricted to [0.0, 1.0], temperatures to [-10°C, 65°C], pH to [0, 14].</li>
          <li><strong>Auditability:</strong> Enforces explicit <code>is_simulated</code> boolean flag.</li>
          <li><strong>Backward Compatibility:</strong> Also exposed at <code>POST /api/v1/sensor-readings</code>.</li>
        </ul>
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          cURL Example for Edge Hardware / Gateway:
        </div>
        <pre
          className="mono"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            overflowX: 'auto',
            fontSize: '0.78rem',
            color: 'var(--accent-primary)',
            margin: 0,
          }}
        >
          {curlExample}
        </pre>
      </div>
    </div>
  );
}
