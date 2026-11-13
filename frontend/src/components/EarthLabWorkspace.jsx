import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Box,
  CloudSun,
  Eye,
  FileText,
  FlaskConical,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { PARCELS, useAgriSense } from '../context/AgriSenseContext';
import { getRelativeEdges, slideFill } from '../utils/motion';
import SpatialTwinWorkspace from './SpatialTwinWorkspace';
import CanopySpectralLab from './CanopySpectralLab';
import ClimateIntelligenceWorkspace from './ClimateIntelligenceWorkspace';
import EarthLabSandbox from './EarthLabSandbox';
import { EditorialSectionHeader } from './methods/MethodsKit';

const EARTH_SECTIONS = [
  { id: 'spatial', domId: 'earth-spatial', num: '01', label: '01 Spatial Twin', icon: Box },
  { id: 'spectral', domId: 'earth-spectral', num: '02', label: '02 Spectral Lab', icon: Layers },
  { id: 'climate', domId: 'earth-climate', num: '03', label: '03 NASA Climate', icon: CloudSun },
  { id: 'sandbox', domId: 'earth-sandbox', num: '04', label: '04 Interactive Lab', icon: FlaskConical },
];

export default function EarthLabWorkspace({ dashboardData, onSyncNasa, syncingNasa }) {
  const {
    selectedFarmId,
    selectedFieldId,
    setSelectedFieldId,
    selectedLocation,
    dynamicFields,
    xRayMode,
    setXRayMode,
    workspaceModes,
    navigateToWorkspace,
  } = useAgriSense();

  const initialMode = workspaceModes?.['earth-lab'] || 'spatial';
  const [activeSection, setActiveSection] = useState(
    EARTH_SECTIONS.some((s) => s.id === initialMode) ? initialMode : 'spatial'
  );
  const manualScrollLockRef = useRef(0);
  const lastModeRef = useRef(initialMode);
  const jumpTrackRef = useRef(null);
  const jumpFillRef = useRef(null);
  const jumpBtnRefs = useRef({});
  const firstPillSyncRef = useRef(true);

  const syncJumpFill = useCallback((immediate = false) => {
    const fillEl = jumpFillRef.current;
    const btnEl = jumpBtnRefs.current[activeSection];
    if (!fillEl || !btnEl) return;
    slideFill(fillEl, getRelativeEdges(fillEl, btnEl), immediate, {
      axis: 'horizontal',
      radius: '9999px',
    });
  }, [activeSection]);

  useLayoutEffect(() => {
    syncJumpFill(firstPillSyncRef.current);
    firstPillSyncRef.current = false;
  }, [syncJumpFill]);

  useEffect(() => {
    const el = jumpTrackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => syncJumpFill(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncJumpFill]);

  const scrollToSection = useCallback((sectionId, behavior = 'smooth') => {
    const target = EARTH_SECTIONS.find((s) => s.id === sectionId);
    if (!target) return;
    const el = document.getElementById(target.domId);
    if (!el) return;
    setActiveSection(sectionId);
    manualScrollLockRef.current = Date.now() + 850;
    el.scrollIntoView({ behavior, block: 'start' });
  }, []);

  // Scroll cleanly when URL/palette sets an external earth-lab submode (e.g. ?mode=spectral)
  useEffect(() => {
    const requested = workspaceModes?.['earth-lab'];
    if (requested && EARTH_SECTIONS.some((s) => s.id === requested)) {
      if (requested !== 'spatial' && lastModeRef.current === requested) {
        // Initial mount with non-default submode deep link
        const timer = window.setTimeout(() => scrollToSection(requested, 'smooth'), 120);
        return () => window.clearTimeout(timer);
      }
      if (requested !== lastModeRef.current) {
        lastModeRef.current = requested;
        scrollToSection(requested, 'smooth');
      }
    }
    return undefined;
  }, [workspaceModes, scrollToSection]);

  // Scroll-Spy via IntersectionObserver to highlight active section pill
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const elements = EARTH_SECTIONS.map((s) => ({
      id: s.id,
      el: document.getElementById(s.domId),
    })).filter((item) => item.el);

    if (!elements.length) return undefined;

    const ratios = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < manualScrollLockRef.current) return;
        entries.forEach((entry) => {
          const match = elements.find((item) => item.el === entry.target);
          if (match) {
            ratios.set(match.id, entry.isIntersecting ? entry.intersectionRatio : 0);
          }
        });
        let bestId = null;
        let bestScore = 0;
        ratios.forEach((score, id) => {
          if (score > bestScore) {
            bestScore = score;
            bestId = id;
          }
        });
        if (bestId) {
          setActiveSection(bestId);
        }
      },
      {
        rootMargin: '-18% 0px -48% 0px',
        threshold: [0.05, 0.2, 0.4, 0.65],
      }
    );

    elements.forEach(({ el }) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="methods-shell earth-lab-shell" style={{ gap: '2rem', paddingBottom: '2rem' }}>
      {/* Slim Sticky Command & Section-Jump Bar (Replaces redundant Context Ribbon + Sub-mode Tabs) */}
      <nav aria-label="Earth Lab Context & Section Jump" className="earth-sticky-bar card no-print">
        <div className="earth-sticky-left">
          <MapPin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <label htmlFor="earth-parcel-select" className="visually-hidden">Select Field Parcel</label>
          <select
            id="earth-parcel-select"
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            className="earth-compact-select"
          >
            {PARCELS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} • {p.crop}
              </option>
            ))}
            {dynamicFields
              .filter((df) => !df.is_demo && !PARCELS.some((p) => p.id === df.id))
              .map((df) => (
                <option key={df.id} value={df.id}>
                  {df.name} • {df.current_crop}
                </option>
              ))}
          </select>

          <span
            className={`badge ${selectedLocation?.isPrimary ? 'badge-live' : 'badge-demo'}`}
            style={{ fontSize: '0.64rem', padding: '0.14rem 0.48rem', whiteSpace: 'nowrap' }}
            title={`${selectedLocation?.district || 'Rajshahi'} · ${selectedLocation?.aez || 'AEZ-26'}`}
          >
            AEZ-26
          </span>

          <button
            type="button"
            onClick={() => setXRayMode((prev) => !prev)}
            aria-pressed={xRayMode}
            className="btn btn-secondary"
            style={{
              padding: '0.22rem 0.52rem',
              fontSize: '0.7rem',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
              background: xRayMode ? 'rgba(52, 211, 153, 0.16)' : undefined,
              borderColor: xRayMode ? 'var(--accent-primary)' : undefined,
              color: xRayMode ? 'var(--accent-primary)' : undefined,
            }}
            title="Toggle Scientific Provenance Disclosures"
          >
            <Eye size={12} /> X-Ray: {xRayMode ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={onSyncNasa}
            disabled={syncingNasa}
            className="btn btn-secondary"
            style={{ padding: '0.22rem 0.52rem', fontSize: '0.7rem', borderRadius: '9999px', whiteSpace: 'nowrap' }}
            title="Sync Live NASA POWER Telemetry"
          >
            <RefreshCw size={12} className={syncingNasa ? 'animate-spin' : ''} />
            <span>{syncingNasa ? 'Sync...' : 'Sync NASA'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateToWorkspace('report')}
            className="btn btn-secondary"
            style={{ padding: '0.22rem 0.52rem', fontSize: '0.7rem', borderRadius: '9999px', whiteSpace: 'nowrap' }}
            title="Open Printable Field Report"
          >
            <FileText size={12} /> Report
          </button>
        </div>

        {/* Right: GSAP Liquid Sliding Pill Section Jump Bar */}
        <div ref={jumpTrackRef} className="earth-jumps-track" role="tablist" aria-label="Earth Lab Sections">
          <div className="earth-jumps-layer">
            {EARTH_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  ref={(el) => {
                    jumpBtnRefs.current[sec.id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => scrollToSection(sec.id, 'smooth')}
                  className="earth-jump-pill"
                >
                  <Icon size={13} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
          <div ref={jumpFillRef} aria-hidden="true" className="earth-jumps-layer earth-jumps-fill">
            {EARTH_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              return (
                <div key={sec.id} className="earth-jump-pill">
                  <Icon size={13} />
                  <span>{sec.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* SECTION 01: 2D / 3D Spatial Twin */}
      <section id="earth-spatial" className="earth-section-anchor" aria-label="2D and 3D Spatial Twin">
        <EditorialSectionHeader
          num="01"
          kicker="Synchronized 2D GIS & 3D WebGL Landscape Twin"
          title="Spatial Parcel & Elevation Architecture"
          accentPhrase="in AEZ-26"
          subtitle="Synchronized Leaflet parcel polygons, 4-strata Barind WebGL subsurface model, and Terrarium DEM slope transects."
          accent="var(--m-emerald)"
          tagLabel="MODULE"
        />
        <SpatialTwinWorkspace dashboardData={dashboardData} />
      </section>

      {/* SECTION 02: Sentinel-2 Canopy & Spectral Lab */}
      <section id="earth-spectral" className="earth-section-anchor" aria-label="Sentinel-2 Canopy Spectral Lab">
        <EditorialSectionHeader
          num="02"
          kicker="ESA Copernicus Sentinel-2 L2A Multispectral"
          title="Canopy Spectral Curtain & 15-Feature Inference"
          accentPhrase="across 12 passes"
          subtitle="Compare NDVI, NDMI, EVI, and McFeeters NDWI phenology trajectories, scene cloud screening, and spatial validation partitions."
          accent="var(--m-emerald)"
          tagLabel="MODULE"
        />
        <CanopySpectralLab selectedFarmId={selectedFarmId} />
      </section>

      {/* SECTION 03: NASA POWER Climate & Heat-Dryness Screening */}
      <section id="earth-climate" className="earth-section-anchor" aria-label="NASA POWER Climate Intelligence">
        <EditorialSectionHeader
          num="03"
          kicker="NASA Langley MERRA-2 & CERES Reanalysis"
          title="Agroclimatology & Compound Desiccation Screening"
          accentPhrase="at 34.8 km ESE"
          subtitle="Track daily Tmax/Tmin spread, Tetens Vapor Pressure Deficit (VPD), solar radiation flux, and compound heat-dryness triggers."
          accent="var(--m-emerald)"
          tagLabel="MODULE"
        />
        <ClimateIntelligenceWorkspace
          weatherHistory={dashboardData?.weatherHistory || []}
          attribution={dashboardData?.nasaAttribution}
          onSyncNasa={onSyncNasa}
          syncingNasa={syncingNasa}
        />
      </section>

      {/* SECTION 04: Interactive Scientific Lab & Live API Sandbox */}
      <section id="earth-sandbox" className="earth-section-anchor" aria-label="Interactive Scientific Lab and Testing Sandbox">
        <EditorialSectionHeader
          num="04"
          kicker="Live Backend Parameter Sandbox"
          title="Interactive Reflectance, Classifier & Coordinate Tests"
          accentPhrase="with zero fake math"
          subtitle="Adjust surface reflectance bands, verify 15-feature land-cover inference and HTTP 422/501 gates, or fetch custom NASA POWER + DEM coordinates."
          accent="var(--m-emerald)"
          tagLabel="MODULE"
        />
        <EarthLabSandbox dashboardData={dashboardData} />
      </section>
    </div>
  );
}
