import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Map as MapIcon,
  Box,
  Columns,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Sliders,
  MapPin,
  Radio,
  Radar,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import LeafletGisMap from './LeafletGisMap';
import ThreeLandscapeStage, { LAYER_CONFIG } from './ThreeLandscapeStage';
import AgriSenseOrbitalHUD from './AgriSenseOrbitalHUD';
import ProvenanceBadge from './ProvenanceBadge';
import AnimatedMetricCard from './charts/AnimatedMetricCard';
import TerrainProfileAndSlopeCards from './charts/TerrainProfileAndSlopeCards';

const VIEW_MODES = [
  { id: 'split', label: 'Synchronized Split', icon: Columns },
  { id: '2d', label: '2D Map Only', icon: MapIcon },
  { id: '3d', label: '3D Terrain Only', icon: Box },
  { id: 'orbital', label: 'Orbital 3D HUD', icon: Radar },
];

export default function SpatialTwinWorkspace({ dashboardData }) {
  const {
    selectedFieldId,
    setSelectedFieldId,
    selectedParcel,
    pauseMotion,
    cursorGeo,
    setCursorGeo,
  } = useAgriSense();

  const [layoutMode, setLayoutMode] = useState('split'); // 'split' | '2d' | '3d' | 'orbital'
  const [spectralOverlay, setSpectralOverlay] = useState('NDVI');
  const [activeLayer, setActiveLayer] = useState(0);
  const [exploded, setExploded] = useState(true);
  const [showTether, setShowTether] = useState(true);
  const [showTechDrawer, setShowTechDrawer] = useState(false);

  const wb = dashboardData?.waterBalance || {};
  const drVal = wb.depletion_mm ?? wb.root_zone_depletion_dr ?? 38.2;
  const rawVwc = dashboardData?.latestSensor?.soil_moisture_pct ?? selectedParcel.vwc ?? 25.4;
  const vwcVal = Number(rawVwc) <= 1 ? Number(rawVwc) * 100 : Number(rawVwc);

  // Approximate UTM Zone 45N (EPSG:32645) conversion for active cursor or centroid
  const activeLat = cursorGeo?.lat ?? selectedParcel.centroid.lat;
  const activeLon = cursorGeo?.lon ?? selectedParcel.centroid.lon;
  const utmEasting = Math.round(634820 + (activeLon - 88.33) * 101200);
  const utmNorthing = Math.round(2706890 + (activeLat - 24.469) * 110750);

  const [demData, setDemData] = useState(null);
  const [demLoading, setDemLoading] = useState(true);
  const [twinInView, setTwinInView] = useState(true);
  const twinStageRef = useRef(null);

  useEffect(() => {
    const el = twinStageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        setTwinInView(entries.some((e) => e.isIntersecting));
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const demSparkSeries = useMemo(() => {
    const profile = demData?.profile;
    if (!Array.isArray(profile) || profile.length < 2) return [];
    return profile.map((pt, i) => ({
      label: `${pt.distanceKm ?? i} km`,
      value: Number(pt.elevationM),
    }));
  }, [demData]);

  const weatherTmaxSeries = useMemo(() => {
    const hist = dashboardData?.weatherHistory;
    if (!Array.isArray(hist) || hist.length < 2) return [];
    return hist
      .slice(-14)
      .map((d, idx) => {
        const val = Number(d.t2m_max ?? (d.t2m !== undefined ? Number(d.t2m) + 4.2 : NaN));
        return Number.isFinite(val) ? { label: (d.date || `D${idx + 1}`).slice(5), value: val } : null;
      })
      .filter(Boolean);
  }, [dashboardData]);

  const fetchDemProfile = useCallback(async (latVal, lonVal) => {
    setDemLoading(true);
    try {
      const res = await fetch(
        `/api/v1/water/dem-profile?lat=${encodeURIComponent(latVal)}&lon=${encodeURIComponent(lonVal)}`
      );
      const data = await res.json();
      setDemData(data);
    } catch (err) {
      setDemData({ available: false, error: err.message });
    } finally {
      setDemLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDemProfile(selectedParcel.centroid.lat, selectedParcel.centroid.lon);
  }, [selectedParcel.centroid.lat, selectedParcel.centroid.lon, fetchDemProfile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Top Workspace Header & Controls */}
      <section className="card earth-module-card earth-module-card--emerald" style={{ padding: '1.25rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div className="section-eyebrow" style={{ marginBottom: '0.2rem' }}>
              Synchronized 2D GIS Cartography &amp; 3D WebGL Landscape Twin
            </div>
            <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
              2D / 3D Spatial Twin — Godagari Upazila (AEZ 26)
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Hover or click any parcel in the 2D satellite map or 3D Barind terrain to synchronize coordinates and layer telemetry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                background: 'var(--bg-alt)',
                padding: '0.2rem',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                const active = layoutMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setLayoutMode(mode.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'background 0.2s ease, color 0.2s ease',
                      background: active ? 'var(--bg-surface)' : 'transparent',
                      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={14} /> {mode.label}
                  </button>
                );
              })}
            </div>

            <select
              aria-label="Select Spectral Overlay"
              value={spectralOverlay}
              onChange={(e) => setSpectralOverlay(e.target.value)}
              style={{ padding: '0.42rem 0.75rem', fontSize: '0.76rem', fontWeight: 600 }}
            >
              <option value="NDVI">Overlay: Sentinel-2 NDVI</option>
              <option value="NDMI">Overlay: Sentinel-2 NDMI</option>
              <option value="EVI">Overlay: Sentinel-2 EVI</option>
            </select>

            <button
              type="button"
              onClick={() => setExploded((e) => !e)}
              className="btn btn-secondary"
              style={{ padding: '0.42rem 0.75rem', fontSize: '0.75rem' }}
            >
              <Sliders size={14} /> {exploded ? '3D: Exploded' : '3D: Stacked'}
            </button>

            <button
              type="button"
              onClick={() => setShowTether((t) => !t)}
              className="btn btn-secondary"
              style={{ padding: '0.42rem 0.75rem', fontSize: '0.75rem' }}
            >
              34.8 km NASA Tether: {showTether ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Parcel & Layer Quick Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            {PARCELS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedFieldId(p.id)}
                className={selectedFieldId === p.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                {p.code} ({p.area_ha} ha • {p.crop})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveLayer(0)}
              className={activeLayer === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.32rem 0.65rem', fontSize: '0.73rem' }}
            >
              All Strata
            </button>
            {LAYER_CONFIG.map((ly) => (
              <button
                key={ly.id}
                type="button"
                onClick={() => setActiveLayer(ly.id)}
                className={activeLayer === ly.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.32rem 0.65rem', fontSize: '0.73rem' }}
              >
                {ly.shortName}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Split-Screen 2D GIS Map + 3D WebGL Digital Twin */}
      <section
        ref={twinStageRef}
        style={{
          display: 'grid',
          gridTemplateColumns:
            layoutMode === 'split' ? 'repeat(auto-fit, minmax(380px, 1fr))' : '1fr',
          gap: '1.25rem',
        }}
      >
        {(layoutMode === 'split' || layoutMode === '2d') && (
          <div className="card" style={{ padding: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '0.65rem' }}>
              <span>2D Satellite &amp; Parcel Cartography (Leaflet GIS)</span>
              <ProvenanceBadge type="SATELLITE-DERIVED" label="ESRI IMAGERY + SENTINEL-2" compact />
            </div>
            <LeafletGisMap
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              spectralOverlay={spectralOverlay}
              showTether={showTether}
              cursorGeo={cursorGeo}
              onCursorMove={setCursorGeo}
              height={470}
            />
          </div>
        )}

        {(layoutMode === 'split' || layoutMode === '3d') && (
          <div className="card" style={{ padding: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '0.65rem' }}>
              <span>3D WebGL Barind Terraced Landscape &amp; Subsurface Twin</span>
              <ProvenanceBadge type="MODEL-DERIVED" label="4-LAYER STRATIGRAPHY" compact />
            </div>
            <ThreeLandscapeStage
              activeLayer={activeLayer}
              exploded={exploded}
              spectralMode={spectralOverlay}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              pauseMotion={pauseMotion || !twinInView}
              cursorGeo={cursorGeo}
              onCursorMove={setCursorGeo}
              moisturePct={vwcVal}
              depletionMm={drVal}
              height={470}
            />
          </div>
        )}

        {layoutMode === 'orbital' && (
          <div className="card earth-module-card earth-module-card--emerald" style={{ padding: '0.85rem' }}>
            <div className="card-title" style={{ marginBottom: '0.65rem' }}>
              <span>Orbital 3D Telemetry Hologram &amp; Sector Matrix</span>
              <ProvenanceBadge type="SATELLITE-DERIVED" label="SENTINEL-2 + NASA POWER + FAO-56" compact />
            </div>
            <AgriSenseOrbitalHUD
              selectedParcel={selectedParcel}
              activeLat={activeLat}
              activeLon={activeLon}
              dashboardData={dashboardData}
              vwcVal={vwcVal}
              drVal={drVal}
              pauseMotion={pauseMotion}
              height={465}
            />
          </div>
        )}
      </section>

      {/* Animated Telemetry KPI Strip + Expandable CRS & Spatial Provenance Drawer */}
      <section className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))',
            gap: '1rem',
            alignItems: 'stretch',
          }}
        >
          <AnimatedMetricCard
            title={`Active Parcel • ${selectedParcel.code}`}
            value={Number(selectedParcel.area_ha)}
            decimals={2}
            unit={`ha • ${selectedParcel.crop}`}
            subtitle={`Stage: ${selectedParcel.stage}`}
            series={demSparkSeries}
            seriesLabel="DEM Elevation"
            seriesUnit="m"
            accent="var(--accent-primary)"
            badgeType="SATELLITE-DERIVED"
            badgeLabel="SENTINEL-2 10m"
            icon={MapPin}
          />

          <AnimatedMetricCard
            title="Synchronized Cursor (WGS84)"
            value={Number(activeLat)}
            decimals={5}
            unit={`°N, ${activeLon.toFixed(5)}°E`}
            subtitle={`UTM 45N: ${utmEasting}m E, ${utmNorthing}m N`}
            series={demSparkSeries}
            seriesLabel="Transect Height"
            seriesUnit="m"
            accent="var(--accent-water)"
            badgeType="MODEL-DERIVED"
            badgeLabel="2D ↔ 3D LINKED"
            icon={Crosshair}
          />

          <AnimatedMetricCard
            title="NASA POWER Spatial Tether"
            value={34.8}
            decimals={1}
            unit="km ESE"
            subtitle={`VWC: ${Number(vwcVal).toFixed(1)}% • Depletion: ${Number(drVal).toFixed(1)} mm`}
            series={weatherTmaxSeries}
            seriesLabel="Reanalysis Tmax"
            seriesUnit="°C"
            accent="var(--accent-terracotta)"
            badgeType="NASA POWER"
            badgeLabel="24.3636°N, 88.6241°E"
            icon={Radio}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowTechDrawer((d) => !d)}
            className="btn btn-secondary"
          >
            {showTechDrawer ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>{showTechDrawer ? 'Hide Technical CRS Details' : 'Inspect CRS & Offset Provenance'}</span>
          </button>
        </div>

        {showTechDrawer && (
          <div
            className="surface"
            style={{
              marginTop: '1rem',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              fontSize: '0.8rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Geographic Display CRS
              </div>
              <div className="mono" style={{ color: 'var(--text-secondary)' }}>
                EPSG:4326 (WGS 84) • Centroid 24.4690°N, 88.3300°E
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Metric Area Calculation CRS
              </div>
              <div className="mono" style={{ color: 'var(--text-secondary)' }}>
                EPSG:32645 (UTM Zone 45N) • {utmEasting}m E, {utmNorthing}m N
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Sentinel-2 Spatial Resolution
              </div>
              <div className="mono" style={{ color: 'var(--text-secondary)' }}>
                10m Optical (B2/B3/B4/B8) • 20m SWIR B11 → 10m resampled
              </div>
            </div>
          </div>
        )}
      </section>

      {/* DEM Elevation Cross-Section & Terrace Slope Distribution */}
      <TerrainProfileAndSlopeCards
        demData={demData}
        loading={demLoading}
        onRetry={() => fetchDemProfile(selectedParcel.centroid.lat, selectedParcel.centroid.lon)}
      />

      {/* Orbital 3D Telemetry HUD Deck (Always visible in Module 01 when not focused at top) */}
      {layoutMode !== 'orbital' && (
        <section className="card earth-module-card earth-module-card--emerald" style={{ padding: '0.95rem' }}>
          <div className="card-title" style={{ marginBottom: '0.65rem' }}>
            <span>Orbital 3D Telemetry Hologram &amp; Sector Matrix</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ProvenanceBadge type="SATELLITE-DERIVED" label="SENTINEL-2 + NASA POWER + FAO-56" compact />
              <button
                type="button"
                onClick={() => {
                  setLayoutMode('orbital');
                  twinStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="btn btn-secondary"
                style={{ padding: '0.24rem 0.6rem', fontSize: '0.7rem' }}
              >
                <Radar size={13} /> Focus Top Stage
              </button>
            </div>
          </div>
          <AgriSenseOrbitalHUD
            selectedParcel={selectedParcel}
            activeLat={activeLat}
            activeLon={activeLon}
            dashboardData={dashboardData}
            vwcVal={vwcVal}
            drVal={drVal}
            pauseMotion={pauseMotion}
            height={465}
          />
        </section>
      )}
    </div>
  );
}
