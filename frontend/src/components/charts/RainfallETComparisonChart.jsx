import React, { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import AnimatedChartCard, { prefersReducedMotion, AnimatedCounter } from './AnimatedChartCard';

function estimateEt0Simple(rec) {
  if (Number.isFinite(rec?.et0_mm)) return rec.et0_mm;
  const tMax = Number(rec?.t2m_max ?? rec?.t_max ?? (rec?.t2m ? rec.t2m + 4 : 33));
  const tMin = Number(rec?.t2m_min ?? rec?.t_min ?? (rec?.t2m ? rec.t2m - 4 : 24));
  const tMean = (tMax + tMin) / 2;
  const rs = Number(rec?.solar_mj_m2 ?? rec?.solar_mj ?? rec?.solar_radiation_mj ?? 18.5);
  // Hargreaves-calibrated proxy matching Barind radiation demand when daily NASA ET0 isn't stored per row
  return Number(Math.max(1.2, 0.0023 * (tMean + 17.8) * Math.sqrt(Math.max(1, tMax - tMin)) * (rs * 0.408)).toFixed(2));
}

function buildSvgLinePath(points, width, height, pad, maxVal) {
  if (!points.length) return { line: '', area: '', coords: [] };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const coords = points.map((v, idx) => {
    const x = pad.left + (points.length === 1 ? plotW / 2 : (idx / (points.length - 1)) * plotW);
    const y = pad.top + plotH - (Math.max(0, v) / maxVal) * plotH;
    return { x, y, val: v };
  });
  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bottomY = (pad.top + plotH).toFixed(1);
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY} L ${coords[0].x.toFixed(1)} ${bottomY} Z`;
  return { line, area, coords };
}

function ComparisonChartBody({ series, animateKey, hoverIdx, setHoverIdx, kc }) {
  const et0PathRef = useRef(null);
  const etcPathRef = useRef(null);
  const areaRef = useRef(null);
  const barRefs = useRef([]);
  const et0DotRef = useRef(null);
  const et0HaloRef = useRef(null);
  const etcDotRef = useRef(null);
  const beaconRef = useRef(null);
  const scanBeamRef = useRef(null);

  const width = 680;
  const height = 250;
  const pad = { top: 20, right: 20, bottom: 34, left: 42 };

  const et0Vals = series.map((d) => d.et0);
  const etcVals = series.map((d) => Number((d.et0 * kc).toFixed(2)));
  const rainVals = series.map((d) => d.rain);
  const peakVal = Math.max(2.5, ...et0Vals, ...etcVals, ...rainVals);
  const maxVal = Number((peakVal * 1.24).toFixed(1));

  const et0Geom = useMemo(() => buildSvgLinePath(et0Vals, width, height, pad, maxVal), [et0Vals, maxVal]);
  const etcGeom = useMemo(() => buildSvgLinePath(etcVals, width, height, pad, maxVal), [etcVals, maxVal]);
  const plotH = height - pad.top - pad.bottom;

  useEffect(() => {
    if (!animateKey) return undefined;
    const paused = typeof document !== 'undefined' && document.body.classList.contains('pause-motion');
    const paths = [et0PathRef.current, etcPathRef.current].filter(Boolean);

    if (paused) {
      paths.forEach((p) => {
        p.style.strokeDasharray = 'none';
        p.style.strokeDashoffset = '0';
      });
      if (areaRef.current) areaRef.current.style.opacity = '1';
      barRefs.current.forEach((b) => {
        if (b) b.style.transform = 'scaleY(1)';
      });
      return undefined;
    }

    const ctx = gsap.context(() => {
      // 1. Initial path-length reveal + staggered bars
      paths.forEach((p, idx) => {
        const len = p.getTotalLength?.() || 600;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(p, {
          strokeDashoffset: 0,
          duration: 0.95,
          delay: idx * 0.1,
          ease: 'power2.out',
          onComplete: () => {
            p.style.strokeDasharray = idx === 1 ? '6 3' : 'none';
          },
        });
      });

      if (areaRef.current) {
        gsap.fromTo(areaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.85, delay: 0.15, ease: 'power1.out' });
      }

      const validBars = barRefs.current.filter(Boolean);
      if (validBars.length) {
        gsap.fromTo(
          validBars,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.65, stagger: 0.035, ease: 'power3.out' }
        );
      }

      // 2. Continuous GSAP live travelling beacon dots along ET0 & ETc paths
      if (et0PathRef.current && et0DotRef.current && et0HaloRef.current) {
        const len = et0PathRef.current.getTotalLength?.() || 0;
        if (len > 0) {
          const proxy = { t: 0 };
          gsap.to(proxy, {
            t: 1,
            duration: 3.8,
            repeat: -1,
            ease: 'none',
            onUpdate: () => {
              const pt = et0PathRef.current?.getPointAtLength(proxy.t * len);
              if (pt && et0DotRef.current && et0HaloRef.current) {
                et0DotRef.current.setAttribute('cx', pt.x.toFixed(1));
                et0DotRef.current.setAttribute('cy', pt.y.toFixed(1));
                et0HaloRef.current.setAttribute('cx', pt.x.toFixed(1));
                et0HaloRef.current.setAttribute('cy', pt.y.toFixed(1));
              }
            },
          });
        }
      }

      if (etcPathRef.current && etcDotRef.current) {
        const len = etcPathRef.current.getTotalLength?.() || 0;
        if (len > 0) {
          const proxy = { t: 0 };
          gsap.to(proxy, {
            t: 1,
            duration: 4.4,
            delay: 0.6,
            repeat: -1,
            ease: 'none',
            onUpdate: () => {
              const pt = etcPathRef.current?.getPointAtLength(proxy.t * len);
              if (pt && etcDotRef.current) {
                etcDotRef.current.setAttribute('cx', pt.x.toFixed(1));
                etcDotRef.current.setAttribute('cy', pt.y.toFixed(1));
              }
            },
          });
        }
      }

      // 3. Continuous pulsing endpoint radar ring
      if (beaconRef.current) {
        gsap.fromTo(
          beaconRef.current,
          { attr: { r: 4 }, opacity: 0.95 },
          { attr: { r: 15 }, opacity: 0, duration: 1.7, repeat: -1, ease: 'power1.out' }
        );
      }

      // 4. Subtle continuous horizontal scan beam across chart window
      if (scanBeamRef.current) {
        gsap.fromTo(
          scanBeamRef.current,
          { attr: { x: pad.left }, opacity: 0.35 },
          { attr: { x: width - pad.right - 28 }, opacity: 0.12, duration: 5.5, repeat: -1, ease: 'sine.inOut', yoyo: true }
        );
      }
    });

    return () => ctx.revert();
  }, [animateKey, series]);

  const activePoint = hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : series[series.length - 1];
  const barWidth = Math.max(8, Math.min(26, ((width - pad.left - pad.right) / Math.max(1, series.length)) * 0.42));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', marginBottom: '0.9rem' }}>
        <div className="surface" style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>WINDOW RAINFALL SUM</div>
          <div className="mono" style={{ fontSize: '1.12rem', fontWeight: 800, color: '#38bdf8' }}>
            <AnimatedCounter value={rainVals.reduce((a, b) => a + b, 0)} decimals={1} suffix=" mm" />
          </div>
        </div>
        <div className="surface" style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>AVG REFERENCE ET₀</div>
          <div className="mono" style={{ fontSize: '1.12rem', fontWeight: 800, color: '#fbbf24' }}>
            <AnimatedCounter value={et0Vals.reduce((a, b) => a + b, 0) / Math.max(1, et0Vals.length)} decimals={2} suffix=" mm/d" />
          </div>
        </div>
        <div className="surface" style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>EST. CROP DEMAND ETc (Kc={kc})</div>
          <div className="mono" style={{ fontSize: '1.12rem', fontWeight: 800, color: '#34d399' }}>
            <AnimatedCounter value={etcVals.reduce((a, b) => a + b, 0) / Math.max(1, etcVals.length)} decimals={2} suffix=" mm/d" />
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: '0.75rem', position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rainfall vs ET0 and ETc comparison chart" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="wsEtAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="wsScanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = pad.top + plotH * (1 - t);
            const val = (maxVal * t).toFixed(1);
            return (
              <g key={t}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 3" />
                <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-muted)" className="mono">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Vertical Sweeping Scan Beam */}
          <rect
            ref={scanBeamRef}
            x={pad.left}
            y={pad.top}
            width={28}
            height={plotH}
            fill="url(#wsScanGrad)"
            pointerEvents="none"
          />

          {/* Rainfall Bars */}
          {et0Geom.coords.map((pt, idx) => {
            const rainH = (Math.max(0, series[idx].rain) / maxVal) * plotH;
            const y = pad.top + plotH - rainH;
            return (
              <rect
                key={series[idx].date || idx}
                ref={(el) => {
                  barRefs.current[idx] = el;
                }}
                x={pt.x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(1, rainH)}
                rx="3"
                fill="rgba(56, 189, 248, 0.45)"
                stroke="rgba(56, 189, 248, 0.85)"
                strokeWidth="0.75"
              />
            );
          })}

          {/* ET0 Area & Path + GSAP Live Travelling Pulse Beads */}
          <path ref={areaRef} d={et0Geom.area} fill="url(#wsEtAreaGrad)" />
          <path ref={et0PathRef} d={et0Geom.line} fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={etcPathRef} d={etcGeom.line} fill="none" stroke="#34d399" strokeWidth="2.1" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" />

          {et0Geom.coords.length > 0 && (
            <g pointerEvents="none">
              <circle ref={et0HaloRef} cx={et0Geom.coords[0].x} cy={et0Geom.coords[0].y} r="9" fill="rgba(251, 191, 36, 0.28)" />
              <circle ref={et0DotRef} cx={et0Geom.coords[0].x} cy={et0Geom.coords[0].y} r="4.2" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.5" />
              <circle ref={etcDotRef} cx={etcGeom.coords[0].x} cy={etcGeom.coords[0].y} r="3.8" fill="#a7f3d0" stroke="#10b981" strokeWidth="1.4" />
              <circle
                ref={beaconRef}
                cx={et0Geom.coords[et0Geom.coords.length - 1].x}
                cy={et0Geom.coords[et0Geom.coords.length - 1].y}
                r="5"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.8"
              />
            </g>
          )}

          {/* Interactive Hover Points & X-axis labels */}
          {et0Geom.coords.map((pt, idx) => {
            const isActive = hoverIdx === idx;
            const showLabel = series.length <= 8 || idx === 0 || idx === series.length - 1 || idx % Math.ceil(series.length / 5) === 0;
            return (
              <g key={`pt-${idx}`}>
                {isActive && (
                  <line x1={pt.x} y1={pad.top} x2={pt.x} y2={pad.top + plotH} stroke="rgba(248, 250, 252, 0.35)" strokeWidth="1" />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 5 : 3}
                  fill="#fbbf24"
                  stroke="#040914"
                  strokeWidth="1.4"
                />
                <rect
                  x={pt.x - 14}
                  y={pad.top}
                  width={28}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
                {showLabel && (
                  <text x={pt.x} y={height - 10} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)" className="mono">
                    {String(series[idx].date || '').slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Bottom Legend & Live Crosshair Tooltip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.55rem', fontSize: '0.74rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#38bdf8', marginRight: 5 }} />Rainfall (mm)</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#fbbf24', marginRight: 5, verticalAlign: 'middle' }} />Reference ET₀</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#34d399', marginRight: 5, verticalAlign: 'middle' }} />Crop ETc</span>
          </div>
          {activePoint && (
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-water)', fontWeight: 700 }}>
              {activePoint.date}: Rain {activePoint.rain} mm • ET₀ {activePoint.et0} mm • Net {(activePoint.rain - activePoint.et0).toFixed(1)} mm
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RainfallETComparisonChart({
  weatherHistory = [],
  forecastData = null,
  forecastLoading = false,
  kc = 1.15,
}) {
  const [mode, setMode] = useState('nasa'); // 'nasa' | 'forecast'
  const [hoverIdx, setHoverIdx] = useState(null);

  const nasaSeries = useMemo(() => {
    const slice = weatherHistory.slice(-10);
    return slice.map((r) => ({
      date: r.date || '--',
      rain: Number((r.precip_mm ?? r.rainfall ?? 0).toFixed(2)),
      et0: estimateEt0Simple(r),
    }));
  }, [weatherHistory]);

  const forecastSeries = useMemo(() => {
    if (!forecastData?.available || !Array.isArray(forecastData.records)) return [];
    return forecastData.records.map((r) => ({
      date: r.date,
      rain: Number((r.precip_mm ?? 0).toFixed(2)),
      et0: Number((r.et0_mm ?? 0).toFixed(2)),
    }));
  }, [forecastData]);

  const activeSeries = mode === 'forecast' ? forecastSeries : nasaSeries;
  const isForecastUnavailable = mode === 'forecast' && !forecastLoading && !forecastData?.available;

  return (
    <AnimatedChartCard
      title="Rainfall vs. Atmospheric & Crop Water Demand (ET₀ / ETc)"
      subtitle={
        mode === 'forecast'
          ? 'Open-Meteo 7-Day NWP precipitation outlook vs FAO reference evapotranspiration'
          : 'NASA POWER recent agroclimatology rainfall vs atmospheric & crop demand'
      }
      unit="mm / day"
      badgeType={mode === 'forecast' ? 'MODEL-DERIVED' : 'NASA POWER'}
      badgeLabel={mode === 'forecast' ? 'OPEN-METEO 7D NWP' : 'NASA POWER REANALYSIS'}
      source={mode === 'forecast' ? 'Open-Meteo NWP Forecast' : 'NASA POWER AG Archive'}
      loading={mode === 'forecast' && forecastLoading}
      unavailableMessage={
        isForecastUnavailable
          ? `Open-Meteo NWP 7-Day Forecast is currently unreachable (${forecastData?.error || 'offline'}). Switch back to NASA POWER History for cached agroclimatology.`
          : ''
      }
      empty={!activeSeries.length}
      headerRight={
        <div className="seg-group" style={{ background: 'var(--bg-alt)' }}>
          <button
            type="button"
            className={`seg-btn ${mode === 'nasa' ? 'active' : ''}`}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
            onClick={() => {
              setHoverIdx(null);
              setMode('nasa');
            }}
          >
            NASA POWER History
          </button>
          <button
            type="button"
            className={`seg-btn ${mode === 'forecast' ? 'active' : ''}`}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
            onClick={() => {
              setHoverIdx(null);
              setMode('forecast');
            }}
          >
            7-Day NWP Outlook
          </button>
        </div>
      }
      provenanceNote={
        mode === 'forecast'
          ? 'Open-Meteo NWP Forecast is an operational multi-model weather forecast, shown separately from NASA POWER reanalysis.'
          : 'NASA POWER meteorological grid sits at 24.3636°N, 88.6241°E (~34.8 km ESE of Godagari).'
      }
    >
      {({ animateKey }) => (
        <ComparisonChartBody
          series={activeSeries}
          animateKey={animateKey}
          hoverIdx={hoverIdx}
          setHoverIdx={setHoverIdx}
          kc={kc}
        />
      )}
    </AnimatedChartCard>
  );
}
