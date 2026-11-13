import React, { useMemo, useState } from 'react';
import {
  Droplets,
  Leaf,
  AlertTriangle,
  ScanLine,
  Radio,
  Layers,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';

/**
 * Callout definitions linking specific field anomalies on the scan stage
 * to the deterministic AgriSense Fusion subsystems (M1-M6).
 */
export const SCAN_HOTSPOTS = [
  {
    id: 'moisture',
    label: 'Moisture Stress Detected',
    subTag: 'M2 POWER + M5 FAO-56',
    accent: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    icon: Droplets,
    linkedSubsystems: ['climate', 'root-zone'],
    primarySubsystem: 'root-zone',
    metrics: 'Dr = 38.2 mm / TAW 79.0 mm • VPD 1.82 kPa • NASA Tether 34.8 km',
    description:
      'Acute evaporative demand from dry-season VPD elevates Penman-Monteith ETc (5.49 mm/d), drawing moisture below optimal clay-loam thresholds.',
    // Coordinates on the 1376x768 canvas
    pin: { x: 468, y: 582 },
    elbow: { x: 440, y: 415 },
    card: { x: 185, y: 392, w: 235 },
    legendPos: '32%',
  },
  {
    id: 'healthy',
    label: 'Healthy Canopy',
    subTag: 'M1 SENTINEL-2 + M4 MCDA',
    accent: '#22C55E',
    badgeBg: 'rgba(34, 197, 94, 0.18)',
    icon: Leaf,
    linkedSubsystems: ['spectral-lab', 'crop-intelligence'],
    primarySubsystem: 'spectral-lab',
    metrics: 'NDVI 0.74 • NDRE 0.42 • Spatial CV 84.63% ± 3.81%',
    description:
      'Resilient Mustard-Mungbean plots maintain strong chlorophyll reflectance across 10m Sentinel-2 B4/B8 optical bands with 90.64% Block C pure-interior accuracy.',
    pin: { x: 672, y: 525 },
    elbow: { x: 716, y: 349 },
    card: { x: 740, y: 326, w: 205 },
    legendPos: '84%',
  },
  {
    id: 'action',
    label: 'Action Needed',
    subTag: 'M3 SOIL IOT + M6 PATHOLOGY',
    accent: '#EF4444',
    badgeBg: 'rgba(239, 68, 68, 0.2)',
    icon: AlertTriangle,
    linkedSubsystems: ['soil-iot', 'crop-health'],
    primarySubsystem: 'crop-health',
    metrics: 'Aquifer 26.4m DTW (Limit 28.0m) • Stress Cluster Alert',
    description:
      'Severe moisture deficit converging with uncalibrated FDR probe stress signals; prioritize 85% efficient drip shift and fungal risk check.',
    pin: { x: 765, y: 642 },
    elbow: { x: 830, y: 501 },
    card: { x: 855, y: 478, w: 190 },
    legendPos: '11%',
  },
];

/**
 * Perspective-aligned agricultural parcel polygons in 1376x768 coordinate space
 * matching the visible crop patchwork on section05-science-backdrop.jpg.
 */
const PARCEL_ZONES = [
  // Left-center stressed amber plots (Moisture Stress hotspot)
  {
    id: 'p-stress-1',
    hotspot: 'moisture',
    points: '372,538 492,516 544,578 416,608',
    ndviColor: 'rgba(249, 115, 22, 0.44)',
    ndmiColor: 'rgba(245, 158, 11, 0.50)',
    rfColor: 'rgba(56, 189, 248, 0.36)',
    stroke: 'rgba(255, 237, 213, 0.85)',
  },
  {
    id: 'p-stress-2',
    hotspot: 'moisture',
    points: '416,608 544,578 588,632 452,668',
    ndviColor: 'rgba(234, 179, 8, 0.38)',
    ndmiColor: 'rgba(249, 115, 22, 0.44)',
    rfColor: 'rgba(245, 158, 11, 0.42)',
    stroke: 'rgba(255, 255, 255, 0.72)',
  },
  // Far-left moderate plots
  {
    id: 'p-mod-1',
    hotspot: 'moisture',
    points: '198,536 332,508 372,538 238,576',
    ndviColor: 'rgba(250, 204, 21, 0.36)',
    ndmiColor: 'rgba(56, 189, 248, 0.35)',
    rfColor: 'rgba(34, 197, 94, 0.38)',
    stroke: 'rgba(255, 255, 255, 0.65)',
  },
  {
    id: 'p-mod-2',
    hotspot: 'moisture',
    points: '238,576 372,538 416,608 278,642',
    ndviColor: 'rgba(132, 204, 22, 0.34)',
    ndmiColor: 'rgba(234, 179, 8, 0.36)',
    rfColor: 'rgba(34, 197, 94, 0.44)',
    stroke: 'rgba(255, 255, 255, 0.7)',
  },
  // Central lush emerald healthy plots
  {
    id: 'p-healthy-1',
    hotspot: 'healthy',
    points: '528,476 662,456 710,516 568,540',
    ndviColor: 'rgba(34, 197, 94, 0.40)',
    ndmiColor: 'rgba(14, 165, 233, 0.42)',
    rfColor: 'rgba(16, 185, 129, 0.48)',
    stroke: 'rgba(220, 252, 231, 0.85)',
  },
  {
    id: 'p-healthy-2',
    hotspot: 'healthy',
    points: '568,540 710,516 762,582 612,612',
    ndviColor: 'rgba(22, 163, 74, 0.44)',
    ndmiColor: 'rgba(6, 182, 212, 0.44)',
    rfColor: 'rgba(16, 185, 129, 0.52)',
    stroke: 'rgba(220, 252, 231, 0.88)',
  },
  {
    id: 'p-healthy-3',
    hotspot: 'healthy',
    points: '662,456 786,442 832,496 710,516',
    ndviColor: 'rgba(34, 197, 94, 0.36)',
    ndmiColor: 'rgba(14, 165, 233, 0.36)',
    rfColor: 'rgba(16, 185, 129, 0.42)',
    stroke: 'rgba(255, 255, 255, 0.72)',
  },
  // High-stress critical action cluster (red hotspot)
  {
    id: 'p-action-1',
    hotspot: 'action',
    points: '702,606 812,586 854,656 734,682',
    ndviColor: 'rgba(239, 68, 68, 0.50)',
    ndmiColor: 'rgba(220, 38, 38, 0.54)',
    rfColor: 'rgba(244, 63, 94, 0.50)',
    stroke: 'rgba(254, 202, 202, 0.92)',
  },
  {
    id: 'p-action-2',
    hotspot: 'healthy',
    points: '612,612 702,606 734,682 640,702',
    ndviColor: 'rgba(132, 204, 22, 0.36)',
    ndmiColor: 'rgba(56, 189, 248, 0.32)',
    rfColor: 'rgba(245, 158, 11, 0.38)',
    stroke: 'rgba(255, 255, 255, 0.68)',
  },
];

const SPECTRAL_MODES = [
  { id: 'ndvi', label: 'NDVI Health', title: 'Crop Health Index (NDVI)', low: 'High Stress', mid: 'Moderate', high: 'Healthy' },
  { id: 'ndmi', label: 'Moisture (NDMI)', title: 'Root-Zone Moisture Index (NDMI)', low: 'Dry Stress', mid: 'Transitional', high: 'Hydrated' },
  { id: 'rf', label: 'RF Pixel Class', title: 'Random Forest Confidence', low: 'Boundary 49.7%', mid: 'Mixed Edge', high: 'Interior 97.8%' },
];

export default function SatelliteScanStage({
  activeSubsystem = null,
  onSelectHotspot,
  onOpenWorkspace,
  pauseMotion = false,
}) {
  const [spectralMode, setSpectralMode] = useState('ndvi');
  const [backdropMode, setBackdropMode] = useState('orbital'); // 'orbital' | 'mosaic'
  const [liveScan, setLiveScan] = useState(true);
  const [localHotspotId, setLocalHotspotId] = useState('moisture');

  // Derive active hotspot from either parent subsystem hover/selection or user click here
  const activeHotspotId = useMemo(() => {
    if (activeSubsystem) {
      const matched = SCAN_HOTSPOTS.find((h) => h.linkedSubsystems.includes(activeSubsystem));
      if (matched) return matched.id;
    }
    return localHotspotId;
  }, [activeSubsystem, localHotspotId]);

  const activeHotspot =
    SCAN_HOTSPOTS.find((h) => h.id === activeHotspotId) || SCAN_HOTSPOTS[0];
  const currentModeSpec =
    SPECTRAL_MODES.find((m) => m.id === spectralMode) || SPECTRAL_MODES[0];

  const handleSelectHotspot = (hotspot) => {
    setLocalHotspotId(hotspot.id);
    if (onSelectHotspot) {
      onSelectHotspot(hotspot.linkedSubsystems);
    }
  };

  const backdropSrc =
    backdropMode === 'orbital'
      ? '/story-assets/section05-science-backdrop.jpg'
      : '/story-assets/godagari-terraces-mosaic.jpg';

  const getParcelFill = (zone, isHighlighted) => {
    let base =
      spectralMode === 'ndvi'
        ? zone.ndviColor
        : spectralMode === 'ndmi'
        ? zone.ndmiColor
        : zone.rfColor;
    if (!isHighlighted) return base;
    // Slightly intensify opacity for active zone
    return base.replace(/[\d.]+\)$/, (m) => `${Math.min(parseFloat(m) + 0.16, 0.72)})`);
  };

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(52, 211, 153, 0.38)',
        boxShadow: '0 22px 54px rgba(0, 0, 0, 0.6)',
        background: '#040F0A',
      }}
    >
      {/* Top Interactive Controls Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem',
          padding: '0.78rem 1.15rem',
          background: 'rgba(6, 18, 14, 0.94)',
          borderBottom: '1px solid rgba(52, 211, 153, 0.22)',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            className="mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#34D399',
              background: 'rgba(52, 211, 153, 0.14)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
            }}
          >
            <Radio size={11} /> SENTINEL-2 MULTI-SPECTRAL SWATH
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
            Live Orbital Scan &amp; Parcel Diagnostics
          </span>
        </div>

        {/* Mode Switches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Spectral Mode Switcher */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.07)',
              borderRadius: '9999px',
              padding: '0.18rem',
            }}
          >
            {SPECTRAL_MODES.map((mode) => {
              const active = spectralMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSpectralMode(mode.id)}
                  style={{
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.24rem 0.65rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: active ? '#2F8F5B' : 'transparent',
                    color: active ? '#FFFFFF' : 'rgba(226, 232, 240, 0.72)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Imagery Layer Switcher */}
          <button
            type="button"
            onClick={() => setBackdropMode((m) => (m === 'orbital' ? 'mosaic' : 'orbital'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.26rem 0.7rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              borderRadius: '9999px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background:
                backdropMode === 'mosaic' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: backdropMode === 'mosaic' ? '#BAE6FD' : '#E2E8F0',
              cursor: 'pointer',
            }}
          >
            <Layers size={12} />
            {backdropMode === 'orbital' ? 'Orbital Horizon' : 'Godagari 10m Mosaic'}
          </button>

          {/* Live Laser Sweep Toggle */}
          <button
            type="button"
            onClick={() => setLiveScan((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.26rem 0.65rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              borderRadius: '9999px',
              border: '1px solid rgba(52, 211, 153, 0.45)',
              background: liveScan ? 'rgba(52, 211, 153, 0.18)' : 'rgba(255, 255, 255, 0.06)',
              color: liveScan ? '#34D399' : '#CBD5E1',
              cursor: 'pointer',
            }}
          >
            {liveScan ? <Pause size={11} /> : <Play size={11} />}
            {liveScan ? 'Scan: LIVE' : 'Scan: PAUSED'}
          </button>
        </div>
      </div>

      {/* Main Interactive Scan Canvas (16:9 aligned SVG over clean high-res landscape) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(400px, 46vw, 560px)',
          overflow: 'hidden',
          background: '#03110B',
        }}
      >
        {/* Base Aerial / Orbital Imagery */}
        <img
          src={backdropSrc}
          alt={
            backdropMode === 'orbital'
              ? 'Orbital horizon above fertile agricultural field patchwork and meandering river'
              : 'Godagari Barind Tract true-color satellite orthomosaic'
          }
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            filter: backdropMode === 'mosaic' ? 'brightness(0.84) contrast(1.12)' : 'brightness(0.95) saturate(1.08)',
            transition: 'filter 0.35s ease',
          }}
        />

        {/* Subtle Dark Contrast Shielding Around Edges */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(3, 14, 10, 0.32) 0%, transparent 25%, transparent 72%, rgba(3, 14, 10, 0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Exact Coordinate-Matched Interactive Vector SVG Stage (1376x768 cover projection) */}
        <svg
          viewBox="0 0 1376 768"
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
          }}
          role="img"
          aria-label="Interactive Sentinel-2 orbital scan showing spectral parcel health markings and field alerts"
        >
          <defs>
            <linearGradient id="scanSwathCone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.46" />
              <stop offset="45%" stopColor="#34D399" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="laserSweepGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.55" />
              <stop offset="78%" stopColor="#34D399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="scanSatWing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id="scanSatGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Curved Orbital Arc Line Across Upper Horizon */}
          <path
            d="M 10 218 Q 360 92 950 128"
            fill="none"
            stroke="rgba(224, 242, 254, 0.55)"
            strokeWidth="1.8"
            strokeDasharray="6 6"
          />
          <circle cx="490" cy="119" r="3" fill="#E0F2FE" opacity="0.8" />
          <circle cx="710" cy="117" r="2.5" fill="#E0F2FE" opacity="0.65" />

          {/* Perspective Multi-Spectral Parcel Overlays */}
          <g>
            {PARCEL_ZONES.map((zone) => {
              const isSelected = activeHotspotId === zone.hotspot;
              const linkedHotspot = SCAN_HOTSPOTS.find((h) => h.id === zone.hotspot);
              return (
                <polygon
                  key={zone.id}
                  points={zone.points}
                  fill={getParcelFill(zone, isSelected)}
                  stroke={isSelected ? '#FFFFFF' : zone.stroke}
                  strokeWidth={isSelected ? 2.6 : 1.5}
                  strokeDasharray={zone.id.includes('mod') ? '5 3' : undefined}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill 0.25s ease, stroke-width 0.2s ease',
                  }}
                  onClick={() => linkedHotspot && handleSelectHotspot(linkedHotspot)}
                  onMouseEnter={() => linkedHotspot && handleSelectHotspot(linkedHotspot)}
                />
              );
            })}
          </g>

          {/* Animated Swath Beam Fan From Satellite Nadir Down to Farm Plots */}
          <g className={liveScan && !pauseMotion ? 'sat-swath-craft' : undefined}>
            {/* Fan Beam */}
            <polygon
              points="212,118 355,640 875,672 226,112"
              fill="url(#scanSwathCone)"
              opacity={liveScan ? 0.85 : 0.42}
              style={{ pointerEvents: 'none' }}
            />
            <line
              x1="216"
              y1="115"
              x2="355"
              y2="640"
              stroke="rgba(186, 230, 253, 0.48)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <line
              x1="222"
              y1="114"
              x2="875"
              y2="672"
              stroke="rgba(167, 243, 208, 0.42)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />

            {/* Crisp Sentinel-2 Spacecraft */}
            <g transform="translate(132, 34) scale(1.15)" filter="url(#softGlow)">
              {/* Left Solar Array */}
              <rect x="0" y="34" width="52" height="28" rx="3" fill="url(#scanSatWing)" stroke="#BAE6FD" strokeWidth="1.4" />
              <line x1="17" y1="34" x2="17" y2="62" stroke="#BAE6FD" strokeOpacity="0.6" strokeWidth="1" />
              <line x1="34" y1="34" x2="34" y2="62" stroke="#BAE6FD" strokeOpacity="0.6" strokeWidth="1" />
              <line x1="0" y1="48" x2="52" y2="48" stroke="#BAE6FD" strokeOpacity="0.6" strokeWidth="1" />
              {/* Right Solar Array */}
              <rect x="92" y="34" width="52" height="28" rx="3" fill="url(#scanSatWing)" stroke="#BAE6FD" strokeWidth="1.4" />
              <line x1="109" y1="34" x2="109" y2="62" stroke="#BAE6FD" strokeOpacity="0.6" strokeWidth="1" />
              <line x1="126" y1="34" x2="126" y2="62" stroke="#BAE6FD" strokeOpacity="0.6" strokeWidth="1" />
              <line x1="92" y1="48" x2="144" y2="48" stroke="#BAE6FD" strokeOpacity="0.6" strokeWidth="1" />
              {/* Chassis & Optics */}
              <rect x="52" y="44" width="40" height="8" rx="2" fill="#CBD5E1" />
              <rect x="60" y="30" width="24" height="36" rx="4" fill="url(#scanSatGold)" stroke="#FEF3C7" strokeWidth="1.3" />
              <circle cx="72" cy="54" r="6.5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.8" />
              <circle cx="72" cy="54" r="2.6" fill="#34D399" />
              <ellipse cx="72" cy="22" rx="9" ry="4.5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.1" />
              <line x1="72" y1="26" x2="72" y2="30" stroke="#E2E8F0" strokeWidth="1.4" />
            </g>
          </g>

          {/* Continuous Sweeping Laser Scan Band */}
          {liveScan && !pauseMotion && (
            <rect
              x="160"
              y="420"
              width="220"
              height="310"
              fill="url(#laserSweepGrad)"
              className="sat-laser-beam"
              transform="skewX(-18)"
              style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}
            />
          )}

          {/* Callout Elbow Leader Lines, Pulsed Pins & Interactive Pill Labels */}
          {SCAN_HOTSPOTS.map((spot) => {
            const isSelected = activeHotspotId === spot.id;
            return (
              <g
                key={spot.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectHotspot(spot)}
                onMouseEnter={() => handleSelectHotspot(spot)}
              >
                {/* Glow Halo Under Target Pin */}
                <circle
                  cx={spot.pin.x}
                  cy={spot.pin.y}
                  r="14"
                  fill={spot.accent}
                  opacity={isSelected ? 0.38 : 0.2}
                  className={!pauseMotion ? 'scan-target-ping' : undefined}
                />

                {/* Angular White Elbow Leader Line */}
                <polyline
                  points={`${spot.pin.x},${spot.pin.y} ${spot.elbow.x},${spot.elbow.y} ${
                    spot.card.x < spot.elbow.x ? spot.card.x + spot.card.w : spot.card.x
                  },${spot.elbow.y}`}
                  fill="none"
                  stroke={isSelected ? spot.accent : '#FFFFFF'}
                  strokeWidth={isSelected ? 2.8 : 2}
                  strokeLinejoin="round"
                  filter="url(#softGlow)"
                />

                {/* Anchor White Circle Dot */}
                <circle
                  cx={spot.pin.x}
                  cy={spot.pin.y}
                  r={isSelected ? 7.5 : 6}
                  fill="#FFFFFF"
                  stroke={spot.accent}
                  strokeWidth="3"
                />

                {/* Callout Card Chip */}
                <g transform={`translate(${spot.card.x}, ${spot.card.y})`}>
                  <rect
                    x="0"
                    y="0"
                    width={spot.card.w}
                    height="46"
                    rx="11"
                    fill={isSelected ? 'rgba(6, 18, 14, 0.96)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke={spot.accent}
                    strokeWidth={isSelected ? 2.4 : 1.4}
                    filter="url(#softGlow)"
                  />
                  {/* Left Accent Status Dot/Badge */}
                  <circle
                    cx="20"
                    cy="23"
                    r="11"
                    fill={spot.accent}
                    opacity={isSelected ? 0.24 : 0.16}
                  />
                  <circle cx="20" cy="23" r="5" fill={spot.accent} />
                  <text
                    x="38"
                    y="20"
                    fill={isSelected ? '#FFFFFF' : '#0F172A'}
                    fontSize="13.5"
                    fontWeight="800"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {spot.label}
                  </text>
                  <text
                    x="38"
                    y="35"
                    fill={isSelected ? spot.accent : '#475569'}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {spot.subTag}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Top-Right Floating Field Summary Widget (Donut Chart + Mini Parcel Map) */}
        <div
          className="floating-hud-overlay scan-hud-summary"
          style={{
            top: '0.9rem',
            right: '0.9rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.88)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            padding: '0.7rem 0.85rem',
            minWidth: '285px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>
              Field Summary
            </span>
            <span
              className="mono"
              style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                color: '#34D399',
                background: 'rgba(52, 211, 153, 0.15)',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
              }}
            >
              ILLUSTRATIVE SCAN
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Segmented SVG Donut (72% Healthy, 18% Moderate, 10% High Stress) */}
            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                {/* Healthy 72% arc (circumference 138.2 -> 99.5) */}
                <circle
                  cx="30"
                  cy="30"
                  r="22"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="6"
                  strokeDasharray="99.5 138.2"
                  strokeDashoffset="0"
                  transform="rotate(-90 30 30)"
                  strokeLinecap="round"
                />
                {/* Moderate 18% arc (24.9) */}
                <circle
                  cx="30"
                  cy="30"
                  r="22"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="6"
                  strokeDasharray="24.9 138.2"
                  strokeDashoffset="-99.5"
                  transform="rotate(-90 30 30)"
                />
                {/* High Stress 10% arc (13.8) */}
                <circle
                  cx="30"
                  cy="30"
                  r="22"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="6"
                  strokeDasharray="13.8 138.2"
                  strokeDashoffset="-124.4"
                  transform="rotate(-90 30 30)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1.05,
                }}
              >
                <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF' }}>
                  72%
                </span>
                <span style={{ fontSize: '0.52rem', color: 'rgba(226, 232, 240, 0.72)' }}>Healthy</span>
              </div>
            </div>

            {/* Mini Parcel Classification Inset Map */}
            <svg width="52" height="56" viewBox="0 0 56 60" aria-hidden="true" style={{ flexShrink: 0, borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <polygon points="8,8 30,6 28,24 6,22" fill="#22C55E" opacity="0.85" stroke="#06120E" strokeWidth="1.2" />
              <polygon points="30,6 48,12 46,32 28,24" fill="#16A34A" opacity="0.9" stroke="#06120E" strokeWidth="1.2" />
              <polygon points="6,22 28,24 25,42 8,38" fill="#F59E0B" opacity="0.88" stroke="#06120E" strokeWidth="1.2" />
              <polygon points="28,24 46,32 42,50 25,42" fill="#22C55E" opacity="0.82" stroke="#06120E" strokeWidth="1.2" />
              <polygon points="8,38 25,42 22,54 10,50" fill="#EAB308" opacity="0.82" stroke="#06120E" strokeWidth="1.2" />
              <polygon points="25,42 42,50 38,56 22,54" fill="#EF4444" opacity="0.92" stroke="#06120E" strokeWidth="1.2" />
            </svg>

            {/* Interactive Mini Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem', flex: 1 }}>
              {[
                { id: 'healthy', label: 'Healthy', pct: '72%', color: '#22C55E' },
                { id: 'moisture', label: 'Moderate', pct: '18%', color: '#F59E0B' },
                { id: 'action', label: 'High Stress', pct: '10%', color: '#EF4444' },
              ].map((row) => {
                const isActive = activeHotspotId === row.id;
                const linked = SCAN_HOTSPOTS.find((h) => h.id === row.id);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => linked && handleSelectHotspot(linked)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.45rem',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.16rem 0.35rem',
                      cursor: 'pointer',
                      color: '#FFFFFF',
                      fontSize: '0.67rem',
                      width: '100%',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '9999px',
                          background: row.color,
                        }}
                      />
                      {row.label}
                    </span>
                    <span className="mono" style={{ fontWeight: 700, color: row.color }}>
                      {row.pct}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom-Left Crop Health Index Scale Legend */}
        <div
          className="floating-hud-overlay scan-hud-legend"
          style={{
            bottom: '0.9rem',
            left: '0.9rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.88)',
            border: '1px solid rgba(52, 211, 153, 0.32)',
            padding: '0.6rem 0.9rem',
            minWidth: '235px',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
            {currentModeSpec.title}
          </div>
          <div style={{ position: 'relative', paddingTop: '2px' }}>
            <div
              style={{
                height: '9px',
                borderRadius: '9999px',
                background:
                  spectralMode === 'ndmi'
                    ? 'linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #38BDF8 100%)'
                    : 'linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #84CC16 74%, #16A34A 100%)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.45)',
              }}
            />
            {/* Dynamic Pointer Marker Corresponding to Selected Zone */}
            <div
              style={{
                position: 'absolute',
                top: '-1px',
                left: activeHotspot.legendPos,
                width: '13px',
                height: '13px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                border: `2.5px solid ${activeHotspot.accent}`,
                transform: 'translateX(-50%)',
                transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.62rem',
              fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.78)',
              marginTop: '0.35rem',
            }}
          >
            <span>{currentModeSpec.low}</span>
            <span>{currentModeSpec.mid}</span>
            <span>{currentModeSpec.high}</span>
          </div>
        </div>

        {/* Bottom-Right Active Hotspot Readout Bar Synced to M1-M6 Subsystems */}
        <div
          className="floating-hud-overlay scan-hud-detail"
          style={{
            bottom: '0.9rem',
            right: '0.9rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.90)',
            border: `1px solid ${activeHotspot.accent}66`,
            padding: '0.65rem 0.9rem',
            maxWidth: '370px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: 800, color: activeHotspot.accent }}>
              <ScanLine size={13} />
              {activeHotspot.label}
            </span>
            {onOpenWorkspace && (
              <button
                type="button"
                onClick={() => onOpenWorkspace(activeHotspot.primarySubsystem)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: `${activeHotspot.accent}22`,
                  color: '#FFFFFF',
                  border: `1px solid ${activeHotspot.accent}55`,
                  borderRadius: '9999px',
                  padding: '0.14rem 0.5rem',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Inspect Module <ChevronRight size={11} />
              </button>
            )}
          </div>
          <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '0.22rem' }}>
            {activeHotspot.metrics}
          </div>
          <p style={{ fontSize: '0.71rem', color: 'rgba(226, 232, 240, 0.82)', margin: 0, lineHeight: 1.4 }}>
            {activeHotspot.description}
          </p>
        </div>
      </div>
    </div>
  );
}
