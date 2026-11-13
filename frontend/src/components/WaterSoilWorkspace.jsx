import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  Droplets,
  Waves,
  Cpu,
  Gauge,
  SlidersHorizontal,
  AlertTriangle,
  Bot,
  ShieldCheck,
  Play,
  ArrowRight,
  MapPin,
  RefreshCw,
  Zap,
  CloudRain,
  Wind,
  Sun,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import { slideFill, getRelativeEdges } from '../utils/motion';
import RootZonePhysicsWorkspace from './RootZonePhysicsWorkspace';
import SoilIotWorkspace from './SoilIotWorkspace';
import GroundwaterPanel from './GroundwaterPanel';
import ProvenanceBadge from './ProvenanceBadge';
import { AnimatedCounter } from './charts/AnimatedChartCard';
import { WeatherAtmosphereOverlay, WindRotorGlyph } from './charts/WeatherMicroVisuals';
import RainfallETComparisonChart from './charts/RainfallETComparisonChart';
import RootZoneWaterProfile from './charts/RootZoneWaterProfile';
import TerrainProfileAndSlopeCards from './charts/TerrainProfileAndSlopeCards';

const SIDE_CATEGORIES = [
  {
    id: 'root-zone',
    label: 'Root-Zone Physics',
    icon: Droplets,
    tabs: ['Budget Overview', '2D Cutaway Profile', '3D Soil Pedon', 'Equation Trace & AI'],
  },
  {
    id: 'irrigation',
    label: 'Irrigation & Thresholds',
    icon: Waves,
    tabs: ['70% vs 85% Efficiency', 'VWC Thresholds'],
  },
  {
    id: 'soil-iot',
    label: 'Soil & ESP32 IoT',
    icon: Cpu,
    tabs: ['AEZ-26 Soil Profile', 'Telemetry (5,760)', 'Live VWC & Modal', 'ESP32 API Contract'],
  },
  {
    id: 'aquifer',
    label: 'Aquifer & Terrain',
    icon: Gauge,
    tabs: ['BMDA Well Gauge', 'Drawdown & Rotation', 'DEM Profile & Slope'],
  },
  {
    id: 'runner',
    label: 'ET₀ Runner & Parity',
    icon: SlidersHorizontal,
    tabs: ['Live ET₀ Calculator', 'Calibration & Parity'],
  },
];

export default function WaterSoilWorkspace({
  dashboardData,
  onOpenSimulateModal,
  onSyncNasa,
  syncingNasa = false,
}) {
  const {
    workspaceModes,
    setWorkspaceSubMode,
    navigateToWorkspace,
    askAssistantWithPrompt,
    selectedLocation,
    isPrimaryGodagari,
    selectRegion,
    selectedFieldId,
    setSelectedFieldId,
    dynamicFields,
  } = useAgriSense();

  const [activeSideIdx, setActiveSideIdx] = useState(() =>
    workspaceModes?.hydrology === 'soil-iot' ? 2 : 0
  );
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  const sideFillRef = useRef(null);
  const sideBtnRefs = useRef([]);
  const topFillRef = useRef(null);
  const topBtnRefs = useRef([]);
  const firstMountSide = useRef(true);
  const lastTabSide = useRef(activeSideIdx);

  const currentMenu = SIDE_CATEGORIES[activeSideIdx];

  const lat = Number(selectedLocation?.lat ?? 24.469);
  const lon = Number(selectedLocation?.lon ?? 88.330);

  // Open Hydrology API states (Open-Meteo NWP Forecast, GloFAS River Discharge, AWS Terrarium DEM)
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [riverData, setRiverData] = useState(null);
  const [demData, setDemData] = useState(null);
  const [demLoading, setDemLoading] = useState(false);

  const fetchOpenHydrology = useCallback(async () => {
    setForecastLoading(true);
    try {
      const [fcRes, rvRes] = await Promise.allSettled([
        fetch(`/api/v1/water/forecast?lat=${lat}&lon=${lon}`).then((r) => r.json()),
        fetch(`/api/v1/water/river-discharge?lat=${lat}&lon=${lon}`).then((r) => r.json()),
      ]);
      if (fcRes.status === 'fulfilled') setForecastData(fcRes.value);
      if (rvRes.status === 'fulfilled') setRiverData(rvRes.value);
    } finally {
      setForecastLoading(false);
    }
  }, [lat, lon]);

  const fetchDemProfile = useCallback(async () => {
    setDemLoading(true);
    try {
      const res = await fetch(`/api/v1/water/dem-profile?lat=${lat}&lon=${lon}`);
      const json = await res.json();
      setDemData(json);
    } catch (err) {
      setDemData({ available: false, error: err.message });
    } finally {
      setDemLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchOpenHydrology();
  }, [fetchOpenHydrology]);

  // Fetch DEM lazily when entering Terrain sub-tab
  useEffect(() => {
    if (activeSideIdx === 3 && activeTabIdx === 2 && !demData && !demLoading) {
      fetchDemProfile();
    }
  }, [activeSideIdx, activeTabIdx, demData, demLoading, fetchDemProfile]);

  useEffect(() => {
    setDemData(null);
  }, [lat, lon]);

  // Live ET₀ / Water-Balance interactive calculator state
  const latestWeather = dashboardData?.latestWeather;
  const latestSensor = dashboardData?.latestSensor;
  const waterBalance = dashboardData?.waterBalance;
  const weatherHistory = dashboardData?.weatherHistory || [];

  const [calcForm, setCalcForm] = useState({
    tMax: latestWeather?.temp_max_c ?? latestWeather?.t2m_max ?? 34.2,
    tMin: latestWeather?.temp_min_c ?? latestWeather?.t2m_min ?? 23.6,
    rhMean: latestWeather?.relative_humidity_pct ?? latestWeather?.rh2m ?? 68.0,
    solarRadiationMJ: latestWeather?.solar_radiation_mj ?? latestWeather?.solar_mj ?? 19.4,
    windSpeed10m: latestWeather?.wind_speed_10m_ms ?? latestWeather?.ws10m ?? 2.4,
    kc: waterBalance?.cropKc ?? 1.15,
    rootDepthM: 0.5,
    theta: latestSensor?.soil_moisture_vwc ?? 0.244,
  });
  const [calcResult, setCalcResult] = useState(null);
  const [calcRunning, setCalcRunning] = useState(false);
  const [calcError, setCalcError] = useState('');

  // Sync deep links coming from Command Hub or Ctrl+K Search
  useEffect(() => {
    if (workspaceModes?.hydrology === 'soil-iot' && activeSideIdx !== 2) {
      setActiveSideIdx(2);
      setActiveTabIdx(0);
    } else if (workspaceModes?.hydrology === 'root-zone' && activeSideIdx === 2) {
      setActiveSideIdx(0);
      setActiveTabIdx(0);
    }
  }, [workspaceModes?.hydrology]);

  // Animate vertical (desktop) / horizontal (mobile) sidebar pill
  const positionSidePill = (immediate = false) => {
    const fill = sideFillRef.current;
    const btn = sideBtnRefs.current[activeSideIdx];
    if (!fill || !btn) return;
    const isStacked = window.innerWidth <= 768;
    slideFill(fill, getRelativeEdges(fill, btn), immediate, {
      axis: isStacked ? 'horizontal' : 'vertical',
      radius: '10px',
    });
  };

  useLayoutEffect(() => {
    positionSidePill(firstMountSide.current);
    firstMountSide.current = false;
  }, [activeSideIdx]);

  // Animate horizontal sub-tab pill inside the Water & Soil topbar
  const positionTopPill = (immediate = false) => {
    const fill = topFillRef.current;
    const btn = topBtnRefs.current[activeTabIdx];
    if (!fill || !btn) return;
    slideFill(fill, getRelativeEdges(fill, btn), immediate, {
      axis: 'horizontal',
      radius: '8px',
    });
  };

  useLayoutEffect(() => {
    const switchedCategory = lastTabSide.current !== activeSideIdx;
    lastTabSide.current = activeSideIdx;
    positionTopPill(switchedCategory);
  }, [activeSideIdx, activeTabIdx]);

  useEffect(() => {
    const onResize = () => {
      positionSidePill(true);
      positionTopPill(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeSideIdx, activeTabIdx]);

  const handleSelectSide = (idx) => {
    setActiveSideIdx(idx);
    setActiveTabIdx(0);
    if (idx === 2) {
      setWorkspaceSubMode('hydrology', 'soil-iot');
    } else if (idx === 0) {
      setWorkspaceSubMode('hydrology', 'root-zone');
    }
  };

  const handleRunLiveBalance = async (e) => {
    e.preventDefault();
    setCalcRunning(true);
    setCalcError('');
    try {
      const tMax = Number(calcForm.tMax);
      const tMin = Number(calcForm.tMin);
      const res = await fetch('/api/v1/physics/water-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather: {
            tMax,
            tMin,
            tMean: Number(((tMax + tMin) / 2).toFixed(2)),
            rhMean: Number(calcForm.rhMean),
            solarRadiationMJ: Number(calcForm.solarRadiationMJ),
            windSpeed10m: Number(calcForm.windSpeed10m),
            latitude: lat,
            elevationM: 28.0,
          },
          soil: {
            thetaFC: 0.323,
            thetaWP: 0.165,
            rootDepthM: Number(calcForm.rootDepthM),
            theta: Number(calcForm.theta),
          },
          crop: {
            kc: Number(calcForm.kc),
            depletionFraction: 0.5,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.metrics) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setCalcResult(data);
    } catch (err) {
      setCalcError(err.message || 'Failed to compute water balance');
    } finally {
      setCalcRunning(false);
    }
  };

  const renderAtmosphereCardsStrip = () => {
    const latestRec = weatherHistory[weatherHistory.length - 1] || latestWeather || {};
    const precipMm = Number(latestRec.precip_mm ?? latestRec.rainfall ?? forecastData?.records?.[0]?.precip_mm ?? 0);
    const ws10m = Number(latestRec.ws10m ?? latestRec.wind_speed_10m_ms ?? forecastData?.records?.[0]?.wind_max_ms ?? 2.4);
    const u2Ms = Number((ws10m * 0.748).toFixed(2));
    const et0 = Number(waterBalance?.et0_mm_day ?? waterBalance?.reference_et0 ?? 2.91);
    const riverM3s = riverData?.available ? riverData.summary?.latest_m3s : null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem' }}>
        {/* 1. Rain Card with Motion-Driven Falling Rain / Dry Horizon */}
        <div className="surface weather-anim-card" style={{ padding: '1rem' }}>
          <WeatherAtmosphereOverlay type="rain" value={precipMm} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Precipitation Flux
              </span>
              <CloudRain size={15} style={{ color: '#38bdf8' }} />
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.22rem' }}>
              <AnimatedCounter value={precipMm} decimals={1} suffix=" mm/d" />
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {precipMm > 0.05 ? 'Active rainfall intensity' : 'Dry spell (0 mm rain — heat horizon mode)'}
            </div>
          </div>
        </div>

        {/* 2. Wind Speed Card with Smooth Airflow Canvas & Rotating Anemometer */}
        <div className="surface weather-anim-card" style={{ padding: '1rem' }}>
          <WeatherAtmosphereOverlay type="wind" value={ws10m} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Wind Speed (u₁₀ → u₂)
              </span>
              <WindRotorGlyph speedMs={ws10m} size={18} />
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#22d3ee', marginTop: '0.22rem' }}>
              <AnimatedCounter value={u2Ms} decimals={2} suffix=" m/s" />
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              10m NASA POWER: {ws10m.toFixed(1)} m/s (0.748 log factor)
            </div>
          </div>
        </div>

        {/* 3. ET0 Demand Card with Solar Vapor Canvas */}
        <div className="surface weather-anim-card" style={{ padding: '1rem' }}>
          <WeatherAtmosphereOverlay type="solar" value={et0} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Reference Demand (ET₀)
              </span>
              <Sun size={15} style={{ color: '#fbbf24' }} />
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.22rem' }}>
              <AnimatedCounter value={et0} decimals={2} suffix=" mm/d" />
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              FAO-56 Penman-Monteith · Single-Kc Mode
            </div>
          </div>
        </div>

        {/* 4. Open-Meteo GloFAS Basin River Discharge Card with Flowing River Wave */}
        <div className="surface weather-anim-card" style={{ padding: '1rem' }}>
          <WeatherAtmosphereOverlay type="river" value={riverM3s ?? 0} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Basin River Discharge
              </span>
              <Waves size={15} style={{ color: '#60a5fa' }} />
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: riverM3s !== null ? '#60a5fa' : 'var(--text-muted)', marginTop: '0.22rem' }}>
              {riverM3s !== null ? <AnimatedCounter value={riverM3s} decimals={1} suffix=" m³/s" /> : 'Offline Gate'}
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {riverData?.available
                ? `GloFAS v4 (~5 km cell · Peak ${riverData.summary?.peak_window_m3s ?? '--'} m³/s)`
                : 'Open-Meteo GloFAS discharge unreachable'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNonGodagariBanner = (subsystemName) => {
    if (isPrimaryGodagari) return null;
    return (
      <div
        className="surface"
        style={{
          padding: '0.85rem 1.1rem',
          borderLeft: '4px solid var(--accent-amber)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <span>
            <strong>Pilot Scope Notice ({selectedLocation?.name}):</strong> {subsystemName} field hardware &amp; BMDA monitoring baseline are deployed only in the <strong>Godagari AEZ-26 Pilot</strong>. Below shows the reference Godagari calibration schema.
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => selectRegion('godagari')}
          style={{ padding: '0.32rem 0.72rem', fontSize: '0.73rem' }}
        >
          <MapPin size={13} /> Switch to Godagari Pilot
        </button>
      </div>
    );
  };

  const renderAquiferDepthSummary = () => {
    const gw = dashboardData?.groundwater;
    const depth = gw?.depth_below_surface_m || 26.4;
    const critical = gw?.critical_threshold_m || 28.0;
    const pctToCritical = Math.min(100, Math.round((depth / critical) * 100));
    const yearsAtCurrentRate = ((critical - depth) / (gw?.annual_drawdown_rate_m || 0.65)).toFixed(1);

    return (
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              Aquifer Cavitation Margin &amp; Drawdown Horizon
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              Centrifugal suction proximity at BMDA benchmark depth ({depth} m vs {critical} m threshold)
            </p>
          </div>
          <ProvenanceBadge type="SYNTHETIC PROXY" label={`${pctToCritical}% OF SUCTION LIMIT`} compact />
        </div>

        <div className="surface" style={{ padding: '1rem' }}>
          <div style={{ height: '18px', borderRadius: '999px', background: 'var(--bg-alt)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                width: `${pctToCritical}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9 0%, #f59e0b 75%, #ef4444 100%)',
                borderRadius: '999px',
              }}
            />
          </div>
          <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Current Well Level: <strong>{depth} m</strong></span>
            <span style={{ color: 'var(--accent-amber)' }}>Buffer Before Cavitation: <strong>{(critical - depth).toFixed(1)} m (~{yearsAtCurrentRate} yrs @ +0.65 m/yr)</strong></span>
            <span style={{ color: 'var(--accent-danger)' }}>Critical Limit: <strong>{critical} m</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigateToWorkspace('simulator')}
            style={{ fontSize: '0.76rem' }}
          >
            <span>Test Irrigation Reduction in What-If Lab</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              askAssistantWithPrompt(
                'Explain why a 26.4m aquifer depth approaching 28.0m critical suction limit in Godagari requires shifting away from dry-season Boro flood rice toward Pulse/Mustard/T. Aman rotations.'
              )
            }
            style={{ fontSize: '0.76rem' }}
          >
            <Bot size={14} />
            <span>Ask AI About Barind Aquifer</span>
          </button>
        </div>
      </div>
    );
  };

  const renderLiveEt0Runner = () => (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span className="badge badge-model">POST /api/v1/physics/water-balance</span>
            <ProvenanceBadge type="MODEL-DERIVED" label={`LAT ${lat.toFixed(3)}°N`} compact />
          </div>
          <h2 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
            Interactive FAO-56 Penman-Monteith Water-Balance Runner
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Run live deterministic daily ET₀, ETc, TAW, RAW, depletion Dr, and stress coefficient Ks on the Node/Python-parity backend for {selectedLocation?.name || 'Godagari'}.
          </p>
        </div>
      </div>

      <form onSubmit={handleRunLiveBalance}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { key: 'tMax', label: 'Tmax (°C)', step: '0.1', min: '-5', max: '55' },
            { key: 'tMin', label: 'Tmin (°C)', step: '0.1', min: '-5', max: '45' },
            { key: 'rhMean', label: 'RH Mean (%)', step: '0.5', min: '5', max: '100' },
            { key: 'solarRadiationMJ', label: 'Solar Rs (MJ/m²/d)', step: '0.1', min: '1', max: '35' },
            { key: 'windSpeed10m', label: 'Wind u₁₀ (m/s)', step: '0.1', min: '0.1', max: '25' },
            { key: 'kc', label: 'Crop Coeff Kc', step: '0.05', min: '0.2', max: '1.4' },
            { key: 'rootDepthM', label: 'Root Depth Zr (m)', step: '0.05', min: '0.15', max: '1.5' },
            { key: 'theta', label: 'Current θ (VWC 0-1)', step: '0.005', min: '0.08', max: '0.45' },
          ].map((field) => (
            <label key={field.key} className="surface" style={{ padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{field.label}</span>
              <input
                type="number"
                step="any"
                min={field.min}
                max={field.max}
                value={calcForm[field.key]}
                onChange={(e) => setCalcForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="form-control mono"
                style={{ padding: '0.38rem 0.55rem', fontSize: '0.84rem' }}
              />
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={calcRunning}>
            <Play size={14} />
            <span>{calcRunning ? 'Computing FAO-56...' : 'Compute Live FAO-56 Water Balance'}</span>
          </button>
          {calcError && (
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-danger)', fontWeight: 600 }}>{calcError}</span>
          )}
        </div>
      </form>

      {calcResult?.metrics && (
        <div style={{ marginTop: '1.15rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Reference ET₀', val: `${calcResult.metrics.et0_mm_day} mm/d`, color: 'var(--accent-amber)' },
            { label: 'Crop ETc', val: `${calcResult.metrics.etc_mm_day} mm/d`, color: 'var(--accent-water)' },
            { label: 'TAW / RAW', val: `${calcResult.metrics.taw_mm} / ${calcResult.metrics.raw_mm} mm`, color: 'var(--text-main)' },
            { label: 'Depletion Dr', val: `${calcResult.metrics.depletion_mm} mm (${calcResult.metrics.depletion_pct}%)`, color: 'var(--accent-terracotta)' },
            { label: 'Stress Coeff Ks', val: String(calcResult.metrics.ks), color: 'var(--accent-primary)' },
            {
              label: 'Irrigation Status',
              val: calcResult.metrics.irrigation_needed
                ? `Trigger (${calcResult.metrics.recommended_irrigation_depth_mm} mm)`
                : 'No Irrigation Needed',
              color: calcResult.metrics.irrigation_needed ? 'var(--accent-danger)' : 'var(--accent-primary)',
            },
          ].map((item) => (
            <div key={item.label} className="surface" style={{ padding: '0.75rem 0.85rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
              <div className="mono" style={{ fontSize: '0.96rem', fontWeight: 800, color: item.color, marginTop: '0.2rem' }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCalibrationParity = () => (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} style={{ color: 'var(--accent-water)' }} />
          <h2 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
            Hydrology Calibration Tiers &amp; Node/Python Numerical Parity
          </h2>
        </div>
        <ProvenanceBadge type="MODEL-DERIVED" label="PARITY DIFF < 1e-6" compact />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.9rem' }}>
        <div className="surface" style={{ padding: '0.95rem', borderLeft: '4px solid var(--accent-water)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>M5 FAO-56 REFERENCE ENGINE</div>
          <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-water)', margin: '0.25rem 0' }}>
            |Python − Node.js| &lt; 1e-6
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
            Single-Kc Penman-Monteith parity continuously verified. Soil evaporation Eₛ remains <code>null</code> without lysimeter calibration.
          </p>
        </div>

        <div className="surface" style={{ padding: '0.95rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>M3 ESP32 CAPACITIVE FDR</div>
          <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)', margin: '0.25rem 0' }}>
            is_simulated: true • UNCALIBRATED
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
            5,760 source records (500 fast-cache window). Dielectric VWC curve requires site gravimetric soil sampling before commercial deployment.
          </p>
        </div>

        <div className="surface" style={{ padding: '0.95rem', borderLeft: '4px solid #22d3ee' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>BMDA AQUIFER MONITORING</div>
          <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#22d3ee', margin: '0.25rem 0' }}>
            SYNTHETIC_REGIONAL_PROXY
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
            Derived from published Jahan et al. (2010) &amp; BMDA drawdown trends (+0.65 m/yr), not a live piezo telemetry feed.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigateToWorkspace('methods')}>
          <span>Inspect Full Verification Ledger in Methods &amp; Learn</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );

  const renderPanelContent = () => {
    const currentVwcPct =
      latestSensor?.soil_moisture_vwc != null && Number.isFinite(Number(latestSensor.soil_moisture_vwc))
        ? Number((Number(latestSensor.soil_moisture_vwc) * 100).toFixed(1))
        : latestSensor?.soil_moisture_pct ?? 25.4;
    const taw = waterBalance?.taw_mm ?? waterBalance?.total_available_water_taw ?? 79.0;
    const raw = waterBalance?.raw_mm ?? 39.5;
    const dr = waterBalance?.depletion_mm ?? waterBalance?.root_zone_depletion_dr ?? 38.2;
    const kc = waterBalance?.kc ?? waterBalance?.cropKc ?? 1.15;

    if (activeSideIdx === 0) {
      if (activeTabIdx === 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {renderAtmosphereCardsStrip()}
            <RainfallETComparisonChart
              weatherHistory={weatherHistory}
              forecastData={forecastData}
              forecastLoading={forecastLoading}
              kc={kc}
            />
            <RootZonePhysicsWorkspace
              waterBalance={waterBalance}
              latestSensor={latestSensor}
              latestWeather={latestWeather}
              embeddedSection="budget"
            />
          </div>
        );
      }

      if (activeTabIdx === 1) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <RootZoneWaterProfile vwcPct={currentVwcPct} dr={dr} taw={taw} raw={raw} />
            <RootZonePhysicsWorkspace
              waterBalance={waterBalance}
              latestSensor={latestSensor}
              latestWeather={latestWeather}
              embeddedSection="cutaway-2d"
            />
          </div>
        );
      }

      const section = activeTabIdx === 2 ? 'cutaway-3d' : 'equations-ai';
      return (
        <RootZonePhysicsWorkspace
          waterBalance={waterBalance}
          latestSensor={latestSensor}
          latestWeather={latestWeather}
          embeddedSection={section}
        />
      );
    }

    if (activeSideIdx === 1) {
      const sectionByTab = ['efficiency', 'thresholds'];
      return (
        <RootZonePhysicsWorkspace
          waterBalance={waterBalance}
          latestSensor={latestSensor}
          latestWeather={latestWeather}
          embeddedSection={sectionByTab[activeTabIdx] || 'efficiency'}
        />
      );
    }

    if (activeSideIdx === 2) {
      const sectionByTab = ['profile', 'telemetry', 'moisture', 'hardware-only'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {renderNonGodagariBanner('M3 ESP32 Capacitive FDR & AEZ-26 Soil')}
          <SoilIotWorkspace
            latestSensor={latestSensor}
            sensorHistory={dashboardData?.sensorHistory || []}
            groundwater={dashboardData?.groundwater}
            farm={dashboardData?.farm}
            onOpenSimulateModal={onOpenSimulateModal}
            controlledSubSection={sectionByTab[activeTabIdx] || 'profile'}
          />
        </div>
      );
    }

    if (activeSideIdx === 3) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTabIdx !== 2 && renderNonGodagariBanner('BMDA Deep Tubewell Aquifer Proxy')}
          {activeTabIdx === 0 && (
            <GroundwaterPanel groundwater={dashboardData?.groundwater} farm={dashboardData?.farm} />
          )}
          {activeTabIdx === 1 && renderAquiferDepthSummary()}
          {activeTabIdx === 2 && (
            <TerrainProfileAndSlopeCards
              demData={demData}
              loading={demLoading}
              onRetry={fetchDemProfile}
            />
          )}
        </div>
      );
    }

    return activeTabIdx === 0 ? renderLiveEt0Runner() : renderCalibrationParity();
  };

  return (
    <section className="water-shell water-shell--fullbleed" aria-label="Water and Soil Dual-Axis Hydrology Control">
      {/* 1. LEFT VERTICAL ICON SIDEBAR (UP / DOWN GSAP STRETCH PILL) */}
      <aside className="water-sidebar" aria-label="Hydrology Subsystem Categories">
        <div className="water-brand-dot" title="AgriSense Water & Soil Control">
          <Droplets size={18} />
        </div>

        <div className="water-sidebar-nav-wrap">
          <div className="water-sidebar-layer">
            {SIDE_CATEGORIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  ref={(el) => {
                    sideBtnRefs.current[idx] = el;
                  }}
                  onClick={() => handleSelectSide(idx)}
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={activeSideIdx === idx}
                  className="water-side-btn"
                >
                  <Icon size={19} />
                </button>
              );
            })}
          </div>

          <div
            ref={sideFillRef}
            aria-hidden="true"
            className="water-sidebar-layer water-sidebar-fill"
          >
            {SIDE_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="water-side-btn">
                  <Icon size={19} />
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* 2. MAIN OCEAN AREA + TOPBAR (SUB-TABS + COMPACT PARCEL & QUICK ACTIONS) */}
      <div className="water-main-shell">
        <header className="water-topbar">
          <div className="water-topbar-left">
            <span className="water-section-label">{currentMenu.label}</span>

            <div className="water-top-tabs-scroll">
              <div className="water-top-tabs-wrap" role="tablist" aria-label={`${currentMenu.label} Views`}>
                <div className="water-top-tabs-layer">
                  {currentMenu.tabs.map((tab, idx) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTabIdx === idx}
                      ref={(el) => {
                        topBtnRefs.current[idx] = el;
                      }}
                      onClick={() => setActiveTabIdx(idx)}
                      className="water-top-tab-btn"
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div
                  ref={topFillRef}
                  aria-hidden="true"
                  className="water-top-tabs-layer water-top-tabs-fill"
                >
                  {currentMenu.tabs.map((tab) => (
                    <div key={tab} className="water-top-tab-btn">
                      {tab}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ultra-Compact Inline Controls (replaces bulky dark-olive Telemetry Ribbon on Water & Soil) */}
          <div className="water-topbar-right">
            <label htmlFor="water-parcel-select" className="visually-hidden">Select Field Parcel</label>
            <select
              id="water-parcel-select"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="water-compact-select"
              title="Switch active parcel"
            >
              {PARCELS.map((p) => (
                <option key={p.id} value={p.id}>{p.code} ({p.crop})</option>
              ))}
              {dynamicFields
                .filter((df) => !df.is_demo && !PARCELS.some((p) => p.id === df.id))
                .map((df) => (
                  <option key={df.id} value={df.id}>{df.name} ({df.current_crop})</option>
                ))}
            </select>

            {onSyncNasa && (
              <button
                type="button"
                onClick={onSyncNasa}
                disabled={syncingNasa}
                className="water-compact-btn"
                title="Sync NASA POWER meteorological feed"
              >
                <RefreshCw size={12} className={syncingNasa ? 'water-spin' : ''} />
                <span>{syncingNasa ? 'Syncing' : 'Sync'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSimulateModal}
              className="water-compact-btn"
              title="Inject simulated ESP32 soil reading"
            >
              <Zap size={12} />
              <span>ESP32</span>
            </button>

            <div className="water-status-chip">
              <span className="water-status-dot" />
              <span>
                {isPrimaryGodagari
                  ? 'AEZ-26 · Godagari'
                  : `${selectedLocation?.district || 'Regional'} · ET₀`}
              </span>
            </div>
          </div>
        </header>

        <div className="water-content">{renderPanelContent()}</div>
      </div>
    </section>
  );
}
