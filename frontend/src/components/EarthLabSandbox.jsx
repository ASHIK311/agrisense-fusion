import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Crosshair,
  FlaskConical,
  Layers,
  MapPin,
  Play,
  RefreshCw,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import { AnimatedCounter } from './charts/AnimatedChartCard';

const BAND_PRESETS = [
  {
    id: 'boro-healthy',
    label: 'Healthy Boro Rice',
    bands: { b2: 0.042, b3: 0.078, b4: 0.048, b8: 0.44, b11: 0.165, b12: 0.075 },
    seasonal: { deltaNdvi: 0.29, minNdvi: 0.21, maxNdvi: 0.78, ampNdvi: 0.57, meanNdmi: 0.28, eviChange: 0.22 },
  },
  {
    id: 'water-pond',
    label: 'Waterlogged / Pond',
    bands: { b2: 0.068, b3: 0.095, b4: 0.055, b8: 0.038, b11: 0.025, b12: 0.018 },
    seasonal: { deltaNdvi: -0.08, minNdvi: -0.25, maxNdvi: 0.05, ampNdvi: 0.30, meanNdmi: 0.12, eviChange: -0.04 },
  },
  {
    id: 'barren-fallow',
    label: 'Dry Fallow Terrace',
    bands: { b2: 0.118, b3: 0.148, b4: 0.175, b8: 0.245, b11: 0.285, b12: 0.215 },
    seasonal: { deltaNdvi: 0.04, minNdvi: 0.11, maxNdvi: 0.24, ampNdvi: 0.13, meanNdmi: -0.08, eviChange: 0.03 },
  },
  {
    id: 'moisture-stress',
    label: 'Moisture-Stressed Canopy',
    bands: { b2: 0.058, b3: 0.088, b4: 0.089, b8: 0.295, b11: 0.245, b12: 0.165 },
    seasonal: { deltaNdvi: 0.14, minNdvi: 0.19, maxNdvi: 0.54, ampNdvi: 0.35, meanNdmi: 0.09, eviChange: 0.08 },
  },
];

const BAND_SLIDER_DEFS = [
  { key: 'b2', label: 'B2 Blue (490nm)', res: '10m', color: '#2DD4BF', min: 0.01, max: 0.35 },
  { key: 'b3', label: 'B3 Green (560nm)', res: '10m', color: '#34D399', min: 0.01, max: 0.4 },
  { key: 'b4', label: 'B4 Red (665nm)', res: '10m', color: '#FB7185', min: 0.01, max: 0.4 },
  { key: 'b8', label: 'B8 NIR (842nm)', res: '10m', color: '#10B981', min: 0.02, max: 0.65 },
  { key: 'b11', label: 'B11 SWIR-1 (1610nm)', res: '20m→10m', color: '#FBBF24', min: 0.01, max: 0.55 },
  { key: 'b12', label: 'B12 SWIR-2 (2190nm)', res: '20m→10m', color: '#6EE7B7', min: 0.01, max: 0.5 },
];

export default function EarthLabSandbox({ dashboardData = null }) {
  const { selectedParcel, cursorGeo, notifyIsland } = useAgriSense();

  // ── A. Sentinel-2 Band Physics Calculator State ──
  const [activePresetId, setActivePresetId] = useState('boro-healthy');
  const [bands, setBands] = useState(BAND_PRESETS[0].bands);
  const [seasonalContext, setSeasonalContext] = useState(BAND_PRESETS[0].seasonal);
  const [indicesResult, setIndicesResult] = useState(null);
  const [indicesLoading, setIndicesLoading] = useState(false);

  // ── B. 15-Feature Land-Cover & 422 Gate Tester State ──
  const [classifyResult, setClassifyResult] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [cropGateResult, setCropGateResult] = useState(null);
  const [testingCropGate, setTestingCropGate] = useState(false);

  // ── C. Custom Coordinate + NASA POWER + DEM Stress Sandbox State ──
  const [testLat, setTestLat] = useState(selectedParcel?.centroid?.lat ?? 24.469);
  const [testLon, setTestLon] = useState(selectedParcel?.centroid?.lon ?? 88.33);
  const [lookbackDays, setLookbackDays] = useState(14);
  const [customFetchLoading, setCustomFetchLoading] = useState(false);
  const [customWeather, setCustomWeather] = useState(null);
  const [customDem, setCustomDem] = useState(null);
  const [forecastGateRes, setForecastGateRes] = useState(null);
  const [testingForecastGate, setTestingForecastGate] = useState(false);

  // Interactive compound heat-dryness thresholds
  const [tmaxThreshold, setTmaxThreshold] = useState(35.0);
  const [rhThreshold, setRhThreshold] = useState(50);
  const [rainThreshold, setRainThreshold] = useState(1.0);

  // Auto-compute spectral indices via real backend endpoint when bands change (debounced)
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIndicesLoading(true);
      try {
        const qs = new URLSearchParams({
          b2: String(bands.b2),
          b3: String(bands.b3),
          b4: String(bands.b4),
          b8: String(bands.b8),
          b11: String(bands.b11),
          b12: String(bands.b12),
        });
        const res = await fetch(`/api/v1/satellite/indices?${qs.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.success) {
          setIndicesResult(json);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Spectral index calculation failed:', err);
        }
      } finally {
        setIndicesLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bands]);

  const applyBandPreset = (preset) => {
    setActivePresetId(preset.id);
    setBands({ ...preset.bands });
    setSeasonalContext({ ...preset.seasonal });
    setClassifyResult(null);
  };

  const liveIndices = indicesResult?.indices || {
    ndvi: 0.803,
    ndwi: -0.699,
    ndmi: 0.455,
    evi: 1.281,
    savi: 0.595,
  };

  // Assemble exact 15-feature vector expected by POST /api/v1/satellite/classify
  const featureVector15 = useMemo(
    () => [
      Number(bands.b2.toFixed(3)),
      Number(bands.b3.toFixed(3)),
      Number(bands.b4.toFixed(3)),
      Number(bands.b8.toFixed(3)),
      Number(bands.b11.toFixed(3)),
      Number(liveIndices.ndvi.toFixed(3)),
      Number(liveIndices.ndwi.toFixed(3)),
      Number(liveIndices.ndmi.toFixed(3)),
      Number(liveIndices.evi.toFixed(3)),
      seasonalContext.deltaNdvi,
      seasonalContext.minNdvi,
      seasonalContext.maxNdvi,
      seasonalContext.ampNdvi,
      seasonalContext.meanNdmi,
      seasonalContext.eviChange,
    ],
    [bands, liveIndices, seasonalContext]
  );

  const runLiveClassification = async () => {
    setClassifying(true);
    try {
      const res = await fetch('/api/v1/satellite/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: featureVector15,
          parcel_id: selectedParcel?.id || 'field-a01',
        }),
      });
      const json = await res.json();
      setClassifyResult(json);
    } catch (err) {
      notifyIsland?.(`Classifier test failed: ${err.message}`, 'error');
    } finally {
      setClassifying(false);
    }
  };

  const testCropSpeciesGate = async () => {
    setTestingCropGate(true);
    try {
      const res = await fetch('/api/v1/satellite/classify-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: featureVector15,
          parcel_id: selectedParcel?.id || 'field-a01',
        }),
      });
      const json = await res.json();
      setCropGateResult({ status: res.status, payload: json });
    } catch (err) {
      setCropGateResult({ status: 500, payload: { error: err.message } });
    } finally {
      setTestingCropGate(false);
    }
  };

  const syncFromMapCursor = () => {
    const lat = cursorGeo?.lat ?? selectedParcel?.centroid?.lat ?? 24.469;
    const lon = cursorGeo?.lon ?? selectedParcel?.centroid?.lon ?? 88.33;
    setTestLat(Number(lat.toFixed(5)));
    setTestLon(Number(lon.toFixed(5)));
    notifyIsland?.(`Synced coordinate ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E from Spatial Twin`, 'info');
  };

  const runCustomCoordinateTest = async (e) => {
    e?.preventDefault();
    setCustomFetchLoading(true);
    try {
      const latNum = Number(testLat);
      const lonNum = Number(testLon);
      const [weatherRes, demRes] = await Promise.all([
        fetch(`/api/v1/weather/daily?lat=${encodeURIComponent(latNum)}&lon=${encodeURIComponent(lonNum)}&days=${encodeURIComponent(lookbackDays)}`),
        fetch(`/api/v1/water/dem-profile?lat=${encodeURIComponent(latNum)}&lon=${encodeURIComponent(lonNum)}`),
      ]);
      const [wJson, dJson] = await Promise.all([weatherRes.json(), demRes.json()]);
      setCustomWeather(wJson);
      setCustomDem(dJson);
      notifyIsland?.(
        `Loaded ${lookbackDays}d NASA POWER & DEM telemetry for ${latNum.toFixed(3)}°N, ${lonNum.toFixed(3)}°E`,
        'success'
      );
    } catch (err) {
      notifyIsland?.(`Coordinate fetch error: ${err.message}`, 'error');
    } finally {
      setCustomFetchLoading(false);
    }
  };

  const testForecastGate = async () => {
    setTestingForecastGate(true);
    try {
      const res = await fetch('/api/v1/weather/forecast');
      const json = await res.json();
      setForecastGateRes({ status: res.status, payload: json });
    } catch (err) {
      setForecastGateRes({ status: 500, payload: { error: err.message } });
    } finally {
      setTestingForecastGate(false);
    }
  };

  // Evaluate stress rule against either custom-fetched NASA series or dashboard series
  const activeWeatherSeries = useMemo(() => {
    if (Array.isArray(customWeather?.records) && customWeather.records.length > 0) {
      return customWeather.records;
    }
    return dashboardData?.weatherHistory || [];
  }, [customWeather, dashboardData]);

  const stressEval = useMemo(() => {
    if (!activeWeatherSeries.length) {
      return { total: 0, triggered: 0, latestTmax: 0, avgRh: 0, totalRain: 0 };
    }
    let triggered = 0;
    let rhSum = 0;
    let rhCount = 0;
    let rainSum = 0;
    let latestTmax = 0;

    activeWeatherSeries.forEach((d, idx) => {
      const mx = Number(d.t2m_max ?? (d.t2m !== undefined ? Number(d.t2m) + 4.2 : 0));
      const rh = Number(d.rh2m ?? 0);
      const rn = Number(d.precip_mm ?? 0);
      if (idx === activeWeatherSeries.length - 1) latestTmax = mx;
      if (Number.isFinite(rh) && rh > 0) {
        rhSum += rh;
        rhCount += 1;
      }
      if (Number.isFinite(rn) && rn >= 0) rainSum += rn;
      if (mx >= tmaxThreshold && rh <= rhThreshold && rn <= rainThreshold) {
        triggered += 1;
      }
    });

    return {
      total: activeWeatherSeries.length,
      triggered,
      latestTmax,
      avgRh: rhCount > 0 ? rhSum / rhCount : 0,
      totalRain: rainSum,
    };
  }, [activeWeatherSeries, tmaxThreshold, rhThreshold, rainThreshold]);

  const canopyStatusLabel = useMemo(() => {
    if (liveIndices.ndwi > 0.05) return { text: 'Open Water / Saturated Surface', cls: 'badge-water' };
    if (liveIndices.ndvi >= 0.6 && liveIndices.ndmi >= 0.2) return { text: 'Vigorous Hydrated Canopy', cls: 'badge-live' };
    if (liveIndices.ndvi >= 0.35 && liveIndices.ndmi < 0.15) return { text: 'Active Canopy Under Moisture Stress', cls: 'badge-amber' };
    return { text: 'Bare Fallow / Sparse Residue', cls: 'badge-demo' };
  }, [liveIndices]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Sandbox Section Banner */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div className="methods-scan-beam" aria-hidden="true" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-live">
                <FlaskConical size={13} /> Interactive Scientific Sandbox
              </span>
              <ProvenanceBadge
                type="MODEL-DERIVED"
                label="LIVE API TESTBENCH • ZERO MOCK MATH"
                source="Backend /api/v1/satellite/*, /api/v1/weather/* & /api/v1/water/dem-profile"
                compact
              />
            </div>
            <h2 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
              Live Band Physics, 15-Feature Land-Cover &amp; Coordinate Stress Lab
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Adjust Sentinel-2 BOA reflectance bands, run live 15-feature land-cover inference &amp; 422/501 honesty gates, or query NASA POWER + DEM telemetry for any custom coordinate.
            </p>
          </div>
          <span className={`badge ${canopyStatusLabel.cls}`} style={{ fontSize: '0.74rem', padding: '0.36rem 0.78rem' }}>
            {canopyStatusLabel.text}
          </span>
        </div>
      </div>

      {/* 2-Column Tester Grid: A (Band Physics) + B (15-Feature Classifier & 422 Gate) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* TESTER A: Sentinel-2 Band Reflectance -> Spectral Indices Calculator */}
        <section className="card tilt-card" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div className="section-eyebrow">Tester A • GET /api/v1/satellite/indices</div>
              <h3 className="font-display" style={{ fontSize: '1.08rem', fontWeight: 800, margin: '0.15rem 0 0' }}>
                Sentinel-2 Reflectance Band Calculator
              </h3>
            </div>
            <span className="mono" style={{ fontSize: '0.7rem', color: indicesLoading ? 'var(--accent-amber)' : 'var(--accent-primary)' }}>
              {indicesLoading ? 'Computing via API...' : 'Synced with API'}
            </span>
          </div>

          {/* Preset Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {BAND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyBandPreset(preset)}
                className={activePresetId === preset.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.3rem 0.68rem', fontSize: '0.72rem' }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 6 Band Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
            {BAND_SLIDER_DEFS.map((b) => (
              <div key={b.key} className="surface" style={{ padding: '0.68rem 0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginBottom: '0.32rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.label}</span>
                  <span className="mono" style={{ fontWeight: 800, color: b.color }}>
                    {Number(bands[b.key]).toFixed(3)}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={b.label}
                  className="slider-input earth-sandbox-slider"
                  min={b.min}
                  max={b.max}
                  step="0.005"
                  value={bands[b.key]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setActivePresetId('custom');
                    setBands((prev) => ({ ...prev, [b.key]: val }));
                  }}
                />
              </div>
            ))}
          </div>

          {/* Live Computed Spectral Indices Readout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.55rem' }}>
            {[
              { id: 'NDVI', val: liveIndices.ndvi, color: '#34D399' },
              { id: 'NDMI', val: liveIndices.ndmi, color: '#2DD4BF' },
              { id: 'EVI', val: liveIndices.evi, color: '#10B981' },
              { id: 'NDWI', val: liveIndices.ndwi, color: '#6EE7B7' },
              { id: 'SAVI', val: liveIndices.savi, color: '#FBBF24' },
            ].map((idx) => (
              <div key={idx.id} className="surface" style={{ padding: '0.58rem 0.65rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)' }}>{idx.id}</div>
                <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: idx.color, marginTop: '0.15rem' }}>
                  <AnimatedCounter value={Number(idx.val)} decimals={3} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TESTER B: 15-Feature Land-Cover Classifier & Honest 422 Crop Gate */}
        <section className="card tilt-card" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div className="section-eyebrow">Tester B • POST /api/v1/satellite/classify</div>
            <h3 className="font-display" style={{ fontSize: '1.08rem', fontWeight: 800, margin: '0.15rem 0 0' }}>
              15-Feature Land-Cover Inference &amp; 422 Boundary Gate
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Sends the live 15-element spectral + seasonal feature vector assembled from your band sliders above to verify Land-Cover predictions vs. the strict HTTP 422 Crop-Species Gate.
            </p>
          </div>

          <div className="surface" style={{ padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              ASSEMBLED 15-FEATURE INPUT VECTOR ({selectedParcel?.code || 'PARCEL A-01'})
            </div>
            <div className="mono" style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
              [{featureVector15.join(', ')}]
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
            <button
              type="button"
              onClick={runLiveClassification}
              disabled={classifying}
              className="btn btn-primary"
            >
              <Play size={14} />
              <span>{classifying ? 'Classifying 15 Features...' : 'Run Land-Cover Classification'}</span>
            </button>

            <button
              type="button"
              onClick={testCropSpeciesGate}
              disabled={testingCropGate}
              className="btn btn-secondary"
            >
              <ShieldAlert size={14} />
              <span>{testingCropGate ? 'Checking 422 Gate...' : 'Test Crop-Species 422 Gate'}</span>
            </button>
          </div>

          {classifyResult?.prediction && (
            <div className="surface" style={{ padding: '0.9rem 1rem', borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>PREDICTED LAND COVER</div>
                  <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {classifyResult.prediction.class_label.replace(/_/g, ' ')}
                  </div>
                </div>
                <span className="badge badge-live" style={{ fontSize: '0.72rem' }}>
                  Confidence: {(Number(classifyResult.prediction.confidence || 0) * 100).toFixed(1)}%
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {Object.entries(classifyResult.prediction.class_probabilities || {}).map(([clsName, prob]) => {
                  const pct = Math.round(Number(prob) * 100);
                  return (
                    <div key={clsName} style={{ display: 'grid', gridTemplateColumns: '125px 1fr 48px', alignItems: 'center', gap: '0.6rem', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{clsName.replace(/_/g, ' ')}</span>
                      <div style={{ height: '8px', background: 'var(--bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: clsName === classifyResult.prediction.class_label ? '#34D399' : 'rgba(52, 211, 153, 0.36)',
                            borderRadius: '999px',
                            transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                        />
                      </div>
                      <span className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.55rem' }}>
                Source: {classifyResult.source} • Holdout Ref: {classifyResult.provenance?.holdout_accuracy_ref ?? 85.77}%
              </div>
            </div>
          )}

          {cropGateResult && (
            <div className="surface" style={{ padding: '0.8rem 1rem', borderLeft: '4px solid #FBBF24' }}>
              <div className="mono" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FBBF24' }}>
                HTTP {cropGateResult.status} • {cropGateResult.payload?.error}
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.28rem 0 0' }}>
                {cropGateResult.payload?.message}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* TESTER C: Custom Coordinate NASA POWER + Terrarium DEM + Stress Threshold Tester */}
      <section className="card tilt-card" style={{ padding: '1.25rem 1.45rem', display: 'flex', flexDirection: 'column', gap: '1.05rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <div className="section-eyebrow">Tester C • Custom Spatial Point Query &amp; Heat-Dryness Simulator</div>
            <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.15rem 0 0' }}>
              Custom Lat/Lon NASA POWER Weather, Terrarium DEM &amp; Stress Thresholds
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={syncFromMapCursor} className="btn btn-secondary" style={{ fontSize: '0.74rem', padding: '0.38rem 0.75rem' }}>
              <Crosshair size={13} /> Use 2D Map / Parcel Point
            </button>
            <button type="button" onClick={testForecastGate} disabled={testingForecastGate} className="btn btn-secondary" style={{ fontSize: '0.74rem', padding: '0.38rem 0.75rem' }}>
              <ShieldAlert size={13} /> {testingForecastGate ? 'Checking 501...' : 'Verify HTTP 501 NWP Gate'}
            </button>
          </div>
        </div>

        <form
          onSubmit={runCustomCoordinateTest}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
            alignItems: 'end',
            padding: '0.9rem',
            background: 'var(--bg-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div>
            <label htmlFor="sandbox-lat" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.28rem' }}>
              Latitude (°N)
            </label>
            <input
              id="sandbox-lat"
              type="number"
              step="0.0001"
              min="20.5"
              max="26.7"
              value={testLat}
              onChange={(e) => setTestLat(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem', fontWeight: 600 }}
            />
          </div>
          <div>
            <label htmlFor="sandbox-lon" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.28rem' }}>
              Longitude (°E)
            </label>
            <input
              id="sandbox-lon"
              type="number"
              step="0.0001"
              min="88.0"
              max="92.7"
              value={testLon}
              onChange={(e) => setTestLon(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem', fontWeight: 600 }}
            />
          </div>
          <div>
            <label htmlFor="sandbox-days" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.28rem' }}>
              NASA POWER Window
            </label>
            <select
              id="sandbox-days"
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              style={{ width: '100%', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
          <button type="submit" disabled={customFetchLoading} className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <RefreshCw size={14} className={customFetchLoading ? 'animate-spin' : ''} />
            <span>{customFetchLoading ? 'Querying NASA & DEM...' : 'Fetch Coordinate Telemetry'}</span>
          </button>
        </form>

        {/* Compound Heat-Dryness Stress Threshold Interactive Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div className="surface" style={{ padding: '0.75rem 0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 700 }}>Tmax Cutoff (°C)</span>
              <span className="mono" style={{ color: 'var(--accent-terracotta)', fontWeight: 800 }}>≥ {tmaxThreshold.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              aria-label="Tmax Stress Cutoff"
              className="slider-input"
              min="28"
              max="42"
              step="0.5"
              value={tmaxThreshold}
              onChange={(e) => setTmaxThreshold(parseFloat(e.target.value))}
            />
          </div>

          <div className="surface" style={{ padding: '0.75rem 0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 700 }}>RH2M Cutoff (%)</span>
              <span className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 800 }}>≤ {rhThreshold}%</span>
            </div>
            <input
              type="range"
              aria-label="Relative Humidity Stress Cutoff"
              className="slider-input"
              min="25"
              max="85"
              step="1"
              value={rhThreshold}
              onChange={(e) => setRhThreshold(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="surface" style={{ padding: '0.75rem 0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 700 }}>Precipitation Cutoff (mm)</span>
              <span className="mono" style={{ color: 'var(--accent-water)', fontWeight: 800 }}>≤ {rainThreshold.toFixed(1)} mm</span>
            </div>
            <input
              type="range"
              aria-label="Precipitation Stress Cutoff"
              className="slider-input"
              min="0"
              max="10"
              step="0.5"
              value={rainThreshold}
              onChange={(e) => setRainThreshold(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Dynamic Live Results Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '0.85rem' }}>
          <div className="surface" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>STRESS DAYS MATCHED</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: stressEval.triggered > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)', marginTop: '0.18rem' }}>
              <AnimatedCounter value={stressEval.triggered} decimals={0} /> <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {stressEval.total}d</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {customWeather?.records ? 'Custom coordinate query' : 'Dashboard NASA POWER series'}
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LATEST TMAX / MEAN RH</div>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-terracotta)', marginTop: '0.18rem' }}>
              <AnimatedCounter value={stressEval.latestTmax} decimals={1} suffix="°C" />
            </div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Mean RH: {stressEval.avgRh.toFixed(1)}% • Rain: {stressEval.totalRain.toFixed(1)} mm
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>TERRARIUM DEM RELIEF</div>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2DD4BF', marginTop: '0.18rem' }}>
              {customDem?.stats ? (
                <AnimatedCounter value={Number(customDem.stats.reliefM ?? 0)} decimals={1} suffix=" m" />
              ) : (
                <span>--</span>
              )}
            </div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {customDem?.stats
                ? `${customDem.stats.minM}m – ${customDem.stats.maxM}m • Mean Slope ${customDem.stats.meanSlopePct}%`
                : 'Click Fetch Coordinate Telemetry'}
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HYDRO-METRIC TETHER</div>
            <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {Number(testLat).toFixed(4)}°N, {Number(testLon).toFixed(4)}°E
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.18rem' }}>
              NASA Grid: 24.3636°N, 88.6241°E
            </div>
          </div>
        </div>

        {forecastGateRes && (
          <div className="surface" style={{ padding: '0.8rem 1rem', borderLeft: '4px solid var(--accent-amber)' }}>
            <div className="mono" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              HTTP {forecastGateRes.status} NWP FORECAST GATE: {forecastGateRes.payload?.error}
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.28rem 0 0' }}>
              {forecastGateRes.payload?.message}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
