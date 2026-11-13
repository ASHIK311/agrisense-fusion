import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import AnimatedChartCard, { prefersReducedMotion } from './AnimatedChartCard';

/**
 * Computes contiguous SVG path segments so null / missing points break the line
 * visibly instead of silently interpolating across missing periods.
 */
function buildSegmentedPaths(points, getX, getY) {
  const segments = [];
  let current = [];
  points.forEach((pt, idx) => {
    if (pt.center === null || pt.center === undefined || !Number.isFinite(pt.center)) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    } else {
      current.push({ ...pt, x: getX(idx), y: getY(pt.center), yLow: getY(pt.low), yHigh: getY(pt.high) });
    }
  });
  if (current.length > 0) segments.push(current);
  return segments;
}

function UncertaintyBandBody({
  data,
  unit,
  centerLabel,
  bandLabel,
  accent,
  decimals,
  animateKey,
}) {
  const lineRefs = useRef([]);
  const bandRefs = useRef([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const gradId = useId().replace(/:/g, '');

  const width = 760;
  const height = 250;
  const pad = { top: 22, right: 20, bottom: 38, left: 50 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { minVal, maxVal, segments, missingPoints, allMapped } = useMemo(() => {
    const validNumbers = [];
    data.forEach((d) => {
      if (Number.isFinite(d.center)) validNumbers.push(d.center);
      if (Number.isFinite(d.low)) validNumbers.push(d.low);
      if (Number.isFinite(d.high)) validNumbers.push(d.high);
    });
    const rawMin = validNumbers.length ? Math.min(...validNumbers) : 0;
    const rawMax = validNumbers.length ? Math.max(...validNumbers) : 10;
    const margin = (rawMax - rawMin || 1) * 0.12;
    const minV = rawMin - margin;
    const maxV = rawMax + margin;
    const span = maxV - minV || 1;

    const getX = (i) => pad.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const getY = (v) => pad.top + plotH - ((v - minV) / span) * plotH;

    const normalized = data.map((d) => ({
      ...d,
      low: Number.isFinite(d.low) ? d.low : d.center,
      high: Number.isFinite(d.high) ? d.high : d.center,
    }));

    const segs = buildSegmentedPaths(normalized, getX, getY);
    const missing = normalized
      .map((d, idx) => ({ ...d, idx, x: getX(idx) }))
      .filter((d) => !Number.isFinite(d.center));

    const mapped = normalized.map((d, idx) => ({
      ...d,
      idx,
      x: getX(idx),
      y: Number.isFinite(d.center) ? getY(d.center) : null,
      yLow: Number.isFinite(d.low) ? getY(d.low) : null,
      yHigh: Number.isFinite(d.high) ? getY(d.high) : null,
    }));

    return { minVal: minV, maxVal: maxV, segments: segs, missingPoints: missing, allMapped: mapped };
  }, [data, plotH, plotW, pad.left, pad.top]);

  useEffect(() => {
    if (!animateKey) return undefined;
    const lines = lineRefs.current.filter(Boolean);
    const bands = bandRefs.current.filter(Boolean);
    if (prefersReducedMotion()) {
      lines.forEach((l) => {
        l.style.strokeDasharray = 'none';
        l.style.strokeDashoffset = '0';
      });
      bands.forEach((b) => {
        b.style.opacity = '1';
      });
      return undefined;
    }
    const ctx = gsap.context(() => {
      lines.forEach((l) => {
        const len = l.getTotalLength?.() || 600;
        gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(l, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out' });
      });
      bands.forEach((b) => {
        gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.75, delay: 0.15, ease: 'power2.out' });
      });
    });
    return () => ctx.revert();
  }, [animateKey, data]);

  const handlePointerMove = (e) => {
    if (!allMapped.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * width;
    let best = 0;
    let bestD = Infinity;
    allMapped.forEach((pt, idx) => {
      const d = Math.abs(pt.x - svgX);
      if (d < bestD) {
        bestD = d;
        best = idx;
      }
    });
    setHoverIdx(best);
  };

  const hovered = hoverIdx !== null ? allMapped[hoverIdx] : null;
  const xTickStep = Math.max(1, Math.floor(allMapped.length / 6));

  return (
    <div style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '16px', height: '2.5px', background: accent, borderRadius: '2px' }} />
          {centerLabel}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '14px', height: '10px', background: accent, opacity: 0.24, borderRadius: '2px', border: `1px solid ${accent}` }} />
          {bandLabel}
        </span>
        {missingPoints.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-amber)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px dashed var(--accent-amber)' }} />
            Missing / -999 gap ({missingPoints.length})
          </span>
        )}
      </div>

      <div className="surface" style={{ padding: '0.75rem', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${centerLabel} with ${bandLabel}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIdx(null)}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        >
          <defs>
            <linearGradient id={`bandGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {/* Horizontal Y gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = pad.top + plotH * (1 - t);
            const val = minVal + (maxVal - minVal) * t;
            return (
              <g key={t}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <text x={pad.left - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="var(--text-dim)" className="mono">
                  {val.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {/* Shaded Dispersion Band + Center Line per contiguous segment */}
          {segments.map((seg, sIdx) => {
            const lineD = seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const upper = seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yHigh.toFixed(1)}`).join(' ');
            const lower = [...seg].reverse().map((p) => `L ${p.x.toFixed(1)} ${p.yLow.toFixed(1)}`).join(' ');
            const bandD = `${upper} ${lower} Z`;

            return (
              <g key={sIdx}>
                <path
                  ref={(el) => {
                    bandRefs.current[sIdx] = el;
                  }}
                  d={bandD}
                  fill={`url(#bandGrad-${gradId})`}
                />
                <path
                  ref={(el) => {
                    lineRefs.current[sIdx] = el;
                  }}
                  d={lineD}
                  fill="none"
                  stroke={accent}
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Missing Data Gap Markers */}
          {missingPoints.map((mp) => (
            <g key={`miss-${mp.idx}`}>
              <line
                x1={mp.x}
                y1={pad.top}
                x2={mp.x}
                y2={pad.top + plotH}
                stroke="var(--accent-amber)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.55"
              />
              <circle
                cx={mp.x}
                cy={pad.top + plotH / 2}
                r="4"
                fill="var(--bg-canvas)"
                stroke="var(--accent-amber)"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* X Axis Labels */}
          {allMapped.map((pt, idx) => {
            if (idx % xTickStep !== 0 && idx !== allMapped.length - 1) return null;
            return (
              <text
                key={`xt-${idx}`}
                x={pt.x}
                y={height - 10}
                textAnchor={idx === 0 ? 'start' : idx === allMapped.length - 1 ? 'end' : 'middle'}
                fontSize="9.5"
                fill="var(--text-dim)"
                className="mono"
              >
                {pt.label}
              </text>
            );
          })}

          {/* Hover Crosshair */}
          {hovered && (
            <g>
              <line
                x1={hovered.x}
                y1={pad.top}
                x2={hovered.x}
                y2={pad.top + plotH}
                stroke="var(--text-muted)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {hovered.y !== null && (
                <>
                  <circle cx={hovered.x} cy={hovered.yHigh} r="3" fill={accent} opacity="0.65" />
                  <circle cx={hovered.x} cy={hovered.yLow} r="3" fill={accent} opacity="0.65" />
                  <circle cx={hovered.x} cy={hovered.y} r="4.8" fill={accent} stroke="var(--bg-surface)" strokeWidth="2" />
                </>
              )}
            </g>
          )}
        </svg>

        {/* Accessible Hover Readout Bar */}
        <div
          className="mono"
          style={{
            marginTop: '0.45rem',
            padding: '0.35rem 0.6rem',
            borderRadius: '6px',
            background: 'var(--bg-alt)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {hovered ? (
            hovered.center !== null && Number.isFinite(hovered.center) ? (
              <>
                <span><strong>{hovered.label}</strong></span>
                <span>
                  {centerLabel}: <strong style={{ color: accent }}>{hovered.center.toFixed(decimals)} {unit}</strong> •{' '}
                  {bandLabel}: <strong>{hovered.low.toFixed(decimals)} – {hovered.high.toFixed(decimals)} {unit}</strong>
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--accent-amber)' }}>
                <strong>{hovered.label}</strong>: Missing / -999 observation (not interpolated)
              </span>
            )
          ) : (
            <span>Hover over any point to inspect exact values and dispersion bounds ({allMapped.length} steps)</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Scientific Uncertainty & Dispersion Band Chart with built-in Chart <-> Table toggle.
 * Expects data items shaped as { label, center, low, high }.
 */
export default function UncertaintyBandChart({
  title,
  subtitle,
  unit = '',
  badgeType = 'NASA POWER',
  badgeLabel = 'UNCERTAINTY BAND',
  source = '',
  provenanceNote = '',
  data = [],
  centerLabel = 'Mean / Value',
  bandLabel = 'Dispersion Band',
  accent = '#38BDF8',
  decimals = 1,
}) {
  const tableColumns = useMemo(
    () => [
      { key: 'label', label: 'Period / Step' },
      { key: 'center', label: `${centerLabel} (${unit})`, align: 'right', format: (v) => (Number.isFinite(v) ? v.toFixed(decimals) : 'MISSING (-999)') },
      { key: 'low', label: `Lower (${unit})`, align: 'right', format: (v) => (Number.isFinite(v) ? v.toFixed(decimals) : '—') },
      { key: 'high', label: `Upper (${unit})`, align: 'right', format: (v) => (Number.isFinite(v) ? v.toFixed(decimals) : '—') },
    ],
    [centerLabel, decimals, unit]
  );

  return (
    <AnimatedChartCard
      title={title}
      subtitle={subtitle}
      unit={unit}
      badgeType={badgeType}
      badgeLabel={badgeLabel}
      source={source}
      provenanceNote={provenanceNote}
      empty={!data || data.length === 0}
      tableColumns={tableColumns}
      tableRows={data}
    >
      {({ animateKey }) => (
        <UncertaintyBandBody
          data={data}
          unit={unit}
          centerLabel={centerLabel}
          bandLabel={bandLabel}
          accent={accent}
          decimals={decimals}
          animateKey={animateKey}
        />
      )}
    </AnimatedChartCard>
  );
}
