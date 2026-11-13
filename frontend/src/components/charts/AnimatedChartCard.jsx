import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AlertCircle, BarChart3, Loader2, Table2 } from 'lucide-react';
import ProvenanceBadge from '../ProvenanceBadge';

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.body.classList.contains('pause-motion')
  );
}

/**
 * Reveal-once intersection observer hook that triggers GSAP animations when
 * the chart card enters the viewport and respects reduced-motion preferences.
 */
export function useInViewportMotion(ref) {
  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(prefersReducedMotion());
    mq.addEventListener?.('change', sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mq.removeEventListener?.('change', sync);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || entered) return undefined;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setEntered(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEntered(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, entered, reduced]);

  return { entered, reduced };
}

/**
 * Smooth GSAP numeric counter for computed metrics, snapping immediately when reduced motion is active.
 */
export function AnimatedCounter({ value, decimals = 1, prefix = '', suffix = '' }) {
  const num = Number(value);
  const valid = Number.isFinite(num);
  const [display, setDisplay] = useState(() => (valid ? num : 0));
  const proxyRef = useRef({ v: 0 });

  useEffect(() => {
    if (!valid) return undefined;
    if (prefersReducedMotion()) {
      setDisplay(num);
      proxyRef.current.v = num;
      return undefined;
    }
    const tween = gsap.to(proxyRef.current, {
      v: num,
      duration: 0.85,
      ease: 'power2.out',
      onUpdate: () => setDisplay(proxyRef.current.v),
    });
    return () => tween.kill();
  }, [num, valid]);

  if (!valid) return <span>--</span>;
  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * Reusable analytical visualization card shell with Reveal animation, source badge,
 * and honest loading / empty / unavailable state handling.
 */
export default function AnimatedChartCard({
  title,
  subtitle,
  unit,
  badgeType = 'MODEL-DERIVED',
  badgeLabel,
  source,
  provenanceNote,
  loading = false,
  unavailableMessage = '',
  empty = false,
  headerRight = null,
  tableColumns = null,
  tableRows = null,
  children,
}) {
  const cardRef = useRef(null);
  const { entered, reduced } = useInViewportMotion(cardRef);
  const [viewMode, setViewMode] = useState('chart');
  const hasTable = Array.isArray(tableColumns) && tableColumns.length > 0 && Array.isArray(tableRows) && tableRows.length > 0;

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !entered || reduced) return undefined;
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' }
    );
    return () => tween.kill();
  }, [entered, reduced]);

  return (
    <div
      ref={cardRef}
      className="card"
      style={{
        padding: '1.2rem 1.4rem',
        opacity: entered || reduced ? 1 : 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.95rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0 }}>
              {title}
            </h3>
            {unit && (
              <span className="mono" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem', borderRadius: '6px', background: 'var(--bg-alt)', color: 'var(--accent-water)', border: '1px solid var(--border-subtle)' }}>
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {hasTable && !loading && !unavailableMessage && !empty && (
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'chart' ? 'table' : 'chart'))}
              aria-pressed={viewMode === 'table'}
              className="btn btn-secondary"
              style={{ padding: '0.24rem 0.62rem', fontSize: '0.7rem', gap: '0.3rem' }}
            >
              {viewMode === 'table' ? <BarChart3 size={12} /> : <Table2 size={12} />}
              <span>{viewMode === 'table' ? 'Show Chart' : 'Show Table'}</span>
            </button>
          )}
          {headerRight}
          {badgeLabel && <ProvenanceBadge type={badgeType} label={badgeLabel} source={source} compact />}
        </div>
      </div>

      {loading ? (
        <div
          className="surface"
          style={{ padding: '2.2rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}
        >
          <Loader2 size={16} className="water-spin" />
          <span>Loading hydrological series...</span>
        </div>
      ) : unavailableMessage ? (
        <div
          className="surface"
          style={{
            padding: '1.15rem 1.25rem',
            borderLeft: '4px solid var(--accent-amber)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <AlertCircle size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
          <div>{unavailableMessage}</div>
        </div>
      ) : empty ? (
        <div className="surface" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No verified records available for this window.
        </div>
      ) : viewMode === 'table' && hasTable ? (
        <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
          <table>
            <caption className="visually-hidden">{title} tabular view</caption>
            <thead>
              <tr>
                {tableColumns.map((col) => (
                  <th key={col.key} scope="col" style={{ textAlign: col.align || 'left' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={row.id || row.key || idx}>
                  {tableColumns.map((col) => {
                    const raw = row[col.key];
                    const formatted = col.format ? col.format(raw, row) : raw ?? '—';
                    return (
                      <td
                        key={col.key}
                        className={col.align === 'right' || col.mono ? 'mono' : undefined}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children({ animateKey: entered })
      )}

      {provenanceNote && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.71rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>
          {provenanceNote}
        </div>
      )}
    </div>
  );
}
