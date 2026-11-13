import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Compass,
  Layers,
  CloudSun,
  Droplets,
  Cpu,
  Wheat,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  MapPin,
  Sparkles,
  BookOpen,
  Eye,
  Activity,
  BarChart3,
  Database,
  Globe,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Radio,
  ExternalLink,
  Users,
  Rocket,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import { TEAM_INFO, ALL_TEAM } from '../data/teamData';
import { useAgriSense, PARCELS, JUDGE_DEMO_STEPS } from '../context/AgriSenseContext';
import ThreeLandscapeStage, { LAYER_CONFIG } from './ThreeLandscapeStage';
import HeroThreeLandscape from './HeroThreeLandscape';
import EarthGodagariMap from './EarthGodagariMap';
import SatelliteScanStage from './SatelliteScanStage';
import ImpactObservatoryDashboard, { DonutPieGauge, SegmentedPieBar } from './ImpactObservatoryDashboard';
import SpatialTwinPreviewStage from './SpatialTwinPreviewStage';
import BangladeshLocationExplorer from './BangladeshLocationExplorer';
import ProvenanceBadge from './ProvenanceBadge';

const SIX_PILLARS = [
  {
    id: 'spectral-lab',
    tag: 'Subsystem M1 • Earth Observation',
    title: 'Sentinel-2 Spectral & Land Classification',
    icon: Layers,
    accent: '#2F8F5B',
    badge: 'SATELLITE-DERIVED',
    metric: '84.63% ± 3.81% Spatial CV • 85.77% Block C Holdout',
    desc: '21-feature Random Forest (RandomForest_21Feat_Deep) across 12 cloud-screened Sentinel-2 passes (10m optical, resampled B11 & multi-temporal texture). Block C holdout reaches 85.77% overall (90.64% pure interior; 75.92% mixed boundary). Crop-species classification is honestly gated (HTTP 422) until field labels are collected.',
  },
  {
    id: 'climate',
    tag: 'Subsystem M2 • Agroclimatology',
    title: 'NASA POWER Heat & Dryness Screening',
    icon: CloudSun,
    accent: '#FBBF24',
    badge: 'NASA POWER',
    metric: 'MERRA-2 + CERES • 34.8 km ESE Spatial Tether',
    desc: 'Extracts daily Tmax, Tmin, relative humidity, solar radiation, wind speed, and precipitation from the nearest NASA POWER reanalysis centroid (24.3636°N, 88.6241°E, ~34.8 km ESE of Godagari). Screens compound heat-dryness stress (Tmax ≥ 35°C, RH ≤ 50%, Rain ≤ 1 mm).',
  },
  {
    id: 'soil-iot',
    tag: 'Subsystem M3 • Subsurface Telemetry',
    title: 'Terraced Soil Profile & Simulated ESP32 Nodes',
    icon: Cpu,
    accent: '#398EAA',
    badge: 'SIMULATED',
    metric: '5,760 Source Records • 500 Fast-Cache • UNCALIBRATED',
    desc: 'Models capacitive FDR v2 volumetric water content, DS18B20 soil temperature, and SHT31 microclimate across uplifted Barind clay-loam terraces. Every reading is transparently flagged as is_simulated = true and calibration_status = UNCALIBRATED.',
  },
  {
    id: 'crop-intelligence',
    tag: 'Subsystem M4 • Agronomic Planning',
    title: 'BARC Historical Suitability & MCDA Rotation',
    icon: Wheat,
    accent: '#FB923C',
    badge: 'HISTORICAL BASELINE',
    metric: 'Aman 78.92% • Maize 73.44% • Wheat 57.41% • Boro 40.51%',
    desc: 'Couples Bangladesh Agricultural Research Council (BARC) AEZ-26 historical suitability baselines with a 4-criterion Multi-Criteria Decision Analysis engine (Water Conservation, Soil Health, Heat Resilience, Economic Return) to replace water-intensive Boro monoculture.',
  },
  {
    id: 'root-zone',
    tag: 'Subsystem M5 • Vadose Hydrology',
    title: 'FAO-56 Penman-Monteith Water Balance',
    icon: Droplets,
    accent: '#0284C7',
    badge: 'MODEL-DERIVED',
    metric: 'Python / JS Parity < 1e-6 • TAW 79.0 mm (Zr = 0.50m)',
    desc: 'Computes daily reference evapotranspiration (ET₀), stage-adjusted crop ETc, Total Available Water (TAW), Readily Available Water (RAW), root-zone depletion (Dr), and water stress coefficient (Ks), comparing 70% flood vs 85% improved irrigation efficiency.',
  },
  {
    id: 'crop-health',
    tag: 'Subsystem M6 • Plant Pathology',
    title: 'Literature-Grounded Disease Susceptibility',
    icon: ShieldAlert,
    accent: '#D65F58',
    badge: 'LITERATURE-DERIVED',
    metric: '17 Crop Diseases • 60 Peer-Reviewed DOI Papers',
    desc: 'Screens environmental and soil-borne susceptibility across 17 Bangladesh crop diseases backed by 60 DOI publications (48 full-text verified, 5 abstract-verified, 7 metadata-only), while explicitly reporting unmeasured leaf_wetness_hours = null.',
  },
];

const IMPACT_METRICS = [
  {
    id: 'cv',
    label: 'SENTINEL-2 SPATIAL CV',
    value: '84.63%',
    desc: '± 3.81% across 12 cloud-screened satellite passes (85.77% Block C Holdout)',
    accent: '#34D399',
    glow: 'rgba(52, 211, 153, 0.35)',
    pieCenter: '84.6%',
    pieSub: 'CV',
    pieSegments: [{ label: 'Spatial CV', pct: 84.63, color: '#34D399' }],
    barSegments: [
      { label: 'Pure Interior', pct: 66, color: '#34D399' },
      { label: 'Mixed Edge', pct: 34, color: '#F59E0B' },
    ],
  },
  {
    id: 'savings',
    label: 'SCENARIO WATER DELTA',
    value: '76.3%',
    desc: 'Provisional scenario modeling delta: Mustard-Mungbean vs flooded Boro baseline',
    accent: '#FB923C',
    glow: 'rgba(251, 146, 60, 0.35)',
    pieCenter: '76.3%',
    pieSub: 'SAVED',
    pieSegments: [
      { label: 'Saved Pumping', pct: 76.3, color: '#FB923C' },
      { label: 'Rotation Demand', pct: 23.7, color: '#0E7490' },
    ],
    barSegments: [
      { label: 'Saved', pct: 76.3, color: '#FB923C' },
      { label: 'Used', pct: 23.7, color: '#38BDF8' },
    ],
  },
  {
    id: 'climate',
    label: 'DAILY CLIMATE ARCHIVE',
    value: '1,827',
    desc: 'Consecutive days of NASA POWER MERRA-2 / CERES reanalysis data',
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.35)',
    pieCenter: '5Y',
    pieSub: 'DAILY',
    pieSegments: [
      { label: 'MERRA-2 Atmospheric', pct: 55, color: '#F59E0B' },
      { label: 'CERES Irradiance', pct: 45, color: '#34D399' },
    ],
    barSegments: [
      { label: 'MERRA-2 Tmax/RH/Wind', pct: 60, color: '#F59E0B' },
      { label: 'CERES Solar/Rain', pct: 40, color: '#38BDF8' },
    ],
  },
  {
    id: 'dois',
    label: 'DISEASES & DOI PAPERS',
    value: '17 / 60',
    desc: 'Crop pathogens backed by 60 peer-reviewed DOI papers (48 full-text)',
    accent: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.35)',
    pieCenter: '80%',
    pieSub: 'FULL',
    pieSegments: [
      { label: 'Full-Text (48)', pct: 80, color: '#F43F5E' },
      { label: 'Abstract (5)', pct: 8.3, color: '#F59E0B' },
      { label: 'Meta (7)', pct: 11.7, color: '#38BDF8' },
    ],
    barSegments: [
      { label: 'Full-Text', pct: 80, color: '#F43F5E' },
      { label: 'Abstract', pct: 8.3, color: '#F59E0B' },
      { label: 'Metadata', pct: 11.7, color: '#38BDF8' },
    ],
  },
  {
    id: 'parity',
    label: 'FAO-56 ENGINE PARITY',
    value: '< 10⁻⁶',
    desc: 'Zero floating point divergence between Python backend and JS frontend',
    accent: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.35)',
    pieCenter: '100%',
    pieSub: 'PARITY',
    pieSegments: [
      { label: 'Python Engine', pct: 50, color: '#38BDF8' },
      { label: 'JS Engine', pct: 50, color: '#34D399' },
    ],
    barSegments: [
      { label: 'Python FAO-56', pct: 50, color: '#38BDF8' },
      { label: 'Node/JS FAO-56', pct: 50, color: '#34D399' },
    ],
  },
  {
    id: 'suction',
    label: 'AQUIFER SUCTION MARGIN',
    value: '1.6 m',
    desc: 'Margin remaining before Godagari tubewells exceed centrifugal suction limit',
    accent: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.35)',
    pieCenter: '94.3%',
    pieSub: 'USED',
    pieSegments: [
      { label: 'DTW Drawdown (26.4m)', pct: 94.3, color: '#EF4444' },
      { label: 'Remaining Margin (1.6m)', pct: 5.7, color: '#34D399' },
    ],
    barSegments: [
      { label: '26.4m Drawdown', pct: 94.3, color: '#EF4444' },
      { label: '1.6m Head', pct: 5.7, color: '#34D399' },
    ],
  },
];

export default function HomeStoryPage({ dashboardData }) {
  const {
    navigateToWorkspace,
    selectedFieldId,
    setSelectedFieldId,
    selectedParcel,
    pauseMotion,
    startJudgeDemo,
    setTeamModalOpen,
  } = useAgriSense();

  const [heroLayer, setHeroLayer] = useState(0); // 0 = all layers, 1 = atmosphere, 2 = canopy, 3 = surface, 4 = subsurface
  const [heroExploded] = useState(true);
  const [heroSpectral, setHeroSpectral] = useState('NDVI');
  const [heroAutoRotate, setHeroAutoRotate] = useState(true);
  const [hoveredParcelCode, setHoveredParcelCode] = useState(null);
  const [activeTwinLayer, setActiveTwinLayer] = useState(0);
  const [twinExploded, setTwinExploded] = useState(true);
  const [twinSpectral, setTwinSpectral] = useState('NDVI');
  const [previewParcelId, setPreviewParcelId] = useState(selectedFieldId || PARCELS[0]?.id || 'field-godagari-a');
  const [previewViewMode, setPreviewViewMode] = useState('2d');
  const [journeyInView, setJourneyInView] = useState(false);
  const [twinInView, setTwinInView] = useState(false);
  const [challengeInView, setChallengeInView] = useState(false);
  const [scienceInView, setScienceInView] = useState(false);
  const [impactInView, setImpactInView] = useState(false);
  const [previewInView, setPreviewInView] = useState(false);
  const [activeScienceSubsystem, setActiveScienceSubsystem] = useState(null);
  const [highlightedSubsystems, setHighlightedSubsystems] = useState(['climate', 'root-zone']);
  const [twinStageTab, setTwinStageTab] = useState('3d'); // '3d' | 'strata'
  const journeySectionRef = useRef(null);
  const twinSectionRef = useRef(null);
  const challengeSectionRef = useRef(null);
  const scienceSectionRef = useRef(null);
  const impactSectionRef = useRef(null);
  const previewSectionRef = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setJourneyInView(true);
      setTwinInView(true);
      setChallengeInView(true);
      setScienceInView(true);
      setImpactInView(true);
      setPreviewInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === journeySectionRef.current) setJourneyInView(true);
            if (entry.target === twinSectionRef.current) setTwinInView(true);
            if (entry.target === challengeSectionRef.current) setChallengeInView(true);
            if (entry.target === scienceSectionRef.current) setScienceInView(true);
            if (entry.target === impactSectionRef.current) setImpactInView(true);
            if (entry.target === previewSectionRef.current) setPreviewInView(true);
          }
        });
      },
      { threshold: 0.08 }
    );
    if (journeySectionRef.current) observer.observe(journeySectionRef.current);
    if (twinSectionRef.current) observer.observe(twinSectionRef.current);
    if (challengeSectionRef.current) observer.observe(challengeSectionRef.current);
    if (scienceSectionRef.current) observer.observe(scienceSectionRef.current);
    if (impactSectionRef.current) observer.observe(impactSectionRef.current);
    if (previewSectionRef.current) observer.observe(previewSectionRef.current);
    return () => observer.disconnect();
  }, []);

  const currentPreviewParcel = PARCELS.find((p) => p.id === previewParcelId) || PARCELS[0];

  const wb = dashboardData?.waterBalance || {};
  const et0 = wb.et0_mm_day ?? wb.reference_et0 ?? 4.78;
  const etc = wb.etc_mm_day ?? wb.crop_etc ?? 5.49;
  const dr = wb.depletion_mm ?? wb.root_zone_depletion_dr ?? 38.2;

  return (
    <main id="main-content" style={{ color: 'var(--text-main)', overflowX: 'hidden' }}>
      {/* =========================================================================
          SECTION 01 · HERO: FULL-BLEED LIVING LANDSCAPE 3D DIGITAL TWIN
          Background: Full-Bleed 100vw × 100% Three.js Animated 3D Scene
          Overlays: Editorial Typography, CTAs, Telemetry, and Floating HUD Controls
          ========================================================================= */}
      <section
        id="hero"
        aria-labelledby="hero-title"
        className="section-forest-hero"
        style={{
          position: 'relative',
          minHeight: 'clamp(740px, 100vh, 960px)',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed Edge-to-Edge 3D WebGL Canvas in Background */}
        <HeroThreeLandscape
          activeLayer={heroLayer}
          exploded={heroExploded}
          spectralMode={heroSpectral}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
          pauseMotion={pauseMotion}
          autoRotate={heroAutoRotate}
          onHoverParcel={setHoveredParcelCode}
        />

        {/* Soft Left-Edge Editorial Scrim for Crisp Open Typography (Right Valley & Sky Open) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background:
              'linear-gradient(90deg, rgba(3, 8, 16, 0.78) 0%, rgba(3, 8, 16, 0.56) 34%, rgba(3, 8, 16, 0.14) 58%, rgba(3, 8, 16, 0.0) 75%), linear-gradient(180deg, rgba(3, 8, 16, 0.42) 0%, transparent 16%, transparent 94%, rgba(11, 34, 23, 0.9) 100%)',
          }}
        />

        {/* Slim Vertical 3D Layer & Spectral Controls Rail on Far Right Edge */}
        <aside
          aria-label="3D Scene Layer and Spectral Controls"
          className="hero-vertical-controls"
          style={{
            position: 'absolute',
            right: '3.25rem',
            top: '43%',
            transform: 'translateY(-50%)',
            zIndex: 6,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '0.28rem',
            width: '84px',
            background: 'rgba(6, 12, 20, 0.62)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.11)',
            padding: '0.45rem 0.32rem',
            borderRadius: '13px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.42)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(203, 213, 225, 0.48)',
              textAlign: 'center',
            }}
          >
            Layers
          </span>

          {/* Vertical Layer Selector Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.16rem' }}>
            {[
              { id: 0, label: 'All Layers' },
              { id: 1, label: 'Atmosphere' },
              { id: 2, label: 'Canopy' },
              { id: 3, label: 'Surface' },
              { id: 4, label: 'Root-Zone' },
            ].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setHeroLayer(l.id)}
                style={{
                  width: '100%',
                  padding: '0.2rem 0.25rem',
                  fontSize: '0.62rem',
                  fontWeight: heroLayer === l.id ? 700 : 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: heroLayer === l.id ? '#34D399' : 'transparent',
                  color: heroLayer === l.id ? '#031912' : 'rgba(226, 232, 240, 0.72)',
                  transition: 'all 0.2s ease',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div style={{ height: '1px', width: '100%', background: 'rgba(255, 255, 255, 0.10)', margin: '0.08rem 0' }} />

          <span
            className="mono"
            style={{
              fontSize: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(203, 213, 225, 0.48)',
              textAlign: 'center',
            }}
          >
            Index
          </span>

          {/* Vertical Spectral Index Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.14rem' }}>
            {['NDVI', 'NDRE', 'MSAVI', 'EVI'].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroSpectral(idx)}
                style={{
                  width: '100%',
                  padding: '0.18rem 0.25rem',
                  fontSize: '0.61rem',
                  fontWeight: heroSpectral === idx ? 700 : 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: heroSpectral === idx ? '#FBBF24' : 'transparent',
                  color: heroSpectral === idx ? '#051320' : 'rgba(226, 232, 240, 0.68)',
                  transition: 'all 0.2s ease',
                }}
              >
                {idx}
              </button>
            ))}
          </div>

          <div style={{ height: '1px', width: '100%', background: 'rgba(255, 255, 255, 0.10)', margin: '0.08rem 0' }} />

          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setHeroAutoRotate(!heroAutoRotate)}
            style={{
              width: '100%',
              padding: '0.2rem 0.25rem',
              fontSize: '0.61rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid rgba(52, 211, 153, 0.28)',
              cursor: 'pointer',
              textAlign: 'center',
              background: heroAutoRotate ? 'rgba(52, 211, 153, 0.16)' : 'transparent',
              color: heroAutoRotate ? '#34D399' : 'rgba(255, 255, 255, 0.55)',
            }}
            title="Toggle 3D Idle Rotation"
          >
            {heroAutoRotate ? 'Auto: ON' : 'Auto: OFF'}
          </button>
        </aside>

        {/* Foreground Content Sitting Directly on Top of the 3D Canvas */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            pointerEvents: 'none',
            minHeight: 'clamp(740px, 100vh, 960px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '5.5rem 0 2.2rem',
          }}
        >
          <div className="container" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

            {/* Middle: Open Editorial Typography Column (Matching Clean Aerospace Style) */}
            <div
              style={{
                maxWidth: '580px',
                margin: 'auto 0',
                paddingTop: '1.25rem',
                paddingBottom: '1.5rem',
                pointerEvents: 'auto',
              }}
            >
              {/* Minimal Thin Horizontal Rule + Tracked Eyebrow */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.15rem',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '26px',
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.45)',
                    display: 'inline-block',
                  }}
                />
                <span
                  className="mono"
                  style={{
                    fontSize: '0.67rem',
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(203, 213, 225, 0.8)',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.75)',
                  }}
                >
                  NASA SPACE APPS 2026 · HIGH BARIND TWIN · GODAGARI
                </span>
              </div>

              {/* Glossy Field Green + Water Aqua Sans Headline + Warm Gold Italic Serif */}
              <h1
                id="hero-title"
                style={{
                  margin: 0,
                  marginBottom: '1.15rem',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    fontSize: 'clamp(2.35rem, 3.65vw, 3.55rem)',
                    fontWeight: 700,
                    lineHeight: 1.07,
                    letterSpacing: '-0.032em',
                    background: 'linear-gradient(180deg, #F0FDF4 0%, #6EE7B7 34%, #10B981 72%, #047857 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 5px 24px rgba(16, 185, 129, 0.42))',
                  }}
                >
                  Understand the Field.
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    fontSize: 'clamp(2.35rem, 3.65vw, 3.55rem)',
                    fontWeight: 700,
                    lineHeight: 1.07,
                    letterSpacing: '-0.032em',
                    background: 'linear-gradient(180deg, #F0F9FF 0%, #7DD3FC 36%, #0EA5E9 74%, #0369A1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 5px 24px rgba(56, 189, 248, 0.45))',
                  }}
                >
                  Protect the Water.
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(2.7rem, 4.2vw, 4.1rem)',
                    lineHeight: 1.03,
                    letterSpacing: '-0.015em',
                    color: '#E5B94C',
                    marginTop: '0.08rem',
                    textShadow: '0 6px 28px rgba(0, 0, 0, 0.65)',
                  }}
                >
                  Plan the Future.
                </span>
              </h1>

              {/* Clean Subheading Paragraph */}
              <p
                style={{
                  fontSize: '0.94rem',
                  color: 'rgba(226, 232, 240, 0.85)',
                  lineHeight: 1.62,
                  marginBottom: '1.75rem',
                  maxWidth: '445px',
                  textShadow: '0 2px 14px rgba(0, 0, 0, 0.88)',
                }}
              >
                AgriSense Fusion unifies Copernicus Sentinel-2 spectral imagery, NASA POWER agroclimatology, simulated soil telemetry, and deterministic FAO-56 physics for{' '}
                <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>
                  Bangladesh’s drought-stressed High Barind Tract.
                </strong>
              </p>

              {/* Minimal Editorial Action Row: White Pill + Dark Outline Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('overview')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#F8FAFC',
                    color: '#090D16',
                    padding: '0.72rem 1.38rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
                    whiteSpace: 'nowrap',
                    transition: 'transform 0.2s ease, background 0.2s ease',
                  }}
                >
                  <span>Explore Digital Twin</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('methods')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(10, 15, 25, 0.54)',
                    color: '#F1F5F9',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '0.72rem 1.28rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(14px)',
                    whiteSpace: 'nowrap',
                    transition: 'border-color 0.2s ease, background 0.2s ease',
                  }}
                >
                  <span>Methodology</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Sleek Bottom-Right 3D Observatory Card (Left Cropland Open) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                width: '100%',
              }}
            >
              {/* Compact Floating 3D Telemetry HUD on Right (Clear of Floating AI FAB) */}
              <div
                style={{
                  pointerEvents: 'auto',
                  background: 'rgba(8, 14, 24, 0.72)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '0.75rem 1rem',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
                  maxWidth: '355px',
                  marginBottom: '2.65rem',
                  marginRight: '2.15rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', fontWeight: 700, color: '#38BDF8', whiteSpace: 'nowrap' }}>
                    <Radio size={12} className="pulse-slow" />
                    <span>Live 3D Twin • NASA GPM Observatory</span>
                  </div>
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.18)',
                      color: '#38BDF8',
                      padding: '0.12rem 0.45rem',
                      borderRadius: '5px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    60 FPS
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {hoveredParcelCode ? `Hovered: ${hoveredParcelCode}` : `${selectedParcel.name} (${selectedParcel.crop})`}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.72)', marginTop: '0.15rem' }}>
                  NASA POWER Tether: 24.3636°N, 88.6241°E (~34.8 km ESE)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 02 · THE JOURNEY: EARTH TO GODAGARI AGRICULTURAL FIELD
          Background: Full-Bleed Photorealistic Orbital Horizon & Agricultural Valley
          Visual: EarthGodagariMap.jsx with Live Orbiting Satellite Layer on Top
          ========================================================================= */}
      <section
        id="journey"
        ref={journeySectionRef}
        aria-labelledby="journey-title"
        className="section-forest-journey"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed High-Resolution Orbital Earth Horizon & Farmland Patchwork Backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: "url('/story-assets/journey-orbital-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 42%',
            opacity: 0.9,
          }}
        />

        {/* Atmospheric Readability Vignette Blending Cleanly Into Adjacent Sections */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #0B2217 0%, rgba(6, 18, 13, 0.42) 18%, rgba(6, 18, 13, 0.48) 82%, #0A1C14 100%), radial-gradient(ellipse at 50% 42%, rgba(4, 14, 10, 0.24) 0%, rgba(4, 14, 10, 0.72) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.25rem' }}>
            <h2
              id="journey-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: 0,
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              From 786 km Low Earth Orbit to 2.4 Hectare Root Zones
            </h2>
          </div>

          {/* Full Screen-Size Interactive 6-Stage Cartographic Navigator */}
          <div
            className={`interactive-glow-card ${journeyInView ? 'card-entrance' : 'journey-card-init'}`}
            style={{
              '--delay': '0.05s',
              background: 'rgba(6, 18, 14, 0.82)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              borderRadius: '22px',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              padding: '1.25rem',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
              width: '100%',
              marginBottom: '1.65rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.85rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <MapPin size={17} color="#34D399" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Interactive 6-Stage Cartographic Navigator
                </span>
              </div>
              <ProvenanceBadge source="NASA GIBS & Sentinel-2" verified={true} />
            </div>

            <EarthGodagariMap
              selectedFieldId={selectedFieldId}
              onSelectField={(id) => setSelectedFieldId(id)}
              height={620}
            />
          </div>

          {/* Under-Map Information & Milestones Grid with Staggered Entrance Animation */}
          <div className="journey-cards-under-container">
            {/* Row 1: Technical & Scientific Accuracy Disclosures */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              {/* Card 1: Orbital Geodesy & Spatial Alignment */}
              <div
                className={`interactive-glow-card ${journeyInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.15s',
                  '--card-glow': 'rgba(56, 189, 248, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(56, 189, 248, 0.32)',
                  borderRadius: '18px',
                  padding: '1.35rem 1.45rem',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.52)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#34D399' }}>
                    Orbital Geodesy &amp; Spatial Alignment
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#7DD3FC',
                      background: 'rgba(56, 189, 248, 0.16)',
                      border: '1px solid rgba(56, 189, 248, 0.42)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    786 KM ORBIT PASS
                  </span>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'rgba(241, 245, 249, 0.88)', lineHeight: 1.65, margin: 0 }}>
                  Copernicus Sentinel-2 MSI provides 10m bands (B2, B3, B4, B8) and 20m SWIR Band 11 resampled for high-contrast moisture and chlorophyll mapping, paired with the live orbital swath pass inside the map.
                </p>
              </div>

              {/* Card 2: Scientific Provenance Callout */}
              <div
                className={`interactive-glow-card ${journeyInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.25s',
                  '--card-glow': 'rgba(212, 154, 61, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(212, 154, 61, 0.38)',
                  borderRadius: '18px',
                  padding: '1.35rem 1.45rem',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.52)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.65rem' }}>
                  <ShieldCheck size={18} color="#E5A93C" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#E5A93C' }}>
                    NASA POWER Spatial Tether &amp; Accuracy Disclosure
                  </span>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'rgba(241, 245, 249, 0.88)', lineHeight: 1.65, margin: 0 }}>
                  NASA POWER agroclimatology is derived from GMAO MERRA-2 and CERES satellite reanalysis on a global 0.5° × 0.625° grid. The closest grid centroid is at <strong style={{ color: '#FDE68A' }}>24.3636°N, 88.6241°E</strong> (~34.8 km ESE of Godagari). AgriSense Fusion openly models this spatial offset with an interactive geodesic tether line instead of falsely presenting regional reanalysis as an on-field microclimate station.
                </p>
              </div>
            </div>

            {/* Row 2: 3 Geographic Milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.15rem' }}>
              <div
                className={`interactive-glow-card ${journeyInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.35s',
                  '--card-glow': 'rgba(52, 211, 153, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(52, 211, 153, 0.28)',
                  padding: '1.1rem 1.35rem',
                  borderRadius: '16px',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.44)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.72)' }}>Elevation Range</div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>18–36 m</div>
                <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600, marginTop: '0.2rem' }}>Terraced relief</div>
              </div>

              <div
                className={`interactive-glow-card ${journeyInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.45s',
                  '--card-glow': 'rgba(251, 146, 60, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(251, 146, 60, 0.28)',
                  padding: '1.1rem 1.35rem',
                  borderRadius: '16px',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.44)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.72)' }}>Barind Topsoil</div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>Ajiem Loam</div>
                <div style={{ fontSize: '0.72rem', color: '#FB923C', fontWeight: 600, marginTop: '0.2rem' }}>Low organic matter</div>
              </div>

              <div
                className={`interactive-glow-card ${journeyInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.55s',
                  '--card-glow': 'rgba(229, 169, 60, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(229, 169, 60, 0.28)',
                  padding: '1.1rem 1.35rem',
                  borderRadius: '16px',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.44)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.72)' }}>Annual Rainfall</div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>1,250 mm</div>
                <div style={{ fontSize: '0.72rem', color: '#E5A93C', fontWeight: 600, marginTop: '0.2rem' }}>82% in monsoon</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 03 · FOUR-LAYER DIGITAL TWIN
          Background: Forest Green Strata (#0A1C14)
          Visual: story-assets/digital-twin-strata.jpg + ThreeLandscapeStage.jsx
          ========================================================================= */}
      <section
        id="digital-twin"
        ref={twinSectionRef}
        aria-labelledby="twin-title"
        className="section-forest-strata"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          e.currentTarget.style.setProperty('--bg-rx', `${(-ny * 3.5).toFixed(2)}deg`);
          e.currentTarget.style.setProperty('--bg-ry', `${(nx * 3.5).toFixed(2)}deg`);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty('--bg-rx', '0deg');
          e.currentTarget.style.setProperty('--bg-ry', '0deg');
        }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed 3D Animated Isometric Strata Continuum Background */}
        <div
          className="section-03-3d-backdrop"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-4%',
            zIndex: 1,
            backgroundImage: "url('/story-assets/digital-twin-strata.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 48%',
            opacity: 0.92,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #0A1C14 0%, rgba(8, 23, 17, 0.30) 18%, rgba(8, 23, 17, 0.38) 80%, #0A1E15 100%), radial-gradient(ellipse at 50% 50%, rgba(4, 14, 10, 0.08) 0%, rgba(4, 14, 10, 0.65) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.25rem' }}>
            <h2
              id="twin-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: 0,
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              Anatomy of an Agricultural Digital Twin
            </h2>

            {/* Layer Selection Tabs */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.55rem',
                flexWrap: 'wrap',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTwinLayer(0)}
                style={{
                  padding: '0.45rem 1.05rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: activeTwinLayer === 0 ? '#34D399' : 'rgba(255, 255, 255, 0.16)',
                  background: activeTwinLayer === 0 ? '#2F8F5B' : 'rgba(18, 59, 42, 0.55)',
                  color: '#FFFFFF',
                  boxShadow: activeTwinLayer === 0 ? '0 0 16px rgba(52, 211, 153, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                All 4 Layers (Exploded)
              </button>
              {LAYER_CONFIG.map((layer) => {
                const isSelected = activeTwinLayer === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveTwinLayer(layer.id)}
                    style={{
                      padding: '0.45rem 1.05rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? layer.color : 'rgba(255, 255, 255, 0.16)',
                      background: isSelected ? 'rgba(255, 255, 255, 0.18)' : 'rgba(18, 59, 42, 0.55)',
                      color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.78)',
                      boxShadow: isSelected ? `0 0 16px ${layer.color}55` : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {layer.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cinema-Scale Full-Width Stage Container */}
          <div
            className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
            style={{
              '--delay': '0.05s',
              background: 'rgba(6, 18, 14, 0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '22px',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              padding: '1.25rem',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
              width: '100%',
              marginBottom: '1.65rem',
            }}
          >
            {/* Top Controls & View Toggle Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.85rem',
                flexWrap: 'wrap',
                gap: '0.65rem',
              }}
            >
              {/* Left: View Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF' }}>
                  3D Strata Continuum Stage
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: 'rgba(52, 211, 153, 0.2)',
                    color: '#34D399',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    fontWeight: 800,
                  }}
                >
                  THREE.JS WEBGL
                </span>

                <div
                  style={{
                    display: 'inline-flex',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '9999px',
                    padding: '0.18rem',
                    marginLeft: '0.4rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setTwinStageTab('3d')}
                    style={{
                      border: 'none',
                      background: twinStageTab === '3d' ? '#2F8F5B' : 'transparent',
                      color: twinStageTab === '3d' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    3D Interactive Model
                  </button>
                  <button
                    type="button"
                    onClick={() => setTwinStageTab('strata')}
                    style={{
                      border: 'none',
                      background: twinStageTab === 'strata' ? '#2F8F5B' : 'transparent',
                      color: twinStageTab === 'strata' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Isometric Strata Cutaway
                  </button>
                </div>
              </div>

              {/* Right: Spectral Selector & Explode View */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {twinStageTab === '3d' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {['NDVI', 'NDRE', 'MSAVI', 'EVI'].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTwinSpectral(idx)}
                          style={{
                            padding: '0.22rem 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: twinSpectral === idx ? '#34D399' : 'rgba(255, 255, 255, 0.1)',
                            color: twinSpectral === idx ? '#031912' : 'rgba(255, 255, 255, 0.7)',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          {idx}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setTwinExploded(!twinExploded)}
                      style={{
                        padding: '0.22rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '9999px',
                        border: '1px solid rgba(52, 211, 153, 0.45)',
                        background: twinExploded ? 'rgba(52, 211, 153, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                        color: twinExploded ? '#34D399' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      {twinExploded ? 'Collapse' : 'Explode'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stage Body */}
            {twinStageTab === '3d' ? (
              <div>
                <ThreeLandscapeStage
                  activeLayer={activeTwinLayer}
                  exploded={twinExploded}
                  spectralMode={twinSpectral}
                  selectedFieldId={selectedFieldId}
                  height={560}
                  pauseMotion={pauseMotion}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.75rem',
                    fontSize: '0.74rem',
                    color: 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  <span>Rotate: Left Click + Drag • Zoom: Scroll • Layer: Click Pills or Cards</span>
                  <span className="mono" style={{ color: '#34D399' }}>
                    LAYER: {activeTwinLayer === 0 ? 'ALL (EXPLODED)' : LAYER_CONFIG.find((l) => l.id === activeTwinLayer)?.name}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '560px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#040F0A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/story-assets/digital-twin-strata.png"
                  alt="High-resolution four-layer agricultural digital twin isometric cutaway"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 12px 30px rgba(0, 0, 0, 0.7))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(6, 18, 14, 0.88)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    color: '#34D399',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                  }}
                >
                  HIGH-RESOLUTION ISOMETRIC CONTINUUM
                </div>
              </div>
            )}
          </div>

          {/* Under-Stage Information & Metrics Grid (4 Layers) */}
          <div className="journey-cards-under-container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.15rem',
              }}
            >
              {/* Layer 1: Tropospheric Atmosphere */}
              <div
                onClick={() => setActiveTwinLayer(activeTwinLayer === 1 ? 0 : 1)}
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.15s',
                  '--card-glow': 'rgba(245, 158, 11, 0.35)',
                  cursor: 'pointer',
                  background: activeTwinLayer === 1 ? 'rgba(245, 158, 11, 0.16)' : 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: activeTwinLayer === 1 ? '1.5px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.32)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  boxShadow: activeTwinLayer === 1 ? '0 16px 40px rgba(245, 158, 11, 0.22)' : '0 14px 32px rgba(0, 0, 0, 0.45)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#E5A93C' }}>
                    1. Atmosphere (100–1000m)
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#FDE68A',
                      background: 'rgba(245, 158, 11, 0.16)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    NASA POWER MERRA-2
                  </span>
                </div>
                <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.45rem' }}>
                  Rs = 21.4 MJ/m² • VPD = 1.82 kPa
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(241, 245, 249, 0.84)', lineHeight: 1.55, margin: 0 }}>
                  Models solar irradiance, air temperature, and vapor pressure deficit driving Penman-Monteith evaporative demand across the High Barind boundary layer.
                </p>
              </div>

              {/* Layer 2: Crop Canopy & Spectral Vigor */}
              <div
                onClick={() => setActiveTwinLayer(activeTwinLayer === 2 ? 0 : 2)}
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.25s',
                  '--card-glow': 'rgba(52, 211, 153, 0.35)',
                  cursor: 'pointer',
                  background: activeTwinLayer === 2 ? 'rgba(52, 211, 153, 0.16)' : 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: activeTwinLayer === 2 ? '1.5px solid #34D399' : '1px solid rgba(52, 211, 153, 0.32)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  boxShadow: activeTwinLayer === 2 ? '0 16px 40px rgba(52, 211, 153, 0.22)' : '0 14px 32px rgba(0, 0, 0, 0.45)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#34D399' }}>
                    2. Crop Canopy (0–2m)
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#A7F3D0',
                      background: 'rgba(52, 211, 153, 0.16)',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    SENTINEL-2 10M L2A
                  </span>
                </div>
                <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.45rem' }}>
                  NDVI 0.74 • NDRE 0.42 • MSAVI 0.68
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(241, 245, 249, 0.84)', lineHeight: 1.55, margin: 0 }}>
                  High-resolution optical multispectral reflectance mapping photosynthetic vigor, canopy chlorophyll density, and crop moisture stress at parcel scale.
                </p>
              </div>

              {/* Layer 3: Agricultural Surface & Terraces */}
              <div
                onClick={() => setActiveTwinLayer(activeTwinLayer === 3 ? 0 : 3)}
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.35s',
                  '--card-glow': 'rgba(251, 146, 60, 0.35)',
                  cursor: 'pointer',
                  background: activeTwinLayer === 3 ? 'rgba(251, 146, 60, 0.16)' : 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: activeTwinLayer === 3 ? '1.5px solid #FB923C' : '1px solid rgba(251, 146, 60, 0.32)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  boxShadow: activeTwinLayer === 3 ? '0 16px 40px rgba(251, 146, 60, 0.22)' : '0 14px 32px rgba(0, 0, 0, 0.45)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FB923C' }}>
                    3. Terraced Surface (0m)
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#FDBA74',
                      background: 'rgba(251, 146, 60, 0.16)',
                      border: '1px solid rgba(251, 146, 60, 0.35)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    PARCEL BOUNDARIES A01–A04
                  </span>
                </div>
                <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.45rem' }}>
                  2.3° Micro-Slope • Stepped Relief
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(241, 245, 249, 0.84)', lineHeight: 1.55, margin: 0 }}>
                  High Barind stepped clay terrace micro-relief with gravity-fed furrow networks governing surface runoff, soil compaction, and irrigation distribution.
                </p>
              </div>

              {/* Layer 4: Vadose Root-Zone & Aquifer */}
              <div
                onClick={() => setActiveTwinLayer(activeTwinLayer === 4 ? 0 : 4)}
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.45s',
                  '--card-glow': 'rgba(56, 189, 248, 0.35)',
                  cursor: 'pointer',
                  background: activeTwinLayer === 4 ? 'rgba(56, 189, 248, 0.16)' : 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: activeTwinLayer === 4 ? '1.5px solid #38BDF8' : '1px solid rgba(56, 189, 248, 0.32)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  boxShadow: activeTwinLayer === 4 ? '0 16px 40px rgba(56, 189, 248, 0.22)' : '0 14px 32px rgba(0, 0, 0, 0.45)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38BDF8' }}>
                    4. Vadose &amp; Aquifer (-0.1 to -28m)
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#BAE6FD',
                      background: 'rgba(56, 189, 248, 0.16)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    FAO-56 &amp; TELEMETRY
                  </span>
                </div>
                <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.45rem' }}>
                  26.4m DTW vs 28.0m Suction Limit
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(241, 245, 249, 0.84)', lineHeight: 1.55, margin: 0 }}>
                  TAW 79.0 mm root depletion Dr = 38.2 mm, simulated FDR v2 probes, and alarming 26.4m groundwater depth nearing critical centrifugal failure.
                </p>
              </div>
            </div>

            {/* Bottom 3 Twin Quick Metric Pills */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.15rem',
                marginTop: '1.15rem',
              }}
            >
              <div
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.55s',
                  '--card-glow': 'rgba(52, 211, 153, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(52, 211, 153, 0.28)',
                  padding: '1.1rem 1.35rem',
                  borderRadius: '16px',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.44)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.72)' }}>Vertical Strata Span</div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>1,000m → -28m</div>
                <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600, marginTop: '0.2rem' }}>Mesoclimate to Aquifer</div>
              </div>

              <div
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.65s',
                  '--card-glow': 'rgba(245, 158, 11, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  padding: '1.1rem 1.35rem',
                  borderRadius: '16px',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.44)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.72)' }}>Coupled Space Sensors</div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>NASA + Sentinel-2</div>
                <div style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 600, marginTop: '0.2rem' }}>0.5° MERRA-2 &amp; 10m MSI L2A</div>
              </div>

              <div
                className={`interactive-glow-card ${twinInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.75s',
                  '--card-glow': 'rgba(56, 189, 248, 0.35)',
                  background: 'rgba(6, 18, 14, 0.82)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                  padding: '1.1rem 1.35rem',
                  borderRadius: '16px',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.44)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.72)' }}>Aquifer Stress Ratio</div>
                <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>26.4m / 28.0m (94.3%)</div>
                <div style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600, marginTop: '0.2rem' }}>Critical Centrifugal Limit</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 04 · THE BARIND CHALLENGE
          Background: Full-Bleed 16:9 Terraced Clay Drought Landscape with Atmospheric Vignette
          Visual: story-assets/section04-challenge-backdrop.jpg + Focal Aerial Parcel Card
          ========================================================================= */}
      <section
        id="challenge"
        ref={challengeSectionRef}
        aria-labelledby="challenge-title"
        className="section-forest-challenge"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed High-Resolution Barind Drought Landscape Backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: "url('/story-assets/section04-challenge-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            opacity: 0.9,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #0A1C14 0%, rgba(10, 28, 20, 0.44) 18%, rgba(10, 28, 20, 0.52) 82%, #071910 100%), radial-gradient(ellipse at 50% 45%, rgba(6, 18, 14, 0.18) 0%, rgba(6, 18, 14, 0.72) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.5rem' }}>
            <h2
              id="challenge-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: '0 0 1rem',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              The Barind Challenge: Pleistocene Clay, Depleting Aquifers, and Monoculture Vulnerability
            </h2>
            <p style={{ fontSize: '1.02rem', color: 'rgba(226, 232, 240, 0.84)', lineHeight: 1.65, margin: 0 }}>
              In northwestern Bangladesh’s Godagari Upazila, agricultural survival is caught in a dangerous hydrological bind. Decades of heavy dry-season Boro rice monoculture have drawn the groundwater table dangerously close to the mechanical suction limit.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '2.25rem',
              alignItems: 'center',
              marginBottom: '2.5rem',
            }}
          >
            {/* Aerial Photography Card */}
            <div
              className={`interactive-glow-card ${challengeInView ? 'card-entrance' : 'journey-card-init'}`}
              style={{
                '--delay': '0.15s',
                '--card-glow': 'rgba(245, 158, 11, 0.35)',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
                position: 'relative',
                background: 'rgba(6, 18, 14, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <img
                src="/story-assets/barind-challenge-aerial.jpg"
                alt="Aerial view of water-stressed straw-covered Barind field parcels"
                style={{ width: '100%', height: '360px', objectFit: 'cover', transform: 'scale(1.05)', transformOrigin: 'center 60%' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '1rem',
                  right: '1rem',
                  background: 'rgba(6, 18, 14, 0.90)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  padding: '0.85rem 1rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B' }}>
                  Observed Soil Cracking &amp; High Evaporative Loss
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(226, 232, 240, 0.82)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  Pleistocene Red-Brown terrace clay has high bulk density (1.52 g/cm³) and low saturated hydraulic conductivity (Ks = 4.2 mm/hr), causing intense dry-season crusting.
                </div>
              </div>
            </div>

            {/* 3 Core Crisis Pillars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Crisis Card 1 */}
              <div
                className={`interactive-glow-card ${challengeInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.25s',
                  '--card-glow': 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(6, 18, 14, 0.84)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '18px',
                  border: '1px solid rgba(239, 68, 68, 0.32)',
                  padding: '1.25rem',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.16)', color: '#EF4444', padding: '0.45rem', borderRadius: '10px' }}>
                    <Droplets size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF' }}>
                      Groundwater Depletion (26.4m DTW vs 28.0m Limit)
                    </div>
                    <div className="mono" style={{ fontSize: '0.74rem', color: '#F87171', fontWeight: 700 }}>
                      Critical Centrifugal Suction Margin: 1.6m Left
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'rgba(241, 245, 249, 0.82)', margin: 0, lineHeight: 1.55 }}>
                  Centrifugal surface tubewells mechanically stall when Depth to Water Table exceeds ~28.0 meters. At 26.4 meters, Godagari tubewells operate with razor-thin hydraulic security. Further uncontrolled extraction threatens widespread irrigation failure.
                </p>
              </div>

              {/* Crisis Card 2 */}
              <div
                className={`interactive-glow-card ${challengeInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.35s',
                  '--card-glow': 'rgba(245, 158, 11, 0.35)',
                  background: 'rgba(6, 18, 14, 0.84)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '18px',
                  border: '1px solid rgba(245, 158, 11, 0.32)',
                  padding: '1.25rem',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.16)', color: '#F59E0B', padding: '0.45rem', borderRadius: '10px' }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF' }}>
                      The Boro Rice Monoculture Trap
                    </div>
                    <div className="mono" style={{ fontSize: '0.74rem', color: '#FDE68A', fontWeight: 700 }}>
                      1,200–1,400 mm Water Demand per Dry Season
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'rgba(241, 245, 249, 0.82)', margin: 0, lineHeight: 1.55 }}>
                  Continuous flooded Boro paddy in a drought-prone AEZ-26 climate consumes over 13,000 m³ of pumped groundwater per hectare, depleting natural recharge while providing low net financial margins compared to high-value legumes and oilseeds.
                </p>
              </div>

              {/* Crisis Card 3 */}
              <div
                className={`interactive-glow-card ${challengeInView ? 'card-entrance' : 'journey-card-init'}`}
                style={{
                  '--delay': '0.45s',
                  '--card-glow': 'rgba(52, 211, 153, 0.35)',
                  background: 'rgba(6, 18, 14, 0.84)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '18px',
                  border: '1px solid rgba(52, 211, 153, 0.32)',
                  padding: '1.25rem',
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.16)', color: '#34D399', padding: '0.45rem', borderRadius: '10px' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF' }}>
                      AgriSense Transition: Mustard-Mungbean-Aman
                    </div>
                    <div className="mono" style={{ fontSize: '0.74rem', color: '#A7F3D0', fontWeight: 700 }}>
                      Provisional Scenario Model • 76.3% Modeled Delta
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'rgba(241, 245, 249, 0.82)', margin: 0, lineHeight: 1.55 }}>
                  Scenario modeling compares short-duration Mustard and Mungbean (3,200 m³/ha modeled demand) against flooded Boro assumptions (13,500 m³/ha) to explore aquifer relief pending field validation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 05 · SCIENTIFIC INTELLIGENCE: SIX INTEGRATED SUBSYSTEMS (M1–M6)
          Background: Full-Bleed 16:9 Earth Observation Satellite Scan Backdrop with Atmospheric Vignette
          Visual: story-assets/section05-science-backdrop.jpg + 6 Coupled Subsystems Grid
          ========================================================================= */}
      <section
        id="science"
        ref={scienceSectionRef}
        aria-labelledby="science-title"
        className="section-forest-science"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed High-Resolution Satellite & Telemetry Backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: "url('/story-assets/section05-science-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 42%',
            opacity: 0.9,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #071910 0%, rgba(5, 20, 14, 0.44) 18%, rgba(5, 20, 14, 0.52) 82%, #06160F 100%), radial-gradient(ellipse at 50% 45%, rgba(4, 16, 12, 0.16) 0%, rgba(4, 16, 12, 0.72) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.5rem' }}>
            <h2
              id="science-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: '0 0 1rem',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              Deterministic Science Engine: M1 to M6
            </h2>
            <p style={{ fontSize: '1.02rem', color: 'rgba(226, 232, 240, 0.84)', lineHeight: 1.65, margin: 0 }}>
              AgriSense Fusion does not rely on opaque LLM guesswork for core agronomy. Six coupled subsystems execute physics-based formulas, satellite reflectance equations, and peer-reviewed disease rules.
            </p>
          </div>

          {/* Live Interactive Sentinel-2 Multi-Spectral Scan Stage */}
          <div
            className={`interactive-glow-card ${scienceInView ? 'card-entrance' : 'journey-card-init'}`}
            style={{
              '--delay': '0.12s',
              '--card-glow': 'rgba(52, 211, 153, 0.35)',
              padding: 0,
              background: 'transparent',
              border: 'none',
              marginBottom: '2.25rem',
            }}
          >
            <SatelliteScanStage
              activeSubsystem={activeScienceSubsystem}
              onSelectHotspot={(linkedIds) => {
                setActiveScienceSubsystem(null);
                setHighlightedSubsystems(linkedIds);
              }}
              onOpenWorkspace={(workspaceId) => navigateToWorkspace(workspaceId)}
              pauseMotion={pauseMotion}
            />
          </div>

          {/* 6 Subsystem Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {SIX_PILLARS.map((p, idx) => {
              const IconComp = p.icon;
              const isLinkedScan = highlightedSubsystems.includes(p.id) || activeScienceSubsystem === p.id;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => {
                    setActiveScienceSubsystem(p.id);
                    setHighlightedSubsystems([p.id]);
                  }}
                  onMouseLeave={() => setActiveScienceSubsystem(null)}
                  className={`interactive-glow-card subsystem-card ${scienceInView ? 'card-entrance' : 'journey-card-init'}`}
                  style={{
                    '--delay': `${0.15 + idx * 0.08}s`,
                    '--card-glow': `${p.accent}55`,
                    borderRadius: '18px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: isLinkedScan ? 'rgba(10, 34, 24, 0.92)' : 'rgba(6, 18, 14, 0.84)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: isLinkedScan ? `1.5px solid ${p.accent}` : `1px solid ${p.accent}35`,
                    boxShadow: isLinkedScan
                      ? `0 18px 42px rgba(0, 0, 0, 0.55), 0 0 24px ${p.accent}33`
                      : '0 14px 32px rgba(0, 0, 0, 0.45)',
                    transition: 'all 0.24s ease',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.85rem',
                        gap: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          background: `${p.accent}22`,
                          color: p.accent,
                          padding: '0.55rem',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          border: `1px solid ${p.accent}45`,
                        }}
                      >
                        <IconComp size={20} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {isLinkedScan && (
                          <span
                            className="mono"
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              background: p.accent,
                              color: '#04120C',
                              padding: '0.16rem 0.48rem',
                              borderRadius: '9999px',
                            }}
                          >
                            LINKED IN SCAN
                          </span>
                        )}
                        <span
                          className="mono"
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            background: `${p.accent}18`,
                            color: '#FFFFFF',
                            border: `1px solid ${p.accent}45`,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                          }}
                        >
                          {p.badge}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: p.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {p.tag}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.3rem', marginBottom: '0.5rem' }}>
                      {p.title}
                    </div>
                    <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F1F5F9', background: 'rgba(255, 255, 255, 0.06)', padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '0.75rem' }}>
                      {p.metric}
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'rgba(226, 232, 240, 0.82)', lineHeight: 1.6, margin: 0 }}>
                      {p.desc}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.35rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.10)' }}>
                    <button
                      type="button"
                      onClick={() => navigateToWorkspace(p.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: 'none',
                        color: p.accent,
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'gap 0.2s ease',
                      }}
                    >
                      <span>Open Workspace</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 06 · DATA & IMPACT
          Background: Full-Bleed 16:9 Aerospace Observatory & Field Transformation Backdrop
          Visual: story-assets/section06-impact-backdrop.jpg + 6 Large Typographic Metrics
          ========================================================================= */}
      <section
        id="impact"
        ref={impactSectionRef}
        aria-labelledby="impact-title"
        className="section-forest-impact"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed High-Resolution Backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: "url('/story-assets/section06-impact-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 45%',
            opacity: 0.9,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #06160F 0%, rgba(4, 16, 12, 0.44) 18%, rgba(4, 16, 12, 0.52) 82%, #091D13 100%), radial-gradient(ellipse at 50% 45%, rgba(4, 16, 12, 0.16) 0%, rgba(4, 16, 12, 0.72) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.5rem' }}>
            <h2
              id="impact-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: '0 0 1rem',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              By the Numbers: Rigor, Parity, and Agronomic Truth
            </h2>
            <p style={{ fontSize: '1.02rem', color: 'rgba(226, 232, 240, 0.84)', lineHeight: 1.65, margin: 0 }}>
              AgriSense Fusion is built on strict data honesty. We openly disclose spatial offsets, cite 60 peer-reviewed publications, verify cross-language engine parity down to 10⁻⁶, and never claim unverified field claims.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '2.25rem',
              alignItems: 'stretch',
              marginBottom: '2.5rem',
            }}
          >
            {/* Interactive Live Observatory Dashboard (Replaces External Screenshot) */}
            <div
              className={`interactive-glow-card ${impactInView ? 'card-entrance' : 'journey-card-init'}`}
              style={{
                '--delay': '0.12s',
                '--card-glow': 'rgba(56, 189, 248, 0.35)',
                padding: 0,
                background: 'transparent',
                border: 'none',
              }}
            >
              <ImpactObservatoryDashboard inView={impactInView} pauseMotion={pauseMotion} />
            </div>

            {/* 6 Modern Digital Pie & Pie-Bar Scientific Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))',
                gap: '1rem',
              }}
            >
              {IMPACT_METRICS.map((m, idx) => (
                <div
                  key={m.id}
                  className={`interactive-glow-card impact-card ${!pauseMotion ? 'telemetry-breath-card' : ''} ${
                    impactInView ? 'card-entrance' : 'journey-card-init'
                  }`}
                  style={{
                    '--delay': `${0.18 + idx * 0.08}s`,
                    '--card-glow': m.glow,
                    background: 'rgba(6, 18, 14, 0.84)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${m.accent}40`,
                    borderRadius: '16px',
                    padding: '1.1rem',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: m.accent, letterSpacing: '0.04em' }}>
                        {m.label}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: '1.65rem',
                          fontWeight: 900,
                          color: m.id === 'suction' ? '#EF4444' : '#FFFFFF',
                          margin: '0.2rem 0 0',
                          lineHeight: 1.1,
                        }}
                      >
                        {m.value}
                      </div>
                    </div>

                    <DonutPieGauge
                      segments={m.pieSegments}
                      size={68}
                      strokeWidth={5.5}
                      centerValue={m.pieCenter}
                      centerSub={m.pieSub}
                      accent={m.accent}
                      animDelay={`${idx * 0.4}s`}
                      pauseMotion={pauseMotion}
                    />
                  </div>

                  <SegmentedPieBar
                    segments={m.barSegments}
                    height={7}
                    animDelay={`${idx * 0.4}s`}
                    pauseMotion={pauseMotion}
                  />

                  <div style={{ fontSize: '0.73rem', color: 'rgba(226, 232, 240, 0.78)', lineHeight: 1.45 }}>
                    {m.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 07 · EXPERIENCE PREVIEW: INTERACTIVE SPATIAL TWIN & FROSTED HUD
          Background: Full-Bleed 16:9 Terraced Landscape with Atmospheric Vignette
          Visual: SpatialTwinPreviewStage (Marked Parcels + Analytical HUD)
          ========================================================================= */}
      <section
        id="preview"
        ref={previewSectionRef}
        aria-labelledby="preview-title"
        className="section-forest-preview"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(47, 143, 91, 0.25)',
        }}
      >
        {/* Full-Bleed Clean Terraced Landscape Backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: "url('/story-assets/section07-spatial-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 52%',
            opacity: 0.88,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #091D13 0%, rgba(5, 18, 12, 0.45) 18%, rgba(5, 18, 12, 0.56) 82%, #0E291D 100%), radial-gradient(ellipse at 50% 45%, rgba(4, 15, 10, 0.16) 0%, rgba(4, 15, 10, 0.74) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.25rem' }}>
            <h2
              id="preview-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                marginBottom: '0.9rem',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              Interactive Spatial Twin &amp; Precision Analytical HUD
            </h2>
            <p style={{ fontSize: '1.02rem', color: 'rgba(226, 232, 240, 0.84)', lineHeight: 1.65 }}>
              Select marked parcels to inspect synced canopy vigors, growth stages, variable rate prescriptions, and root-zone depletion telemetry.
            </p>

            {/* Parcel Switcher Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.55rem',
                flexWrap: 'wrap',
                marginTop: '1.4rem',
              }}
            >
              {PARCELS.map((p) => {
                const isSelected = p.id === currentPreviewParcel?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPreviewParcelId(p.id);
                      setSelectedFieldId(p.id);
                    }}
                    style={{
                      padding: '0.48rem 1.05rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? '#34D399' : 'rgba(255, 255, 255, 0.18)',
                      background: isSelected ? '#2F8F5B' : 'rgba(6, 18, 14, 0.72)',
                      color: '#FFFFFF',
                      boxShadow: isSelected ? '0 0 18px rgba(52, 211, 153, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {p.code}: {p.name.replace(/\s*\(.*\)/, '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Marked Spatial Twin Stage (Watermark-Free) */}
          <div
            className={`interactive-glow-card ${previewInView ? 'card-entrance' : 'journey-card-init'}`}
            style={{
              '--delay': '0.1s',
              '--card-glow': 'rgba(52, 211, 153, 0.35)',
              padding: 0,
              background: 'transparent',
              border: 'none',
            }}
          >
            <SpatialTwinPreviewStage
              parcels={PARCELS}
              selectedParcelId={currentPreviewParcel?.id}
              onSelectParcel={(parcelId) => {
                setPreviewParcelId(parcelId);
                setSelectedFieldId(parcelId);
              }}
              waterBalance={wb}
              pauseMotion={pauseMotion}
            />
          </div>

          {/* Under-Stage Operational Telemetry Pills Synced to Active Parcel */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
              gap: '1.1rem',
              marginTop: '1.4rem',
            }}
          >
            <div
              className={`interactive-glow-card ${previewInView ? 'card-entrance' : 'journey-card-init'}`}
              style={{
                '--delay': '0.2s',
                '--card-glow': 'rgba(52, 211, 153, 0.35)',
                background: 'rgba(6, 18, 14, 0.84)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '1.05rem 1.25rem',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34D399' }}>SELECTED PARCEL GEODESY</div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                {currentPreviewParcel?.elevation_m} m ASL • {currentPreviewParcel?.area_ha} ha
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(226, 232, 240, 0.78)', marginTop: '0.2rem', marginBottom: '0.45rem' }}>
                {currentPreviewParcel?.lulc_class}
              </div>
              <SegmentedPieBar
                segments={[{ label: 'Spectral Vigor', pct: Math.round((currentPreviewParcel?.ndvi || 0.68) * 100), color: '#34D399' }]}
                height={6}
                animDelay="0.1s"
                pauseMotion={pauseMotion}
              />
            </div>

            <div
              className={`interactive-glow-card ${previewInView ? 'card-entrance' : 'journey-card-init'}`}
              style={{
                '--delay': '0.3s',
                '--card-glow': 'rgba(56, 189, 248, 0.35)',
                background: 'rgba(6, 18, 14, 0.84)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '1.05rem 1.25rem',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8' }}>FAO-56 WATER DEMAND</div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                ET₀ {Number(et0).toFixed(2)} • ETc {Number(etc).toFixed(2)} mm/d
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(226, 232, 240, 0.78)', marginTop: '0.2rem', marginBottom: '0.45rem' }}>
                Root-Zone Depletion Dr = {Number(dr).toFixed(1)} mm (TAW 79.0 mm)
              </div>
              <SegmentedPieBar
                segments={[
                  { label: 'Depleted Dr', pct: Math.min(Math.round((Number(dr) / 79.0) * 100), 92), color: '#FB923C' },
                  { label: 'Available Water', pct: Math.max(8, 100 - Math.round((Number(dr) / 79.0) * 100)), color: '#38BDF8' },
                ]}
                height={6}
                animDelay="0.35s"
                pauseMotion={pauseMotion}
              />
            </div>

            <div
              className={`interactive-glow-card ${previewInView ? 'card-entrance' : 'journey-card-init'}`}
              style={{
                '--delay': '0.4s',
                '--card-glow': 'rgba(245, 158, 11, 0.35)',
                background: 'rgba(6, 18, 14, 0.84)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '1.05rem 1.25rem',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B' }}>SPECTRAL &amp; MOISTURE SIGNATURE</div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                NDVI {Number(currentPreviewParcel?.ndvi || 0.68).toFixed(2)} • NDMI {Number(currentPreviewParcel?.ndmi || 0.24).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(226, 232, 240, 0.78)', marginTop: '0.2rem', marginBottom: '0.45rem' }}>
                Volumetric Soil Moisture: {((currentPreviewParcel?.vwc || 0.242) * 100).toFixed(1)}%
              </div>
              <SegmentedPieBar
                segments={[
                  { label: 'Soil Moisture VWC', pct: Math.round((currentPreviewParcel?.vwc || 0.242) * 200), color: '#F59E0B' },
                  { label: 'Pore Capacity', pct: Math.max(10, 100 - Math.round((currentPreviewParcel?.vwc || 0.242) * 200)), color: '#2F8F5B' },
                ]}
                height={6}
                animDelay="0.6s"
                pauseMotion={pauseMotion}
              />
            </div>
          </div>

          {/* Launch Full Workspace CTA */}
          <div style={{ textAlign: 'center', marginTop: '2.25rem' }}>
            <button
              type="button"
              onClick={() => navigateToWorkspace('spatial-twin')}
              className="btn btn-primary"
              style={{
                background: '#2F8F5B',
                color: '#FFFFFF',
                padding: '0.85rem 1.8rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(47, 143, 91, 0.45)',
              }}
            >
              <span>Launch Full Interactive Spatial Twin Workspace</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 08 · BANGLADESH LOCATION EXPLORER
          Background: Forest Green Explorer (#0E291D) + Interactive 3D Aerial Backdrop
          ========================================================================= */}
      <section
        id="explorer"
        aria-labelledby="explorer-title"
        className="section-forest-explorer"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          e.currentTarget.style.setProperty('--bg-rx', `${(-ny * 3.0).toFixed(2)}deg`);
          e.currentTarget.style.setProperty('--bg-ry', `${(nx * 3.0).toFixed(2)}deg`);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty('--bg-rx', '0deg');
          e.currentTarget.style.setProperty('--bg-ry', '0deg');
        }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '4.75rem 0',
          borderBottom: '1px solid rgba(52, 211, 153, 0.24)',
        }}
      >
        {/* Full-Bleed Interactive 3D Mouse-Parallax Bangladesh Backdrop */}
        <div
          className="section-03-3d-backdrop"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-4%',
            zIndex: 1,
            backgroundImage: "url('/story-assets/section08-bangladesh-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 55%',
            opacity: 0.88,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #0E291D 0%, rgba(5, 18, 13, 0.48) 18%, rgba(5, 18, 13, 0.56) 82%, #0A1E15 100%), radial-gradient(ellipse at 50% 45%, rgba(4, 15, 10, 0.20) 0%, rgba(4, 15, 10, 0.78) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.5rem' }}>
            <h2
              id="explorer-title"
              className="font-display"
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                marginBottom: '1rem',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.78)',
              }}
            >
              Explore Bangladesh Agro-Ecological Zones
            </h2>
            <p style={{ fontSize: '1.02rem', color: 'rgba(226, 244, 235, 0.86)', lineHeight: 1.65 }}>
              Compare AEZ-26 High Barind Tract (Godagari) against other key agricultural hubs across Bangladesh. Review honest data availability guarantees across all 6 intelligence engines.
            </p>
          </div>

          <BangladeshLocationExplorer
            onSelectLocation={(loc) => {
              if (loc.isPrimaryGodagari) {
                setSelectedFieldId('field-godagari-a');
              }
            }}
          />
        </div>
      </section>

      {/* =========================================================================
          SECTION 09 · FINAL CTA & COMPREHENSIVE FOOTER
          Background: Atmospheric Backdrop + Mouse Parallax + Interactive Glow Cards
          ========================================================================= */}
      <section
        id="final-cta"
        aria-labelledby="cta-title"
        className="section-forest-cta"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          e.currentTarget.style.setProperty('--bg-rx', `${(-ny * 2.8).toFixed(2)}deg`);
          e.currentTarget.style.setProperty('--bg-ry', `${(nx * 2.8).toFixed(2)}deg`);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty('--bg-rx', '0deg');
          e.currentTarget.style.setProperty('--bg-ry', '0deg');
        }}
        style={{
          padding: '5rem 0 3.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Full-Bleed Dusk Earth-Observation Horizon Backdrop */}
        <div
          className="section-03-3d-backdrop"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-4%',
            zIndex: 1,
            backgroundImage: "url('/story-assets/section09-cta-footer-backdrop.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 58%',
            opacity: 0.86,
          }}
        />

        {/* Atmospheric Readability Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(180deg, #0A1E15 0%, rgba(5, 16, 11, 0.56) 22%, rgba(4, 13, 9, 0.72) 78%, #040B08 100%), radial-gradient(ellipse at 50% 35%, rgba(4, 15, 10, 0.18) 0%, rgba(4, 12, 8, 0.82) 100%)',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          {/* Golden Hour Interactive Spotlight Banner */}
          <div
            className="interactive-glow-card"
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1px solid rgba(52, 211, 153, 0.34)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
              position: 'relative',
              marginBottom: '3.25rem',
              padding: 0,
            }}
          >
            <img
              src="/story-assets/final-cta-landscape.jpg"
              alt="Lush agricultural parcels, orchards, and canals in warm golden afternoon light"
              style={{ width: '100%', height: '360px', objectFit: 'cover', transform: 'scale(1.12)', transformOrigin: 'center 60%', display: 'block' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(6, 20, 14, 0.32) 0%, rgba(6, 20, 14, 0.94) 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '2.5rem',
              }}
            >
              <h2
                id="cta-title"
                className="font-display"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  marginBottom: '0.85rem',
                }}
              >
                Ready to Explore the Future of Agricultural Intelligence?
              </h2>
              <p
                style={{
                  fontSize: '1.08rem',
                  color: 'rgba(255, 255, 255, 0.88)',
                  maxWidth: '700px',
                  lineHeight: 1.6,
                  marginBottom: '1.75rem',
                }}
              >
                Enter the full operational workspace to inspect live Sentinel-2 satellite passes, NASA POWER agroclimatology feeds, FAO-56 Penman-Monteith water balances, and crop rotation scenario models.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('overview')}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    padding: '0.9rem 1.8rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.42)',
                  }}
                >
                  <span>Launch AgriSense Fusion</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('methods')}
                  className="btn"
                  style={{
                    background: 'rgba(13, 32, 24, 0.72)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    padding: '0.9rem 1.6rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                  }}
                >
                  <BookOpen size={17} />
                  <span>View Technical Audit &amp; Methodology</span>
                </button>
              </div>
            </div>
          </div>

          {/* Unified Open Editorial Glass Footer (Original 4-Column Style + Mouse Spotlight) */}
          <footer
            className="interactive-glow-card footer-glass-shell"
            style={{
              padding: '2.25rem 2.4rem 1.75rem',
              borderRadius: '22px',
              background: 'rgba(5, 14, 10, 0.58)',
              backdropFilter: 'blur(22px) saturate(160%)',
              WebkitBackdropFilter: 'blur(22px) saturate(160%)',
              border: '1px solid rgba(52, 211, 153, 0.20)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
              color: 'rgba(255, 255, 255, 0.78)',
              fontSize: '0.84rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '2.25rem',
                marginBottom: '2rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.65rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 10px #34D399' }} />
                  <span>AgriSense Fusion</span>
                </div>
                <p style={{ lineHeight: 1.65, margin: 0, fontSize: '0.82rem', color: 'rgba(226, 244, 235, 0.78)' }}>
                  A scientific agricultural digital twin designed for NASA Space Apps Challenge 2026. Built for AEZ-26 High Barind Tract, Godagari Upazila, Rajshahi, Bangladesh.
                </p>
                <div
                  className="mono"
                  style={{
                    marginTop: '0.85rem',
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#34D399',
                    padding: '0.24rem 0.62rem',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(52, 211, 153, 0.30)',
                  }}
                >
                  Primary Study Area: 24.4690°N, 88.3300°E
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.7rem', letterSpacing: '0.01em' }}>
                  Scientific Engines
                </div>
                <ul className="footer-clean-list" style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.85, fontSize: '0.82rem' }}>
                  <li>Copernicus Sentinel-2 MSI (10m L2A)</li>
                  <li>NASA POWER MERRA-2 Agroclimatology</li>
                  <li>FAO-56 Penman-Monteith Vadose Hydrology</li>
                  <li>BARC AEZ-26 Multi-Criteria Decision Engine</li>
                  <li>Literature-Grounded Crop Disease Rules (60 DOIs)</li>
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.7rem', letterSpacing: '0.01em' }}>
                  Data Integrity &amp; Provenance
                </div>
                <ul className="footer-clean-list" style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.85, fontSize: '0.82rem' }}>
                  <li>NASA POWER Tether: 24.3636°N, 88.6241°E (~34.8 km ESE)</li>
                  <li>Spatial CV: 84.63% ± 3.81% (12 Sentinel-2 passes)</li>
                  <li>IoT Telemetry: Simulated &amp; Uncalibrated (Explicitly Flagged)</li>
                  <li>Zero Hallucination &amp; Mathematical Engine Parity</li>
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.7rem', letterSpacing: '0.01em' }}>
                  Institutional Baselines
                </div>
                <p style={{ lineHeight: 1.65, margin: 0, fontSize: '0.82rem', color: 'rgba(226, 244, 235, 0.78)' }}>
                  Bangladesh Agricultural Research Council (BARC), Bangladesh Meteorological Department (BMD), Barind Multipurpose Development Authority (BMDA), and European Space Agency (ESA).
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', fontWeight: 700, color: '#34D399', marginBottom: '0.7rem', letterSpacing: '0.01em' }}>
                  <Users size={16} />
                  <span>NASA Space Apps Team</span>
                </div>
                <p style={{ lineHeight: 1.6, margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'rgba(226, 244, 235, 0.78)' }}>
                  Field Shift Track · 6-Member Multidisciplinary Engineering Squad (Dhaka Region).
                </p>

                {/* Squad Mini Avatars */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.85rem' }}>
                  {ALL_TEAM.map((m, i) => (
                    <div
                      key={m.id}
                      title={`${m.name} (${m.role})`}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #060D0A',
                        marginLeft: i === 0 ? 0 : '-8px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        background: '#04100b',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={m.image}
                        alt={m.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                  <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, marginLeft: '0.65rem' }}>
                    6 Members
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setTeamModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.42rem 0.85rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 211, 153, 0.15)',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    color: '#34D399',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52, 211, 153, 0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(52, 211, 153, 0.15)')}
                >
                  <Users size={13} />
                  <span>Meet Team Roster</span>
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.55)',
              }}
            >
              <div>
                AgriSense Fusion © 2026. Released for scientific evaluation and humanitarian agronomy.
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer', padding: 0, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Users size={13} />
                  <span>Team Directory</span>
                </button>
                <a
                  href={TEAM_INFO.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#38BDF8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <GithubIcon size={13} color="#38BDF8" />
                  <span>GitHub Repository</span>
                </a>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('methods')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.65)', cursor: 'pointer', padding: 0 }}
                >
                  Methodology &amp; Verification
                </button>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('admin')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.65)', cursor: 'pointer', padding: 0 }}
                >
                  System Architecture
                </button>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
