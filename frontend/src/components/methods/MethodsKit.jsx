import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, CheckCircle2 } from 'lucide-react';
import { prefersReducedMotion } from '../charts/AnimatedChartCard';

/** Editorial chapter header with luminous numeral pill (`01`–`07`), glowing dot, growing hairline rule, and kicker. */
export function EditorialSectionHeader({ num, kicker, title, accentPhrase = '', subtitle = '', accent = 'var(--m-emerald)', tagLabel = 'CHAPTER' }) {
  return (
    <div style={{ marginBottom: '1.35rem', '--chapter-accent': accent }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
        <span className="methods-chapter-badge">
          <span className="methods-chapter-num">{num}</span>
          <span className="methods-kicker-dot" aria-hidden="true" />
          <span
            className="mono"
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-main)',
            }}
          >
            {kicker}
          </span>
        </span>
        <span className="methods-kicker-line" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${accent}, transparent)`, width: '4.5rem' }} />
        <span className="methods-outline-num" aria-hidden="true" style={{ fontSize: '1.35rem', opacity: 0.45, marginLeft: 'auto' }}>
          {tagLabel} {num}
        </span>
      </div>
      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(1.45rem, 2.5vw, 2.15rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.12,
          margin: 0,
          color: 'var(--text-main)',
        }}
      >
        <WordMaskHeadline text={title} />
        {accentPhrase && (
          <>
            {' '}
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: 'var(--m-flare, #fbbf24)' }}>
              {accentPhrase}
            </span>
          </>
        )}
      </h2>
      {subtitle && (
        <p style={{ marginTop: '0.45rem', fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '780px', lineHeight: 1.55 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Word-by-word masked vertical slide-up reveal for headings. */
export function WordMaskHeadline({ text, baseDelay = 0 }) {
  const words = String(text || '').split(' ');
  const reduced = prefersReducedMotion();
  if (reduced) return <span>{text}</span>;

  return (
    <span>
      {words.map((w, idx) => (
        <span key={`${w}-${idx}`} className="methods-word-mask">
          <span
            className="methods-word-inner"
            style={{ '--w-delay': `${(baseDelay + idx * 0.045).toFixed(3)}s` }}
          >
            {w}
            {idx < words.length - 1 ? '\u00A0' : ''}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Subtle cursor-nudged primary button inspired by ShadowAstra's Magnetic control. */
export function MagneticButton({ children, className = 'btn btn-primary', style = {}, onClick, type = 'button', ...rest }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e) => {
    if (prefersReducedMotion() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.16;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.16;
    setOffset({ x: Math.max(-6, Math.min(6, dx)), y: Math.max(-5, Math.min(5, dy)) });
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      className={className}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Circular scroll-progress Back-to-Top button for long Methods & Learn scroll pages. */
export function BackToTopRing() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(1, Math.max(0, window.scrollY / max)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  if (progress <= 0.12) return null;
  const radius = 18;
  const circ = 2 * Math.PI * radius;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
      className="methods-backtotop no-print"
      style={{
        position: 'fixed',
        right: '1.35rem',
        bottom: '5.5rem',
        zIndex: 820,
        width: '44px',
        height: '44px',
        borderRadius: '999px',
        background: 'var(--glass-header-bg)',
        border: '1px solid var(--m-hairline, var(--border-subtle))',
        backdropFilter: 'blur(14px)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-main)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <svg viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="var(--m-flare, #f2c879)"
          strokeWidth="2"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
      <ArrowUp size={15} />
    </button>
  );
}

/** Judge & Reviewer Audit Progress Pill showing which verification gates were inspected. */
export function AuditChecklistPill({ checkedMap = {}, total = 5 }) {
  const completed = Object.values(checkedMap).filter(Boolean).length;
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.28rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 700,
        background: completed === total ? 'rgba(52, 211, 153, 0.16)' : 'var(--bg-alt)',
        border: `1px solid ${completed === total ? 'rgba(52, 211, 153, 0.45)' : 'var(--border-subtle)'}`,
        color: completed === total ? 'var(--m-emerald, #34d399)' : 'var(--text-secondary)',
      }}
    >
      <CheckCircle2 size={12} />
      <span>Audit Trail: {completed}/{total} Verified</span>
    </span>
  );
}
