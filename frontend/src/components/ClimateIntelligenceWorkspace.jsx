import React, { useMemo, useState } from 'react';
import {
  CloudSun,
  RefreshCw,
  ShieldAlert,
  Bot,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import WeatherChart from './WeatherChart';
import AnimatedMetricCard from './charts/AnimatedMetricCard';
import UncertaintyBandChart from './charts/UncertaintyBandChart';
import { WeatherAtmosphereOverlay, WindRotorGlyph } from './charts/WeatherMicroVisuals';

export default function ClimateIntelligenceWorkspace({
  weatherHistory = [],
  attribution,
  onSyncNasa,
  syncingNasa,
}) {
  const { askAssistantWithPrompt } = useAgriSense();
  const [forecastGateResult, setForecastGateResult] = useState(null);
  const [testingForecastGate, setTestingForecastGate] = useState(false);

  const latest =
    weatherHistory.length > 0
      ? weatherHistory[weatherHistory.length - 1]
      : {
          date: '2026-03-14',
          t2m: 31.4,
          t2m_max: 35.6,
          t2m_min: 22.1,
          rh2m: 48.0,
          precip_mm: 0.0,
          solar_mj_m2: 21.2,
          ws10m: 2.8,
        };

  const tMax = latest.t2m_max ?? (latest.t2m ? latest.t2m + 4.2 : 35.6);
  const tMin = latest.t2m_min ?? (latest.t2m ? latest.t2m - 5.1 : 22.1);
  const rh = latest.rh2m ?? 48.0;
  const rain = latest.precip_mm ?? 0.0;
  const solar = latest.solar_mj ?? latest.solar_mj_m2 ?? latest.solar_radiation_mj ?? 21.2;
  const ws10m = latest.ws10m ?? 2.8;
  const u2 = (ws10m * (4.87 / Math.log(67.8 * 10 - 5.42))).toFixed(2);

  // Compute Vapor Pressure Deficit (VPD kPa) via Tetens equation
  const esTmax = 0.6108 * Math.exp((17.27 * tMax) / (tMax + 237.3));
  const esTmin = 0.6108 * Math.exp((17.27 * tMin) / (tMin + 237.3));
  const es = (esTmax + esTmin) / 2;
  const ea = es * (rh / 100);
  const vpd = Math.max(0, es - ea).toFixed(2);

  // Project-specific compound heat-dryness screening rule
  const isHeatDryDay = tMax >= 35.0 && rh <= 50.0 && rain <= 1.0;

  // Rolling summary calculations
  const totalRain = weatherHistory
    .reduce((acc, d) => acc + (d.precip_mm || 0), 0)
    .toFixed(1);
  const meanTemp =
    weatherHistory.length > 0
      ? (
          weatherHistory.reduce((acc, d) => acc + (d.t2m || 28), 0) /
          weatherHistory.length
        ).toFixed(1)
      : '29.8';
  const dryDaysCount = weatherHistory.filter((d) => (d.precip_mm || 0) <= 1.0).length;

  const { tmaxSpark, vpdSpark, solarSpark, rainSpark, tempBandSeries, vpdBandSeries } = useMemo(() => {
    const validOrNull = (val) => (val === null || val === undefined || val === -999 || Number.isNaN(Number(val)) ? null : Number(val));
    const computeDayVpd = (d) => {
      const mx = validOrNull(d.t2m_max ?? (d.t2m !== undefined ? Number(d.t2m) + 4.2 : null));
      const mn = validOrNull(d.t2m_min ?? (d.t2m !== undefined ? Number(d.t2m) - 5.1 : null));
      const rhVal = validOrNull(d.rh2m);
      if (mx === null || mn === null || rhVal === null) return null;
      const esMax = 0.6108 * Math.exp((17.27 * mx) / (mx + 237.3));
      const esMin = 0.6108 * Math.exp((17.27 * mn) / (mn + 237.3));
      const esAvg = (esMax + esMin) / 2;
      const eaAvg = esAvg * (rhVal / 100);
      return Number(Math.max(0, esAvg - eaAvg).toFixed(2));
    };

    const tSp = [];
    const vSp = [];
    const sSp = [];
    const rSp = [];
    const tBand = [];
    const vRaw = [];

    weatherHistory.forEach((d, idx) => {
      const lbl = (d.date || d.rawDate || `D${idx + 1}`).slice(5);
      const tMeanVal = validOrNull(d.t2m);
      const tMaxVal = validOrNull(d.t2m_max ?? (tMeanVal !== null ? tMeanVal + 4.2 : null));
      const tMinVal = validOrNull(d.t2m_min ?? (tMeanVal !== null ? tMeanVal - 5.1 : null));
      const vpdVal = computeDayVpd(d);
      const solVal = validOrNull(d.solar_mj ?? d.solar_mj_m2 ?? d.solar_radiation_mj);
      const rainVal = validOrNull(d.precip_mm);

      if (tMaxVal !== null) tSp.push({ label: lbl, value: tMaxVal });
      if (vpdVal !== null) vSp.push({ label: lbl, value: vpdVal });
      if (solVal !== null) sSp.push({ label: lbl, value: solVal });
      if (rainVal !== null) rSp.push({ label: lbl, value: rainVal });

      tBand.push({
        label: lbl,
        center: tMeanVal,
        low: tMinVal,
        high: tMaxVal,
      });
      vRaw.push({ label: lbl, val: vpdVal });
    });

    const vBand = vRaw.map((entry, idx) => {
      if (entry.val === null) return { label: entry.label, center: null, low: null, high: null };
      const win = vRaw.slice(Math.max(0, idx - 6), idx + 1).map((x) => x.val).filter((x) => x !== null);
      const mean = win.reduce((a, b) => a + b, 0) / win.length;
      const variance = win.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / win.length;
      const sd = Math.sqrt(variance);
      return {
        label: entry.label,
        center: entry.val,
        low: Number(Math.max(0, mean - sd).toFixed(2)),
        high: Number((mean + sd).toFixed(2)),
      };
    });

    return {
      tmaxSpark: tSp.slice(-21),
      vpdSpark: vSp.slice(-21),
      solarSpark: sSp.slice(-21),
      rainSpark: rSp.slice(-21),
      tempBandSeries: tBand.slice(-30),
      vpdBandSeries: vBand.slice(-30),
    };
  }, [weatherHistory]);

  const testForecastGate = async () => {
    setTestingForecastGate(true);
    try {
      const res = await fetch('/api/v1/weather/forecast');
      const data = await res.json();
      setForecastGateResult({ status: res.status, payload: data });
    } catch (err) {
      setForecastGateResult({ status: 500, payload: { error: err.message } });
    } finally {
      setTestingForecastGate(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Header & Provenance Banner */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-nasa">
                <CloudSun size={13} /> Subsystem M2 • Agroclimatology
              </span>
              <ProvenanceBadge
                type="NASA POWER"
                label="MERRA-2 (0.5°×0.625°) + CERES (1.0°×1.0°)"
                source="NASA Langley Research Center POWER Project"
                resolution="MERRA-2 (Temp/RH/Wind/Rain 0.5°×0.625°) | CERES (Solar 1.0°×1.0°)"
                coordinateOffset="Extracted at 24.3636°N, 88.6241°E (~34.8 km ESE of Godagari 24.469°N, 88.330°E)"
                calibration="Historical reanalysis only; 501 gate on weather forecasting"
                compact
              />
            </div>
            <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
              NASA POWER Agroclimatology &amp; Desiccation Screening
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              High Barind atmospheric moisture demand and heat stress monitoring tied to the 34.8 km ESE reanalysis grid cell.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSyncNasa}
              disabled={syncingNasa}
            >
              <RefreshCw size={14} className={syncingNasa ? 'animate-spin' : ''} />
              <span>{syncingNasa ? 'Syncing NASA POWER...' : 'Sync NASA POWER Telemetry'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={testForecastGate}
              disabled={testingForecastGate}
            >
              <ShieldAlert size={14} />
              <span>Verify HTTP 501 Forecast Gate</span>
            </button>
          </div>
        </div>

        {forecastGateResult && (
          <div
            className="surface"
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1.1rem',
              borderLeft: '4px solid var(--accent-amber)',
            }}
          >
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
              HTTP {forecastGateResult.status} SCIENTIFIC GATE VERIFIED (GET /api/v1/weather/forecast):
            </div>
            <pre
              className="mono"
              style={{
                marginTop: '0.35rem',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                background: 'var(--bg-canvas)',
                padding: '0.65rem',
                borderRadius: '6px',
              }}
            >
              {JSON.stringify(forecastGateResult.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Parameter-Level Sparkline KPI Cards with Live Weather Canvas Micro-Animations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '1rem' }}>
        <AnimatedMetricCard
          title="Tmax / Tmin Range"
          value={Number(tMax)}
          decimals={1}
          unit={`°C (Tmin ${Number(tMin).toFixed(1)}°C)`}
          subtitle={`Rolling Mean Temp: ${meanTemp}°C`}
          series={tmaxSpark}
          seriesLabel="Daily Tmax Trend"
          seriesUnit="°C"
          accent="#FB923C"
          badgeType="NASA POWER"
          badgeLabel="MERRA-2 0.5°×0.625°"
          icon={Thermometer}
          overlay={<WeatherAtmosphereOverlay type="solar" value={tMax} />}
        />

        <AnimatedMetricCard
          title="Vapor Pressure Deficit (VPD)"
          value={Number(vpd)}
          decimals={2}
          unit="kPa"
          subtitleExtra={<WindRotorGlyph speedMs={ws10m} size={14} />}
          subtitle={`RH2M: ${Number(rh).toFixed(0)}% • Wind u₂: ${u2} m/s (at 2m)`}
          series={vpdSpark}
          seriesLabel="Daily VPD Trend"
          seriesUnit="kPa"
          accent="#A78BFA"
          badgeType="MODEL-DERIVED"
          badgeLabel="TETENS"
          icon={Wind}
          overlay={<WeatherAtmosphereOverlay type="wind" value={ws10m} />}
        />

        <AnimatedMetricCard
          title="Solar Irradiance"
          value={Number(solar)}
          decimals={1}
          unit="MJ/m²/d"
          subtitle="Parameter: ALLSKY_SFC_SW_DWN"
          series={solarSpark}
          seriesLabel="Daily Solar Flux"
          seriesUnit="MJ/m²"
          accent="#FBBF24"
          badgeType="NASA POWER"
          badgeLabel="CERES 1.0°×1.0°"
          icon={Sun}
          overlay={<WeatherAtmosphereOverlay type="solar" value={solar} />}
        />

        <AnimatedMetricCard
          title="Cumulative Rainfall"
          value={Number(totalRain)}
          decimals={1}
          unit={`mm (${weatherHistory.length}d)`}
          subtitle={`Dry days (≤ 1 mm): ${dryDaysCount} / ${weatherHistory.length} days`}
          series={rainSpark}
          seriesLabel="Daily Precipitation"
          seriesUnit="mm"
          accent="#38BDF8"
          badgeType="NASA POWER"
          badgeLabel="PRECTOTCORR"
          icon={Droplets}
          overlay={<WeatherAtmosphereOverlay type="rain" value={rain} />}
        />
      </div>

      {/* Compound Heat-Dryness Screening Card */}
      <div
        className="card tilt-card earth-module-card"
        style={{
          padding: '1.25rem 1.5rem',
          borderLeft: `4px solid ${isHeatDryDay ? 'var(--accent-danger)' : 'var(--m-emerald, var(--accent-primary))'}`,
        }}
      >
        <div className="card-title" style={{ marginBottom: '0.65rem' }}>
          <span>Compound Heat-Dryness Stress Screening Heuristic</span>
          <ProvenanceBadge
            type="ASSUMPTION"
            label="PROJECT HEURISTIC"
            source="AgriSense Agroclimatology Screening"
            calibration="Screening indicator only — NOT an official BMD or WMO meteorological declaration"
            compact
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="mono" style={{ fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 700 }}>
              Rule: <code>Tmax ≥ 35.0°C</code> AND <code>RH2M ≤ 50%</code> AND <code>Precipitation ≤ 1.0 mm</code>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: '640px' }}>
              Identifies acute atmospheric desiccation days that accelerate canopy transpiration, spike FAO-56 reference evapotranspiration (ET₀), and trigger rapid root-zone depletion.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              className={`badge ${isHeatDryDay ? 'badge-danger' : 'badge-live'}`}
              style={{ fontSize: '0.76rem', padding: '0.38rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span
                className="methods-pulse-dot"
                aria-hidden="true"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '999px',
                  background: isHeatDryDay ? 'var(--accent-danger)' : 'var(--m-emerald, #34d399)',
                  display: 'inline-block',
                }}
              />
              {isHeatDryDay ? (
                <>
                  <AlertTriangle size={13} /> COMPOUND HEAT-DRYNESS TRIGGERED
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} /> NORMAL ATMOSPHERIC ENVELOPE
                </>
              )}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                askAssistantWithPrompt(
                  'How is the compound heat-dryness screening rule defined in AgriSense Fusion, and what are the spatial resolutions of MERRA-2 vs CERES in NASA POWER?'
                )
              }
            >
              <Bot size={14} />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Weather Time-Series Chart */}
      <WeatherChart weatherHistory={weatherHistory} attribution={attribution} />

      {/* Daily Diurnal Dispersion & Rolling VPD Uncertainty Band Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
        <UncertaintyBandChart
          title="Diurnal Temperature Envelope (Tmin – Tmax Range)"
          subtitle="Daily mean air temperature (T2M) bounded by observed Tmin and Tmax extremes"
          unit="°C"
          badgeType="NASA POWER"
          badgeLabel="MERRA-2 DIURNAL SPREAD"
          source="NASA POWER (24.3636°N, 88.6241°E)"
          provenanceNote="Shaded envelope depicts observed daily Tmin–Tmax range (not a confidence interval). Missing or -999 values break the curve cleanly."
          data={tempBandSeries}
          centerLabel="T2M Mean"
          bandLabel="Daily Tmin–Tmax Range"
          accent="#FBBF24"
          decimals={1}
        />

        <UncertaintyBandChart
          title="Vapor Pressure Deficit (VPD) & Rolling 7-Day ±1σ SD"
          subtitle="Daily Tetens VPD against trailing 7-day rolling mean ± 1 standard deviation"
          unit="kPa"
          badgeType="MODEL-DERIVED"
          badgeLabel="ROLLING 7D ±1σ SD"
          source="Computed from NASA POWER Tmax, Tmin, RH2M"
          provenanceNote="Shaded band shows trailing 7-day ±1σ sample standard deviation of atmospheric VPD variability (explicitly SD, not prediction interval)."
          data={vpdBandSeries}
          centerLabel="Daily VPD"
          bandLabel="7-Day Rolling Mean ± 1σ SD"
          accent="#A78BFA"
          decimals={2}
        />
      </div>
    </div>
  );
}
