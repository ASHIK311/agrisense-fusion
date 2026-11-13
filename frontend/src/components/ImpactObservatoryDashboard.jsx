import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Satellite,
  Droplets,
  BookOpen,
  Gauge,
  Activity,
} from 'lucide-react';

/**
 * Shared 60fps requestAnimationFrame telemetry clock.
 * Drives SVG pie rings, segmented pie-bars, and live indicators continuously
 * without React re-renders or browser SVG <mask>/CSS animation freezes.
 */
const telemetrySubscribers = new Set();
let rafHandle = null;

function runTelemetryClock(nowMs) {
  telemetrySubscribers.forEach((cb) => cb(nowMs));
  if (telemetrySubscribers.size > 0) {
    rafHandle = window.requestAnimationFrame(runTelemetryClock);
  } else {
    rafHandle = null;
  }
}

export function subscribeTelemetryTick(callback) {
  telemetrySubscribers.add(callback);
  if (rafHandle === null && typeof window !== 'undefined') {
    rafHandle = window.requestAnimationFrame(runTelemetryClock);
  }
  return () => {
    telemetrySubscribers.delete(callback);
    if (telemetrySubscribers.size === 0 && rafHandle !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  };
}

/** Smooth staggered fill-hold-reset envelope in [0.06, 1.0]. */
function computeCycleFillFactor(sec, delaySec, cycleSec = 3.6) {
  const phase = (((sec + delaySec) % cycleSec) + cycleSec) % cycleSec / cycleSec;
  if (phase < 0.40) {
    const u = phase / 0.40;
    return 0.06 + 0.94 * (1 - Math.pow(1 - u, 3));
  }
  if (phase < 0.78) {
    return 1;
  }
  const u = (phase - 0.78) / 0.22;
  const smooth = u * u * (3 - 2 * u);
  return 1 - 0.94 * smooth;
}

/**
 * Circular multi-segment SVG Donut/Pie chart featuring a continuous
 * clockwise sweep loading loop and dual rotating telemetry loader rings.
 */
export function DonutPieGauge({
  segments,
  size = 68,
  strokeWidth = 5.8,
  centerValue,
  centerSub,
  accent = '#34D399',
  animDelay = '0s',
  pauseMotion = false,
}) {
  const radius = (size - strokeWidth * 2 - 8) / 2;
  const outerRadius = radius + strokeWidth * 0.94;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerRadius = Math.max(radius - strokeWidth * 0.84, 4);
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const outerGroupRef = useRef(null);
  const innerRingRef = useRef(null);
  const tipDotRef = useRef(null);
  const sliceRefs = useRef([]);

  useEffect(() => {
    const totalDataPct = segments.reduce((sum, seg) => sum + seg.pct, 0);

    const applyFrame = (fillFactor, outerDeg, innerDeg) => {
      if (outerGroupRef.current) {
        outerGroupRef.current.setAttribute('transform', `rotate(${outerDeg} ${cx} ${cy})`);
      }
      if (innerRingRef.current) {
        innerRingRef.current.setAttribute('transform', `rotate(${innerDeg} ${cx} ${cy})`);
      }

      const fillBudget = totalDataPct * fillFactor;
      let cumulativePct = 0;

      segments.forEach((seg, idx) => {
        const el = sliceRefs.current[idx];
        const segStart = cumulativePct;
        const segEnd = cumulativePct + seg.pct;
        cumulativePct = segEnd;

        if (!el) return;
        const visiblePct = Math.max(0, Math.min(fillBudget, segEnd) - segStart);
        const arcLen = (visiblePct / 100) * circumference;
        el.setAttribute('stroke-dasharray', `${arcLen.toFixed(2)} ${circumference.toFixed(2)}`);
      });

      if (tipDotRef.current) {
        const tipAngleRad = ((fillBudget / 100) * 360 - 90) * (Math.PI / 180);
        const tx = cx + radius * Math.cos(tipAngleRad);
        const ty = cy + radius * Math.sin(tipAngleRad);
        tipDotRef.current.setAttribute('cx', tx.toFixed(2));
        tipDotRef.current.setAttribute('cy', ty.toFixed(2));
        tipDotRef.current.setAttribute('opacity', fillFactor > 0.07 ? '0.96' : '0');
      }
    };

    if (pauseMotion) {
      applyFrame(1, 0, 0);
      return undefined;
    }

    const delaySec = parseFloat(animDelay) || 0;
    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;
      const fillFactor = computeCycleFillFactor(sec, delaySec, 3.6);
      const outerDeg = ((sec * 125 + delaySec * 55) % 360).toFixed(2);
      const innerDeg = (360 - ((sec * 52 + delaySec * 35) % 360)).toFixed(2);
      applyFrame(fillFactor, outerDeg, innerDeg);
    });
  }, [segments, circumference, radius, cx, cy, animDelay, pauseMotion]);

  // Initial static offset layout per slice
  let initialOffset = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Outer Rotating Loader Arc + Comet Dot */}
        <g ref={outerGroupRef}>
          <circle
            cx={cx}
            cy={cy}
            r={outerRadius}
            fill="none"
            stroke={`${accent}28`}
            strokeWidth="1.2"
          />
          <circle
            cx={cx}
            cy={cy}
            r={outerRadius}
            fill="none"
            stroke={accent}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeDasharray={`${outerCirc * 0.3} ${outerCirc}`}
            opacity="0.95"
          />
          <circle cx={cx} cy={cy - outerRadius} r="2.5" fill="#FFFFFF" />
        </g>

        {/* Inner Counter-Rotating Telemetry Tick Ring */}
        <circle
          ref={innerRingRef}
          cx={cx}
          cy={cy}
          r={innerRadius}
          fill="none"
          stroke={`${accent}38`}
          strokeWidth="1.1"
          strokeDasharray="2 4"
        />

        {/* Subtle Ghost Full Ring Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Animated Multi-Slice Pie Arcs */}
        {segments.map((seg, i) => {
          const dashOffset = -((initialOffset / 100) * circumference);
          const fullArcLen = (seg.pct / 100) * circumference;
          initialOffset += seg.pct;
          return (
            <circle
              key={seg.label || i}
              ref={(el) => {
                sliceRefs.current[i] = el;
              }}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${fullArcLen.toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset={dashOffset.toFixed(2)}
              strokeLinecap={segments.length === 1 ? 'round' : 'butt'}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}

        {/* Glowing Leading Data Tip */}
        {!pauseMotion && (
          <circle
            ref={tipDotRef}
            cx={cx}
            cy={cy - radius}
            r="2.6"
            fill="#FFFFFF"
            opacity="0.95"
          />
        )}
      </svg>

      {(centerValue || centerSub) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.05,
            pointerEvents: 'none',
          }}
        >
          {centerValue && (
            <span className="mono" style={{ fontSize: size >= 72 ? '0.8rem' : '0.64rem', fontWeight: 800, color: '#FFFFFF' }}>
              {centerValue}
            </span>
          )}
          {centerSub && (
            <span style={{ fontSize: '0.48rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.72)' }}>
              {centerSub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal segmented Pie-Bar progress chart driven by the shared 60fps RAF loop
 * for continuous loading fill, flowing stripe motion, and scanner beam sweeps.
 */
export function SegmentedPieBar({ segments, height = 8, animDelay = '0s', pauseMotion = false }) {
  const trackRef = useRef(null);
  const gleamRef = useRef(null);
  const stripeRefs = useRef([]);

  useEffect(() => {
    if (pauseMotion) {
      if (trackRef.current) {
        trackRef.current.style.transform = 'scaleX(1)';
      }
      return undefined;
    }

    const delaySec = parseFloat(animDelay) || 0;
    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;
      const barScale = computeCycleFillFactor(sec, delaySec, 3.6);

      if (trackRef.current) {
        trackRef.current.style.transform = `scaleX(${barScale.toFixed(4)})`;
      }

      const gleamCycle = 1.8;
      const gleamFrac = (((sec + delaySec * 0.6) % gleamCycle) + gleamCycle) % gleamCycle / gleamCycle;
      if (gleamRef.current) {
        const leftPct = -36 + gleamFrac * 172;
        gleamRef.current.style.left = `${leftPct.toFixed(1)}%`;
      }

      const bgX = ((sec * 34) % 28).toFixed(1);
      stripeRefs.current.forEach((segEl) => {
        if (segEl) {
          segEl.style.backgroundPosition = `${bgX}px 0`;
        }
      });
    });
  }, [animDelay, pauseMotion]);

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: '9999px',
        background: 'rgba(255, 255, 255, 0.09)',
        padding: '1px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle Faint Ghost Reference Track Underneath */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '1px',
          display: 'flex',
          gap: '2px',
          opacity: 0.16,
          pointerEvents: 'none',
        }}
      >
        {segments.map((seg, idx) => (
          <div
            key={seg.label || idx}
            style={{
              width: `${seg.pct}%`,
              height: '100%',
              backgroundColor: seg.color,
              borderRadius: '9999px',
            }}
          />
        ))}
      </div>

      {/* Continuous Filling Pie-Bar Track */}
      <div
        ref={trackRef}
        style={{
          transformOrigin: 'left center',
          display: 'flex',
          width: '100%',
          height: '100%',
          gap: '2px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          return (
            <div
              key={seg.label || idx}
              ref={(el) => {
                stripeRefs.current[idx] = el;
              }}
              title={`${seg.label}: ${seg.pct}%`}
              style={{
                width: `${seg.pct}%`,
                height: '100%',
                backgroundColor: seg.color,
                backgroundImage: !pauseMotion
                  ? 'repeating-linear-gradient(-55deg, rgba(255, 255, 255, 0.24) 0px, rgba(255, 255, 255, 0.24) 6px, transparent 6px, transparent 14px)'
                  : undefined,
                backgroundSize: '28px 28px',
                borderRadius: '9999px',
                boxShadow:
                  isLast && !pauseMotion
                    ? `0 0 10px ${seg.color}99, inset -3px 0 6px rgba(255, 255, 255, 0.9)`
                    : `0 0 8px ${seg.color}66`,
              }}
            />
          );
        })}
      </div>

      {/* Continuous Sweeping Scanner Highlight */}
      {!pauseMotion && (
        <div
          ref={gleamRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '32%',
            left: '-36%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.65) 50%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

const FOUR_DASHBOARD_CARDS = [
  {
    id: 'lulc-cv',
    tag: 'SENTINEL-2 LULC',
    value: '84.63%',
    sub: '± 3.81% Spatial CV',
    accent: '#34D399',
    glow: 'rgba(52, 211, 153, 0.42)',
    icon: Satellite,
    pieCenter: '84.6%',
    pieSub: 'CV',
    pieSegments: [
      { label: 'Cross-Validated Correct', pct: 84.63, color: '#34D399' },
    ],
    barSegments: [
      { label: 'Pure Interior Accuracy', pct: 66, color: '#34D399' },
      { label: 'Mixed Boundary Zone', pct: 34, color: '#F59E0B' },
    ],
    barFootnote: 'Block C Interior 90.64% vs Mixed Boundary 75.92%',
  },
  {
    id: 'water-save',
    tag: 'SCENARIO WATER DELTA',
    value: '76.3%',
    sub: 'Provisional Scenario Model',
    accent: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.42)',
    icon: Droplets,
    pieCenter: '76.3%',
    pieSub: 'SAVED',
    pieSegments: [
      { label: 'Groundwater Saved', pct: 76.3, color: '#38BDF8' },
      { label: 'Rotation Demand', pct: 23.7, color: '#0E7490' },
    ],
    barSegments: [
      { label: 'Saved Extraction', pct: 76.3, color: '#38BDF8' },
      { label: 'Remaining Demand (3,200 m³/ha)', pct: 23.7, color: '#F59E0B' },
    ],
    barFootnote: '3,200 vs 13,500 m³/ha dry-season flood pumping',
  },
  {
    id: 'doi-corpus',
    tag: 'LITERATURE CORPUS',
    value: '60 DOIs',
    sub: '17 Crop Pathogens',
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.42)',
    icon: BookOpen,
    pieCenter: '80%',
    pieSub: 'FULL',
    pieSegments: [
      { label: 'Full-Text Verified (48)', pct: 80, color: '#F59E0B' },
      { label: 'Abstract Verified (5)', pct: 8.3, color: '#34D399' },
      { label: 'Metadata Indexed (7)', pct: 11.7, color: '#38BDF8' },
    ],
    barSegments: [
      { label: 'Full-Text (48)', pct: 80, color: '#F59E0B' },
      { label: 'Abstract (5)', pct: 8.3, color: '#34D399' },
      { label: 'Meta (7)', pct: 11.7, color: '#38BDF8' },
    ],
    barFootnote: '48 full-text • 5 abstract • 7 metadata verified',
  },
  {
    id: 'suction-head',
    tag: 'SUCTION STRESS',
    value: '94.3%',
    sub: '26.4m / 28.0m Limit',
    accent: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.42)',
    icon: Gauge,
    pieCenter: '1.6m',
    pieSub: 'LEFT',
    pieSegments: [
      { label: 'Drawdown Depth (26.4m)', pct: 94.3, color: '#EF4444' },
      { label: 'Safety Margin (1.6m)', pct: 5.7, color: '#34D399' },
    ],
    barSegments: [
      { label: 'Depleted Drawdown Head', pct: 94.3, color: '#EF4444' },
      { label: 'Safe Head Left', pct: 5.7, color: '#34D399' },
    ],
    barFootnote: 'Centrifugal stall margin: 1.6m remaining head',
  },
];

const CROP_SUITABILITY_BARS = [
  { name: 'Aman Rice', pct: 78.92, color: '#34D399' },
  { name: 'Maize', pct: 73.44, color: '#38BDF8' },
  { name: 'Wheat', pct: 57.41, color: '#F59E0B' },
  { name: 'Boro Rice', pct: 40.51, color: '#EF4444' },
];

export default function ImpactObservatoryDashboard({ inView = true, pauseMotion = false }) {
  const [selectedCardId, setSelectedCardId] = useState('lulc-cv');
  const cardRefs = useRef([]);
  const headerDotRef = useRef(null);
  const topScanRef = useRef(null);

  const activeCard =
    FOUR_DASHBOARD_CARDS.find((c) => c.id === selectedCardId) || FOUR_DASHBOARD_CARDS[0];

  // Drive live ambient card border pulse, status dot, and mission-control scan sweep continuously
  useEffect(() => {
    if (pauseMotion) return undefined;

    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;

      if (headerDotRef.current) {
        const pulse = 0.78 + 0.42 * (0.5 + 0.5 * Math.sin(sec * 3.5));
        headerDotRef.current.style.transform = `scale(${pulse.toFixed(3)})`;
      }

      if (topScanRef.current) {
        const scanPos = ((sec * 42) % 140) - 20;
        topScanRef.current.style.left = `${scanPos.toFixed(1)}%`;
      }

      FOUR_DASHBOARD_CARDS.forEach((card, idx) => {
        const el = cardRefs.current[idx];
        if (!el) return;
        const glowStrength = 0.5 + 0.5 * Math.sin(sec * 1.9 - idx * 0.9);
        el.style.boxShadow = `0 14px 34px rgba(0, 0, 0, 0.48), 0 0 ${(12 + glowStrength * 18).toFixed(1)}px ${card.accent}${Math.round(25 + glowStrength * 38).toString(16)}`;
      });
    });
  }, [pauseMotion]);

  return (
    <div
      style={{
        background: 'rgba(6, 18, 14, 0.88)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderRadius: '20px',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 22px 54px rgba(0, 0, 0, 0.6)',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.95rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Continuous Telemetry Scanner Line */}
      {!pauseMotion && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(56, 189, 248, 0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            ref={topScanRef}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '28%',
              left: '-20%',
              background: 'linear-gradient(90deg, transparent, #38BDF8, #34D399, transparent)',
            }}
          />
        </div>
      )}

      {/* Top Mission Control Audit Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
        }}
      >
        <div
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(56, 189, 248, 0.14)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38BDF8',
            padding: '0.28rem 0.7rem',
            borderRadius: '9999px',
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          <ShieldCheck size={13} />
          QA PASS • INDEPENDENT REPRODUCIBILITY AUDIT
        </div>

        <div
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.66rem',
            fontWeight: 700,
            color: '#34D399',
          }}
        >
          <span
            ref={headerDotRef}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              background: '#34D399',
              boxShadow: '0 0 10px #34D399',
              display: 'inline-block',
            }}
          />
          LIVE DIGITAL TELEMETRY
        </div>
      </div>

      {/* The 4 Animated Digital Pie & Pie-Bar Telemetry Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {FOUR_DASHBOARD_CARDS.map((card, idx) => {
          const IconComp = card.icon;
          const isSelected = selectedCardId === card.id;
          return (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedCardId(card.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCardId(card.id);
                }
              }}
              onMouseEnter={() => setSelectedCardId(card.id)}
              className={`interactive-glow-card ${inView ? 'card-entrance' : 'journey-card-init'}`}
              style={{
                '--delay': `${0.16 + idx * 0.08}s`,
                '--card-glow': card.glow,
                cursor: 'pointer',
                background: isSelected
                  ? 'rgba(11, 34, 24, 0.92)'
                  : 'rgba(5, 16, 12, 0.85)',
                border: isSelected
                  ? `1.5px solid ${card.accent}`
                  : `1px solid ${card.accent}40`,
                borderRadius: '15px',
                padding: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
                transition: 'border-color 0.25s ease, background 0.25s ease',
              }}
            >
              {/* Card Top: Donut Pie Ring + Big Telemetry Figure */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.32rem',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      color: card.accent,
                      letterSpacing: '0.05em',
                    }}
                  >
                    <IconComp size={12} />
                    {card.tag}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '1.42rem',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      lineHeight: 1.15,
                      marginTop: '0.2rem',
                    }}
                  >
                    {card.value}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.78)' }}>
                    {card.sub}
                  </div>
                </div>

                {/* Live Orbiting Circular Pie Chart */}
                <DonutPieGauge
                  segments={card.pieSegments}
                  size={68}
                  strokeWidth={5.8}
                  centerValue={card.pieCenter}
                  centerSub={card.pieSub}
                  accent={card.accent}
                  animDelay={`${idx * 0.45}s`}
                  pauseMotion={pauseMotion}
                />
              </div>

              {/* Card Bottom: Multi-Segment Digital Pie-Bar */}
              <div>
                <SegmentedPieBar
                  segments={card.barSegments}
                  height={8}
                  animDelay={`${idx * 0.45}s`}
                  pauseMotion={pauseMotion}
                />
                <div
                  style={{
                    fontSize: '0.62rem',
                    color: 'rgba(203, 213, 225, 0.74)',
                    marginTop: '0.35rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {card.barFootnote}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Live BARC AEZ-26 Multi-Segment Pie-Bar Strip */}
      <div
        style={{
          background: 'rgba(4, 14, 10, 0.75)',
          border: '1px solid rgba(52, 211, 153, 0.22)',
          borderRadius: '14px',
          padding: '0.8rem 0.95rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
            gap: '0.4rem',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF' }}>
            <Activity size={13} color="#34D399" />
            BARC AEZ-26 Agronomic Suitability Breakdown
          </span>
          <span className="mono" style={{ fontSize: '0.62rem', fontWeight: 700, color: activeCard.accent }}>
            FOCUS: {activeCard.tag}
          </span>
        </div>

        {/* Continuous Shimmering 4-Crop Pie-Bar Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '0.65rem',
          }}
        >
          {CROP_SUITABILITY_BARS.map((crop, cIdx) => (
            <div key={crop.name}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  marginBottom: '0.24rem',
                }}
              >
                <span style={{ color: 'rgba(226, 232, 240, 0.86)' }}>{crop.name}</span>
                <span className="mono" style={{ color: crop.color }}>{crop.pct}%</span>
              </div>
              <SegmentedPieBar
                segments={[{ label: crop.name, pct: crop.pct, color: crop.color }]}
                height={7}
                animDelay={`${cIdx * 0.35}s`}
                pauseMotion={pauseMotion}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
