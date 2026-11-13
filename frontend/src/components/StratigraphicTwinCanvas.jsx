import React, { useState } from 'react';
import {
  Layers,
  Map as MapIcon,
  Box,
  Columns,
  Sun,
  Eye,
  Sliders,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import ThreeLandscapeStage, { LAYER_CONFIG } from './ThreeLandscapeStage';
import LeafletGisMap from './LeafletGisMap';
import ProvenanceBadge from './ProvenanceBadge';

export default function StratigraphicTwinCanvas({ mode = 'command', dashboardData }) {
  const {
    selectedFieldId,
    setSelectedFieldId,
    selectedParcel,
    pauseMotion,
    cursorGeo,
    setCursorGeo,
    navigateToWorkspace,
  } = useAgriSense();

  const [viewLayout, setViewLayout] = useState('3d'); // '3d' | '2d' | 'split'
  const [activeLayer, setActiveLayer] = useState(0); // 0 = All, 1..4 = Layer
  const [exploded, setExploded] = useState(true);
  const [spectralMode, setSpectralMode] = useState('NDVI');
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const wb = dashboardData?.waterBalance || {};
  const et0Val = wb.et0_mm_day ?? wb.reference_et0 ?? 4.78;
  const etcVal = wb.etc_mm_day ?? wb.crop_etc ?? 5.49;
  const drVal = wb.depletion_mm ?? wb.root_zone_depletion_dr ?? 38.2;
  const vwcVal = dashboardData?.latestSensor?.soil_moisture_pct ?? selectedParcel.vwc ?? 25.4;

  const LAYER_DETAILS = [
    {
      id: 0,
      title: 'Integrated 4-Layer Living Landscape Twin',
      badge: 'MODEL-DERIVED',
      summary:
        'Couples orbital Sentinel-2 canopy vigor, NASA POWER solar/evaporative forcing (~34.8 km ESE), terraced field parcels, and FAO-56 root-zone hydrology.',
      metricLabel: 'Composite Twin Status',
      metricVal: `${selectedParcel.code} • NDVI ${selectedParcel.ndvi.toFixed(2)} • ET₀ ${Number(et0Val).toFixed(2)} mm/d`,
      workspace: 'spatial-twin',
    },
    {
      id: 1,
      title: 'Layer 1 — Atmosphere & Solar Flux',
      badge: 'NASA POWER',
      summary:
        'MERRA-2 (0.5°×0.625°) & CERES (1.0°×1.0°) solar radiation, Tmax/Tmin, vapor pressure deficit, and reference ET₀ at 24.3636°N, 88.6241°E (~34.8 km ESE).',
      metricLabel: 'Reference Evapotranspiration (ET₀)',
      metricVal: `${Number(et0Val).toFixed(2)} mm/day`,
      workspace: 'climate',
    },
    {
      id: 2,
      title: 'Layer 2 — Spectral Canopy (Sentinel-2 L2A)',
      badge: 'SATELLITE-DERIVED',
      summary:
        '10m optical bands (B2, B3, B4, B8) + 20m SWIR Band 11 resampled to 10m across 12 valid cloud-screened scenes. Spatial CV: 84.63% ± 3.81%.',
      metricLabel: `Active ${spectralMode} Index`,
      metricVal:
        spectralMode === 'NDMI'
          ? `${selectedParcel.ndmi.toFixed(2)} (Moisture)`
          : `${selectedParcel.ndvi.toFixed(2)} (Canopy Vigor)`,
      workspace: 'spectral-lab',
    },
    {
      id: 3,
      title: 'Layer 3 — Agricultural Surface & Parcels',
      badge: 'SIMULATED',
      summary:
        'Terraced Barind clay-loam parcels with simulated ESP32 + Capacitive FDR v2 soil telemetry (5,760 source records, is_simulated = true, UNCALIBRATED).',
      metricLabel: 'Parcel Soil VWC (Simulated)',
      metricVal: `${Number(vwcVal).toFixed(1)}% VWC`,
      workspace: 'soil-iot',
    },
    {
      id: 4,
      title: 'Layer 4 — Subsurface Root Zone & Aquifer',
      badge: 'MODEL-DERIVED',
      summary:
        'FAO-56 root zone (Zr = 0.50m, TAW = 79.0 mm, RAW = 39.5 mm) above Pleistocene clay hardpan and 26.4m deep tubewell proxy water table (28.0m limit).',
      metricLabel: 'Root-Zone Depletion (Dr)',
      metricVal: `${Number(drVal).toFixed(1)} mm / 79.0 mm`,
      workspace: 'root-zone',
    },
  ];

  const currentLayerInfo = LAYER_DETAILS.find((l) => l.id === activeLayer) || LAYER_DETAILS[0];

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {/* Minimal Modern Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {/* Left: 4-Layer Stratigraphic Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveLayer(0)}
            className={activeLayer === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '0.38rem 0.75rem', fontSize: '0.76rem' }}
          >
            <Layers size={14} /> All 4 Layers
          </button>
          {LAYER_CONFIG.map((ly) => (
            <button
              key={ly.id}
              type="button"
              onClick={() => setActiveLayer(ly.id)}
              className={activeLayer === ly.id ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.76rem' }}
            >
              {ly.shortName}
            </button>
          ))}
        </div>

        {/* Right: View Mode, Explode Toggle, Spectral Mode, Inspector Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-alt)',
              padding: '0.2rem',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewLayout('3d')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                background: viewLayout === '3d' ? 'var(--bg-surface)' : 'transparent',
                color: viewLayout === '3d' ? 'var(--accent-primary)' : 'var(--text-muted)',
                boxShadow: viewLayout === '3d' ? 'var(--shadow-xs)' : 'none',
              }}
            >
              <Box size={13} /> 3D Twin
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('split')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                background: viewLayout === 'split' ? 'var(--bg-surface)' : 'transparent',
                color: viewLayout === 'split' ? 'var(--accent-primary)' : 'var(--text-muted)',
                boxShadow: viewLayout === 'split' ? 'var(--shadow-xs)' : 'none',
              }}
            >
              <Columns size={13} /> 2D + 3D Split
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('2d')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                background: viewLayout === '2d' ? 'var(--bg-surface)' : 'transparent',
                color: viewLayout === '2d' ? 'var(--accent-primary)' : 'var(--text-muted)',
                boxShadow: viewLayout === '2d' ? 'var(--shadow-xs)' : 'none',
              }}
            >
              <MapIcon size={13} /> 2D GIS Map
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExploded((prev) => !prev)}
            className="btn btn-secondary"
            style={{ padding: '0.36rem 0.7rem', fontSize: '0.74rem' }}
          >
            <Sliders size={13} /> {exploded ? 'Layers: Exploded' : 'Layers: Stacked'}
          </button>

          <select
            aria-label="Select Spectral Layer"
            value={spectralMode}
            onChange={(e) => setSpectralMode(e.target.value)}
            style={{
              padding: '0.36rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '10px',
            }}
          >
            <option value="NDVI">Spectral: NDVI (Canopy)</option>
            <option value="NDMI">Spectral: NDMI (Moisture)</option>
            <option value="EVI">Spectral: EVI (Biomass)</option>
          </select>

          <button
            type="button"
            onClick={() => setInspectorOpen((o) => !o)}
            className="btn btn-secondary"
            style={{ padding: '0.36rem 0.65rem', fontSize: '0.74rem' }}
            title="Toggle Right Parcel & Layer Inspector"
          >
            {inspectorOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />} Inspector
          </button>
        </div>
      </div>

      {/* Main Stage + Collapsible Right Inspector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: inspectorOpen ? 'minmax(0, 1fr) 310px' : 'minmax(0, 1fr)',
          gap: '1rem',
          alignItems: 'stretch',
        }}
      >
        {/* Left/Center Viewport */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewLayout === 'split' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
            gap: '0.85rem',
          }}
        >
          {(viewLayout === '2d' || viewLayout === 'split') && (
            <LeafletGisMap
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              spectralOverlay={spectralMode}
              cursorGeo={cursorGeo}
              onCursorMove={setCursorGeo}
              height={mode === 'hero' ? 450 : 420}
            />
          )}

          {(viewLayout === '3d' || viewLayout === 'split') && (
            <ThreeLandscapeStage
              activeLayer={activeLayer}
              exploded={exploded}
              spectralMode={spectralMode}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              pauseMotion={pauseMotion}
              cursorGeo={cursorGeo}
              onCursorMove={setCursorGeo}
              moisturePct={vwcVal}
              depletionMm={drVal}
              height={mode === 'hero' ? 450 : 420}
            />
          )}
        </div>

        {/* Right Collapsible Inspector */}
        {inspectorOpen && (
          <aside
            className="surface"
            style={{
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.9rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="section-eyebrow" style={{ marginBottom: 0 }}>
                  Active Parcel Selection
                </span>
                <ProvenanceBadge type={currentLayerInfo.badge} compact />
              </div>

              {/* Parcel Switcher Pills */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem' }}>
                {PARCELS.map((p) => {
                  const active = p.id === selectedFieldId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedFieldId(p.id)}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.35rem',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: active ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        color: active ? '#FFFFFF' : 'var(--text-secondary)',
                        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      {p.code.replace('PARCEL ', '')}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '0.85rem',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                  {selectedParcel.code} — {selectedParcel.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {selectedParcel.crop} • {selectedParcel.area_ha} ha • {selectedParcel.soil}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Sentinel-2 NDVI</div>
                    <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {selectedParcel.ndvi.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Crop ETc</div>
                    <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-water)' }}>
                      {Number(etcVal).toFixed(2)} mm/d
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Simulated VWC</div>
                    <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {Number(vwcVal).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Depletion (Dr)</div>
                    <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-terracotta)' }}>
                      {Number(drVal).toFixed(1)} mm
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Layer Details */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {currentLayerInfo.title}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.6rem' }}>
                  {currentLayerInfo.summary}
                </p>
                <div className="mono" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {currentLayerInfo.metricLabel}: {currentLayerInfo.metricVal}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateToWorkspace(currentLayerInfo.workspace)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Eye size={14} /> Open Dedicated Workspace
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
