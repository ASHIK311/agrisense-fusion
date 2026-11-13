import React, { useEffect, useRef, useState } from 'react';
import {
  CloudSun,
  Layers,
  Radio,
  ScanLine,
  Play,
  Pause,
  Crosshair,
  Droplets,
  Sprout,
} from 'lucide-react';
import {
  DonutPieGauge,
  SegmentedPieBar,
  subscribeTelemetryTick,
} from './ImpactObservatoryDashboard';

/**
 * Spatial parcel geometry & field callout metadata mapped pixel-aligned (1376x768 cover)
 * onto section07-spatial-backdrop.jpg terraced farm plots.
 */
const SPATIAL_PARCEL_MARKINGS = {
  'field-godagari-a': {
    shortLabel: 'PARCEL A-01',
    zoneTitle: 'High Barind Transition',
    accent: '#F59E0B',
    polygon: '395,512 588,468 654,558 452,614',
    subGrid: 'M 492 490 L 552 586 M 424 560 L 620 512',
    fill: 'rgba(245, 158, 11, 0.36)',
    pin: { x: 525, y: 538 },
    elbow: { x: 486, y: 376 },
    chip: { x: 355, y: 342, w: 196 },
    bbchPct: 68,
    bbchLabel: 'BBCH 41–50 • Booting / Canopy',
    vraZones: [
      { label: 'Optimal Canopy (68%)', pct: 68, color: '#34D399' },
      { label: 'Moisture Deficit (22%)', pct: 22, color: '#F59E0B' },
      { label: 'Edge Stress (10%)', pct: 10, color: '#EF4444' },
    ],
    targetIrrigationMm: 18.4,
    healthLabel: 'Moderate Stress • Watch ET₀',
    drMm: 38.2,
  },
  'field-godagari-b': {
    shortLabel: 'PARCEL B-02',
    zoneTitle: 'Pulse Rotation Canopy',
    accent: '#22C55E',
    polygon: '642,566 822,516 892,626 694,686',
    subGrid: 'M 732 541 L 792 656 M 668 624 L 856 570',
    fill: 'rgba(34, 197, 94, 0.38)',
    pin: { x: 762, y: 598 },
    elbow: { x: 814, y: 428 },
    chip: { x: 786, y: 394, w: 204 },
    bbchPct: 82,
    bbchLabel: 'BBCH 51–59 • Flowering Peak',
    vraZones: [
      { label: 'Vigorous Canopy (78%)', pct: 78, color: '#22C55E' },
      { label: 'Transition (16%)', pct: 16, color: '#38BDF8' },
      { label: 'Margin (6%)', pct: 6, color: '#F59E0B' },
    ],
    targetIrrigationMm: 11.5,
    healthLabel: 'High Vigor • Optimal AWD',
    drMm: 24.6,
  },
  'field-godagari-c': {
    shortLabel: 'PARCEL C-03',
    zoneTitle: 'Canal Margin Boundary',
    accent: '#38BDF8',
    polygon: '216,526 384,484 434,586 254,634',
    subGrid: 'M 300 505 L 344 610 M 235 580 L 408 534',
    fill: 'rgba(56, 189, 248, 0.34)',
    pin: { x: 325, y: 556 },
    elbow: { x: 300, y: 416 },
    chip: { x: 185, y: 382, w: 196 },
    bbchPct: 54,
    bbchLabel: 'BBCH 65–71 • Grain / Ripening',
    vraZones: [
      { label: 'Healthy Interior (54%)', pct: 54, color: '#34D399' },
      { label: 'Mixed Boundary (31%)', pct: 31, color: '#F59E0B' },
      { label: 'Dry Edge (15%)', pct: 15, color: '#EF4444' },
    ],
    targetIrrigationMm: 24.5,
    healthLabel: 'Boundary Alert • Deficit Risk',
    drMm: 46.8,
  },
};

export default function SpatialTwinPreviewStage({
  parcels = [],
  selectedParcelId,
  onSelectParcel,
  waterBalance = {},
  pauseMotion = false,
}) {
  const [backdropMode, setBackdropMode] = useState('aerial'); // 'aerial' | 'mosaic'
  const [liveScan, setLiveScan] = useState(true);
  const [showMarkings, setShowMarkings] = useState(true);

  const sweepBeamRef = useRef(null);
  const beaconCircleRef = useRef(null);
  const leaderRefs = useRef([]);

  const currentParcel =
    parcels.find((p) => p.id === selectedParcelId) || parcels[0] || {};
  const meta =
    SPATIAL_PARCEL_MARKINGS[currentParcel.id] ||
    SPATIAL_PARCEL_MARKINGS['field-godagari-a'];

  const vwcPct =
    currentParcel.vwc != null ? (Number(currentParcel.vwc) * 100).toFixed(1) : '24.2';
  const ndviNum =
    currentParcel.ndvi != null ? Number(currentParcel.ndvi) : 0.68;
  const ndmiNum =
    currentParcel.ndmi != null ? Number(currentParcel.ndmi) : 0.24;
  const drVal =
    waterBalance.depletion_mm ??
    waterBalance.root_zone_depletion_dr ??
    meta.drMm;

  // Continuous 60fps RAF radar sweep + beacon pulse + leader-line data pulse
  useEffect(() => {
    if (pauseMotion || !liveScan) return undefined;

    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;

      if (sweepBeamRef.current) {
        const sweepX = -260 + ((sec * 240) % 1750);
        sweepBeamRef.current.setAttribute('x', sweepX.toFixed(1));
      }

      if (beaconCircleRef.current) {
        const p = (sec * 0.9) % 1;
        const r = 10 + p * 22;
        const op = Math.max(0, 0.85 * (1 - p));
        beaconCircleRef.current.setAttribute('r', r.toFixed(1));
        beaconCircleRef.current.setAttribute('opacity', op.toFixed(3));
      }

      leaderRefs.current.forEach((lineEl, idx) => {
        if (!lineEl) return;
        const dashOffset = -(sec * 28 + idx * 12) % 40;
        lineEl.style.strokeDashoffset = dashOffset.toFixed(1);
      });
    });
  }, [pauseMotion, liveScan]);

  const backdropSrc =
    backdropMode === 'aerial'
      ? '/story-assets/section07-spatial-backdrop.jpg'
      : '/story-assets/godagari-terraces-mosaic.jpg';

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '22px',
        overflow: 'hidden',
        border: '1px solid rgba(52, 211, 153, 0.38)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.68)',
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
          gap: '0.6rem',
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
              color: meta.accent,
              background: `${meta.accent}1A`,
              border: `1px solid ${meta.accent}55`,
              padding: '0.2rem 0.58rem',
              borderRadius: '9999px',
            }}
          >
            <Crosshair size={11} /> {meta.shortLabel} ACTIVE
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
            Precision Analytical Field HUD &amp; Zone Markings
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowMarkings((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.32rem',
              padding: '0.26rem 0.68rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              borderRadius: '9999px',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              background: showMarkings ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.06)',
              color: showMarkings ? '#FDE68A' : '#CBD5E1',
              cursor: 'pointer',
            }}
          >
            <ScanLine size={12} />
            {showMarkings ? 'Markings: ON' : 'Markings: OFF'}
          </button>

          <button
            type="button"
            onClick={() => setBackdropMode((m) => (m === 'aerial' ? 'mosaic' : 'aerial'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.32rem',
              padding: '0.26rem 0.68rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              borderRadius: '9999px',
              border: '1px solid rgba(56, 189, 248, 0.42)',
              background: backdropMode === 'mosaic' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: backdropMode === 'mosaic' ? '#BAE6FD' : '#E2E8F0',
              cursor: 'pointer',
            }}
          >
            <Layers size={12} />
            {backdropMode === 'aerial' ? 'Terrace Panorama' : 'Godagari 10m Mosaic'}
          </button>

          <button
            type="button"
            onClick={() => setLiveScan((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.26rem 0.68rem',
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
            {liveScan ? 'Radar: LIVE' : 'Radar: PAUSED'}
          </button>
        </div>
      </div>

      {/* Main Panoramic Interactive Spatial Stage */}
      <div
        className="spatial-stage-viewport"
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(440px, 49vw, 600px)',
          overflow: 'hidden',
          background: '#03110B',
        }}
      >
        <img
          src={backdropSrc}
          alt="Water-smart Godagari agricultural terraces with live marked parcel boundaries and frosted analytics"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            filter: backdropMode === 'mosaic' ? 'brightness(0.84) contrast(1.12)' : 'brightness(0.94) saturate(1.06)',
            transition: 'filter 0.35s ease',
          }}
        />

        {/* Atmospheric Edge Contrast Gradient */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(4, 15, 10, 0.42) 0%, transparent 26%, transparent 72%, rgba(4, 15, 10, 0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Pixel-Aligned Interactive SVG Parcel Markings, Leader Lines & Radar Sweep */}
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
          aria-label="Interactive spatial parcel polygons and telemetry pins"
        >
          <defs>
            <linearGradient id="spatialRadarGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
              <stop offset="55%" stopColor="#34D399" stopOpacity="0.45" />
              <stop offset="88%" stopColor="#BAE6FD" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <filter id="spatialGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Moving Telemetry Radar Beam Across Farmland */}
          {liveScan && !pauseMotion && (
            <rect
              ref={sweepBeamRef}
              x="-260"
              y="340"
              width="210"
              height="410"
              fill="url(#spatialRadarGrad)"
              transform="skewX(-16)"
              style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}
            />
          )}

          {/* Marked Agricultural Parcel Polygons & Callouts */}
          {showMarkings &&
            parcels.map((parcel, idx) => {
              const pMeta = SPATIAL_PARCEL_MARKINGS[parcel.id];
              if (!pMeta) return null;
              const isSelected = parcel.id === currentParcel.id;
              return (
                <g
                  key={parcel.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectParcel && onSelectParcel(parcel.id)}
                >
                  {/* Parcel Polygon Fill & Crisp Border */}
                  <polygon
                    points={pMeta.polygon}
                    fill={pMeta.fill}
                    stroke={isSelected ? '#FFFFFF' : pMeta.accent}
                    strokeWidth={isSelected ? 3.2 : 1.8}
                    opacity={isSelected ? 1 : 0.72}
                    filter={isSelected ? 'url(#spatialGlow)' : undefined}
                    style={{ transition: 'all 0.25s ease' }}
                  />

                  {/* Internal VRA Subdivision Grid */}
                  <path
                    d={pMeta.subGrid}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.55)"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity={isSelected ? 0.95 : 0.45}
                  />

                  {/* Animated Beacon Halo Under Active Pin */}
                  {isSelected && !pauseMotion && (
                    <circle
                      ref={beaconCircleRef}
                      cx={pMeta.pin.x}
                      cy={pMeta.pin.y}
                      r="14"
                      fill="none"
                      stroke={pMeta.accent}
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Flowing Dashed Leader Connector */}
                  <polyline
                    ref={(el) => {
                      leaderRefs.current[idx] = el;
                    }}
                    points={`${pMeta.pin.x},${pMeta.pin.y} ${pMeta.elbow.x},${pMeta.elbow.y} ${
                      pMeta.chip.x < pMeta.elbow.x
                        ? pMeta.chip.x + pMeta.chip.w
                        : pMeta.chip.x
                    },${pMeta.elbow.y}`}
                    fill="none"
                    stroke={isSelected ? '#FFFFFF' : pMeta.accent}
                    strokeWidth={isSelected ? 2.6 : 1.6}
                    strokeDasharray={isSelected ? '7 4' : undefined}
                    opacity={isSelected ? 1 : 0.78}
                    filter="url(#spatialGlow)"
                  />

                  {/* Target Pin Dot */}
                  <circle
                    cx={pMeta.pin.x}
                    cy={pMeta.pin.y}
                    r={isSelected ? 7.5 : 5.5}
                    fill="#FFFFFF"
                    stroke={pMeta.accent}
                    strokeWidth="3"
                  />

                  {/* Callout Badge Right Over Marked Plot */}
                  <g transform={`translate(${pMeta.chip.x}, ${pMeta.chip.y})`}>
                    <rect
                      x="0"
                      y="0"
                      width={pMeta.chip.w}
                      height="44"
                      rx="11"
                      fill={isSelected ? 'rgba(6, 18, 14, 0.96)' : 'rgba(6, 18, 14, 0.84)'}
                      stroke={pMeta.accent}
                      strokeWidth={isSelected ? 2.4 : 1.3}
                      filter="url(#spatialGlow)"
                    />
                    <circle cx="19" cy="22" r="5.5" fill={pMeta.accent} />
                    <text
                      x="33"
                      y="19"
                      fill="#FFFFFF"
                      fontSize="13"
                      fontWeight="800"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {pMeta.shortLabel} • NDVI {Number(parcel.ndvi).toFixed(2)}
                    </text>
                    <text
                      x="33"
                      y="34"
                      fill={pMeta.accent}
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pMeta.zoneTitle}
                    </text>
                  </g>
                </g>
              );
            })}
        </svg>

        {/* HUD Card 1: Top-Center Atmospheric Microclimate Strip */}
        <div
          className="floating-hud-overlay spatial-hud-weather"
          style={{
            top: '0.85rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem',
            padding: '0.55rem 1rem',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CloudSun size={18} color="#F59E0B" />
            <div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(226, 232, 240, 0.65)' }}>Atmospheric Weather</div>
              <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 800 }}>28.4°C • Part Cloudy</div>
            </div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.14)', paddingLeft: '0.85rem' }}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(226, 232, 240, 0.65)' }}>Precip</div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700 }}>0.0 mm/d</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.14)', paddingLeft: '0.85rem' }}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(226, 232, 240, 0.65)' }}>Humidity</div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F59E0B' }}>42% Dry</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.14)', paddingLeft: '0.85rem' }}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(226, 232, 240, 0.65)' }}>Wind @ 2m</div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700 }}>2.1 m/s</div>
          </div>
        </div>

        {/* HUD Card 2 (Top-Left Sky Horizon): Active Parcel Growth Stage & Soil Metrics */}
        <div
          className="floating-hud-overlay spatial-hud-left"
          style={{
            top: '4.5rem',
            left: '1rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.90)',
            border: `1px solid ${meta.accent}55`,
            color: '#FFFFFF',
            width: '300px',
            padding: '0.75rem 0.9rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 800, color: '#34D399' }}>
              <Sprout size={12} /> {currentParcel.code}
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 700, color: meta.accent }}>
              {currentParcel.stage}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.2rem' }}>
            {currentParcel.crop}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(226, 232, 240, 0.72)', marginBottom: '0.5rem' }}>
            {currentParcel.area_ha} ha • {currentParcel.elevation_m}m • {currentParcel.soil_class}
          </div>

          {/* Continuous Animated Growth Cycle Meter */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(226, 232, 240, 0.8)', marginBottom: '0.2rem' }}>
              <span>{meta.bbchLabel}</span>
              <span className="mono" style={{ color: meta.accent }}>{meta.bbchPct}%</span>
            </div>
            <SegmentedPieBar
              segments={[{ label: 'Crop Development', pct: meta.bbchPct, color: meta.accent }]}
              height={6}
              animDelay="0.1s"
              pauseMotion={pauseMotion}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(226, 232, 240, 0.65)' }}>Moisture VWC</div>
              <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 800, color: '#34D399' }}>{vwcPct}%</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(226, 232, 240, 0.65)' }}>Root Depletion</div>
              <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FB923C' }}>{Number(drVal).toFixed(1)} mm</div>
            </div>
          </div>
        </div>

        {/* HUD Card 3 (Top-Right Sky Horizon): VRA Prescription & Segmented Zone Pie-Bar */}
        <div
          className="floating-hud-overlay spatial-hud-right"
          style={{
            top: '4.5rem',
            right: '1rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.90)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#FFFFFF',
            width: '300px',
            padding: '0.75rem 0.9rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B' }}>
              <Droplets size={13} /> Variable Rate Prescription (VRA)
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'rgba(241, 245, 249, 0.9)', marginBottom: '0.45rem' }}>
            Target AWD Pulse:{' '}
            <strong className="mono" style={{ color: '#FFFFFF' }}>
              {meta.targetIrrigationMm.toFixed(1)} mm
            </strong>
          </div>

          <SegmentedPieBar
            segments={meta.vraZones}
            height={7}
            animDelay="0.35s"
            pauseMotion={pauseMotion}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.6rem',
              color: 'rgba(226, 232, 240, 0.78)',
              marginTop: '0.38rem',
            }}
          >
            <span style={{ color: '#34D399' }}>Optimal {meta.vraZones[0].pct}%</span>
            <span style={{ color: '#F59E0B' }}>Deficit {meta.vraZones[1].pct}%</span>
            <span style={{ color: '#EF4444' }}>Stress {meta.vraZones[2].pct}%</span>
          </div>
        </div>

        {/* HUD Card 4 (Bottom-Right Riverbank Margin): Live Animated Spectral NDVI Pie Gauge */}
        <div
          className="floating-hud-overlay spatial-hud-ndvi"
          style={{
            bottom: '0.9rem',
            right: '1rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.92)',
            border: `1px solid ${meta.accent}66`,
            color: '#FFFFFF',
            padding: '0.7rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <DonutPieGauge
            segments={[
              { label: 'NDVI Strength', pct: Math.round(ndviNum * 100), color: meta.accent },
            ]}
            size={68}
            strokeWidth={5.8}
            centerValue={ndviNum.toFixed(2)}
            centerSub="NDVI"
            accent={meta.accent}
            animDelay="0.2s"
            pauseMotion={pauseMotion}
          />
          <div>
            <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.72)' }}>
              SENTINEL-2 SPECTRAL
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.12rem' }}>
              {meta.healthLabel}
            </div>
            <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38BDF8', marginTop: '0.18rem' }}>
              NDMI: {ndmiNum.toFixed(2)} • {currentParcel.lulc_class}
            </div>
          </div>
        </div>

        {/* HUD Card 5 (Bottom-Left Subtle Interactive Hint) */}
        <div
          className="floating-hud-overlay spatial-hud-hint"
          style={{
            bottom: '0.9rem',
            left: '1rem',
            zIndex: 4,
            background: 'rgba(6, 18, 14, 0.86)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            padding: '0.5rem 0.8rem',
            fontSize: '0.7rem',
            color: 'rgba(226, 232, 240, 0.86)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <Radio size={13} color="#34D399" />
          <span>Click any marked field polygon or top pill to inspect parcel HUD</span>
        </div>
      </div>
    </div>
  );
}
