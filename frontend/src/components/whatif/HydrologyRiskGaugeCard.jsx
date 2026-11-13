import React from 'react';
import { Sliders, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import RulerSlider from './RulerSlider';
import ProvenanceBadge from '../ProvenanceBadge';

const BUFFER_CAP_MM = 500;
const GAUGE_MIN_MM = 200;
const GAUGE_MAX_MM = 1200;

/**
 * Interactive 3-Zone Semicircular Risk Gauge + Dual Ruler Sliders + Dynamic Alert + Save->Saved Action Card.
 * Tracks Scenario B gross seasonal groundwater extraction (mm) vs 500 mm dry-season Barind buffer.
 */
export default function HydrologyRiskGaugeCard({
  rightPreset,
  rightEfficiency,
  onChangeRightEfficiency,
  et0Input,
  onChangeEt0,
  rightGrossMm,
  seasonalSavingMm,
  isSaved,
  hasUnsavedChanges,
  onSave,
  onCancel,
}) {
  const clampedMm = Math.min(GAUGE_MAX_MM, Math.max(GAUGE_MIN_MM, Number(rightGrossMm) || 365));
  const gaugePct = ((clampedMm - GAUGE_MIN_MM) / (GAUGE_MAX_MM - GAUGE_MIN_MM)) * 100;

  // Map 0..100% left-to-right across upper semicircle: angle PI (left) -> 0 (right)
  const angle = Math.PI * (1 - gaugePct / 100);
  const kx = 155 + 130 * Math.cos(angle);
  const ky = 155 - 130 * Math.sin(angle);

  const deltaFromCap = Math.round(rightGrossMm - BUFFER_CAP_MM);
  const pctVsCap = Math.abs(((rightGrossMm - BUFFER_CAP_MM) / BUFFER_CAP_MM) * 100).toFixed(1);

  let zoneKey = 'fair';
  let statusText = 'Aquifer safe';
  let statusColor = '#10b981';
  let alertText = `Projected extraction is ${pctVsCap}% below the ${BUFFER_CAP_MM} mm dry-season Barind envelope (SIMULATED FAO-56 projection).`;

  if (rightGrossMm > 750) {
    zoneKey = 'high';
    statusText = 'High risk';
    statusColor = '#ef4444';
    alertText = `Extraction is ${pctVsCap}% above the ${BUFFER_CAP_MM} mm seasonal buffer — accelerates Barind DTW drawdown toward 28.0 m suction failure.`;
  } else if (rightGrossMm > 450) {
    zoneKey = 'ambitious';
    statusText = 'Elevated draw';
    statusColor = '#f59e0b';
    alertText = `Extraction is ${deltaFromCap >= 0 ? `${pctVsCap}% above` : `${pctVsCap}% near`} the ${BUFFER_CAP_MM} mm seasonal buffer — 85% buried pipe or legume relay advised.`;
  }

  const AlertIcon = zoneKey === 'fair' ? CheckCircle2 : zoneKey === 'ambitious' ? Info : AlertTriangle;

  return (
    <div className="whatif-gauge-card">
      {/* Header */}
      <div className="whatif-card-header">
        <div className="whatif-card-title-wrap">
          <Sliders size={17} />
          <span>Aquifer Extraction Risk</span>
        </div>
        <ProvenanceBadge type="SIMULATED" label="SIMULATED ENVELOPE" compact />
      </div>

      {/* Semi-Circular Multi-Zone Arc Gauge */}
      <div className="whatif-gauge-container">
        <div className="whatif-delta-pill mono" style={{ color: deltaFromCap > 0 ? statusColor : '#10b981' }}>
          {deltaFromCap >= 0 ? `+${deltaFromCap} mm over cap` : `${deltaFromCap} mm under cap`}
        </div>

        <svg className="whatif-gauge-svg" viewBox="0 0 310 175" role="img" aria-label="Aquifer extraction risk semicircular gauge">
          <path
            d="M 42 155 A 113 113 0 0 1 268 155"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeDasharray="3 5"
          />

          {/* Segment 1: Aquifer Safe */}
          <path
            d="M 25 155 A 130 130 0 0 1 182 28"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Segment 2: Elevated Draw */}
          <path
            d="M 193 31 A 130 130 0 0 1 251 68"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Segment 3: High Cavitation Risk */}
          <path
            d="M 259 78 A 130 130 0 0 1 285 155"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Active Ring Indicator Knob */}
          <g
            style={{
              transform: `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`,
              transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <circle r="11.5" className="whatif-gauge-knob-ring" />
          </g>
        </svg>

        <div className="whatif-gauge-center">
          <span className="whatif-gauge-subtitle">Gross extraction ({rightPreset.cropPattern.split('→')[0].trim()})</span>
          <div className="whatif-gauge-value mono">{rightGrossMm} mm</div>
          <span className="whatif-gauge-status" style={{ color: statusColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Dual Ruler Sliders */}
      <div className="whatif-sliders-grid">
        <RulerSlider
          label="Intervention η_irrig"
          value={rightEfficiency}
          min={55}
          max={90}
          step={5}
          onChange={onChangeRightEfficiency}
          displayValue={`${rightEfficiency}%`}
          badgeText={statusText}
          badgeColor={statusColor}
          fillColor={statusColor}
        />

        <RulerSlider
          label="Atmospheric ET₀"
          value={et0Input}
          min={3.0}
          max={7.0}
          step={0.1}
          onChange={onChangeEt0}
          displayValue={`${et0Input.toFixed(1)} mm/d`}
          badgeText={seasonalSavingMm >= 0 ? `${seasonalSavingMm} mm saved` : `+${Math.abs(seasonalSavingMm)} mm`}
          badgeColor="var(--text-muted)"
          fillColor="#10b981"
        />
      </div>

      {/* Dynamic Market/Aquifer Estimate Alert Banner */}
      <div className={`whatif-alert-box whatif-theme-${zoneKey}`}>
        <AlertIcon size={16} />
        <span>{alertText}</span>
      </div>

      {/* Cancel & Save Scenario -> Saved Micro-Interaction */}
      <div className="whatif-actions-row">
        <button
          type="button"
          className="whatif-btn whatif-btn-cancel"
          onClick={onCancel}
          disabled={!hasUnsavedChanges && !isSaved}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`whatif-btn whatif-btn-save ${isSaved ? 'is-saved' : ''}`}
          onClick={onSave}
        >
          {isSaved ? 'Saved' : 'Save scenario'}
        </button>
      </div>
    </div>
  );
}
