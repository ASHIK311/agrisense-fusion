import React from 'react';
import { useAgriSense } from '../context/AgriSenseContext';

const PROVENANCE_STYLES = {
  MEASURED: { className: 'badge-measured' },
  'SATELLITE-DERIVED': { className: 'badge-satellite' },
  'NASA POWER': { className: 'badge-nasa' },
  SIMULATED: { className: 'badge-simulated' },
  UNCALIBRATED: { className: 'badge-uncalibrated' },
  'SYNTHETIC PROXY': { className: 'badge-proxy' },
  'HISTORICAL BASELINE': { className: 'badge-baseline' },
  'MODEL-DERIVED': { className: 'badge-model' },
  'LITERATURE-DERIVED': { className: 'badge-literature' },
  ASSUMPTION: { className: 'badge-assumption' },
  UNAVAILABLE: { className: 'badge-unavailable' },
  BLOCKED: { className: 'badge-blocked' },
};

export default function ProvenanceBadge({
  type = 'MODEL-DERIVED',
  label,
  source,
  resolution,
  coordinateOffset,
  calibration,
  missingVariables,
  compact = false,
}) {
  const { xRayMode } = useAgriSense();
  const normalized = (type || 'MODEL-DERIVED').toUpperCase();
  const styleMeta = PROVENANCE_STYLES[normalized] || PROVENANCE_STYLES['MODEL-DERIVED'];
  const displayLabel = label || normalized;

  const hasXRayDetails = Boolean(source || resolution || coordinateOffset || calibration || missingVariables);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span
        className={`badge ${styleMeta.className}`}
        style={compact ? { fontSize: '0.68rem', padding: '0.18rem 0.55rem' } : undefined}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
        <span>{displayLabel}</span>
      </span>

      {xRayMode && hasXRayDetails && (
        <span className="xray-drawer" style={{ marginTop: '0.45rem', textAlign: 'left', width: '100%', minWidth: '220px' }}>
          <strong style={{ color: 'var(--accent-terracotta)', display: 'block', marginBottom: '0.2rem' }}>
            Provenance Disclosure
          </strong>
          {source && <div><strong>Source:</strong> {source}</div>}
          {resolution && <div><strong>Resolution:</strong> {resolution}</div>}
          {coordinateOffset && <div><strong>Spatial Ref:</strong> {coordinateOffset}</div>}
          {calibration && <div><strong>Calibration:</strong> {calibration}</div>}
          {missingVariables && <div style={{ color: 'var(--accent-warning)' }}><strong>Missing/Null:</strong> {missingVariables}</div>}
        </span>
      )}
    </span>
  );
}
