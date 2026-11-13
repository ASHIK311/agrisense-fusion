import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowUpRight } from 'lucide-react';
import ProvenanceBadge from '../ProvenanceBadge';
import { AnimatedCounter, prefersReducedMotion, useInViewportMotion } from './AnimatedChartCard';

/**
 * Reusable KPI card featuring a GSAP-counted primary figure, an animated SVG
 * sparkline trend, interactive point inspection on hover, and explicit provenance.
 */
export default function AnimatedMetricCard({
  title,
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  unit = '',
  subtitle = '',
  series = [],
  seriesLabel = 'Trend',
  seriesUnit = '',
  accent = 'var(--accent-primary)',
  badgeType = 'MODEL-DERIVED',
  badgeLabel = '',
  source = '',
  icon: Icon = null,
  progressPct = null,
  onClick = null,
  cta = '',
  emptySeriesText = 'No multi-point series available',
  overlay = null,
  subtitleExtra = null,
  className = '',
}) {
  const cardRef = useRef(null);
  const pathRef = useRef(null);
  const areaRef = useRef(null);
  const gradId = useId().replace(/:/g, '');
  const { entered, reduced } = useInViewportMotion(cardRef);
  const [hoverIdx, setHoverIdx] = useState(null);

  const validPoints = useMemo(() => {
    if (!Array.isArray(series)) return [];
    return series
      .map((pt, idx) => {
        if (pt === null || pt === undefined) return null;
        if (typeof pt === 'number') {
          return Number.isFinite(pt) ? { idx, label: `#${idx + 1}`, value: pt } : null;
        }
        const num = Number(pt.value);
        return Number.isFinite(num)
          ? { idx, label: pt.label || pt.date || `#${idx + 1}`, value: num }
          : null;
      })
      .filter(Boolean);
  }, [series]);

  const spark = useMemo(() => {
    const W = 220;
    const H = 46;
    const padX = 4;
    const padY = 5;
    if (validPoints.length < 2) {
      return { W, H, coords: [], lineD: '', areaD: '', min: 0, max: 0 };
    }
    const vals = validPoints.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const coords = validPoints.map((p, i) => {
      const x = padX + (i / (validPoints.length - 1)) * (W - padX * 2);
      const y = padY + (H - padY * 2) - ((p.value - min) / span) * (H - padY * 2);
      return { ...p, x, y };
    });
    const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const baseY = (H - padY).toFixed(1);
    const areaD = `${lineD} L ${coords[coords.length - 1].x.toFixed(1)} ${baseY} L ${coords[0].x.toFixed(1)} ${baseY} Z`;
    return { W, H, coords, lineD, areaD, min, max };
  }, [validPoints]);

  useEffect(() => {
    if (!entered || !pathRef.current || spark.coords.length < 2) return undefined;
    if (reduced || prefersReducedMotion()) {
      pathRef.current.style.strokeDasharray = 'none';
      pathRef.current.style.strokeDashoffset = '0';
      if (areaRef.current) areaRef.current.style.opacity = '1';
      return undefined;
    }
    const len = pathRef.current.getTotalLength?.() || 260;
    const ctx = gsap.context(() => {
      gsap.set(pathRef.current, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(pathRef.current, { strokeDashoffset: 0, duration: 0.85, ease: 'power2.out' });
      if (areaRef.current) {
        gsap.fromTo(areaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.75, delay: 0.12 });
      }
    });
    return () => ctx.revert();
  }, [entered, reduced, spark.lineD, spark.coords.length]);

  const isNumericValue = typeof value === 'number' && Number.isFinite(value);
  const hoveredPt = hoverIdx !== null ? spark.coords[hoverIdx] : null;

  const handleMove = (e) => {
    if (spark.coords.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * spark.W;
    let best = 0;
    let bestDist = Infinity;
    spark.coords.forEach((c, idx) => {
      const d = Math.abs(c.x - relX);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    });
    setHoverIdx(best);
  };

  return (
    <div
      ref={cardRef}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick || undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`card tilt-card${overlay ? ' weather-anim-card' : ''}${className ? ` ${className}` : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '1.05rem 1.2rem',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.55rem',
        borderColor: accent && accent.startsWith('#') ? `${accent}3a` : undefined,
        background:
          accent && accent.startsWith('#')
            ? `radial-gradient(130% 90% at 94% 8%, ${accent}14, transparent 65%), var(--bg-surface)`
            : undefined,
      }}
    >
      {overlay}

      {/* Top Row: Title + Provenance Badge */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {Icon && <Icon size={14} style={{ color: accent, flexShrink: 0 }} />}
          <span>{title}</span>
        </span>
        {badgeLabel && <ProvenanceBadge type={badgeType} label={badgeLabel} source={source} compact />}
      </div>

      {/* Main Value + Subtitle */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="mono" style={{ fontSize: '1.42rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15 }}>
          {isNumericValue ? (
            <>
              <AnimatedCounter value={entered ? value : 0} decimals={decimals} prefix={prefix} suffix={suffix} />
              {unit && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '0.32rem' }}>
                  {unit}
                </span>
              )}
            </>
          ) : (
            <span>
              {value}
              {unit && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '0.32rem' }}>
                  {unit}
                </span>
              )}
            </span>
          )}
        </div>
        {(subtitle || subtitleExtra) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.38rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.24rem', lineHeight: 1.45 }}>
            {subtitleExtra}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>

      {/* Interactive Sparkline or Honest Empty Indicator */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {spark.coords.length >= 2 ? (
          <div
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              background: 'var(--bg-alt)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.35rem 0.5rem 0.28rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: 'var(--text-dim)', marginBottom: '0.15rem' }}>
              <span className="mono" style={{ fontWeight: 600 }}>
                {hoveredPt ? `${hoveredPt.label}: ${hoveredPt.value.toFixed(decimals)}${seriesUnit ? ` ${seriesUnit}` : ''}` : seriesLabel}
              </span>
              <span className="mono">
                {spark.min.toFixed(decimals)}–{spark.max.toFixed(decimals)}{seriesUnit ? ` ${seriesUnit}` : ''}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${spark.W} ${spark.H}`}
              role="img"
              aria-label={`${title} ${seriesLabel} sparkline`}
              style={{ width: '100%', height: '38px', display: 'block', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id={`sparkGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path ref={areaRef} d={spark.areaD} fill={`url(#sparkGrad-${gradId})`} />
              <path
                ref={pathRef}
                d={spark.lineD}
                fill="none"
                stroke={accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {hoveredPt ? (
                <g>
                  <line
                    x1={hoveredPt.x}
                    y1={2}
                    x2={hoveredPt.x}
                    y2={spark.H - 2}
                    stroke="var(--text-dim)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={hoveredPt.x}
                    cy={hoveredPt.y}
                    r="3.6"
                    fill={accent}
                    stroke="var(--bg-surface)"
                    strokeWidth="1.5"
                  />
                </g>
              ) : (
                <circle
                  cx={spark.coords[spark.coords.length - 1].x}
                  cy={spark.coords[spark.coords.length - 1].y}
                  r="2.8"
                  fill={accent}
                />
              )}
            </svg>
          </div>
        ) : (
          <div
            className="mono"
            style={{
              fontSize: '0.67rem',
              color: 'var(--text-dim)',
              padding: '0.35rem 0.55rem',
              background: 'var(--bg-alt)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '8px',
            }}
          >
            {emptySeriesText}
          </div>
        )}
      </div>

      {/* Optional Progress Bar + CTA */}
      {(progressPct !== null || cta) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {progressPct !== null && (
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, progressPct))}%`, height: '100%', background: accent, borderRadius: '999px', transition: 'width 0.35s ease' }} />
            </div>
          )}
          {cta && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 700, color: accent || 'var(--accent-primary)' }}>
              <span>{cta}</span>
              <ArrowUpRight size={13} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
