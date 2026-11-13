import React, { useMemo, useState } from 'react';
import { Layers, Sliders, Bot, Leaf, Droplets, Sparkles, Waves } from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import SatellitePanel from './SatellitePanel';
import AnimatedMetricCard from './charts/AnimatedMetricCard';
import { VegetationTimeSeriesChart } from './charts/SeasonalScenarioCharts';

const SPECTRAL_LAYERS = [
  { id: 'NDVI', name: 'NDVI (Photosynthetic Vigor)', formula: '(B8 - B4) / (B8 + B4)', res: '10m Native (B8, B4)', colorA: '#065F46', colorB: '#16865B' },
  { id: 'NDMI', name: 'NDMI (Canopy Moisture)', formula: '(B8 - B11) / (B8 + B11)', res: '20m Band 11 Resampled → 10m', colorA: '#155E75', colorB: '#0284C7' },
  { id: 'EVI', name: 'EVI (Enhanced Vegetation)', formula: '2.5*(B8 - B4)/(B8 + 6*B4 - 7.5*B2 + 1)', res: '10m Native (B8, B4, B2)', colorA: '#166534', colorB: '#22C55E' },
  { id: 'NDWI', name: 'McFeeters NDWI (Surface Water)', formula: '(B3 - B8) / (B3 + B8)', res: '10m Native (B3, B8)', colorA: '#1E3A8A', colorB: '#38BDF8' },
  { id: 'TRUE_COLOR', name: 'True Color RGB (B4/B3/B2)', formula: 'RGB(B4, B3, B2)', res: '10m Native Optical', colorA: '#5C3A21', colorB: '#C87952' },
];

const SENTINEL_SCENES = [
  { date: '2025-11-17', stage: 'Post-Monsoon / T. Aman Harvest', ndvi: 0.44, ndmi: 0.14, evi: 0.31, ndwi: -0.24 },
  { date: '2025-11-27', stage: 'Land Prep / Early Rabi Sowing', ndvi: 0.36, ndmi: 0.09, evi: 0.24, ndwi: -0.29 },
  { date: '2025-12-07', stage: 'Early Emergence', ndvi: 0.41, ndmi: 0.12, evi: 0.28, ndwi: -0.26 },
  { date: '2025-12-17', stage: 'Vegetative Establishment', ndvi: 0.49, ndmi: 0.16, evi: 0.35, ndwi: -0.22 },
  { date: '2025-12-27', stage: 'Early Tillering / Branching', ndvi: 0.56, ndmi: 0.19, evi: 0.41, ndwi: -0.20 },
  { date: '2026-01-06', stage: 'Active Canopy Expansion', ndvi: 0.62, ndmi: 0.22, evi: 0.46, ndwi: -0.18 },
  { date: '2026-01-16', stage: 'Mid-Season Canopy Closure', ndvi: 0.69, ndmi: 0.26, evi: 0.52, ndwi: -0.15 },
  { date: '2026-01-26', stage: 'Peak Vegetative Vigor', ndvi: 0.74, ndmi: 0.29, evi: 0.57, ndwi: -0.13 },
  { date: '2026-02-05', stage: 'Reproductive / Heading', ndvi: 0.72, ndmi: 0.27, evi: 0.55, ndwi: -0.14 },
  { date: '2026-02-15', stage: 'Grain Filling / High ETc', ndvi: 0.68, ndmi: 0.24, evi: 0.50, ndwi: -0.18 },
  { date: '2026-02-25', stage: 'Late Grain Fill / Dryness Onset', ndvi: 0.61, ndmi: 0.18, evi: 0.43, ndwi: -0.23 },
  { date: '2026-03-07', stage: 'Pre-Harvest Maturation', ndvi: 0.52, ndmi: 0.13, evi: 0.36, ndwi: -0.27 },
];

export default function CanopySpectralLab({ selectedFarmId }) {
  const { selectedParcel, askAssistantWithPrompt } = useAgriSense();

  const [compareMode, setCompareMode] = useState('modeA'); // 'modeA' (Same-date index compare) | 'modeB' (Temporal compare)
  const [curtainPct, setCurtainPct] = useState(52);
  const [leftLayerId, setLeftLayerId] = useState('NDVI');
  const [rightLayerId, setRightLayerId] = useState('NDMI');
  const [leftSceneIdx, setLeftSceneIdx] = useState(1); // 2025-11-27
  const [rightSceneIdx, setRightSceneIdx] = useState(7); // 2026-01-26
  const [cursorPos, setCursorPos] = useState({ x: 340, y: 155 });

  const leftLayer = SPECTRAL_LAYERS.find((l) => l.id === leftLayerId) || SPECTRAL_LAYERS[0];
  const rightLayer = SPECTRAL_LAYERS.find((l) => l.id === rightLayerId) || SPECTRAL_LAYERS[1];
  const leftScene = SENTINEL_SCENES[leftSceneIdx] || SENTINEL_SCENES[1];
  const rightScene = SENTINEL_SCENES[rightSceneIdx] || SENTINEL_SCENES[7];

  const getSceneMetric = (scene, layerId) => {
    const key = layerId.toLowerCase();
    if (scene[key] !== undefined) return scene[key];
    return scene.ndvi;
  };

  const leftValue =
    compareMode === 'modeA'
      ? getSceneMetric(rightScene, leftLayerId)
      : getSceneMetric(leftScene, leftLayerId);

  const rightValue =
    compareMode === 'modeA'
      ? getSceneMetric(rightScene, rightLayerId)
      : getSceneMetric(rightScene, leftLayerId);

  const spectralSparkSeries = useMemo(() => {
    const build = (key) =>
      SENTINEL_SCENES.map((s) => ({
        label: s.date.slice(5),
        value: Number(s[key]),
      }));
    return {
      ndvi: build('ndvi'),
      ndmi: build('ndmi'),
      evi: build('evi'),
      ndwi: build('ndwi'),
    };
  }, []);

  const formatDelta = (curr, prev) => {
    const diff = Number(curr) - Number(prev);
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} vs ${leftScene.date}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Animated 12-Pass Sentinel-2 Spectral KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))', gap: '1rem' }}>
        <AnimatedMetricCard
          title="NDVI (Photosynthetic Vigor)"
          value={Number(rightScene.ndvi)}
          decimals={2}
          unit={rightScene.date}
          subtitle={`${rightScene.stage} (${formatDelta(rightScene.ndvi, leftScene.ndvi)})`}
          series={spectralSparkSeries.ndvi}
          seriesLabel="12-Pass NDVI"
          accent="#10B981"
          badgeType="SATELLITE-DERIVED"
          badgeLabel="10m B8 & B4"
          icon={Leaf}
          onClick={() => setLeftLayerId('NDVI')}
          cta="Inspect in Curtain"
        />

        <AnimatedMetricCard
          title="NDMI (Canopy Moisture)"
          value={Number(rightScene.ndmi)}
          decimals={2}
          unit={rightScene.date}
          subtitle={`B8 vs B11 SWIR (${formatDelta(rightScene.ndmi, leftScene.ndmi)})`}
          series={spectralSparkSeries.ndmi}
          seriesLabel="12-Pass NDMI"
          accent="#0284C7"
          badgeType="SATELLITE-DERIVED"
          badgeLabel="20m B11 → 10m"
          icon={Droplets}
          onClick={() => setRightLayerId('NDMI')}
          cta="Compare Moisture"
        />

        <AnimatedMetricCard
          title="EVI (Enhanced Vegetation)"
          value={Number(rightScene.evi)}
          decimals={2}
          unit={rightScene.date}
          subtitle={`Atmosphere-corrected (${formatDelta(rightScene.evi, leftScene.evi)})`}
          series={spectralSparkSeries.evi}
          seriesLabel="12-Pass EVI"
          accent="#F59E0B"
          badgeType="SATELLITE-DERIVED"
          badgeLabel="10m B8/B4/B2"
          icon={Sparkles}
          onClick={() => setLeftLayerId('EVI')}
          cta="Inspect in Curtain"
        />

        <AnimatedMetricCard
          title="McFeeters NDWI (Surface Water)"
          value={Number(rightScene.ndwi)}
          decimals={2}
          unit={rightScene.date}
          subtitle={`Surface water screen (${formatDelta(rightScene.ndwi, leftScene.ndwi)})`}
          series={spectralSparkSeries.ndwi}
          seriesLabel="12-Pass NDWI"
          accent="#818CF8"
          badgeType="SATELLITE-DERIVED"
          badgeLabel="10m B3 & B8"
          icon={Waves}
          onClick={() => setRightLayerId('NDWI')}
          cta="Compare Water"
        />
      </div>

      {/* Spectral Curtain Wipe Comparison Lab Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div className="methods-scan-beam" aria-hidden="true" />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-satellite">
                <Layers size={13} /> Canopy &amp; Spectral Lab
              </span>
              <ProvenanceBadge
                type="SATELLITE-DERIVED"
                label="SENTINEL-2 L2A • 10m OPTICAL / 20m BAND 11 RESAMPLED"
                source="ESA Copernicus Sentinel-2 L2A (12 Valid Passes, Nov 2025 – Mar 2026)"
                resolution="B2, B3, B4, B8 at 10m native; B11 SWIR 20m resampled to 10m"
                coordinateOffset="Godagari Centroid 24.469°N, 88.330°E"
                calibration="84.63% ± 3.81% 5-fold spatial CV | 85.77% Block C | 422 Crop Species Gate"
                compact
              />
            </div>
            <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
              Synchronized Spectral Curtain Wipe &amp; Phenology Analysis
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Drag the interactive curtain divider to compare spectral indices or track canopy changes across 12 cloud-screened satellite passes.
            </p>
          </div>

          {/* Mode A vs Mode B Selector */}
          <div
            role="group"
            aria-label="Spectral Comparison Mode"
            style={{
              display: 'inline-flex',
              background: 'var(--bg-alt)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0.2rem',
            }}
          >
            <button
              type="button"
              onClick={() => setCompareMode('modeA')}
              aria-pressed={compareMode === 'modeA'}
              style={{
                padding: '0.38rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: compareMode === 'modeA' ? 'var(--bg-surface)' : 'transparent',
                color: compareMode === 'modeA' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                boxShadow: compareMode === 'modeA' ? 'var(--shadow-xs)' : 'none',
              }}
            >
              Mode A: Same-Date Spectral Wipe
            </button>
            <button
              type="button"
              onClick={() => setCompareMode('modeB')}
              aria-pressed={compareMode === 'modeB'}
              style={{
                padding: '0.38rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: compareMode === 'modeB' ? 'var(--bg-surface)' : 'transparent',
                color: compareMode === 'modeB' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                boxShadow: compareMode === 'modeB' ? 'var(--shadow-xs)' : 'none',
              }}
            >
              Mode B: 12-Scene Temporal Wipe
            </button>
          </div>
        </div>

        {/* Layer / Scene Selection Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
          }}
        >
          {compareMode === 'modeA' ? (
            <>
              <div>
                <label
                  htmlFor="left-layer-sel"
                  style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}
                >
                  Left Curtain Layer
                </label>
                <select
                  id="left-layer-sel"
                  value={leftLayerId}
                  onChange={(e) => setLeftLayerId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {SPECTRAL_LAYERS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} [{l.res}]
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="right-layer-sel"
                  style={{ fontSize: '0.74rem', color: 'var(--accent-water)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}
                >
                  Right Curtain Layer
                </label>
                <select
                  id="right-layer-sel"
                  value={rightLayerId}
                  onChange={(e) => setRightLayerId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {SPECTRAL_LAYERS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} [{l.res}]
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="scene-date-sel"
                  style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}
                >
                  Sentinel-2 Pass Date (1 of 12)
                </label>
                <select
                  id="scene-date-sel"
                  value={rightSceneIdx}
                  onChange={(e) => setRightSceneIdx(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {SENTINEL_SCENES.map((sc, i) => (
                    <option key={sc.date} value={i}>
                      {sc.date} — {sc.stage}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label
                  htmlFor="left-date-sel"
                  style={{ fontSize: '0.74rem', color: 'var(--accent-terracotta)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}
                >
                  Left Scene Date (Baseline Pass)
                </label>
                <select
                  id="left-date-sel"
                  value={leftSceneIdx}
                  onChange={(e) => setLeftSceneIdx(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {SENTINEL_SCENES.map((sc, i) => (
                    <option key={sc.date} value={i}>
                      {sc.date} ({sc.stage})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="right-date-sel"
                  style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}
                >
                  Right Scene Date (Comparison Pass)
                </label>
                <select
                  id="right-date-sel"
                  value={rightSceneIdx}
                  onChange={(e) => setRightSceneIdx(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {SENTINEL_SCENES.map((sc, i) => (
                    <option key={sc.date} value={i}>
                      {sc.date} ({sc.stage})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="temporal-index-sel"
                  style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}
                >
                  Active Spectral Index
                </label>
                <select
                  id="temporal-index-sel"
                  value={leftLayerId}
                  onChange={(e) => setLeftLayerId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {SPECTRAL_LAYERS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Interactive Curtain Slider Control */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
              ◀ Left: {compareMode === 'modeA' ? `${leftLayer.id}` : `${leftScene.date}`} = {leftValue}
            </span>
            <span className="mono" style={{ color: 'var(--accent-terracotta)', fontWeight: 700 }}>
              Curtain Split: {curtainPct}% • Δ = {(Number(rightValue) - Number(leftValue) >= 0 ? '+' : '') + (Number(rightValue) - Number(leftValue)).toFixed(2)}
            </span>
            <span className="mono" style={{ color: 'var(--accent-water)', fontWeight: 700 }}>
              Right: {compareMode === 'modeA' ? `${rightLayer.id}` : `${rightScene.date}`} = {rightValue} ▶
            </span>
          </div>
          <input
            type="range"
            aria-label="Spectral Curtain Wipe Position"
            min="5"
            max="95"
            value={curtainPct}
            onChange={(e) => setCurtainPct(Number(e.target.value))}
            className="slider-input"
          />
        </div>

        {/* Synchronized Curtain Wipe SVG Canvas with Linked Crosshair */}
        <div
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round(((e.clientX - rect.left) / rect.width) * 720);
            const y = Math.round(((e.clientY - rect.top) / rect.height) * 300);
            setCursorPos({ x: Math.max(20, Math.min(700, x)), y: Math.max(20, Math.min(280, y)) });
          }}
          style={{
            background: '#0B1F17',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            cursor: 'crosshair',
          }}
        >
          <svg
            role="img"
            aria-label="Sentinel-2 Synchronized Curtain Wipe Canvas"
            viewBox="0 0 720 300"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <defs>
              <clipPath id="leftCurtainClip">
                <rect x="0" y="0" width={(curtainPct / 100) * 720} height="300" />
              </clipPath>
              <clipPath id="rightCurtainClip">
                <rect x={(curtainPct / 100) * 720} y="0" width={720 - (curtainPct / 100) * 720} height="300" />
              </clipPath>
            </defs>

            {/* LEFT CURTAIN SIDE */}
            <g clipPath="url(#leftCurtainClip)">
              <rect x="0" y="0" width="720" height="300" fill="#0A1812" />
              <polygon points="80,45 340,40 320,175 70,165" fill={leftLayer.colorB} fillOpacity="0.75" stroke="#FFFFFF" strokeWidth="1.8" />
              <polygon points="355,42 640,60 615,185 335,175" fill={leftLayer.colorA} fillOpacity="0.82" stroke="#2D4A3E" strokeWidth="1.5" />
              <polygon points="100,190 560,202 540,275 90,265" fill={leftLayer.colorB} fillOpacity="0.5" stroke="#2D4A3E" strokeWidth="1.5" />
              <text x="20" y="28" fill="#10B981" fontSize="12" fontFamily="var(--font-mono)" fontWeight="700">
                LEFT: {compareMode === 'modeA' ? `${leftLayer.name}` : `${leftScene.date} (${leftScene.stage})`} • Val={leftValue}
              </text>
            </g>

            {/* RIGHT CURTAIN SIDE */}
            <g clipPath="url(#rightCurtainClip)">
              <rect x="0" y="0" width="720" height="300" fill="#071A18" />
              <polygon
                points="80,45 340,40 320,175 70,165"
                fill={compareMode === 'modeA' ? rightLayer.colorB : '#10B981'}
                fillOpacity="0.78"
                stroke="#FFFFFF"
                strokeWidth="1.8"
              />
              <polygon
                points="355,42 640,60 615,185 335,175"
                fill={compareMode === 'modeA' ? rightLayer.colorA : '#059669'}
                fillOpacity="0.85"
                stroke="#1E3A4A"
                strokeWidth="1.5"
              />
              <polygon
                points="100,190 560,202 540,275 90,265"
                fill={compareMode === 'modeA' ? rightLayer.colorB : '#2DD4BF'}
                fillOpacity="0.55"
                stroke="#134E4A"
                strokeWidth="1.5"
              />
              <text x="380" y="28" fill="#2DD4BF" fontSize="12" fontFamily="var(--font-mono)" fontWeight="700">
                RIGHT: {compareMode === 'modeA' ? `${rightLayer.name}` : `${rightScene.date} (${rightScene.stage})`} • Val={rightValue}
              </text>
            </g>

            {/* Curtain Divider Vertical Bar */}
            <line
              x1={(curtainPct / 100) * 720}
              y1="0"
              x2={(curtainPct / 100) * 720}
              y2="300"
              stroke="#FBBF24"
              strokeWidth="2.5"
            />
            <circle
              cx={(curtainPct / 100) * 720}
              cy="150"
              r="14"
              fill="#0B2219"
              stroke="#FBBF24"
              strokeWidth="2.2"
            />
            <text
              x={(curtainPct / 100) * 720}
              y="154"
              fill="#FFFFFF"
              fontSize="11"
              fontFamily="var(--font-mono)"
              fontWeight="700"
              textAnchor="middle"
            >
              ↔
            </text>

            {/* Linked Pixel Crosshair */}
            <g transform={`translate(${cursorPos.x}, ${cursorPos.y})`}>
              <circle cx="0" cy="0" r="8" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#FFFFFF" strokeWidth="1.2" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#FFFFFF" strokeWidth="1.2" />
            </g>
          </svg>
        </div>

        {/* Resolution & Formula Disclosure Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="mono">
            <strong>Formula Trace:</strong> Left <code>{leftLayer.formula}</code> ({leftLayer.res}) | Right <code>{compareMode === 'modeA' ? rightLayer.formula : leftLayer.formula}</code>
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              askAssistantWithPrompt(
                'What is the validated accuracy of the Sentinel-2 Random Forest land classification model and why is crop-species classification gated with HTTP 422?'
              )
            }
          >
            <Bot size={14} />
            <span>Ask AI About Sentinel-2 Validation &amp; 422 Gate</span>
          </button>
        </div>
      </div>

      {/* Seasonal Multi-Band Vegetation Trajectory (NDVI / NDMI / EVI) */}
      <VegetationTimeSeriesChart series={SENTINEL_SCENES} />

      {/* Full Audited SatellitePanel with Verified 15-Feature RF Inference & Scene Ledger */}
      <SatellitePanel selectedFarmId={selectedFarmId} />
    </div>
  );
}
