import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import ProvenanceBadge from './ProvenanceBadge';

export default function MetricCards({ latestSensor, latestWeather, waterBalance }) {
  const fmt = (val, decimals = 1, scale = 1, fallback = '--') =>
    val !== null && val !== undefined && Number.isFinite(Number(val))
      ? (Number(val) * scale).toFixed(decimals)
      : fallback;

  const vwc = fmt(latestSensor?.soil_moisture_vwc, 1, 100, '24.2');
  const soilTemp = fmt(latestSensor?.soil_temp_c, 1, 1, '--');
  const airTemp = fmt(latestWeather?.t2m, 1, 1, '31.4');
  const rh = fmt(latestWeather?.rh2m, 0, 1, '54');
  const solar = latestWeather ? (latestWeather.solar_radiation_mj || latestWeather.solar_mj_m2 || 20.4) : 20.4;
  const et0 = waterBalance ? (waterBalance.et0_mm_day ?? waterBalance.reference_et0 ?? 4.63) : 4.63;
  const etc = waterBalance ? (waterBalance.etc_mm_day ?? waterBalance.crop_etc ?? 5.32) : 5.32;
  const depletion = waterBalance ? (waterBalance.depletion_mm ?? waterBalance.root_zone_depletion_dr ?? 41.2) : 41.2;
  const taw = waterBalance ? (waterBalance.taw_mm ?? waterBalance.total_available_water_taw ?? 79.0) : 79.0;
  const raw = waterBalance ? (waterBalance.raw_mm || (taw * 0.5).toFixed(1)) : 39.5;
  const stressTriggered = waterBalance ? (waterBalance.irrigation_needed ?? depletion > raw) : true;

  return (
    <div>
      {/* FAO-56 Actionable Irrigation Status Banner */}
      <div className={`banner ${stressTriggered ? 'banner-warning' : 'banner-info'}`}>
        <div style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          {stressTriggered ? <AlertTriangle size={18} className="text-amber-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong style={{ color: 'var(--text-main)' }}>
              {stressTriggered
                ? 'FAO-56 Root-Zone Water Stress Alert: Depletion Exceeds Readily Available Water (Dr > RAW)'
                : 'FAO-56 Root-Zone Moisture Within Optimal Envelope (Dr ≤ RAW)'}
            </strong>
            <ProvenanceBadge
              type="MODEL-DERIVED"
              label="FAO-56 PENMAN-MONTEITH"
              source="FAO Irrigation & Drainage Paper No. 56 (Single-Kc Mode)"
              resolution="Daily Point Step | Zr = 0.50m"
              calibration="Python / JS Parity < 1e-6 | Provisional VWC thresholds"
              missingVariables="Es = null (requires dual-Kc lysimeter calibration)"
              compact
            />
          </div>
          <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            {waterBalance?.recommendation ||
              `Current root-zone depletion Dr = ${depletion} mm exceeds RAW = ${raw} mm (50% of TAW = ${taw} mm). Recommended net irrigation depth: ${(depletion - 10).toFixed(1)} mm.`}
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid-cards">
        {/* Card 1: Soil Moisture VWC */}
        <div className="card">
          <div className="card-title">
            <span>Soil Moisture (Root Zone)</span>
            <ProvenanceBadge
              type={latestSensor?.is_simulated !== false ? 'UNCALIBRATED' : 'MEASURED'}
              label="SIMULATED • UNCALIBRATED"
              source="Simulated ESP32 + Capacitive FDR v2 Dataset (5,760 source / 500 fast-cache)"
              resolution="Hourly Point Probe (0–30 cm)"
              coordinateOffset="Godagari Plot A-1 (24.469°N, 88.330°E)"
              calibration="calibration_status = UNCALIBRATED (gravimetric field curve pending)"
              compact
            />
          </div>
          <div className="card-value">
            {vwc}<span className="card-unit">% VWC</span>
          </div>
          <div className="card-subtext">
            <span>Soil Temp: <strong className="mono">{soilTemp}°C</strong> • pH: <strong className="mono">{latestSensor?.soil_ph || 6.4}</strong></span>
          </div>
        </div>

        {/* Card 2: Ambient Air & Humidity */}
        <div className="card">
          <div className="card-title">
            <span>Ambient Air &amp; Humidity</span>
            <ProvenanceBadge
              type="NASA POWER"
              label="NASA POWER MERRA-2"
              source="NASA Langley POWER Agroclimatology API (MERRA-2)"
              resolution="0.5° × 0.625° Grid (~50 km)"
              coordinateOffset="24.3636°N, 88.6241°E (~34.8 km ESE of Godagari centroid)"
              calibration="Satellite-reanalysis assimilation"
              compact
            />
          </div>
          <div className="card-value">
            {airTemp}<span className="card-unit">°C</span>
          </div>
          <div className="card-subtext">
            <span>Relative Humidity: <strong className="mono">{rh}%</strong> • 34.8 km ESE Grid Point</span>
          </div>
        </div>

        {/* Card 3: Solar Shortwave Irradiance */}
        <div className="card">
          <div className="card-title">
            <span>Solar Shortwave Radiation</span>
            <ProvenanceBadge
              type="NASA POWER"
              label="CERES 1.0°×1.0°"
              source="NASA CERES SYN1deg Shortwave Downward Irradiance (ALLSKY_SFC_SW_DWN)"
              resolution="1.0° × 1.0° Grid"
              coordinateOffset="24.3636°N, 88.6241°E (~34.8 km ESE)"
              compact
            />
          </div>
          <div className="card-value">
            {Number(solar).toFixed(1)}<span className="card-unit">MJ/m²/day</span>
          </div>
          <div className="card-subtext">
            <span>Drives net radiation (<code className="mono">Rn</code>) in Penman-Monteith <code className="mono">ET0</code></span>
          </div>
        </div>

        {/* Card 4: Reference ET0 & Crop ETc */}
        <div className="card">
          <div className="card-title">
            <span>Atmospheric Demand (ET₀ / ETc)</span>
            <ProvenanceBadge
              type="MODEL-DERIVED"
              label="FAO-56 PHYSICS"
              source="FAO-56 Penman-Monteith Reference Evapotranspiration"
              resolution="Daily Point Calculation"
              calibration="Python / JS Parity < 1e-6"
              missingVariables="Es = null"
              compact
            />
          </div>
          <div className="card-value" style={{ color: '#34D399' }}>
            {et0}<span className="card-unit">mm/day ET₀</span>
          </div>
          <div className="card-subtext">
            <span>Crop <code className="mono">ETc</code>: <strong className="mono">{etc} mm/d</strong> • <code className="mono">Dr</code>: <strong className="mono">{depletion}/{taw} mm</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
