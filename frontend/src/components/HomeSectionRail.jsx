import React, { useEffect, useState } from 'react';
import { useAgriSense } from '../context/AgriSenseContext';

const HOME_SECTIONS = [
  { id: 'hero', num: '01', label: 'Hero Twin' },
  { id: 'journey', num: '02', label: 'Journey' },
  { id: 'digital-twin', num: '03', label: 'Digital Twin' },
  { id: 'challenge', num: '04', label: 'Challenge' },
  { id: 'science', num: '05', label: 'Science M1–M6' },
  { id: 'impact', num: '06', label: 'Impact' },
  { id: 'preview', num: '07', label: 'Spatial HUD' },
  { id: 'explorer', num: '08', label: 'BD Explorer' },
  { id: 'final-cta', num: '09', label: 'Launch' },
];

const METHODS_SECTIONS = [
  { id: 'methods-subsystems', num: '01', label: 'Subsystems' },
  { id: 'methods-walkthrough', num: '02', label: 'Field Story' },
  { id: 'methods-validation', num: '03', label: 'Validation' },
  { id: 'methods-equations', num: '04', label: 'Equations' },
  { id: 'methods-architecture', num: '05', label: 'Architecture' },
  { id: 'methods-limits', num: '06', label: 'Limits' },
  { id: 'methods-learn', num: '07', label: 'Learn & Quiz' },
];

/** Top full-width loading/scroll progress bar across Home and /app/* pages with section markers. */
export default function HomeSectionRail() {
  const { viewMode, activeTab, pauseMotion } = useAgriSense();
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredSec, setHoveredSec] = useState(null);

  const sections = viewMode === 'home'
    ? HOME_SECTIONS
    : activeTab === 'methods'
      ? METHODS_SECTIONS
      : [];

  useEffect(() => {
    let rafId = 0;
    const updateScrollState = () => {
      rafId = 0;
      const docEl = document.documentElement;
      const scrollTop = window.scrollY || docEl.scrollTop || 0;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      setProgress(pct);

      if (sections.length === 0) {
        setActiveIndex(0);
        return;
      }

      let currentIdx = 0;
      const probeY = scrollTop + window.innerHeight * 0.35;
      for (let i = 0; i < sections.length; i += 1) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= probeY) {
          currentIdx = i;
        }
      }
      setActiveIndex(currentIdx);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [viewMode, activeTab, sections]);

  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: pauseMotion ? 'auto' : 'smooth', block: 'start' });
    }
    if (viewMode === 'home' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `/#${id}`);
    }
  };

  return (
    <div
      className="home-top-progress no-print"
      role="navigation"
      aria-label={sections.length > 0 ? 'Page Scroll Progress and Section Navigation' : 'Page Scroll Progress'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        height: sections.length > 0 ? '12px' : '4px',
        pointerEvents: sections.length > 0 ? 'auto' : 'none',
      }}
    >
      {/* Track background right along top edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(15, 23, 20, 0.72)',
          backdropFilter: 'blur(6px)',
          overflow: 'hidden',
        }}
      >
        {/* Glowing horizontal loading-style fill */}
        <div
          style={{
            height: '100%',
            width: `${Math.max(4, progress)}%`,
            background: 'linear-gradient(90deg, #10B981 0%, #34D399 48%, #38BDF8 80%, #F2C879 100%)',
            boxShadow: '0 0 14px rgba(52, 211, 153, 0.85), 0 0 6px rgba(56, 189, 248, 0.7)',
            transition: pauseMotion ? 'none' : 'width 0.08s linear',
          }}
        />
      </div>

      {/* Clickable Interactive Section Ticks along the top bar */}
      {sections.map((sec, idx) => {
        const leftPct = sections.length > 1 ? (idx / (sections.length - 1)) * 96 + 2 : 50;
        const isReached = idx <= activeIndex;
        const isHovered = hoveredSec?.id === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => jumpTo(sec.id)}
            onMouseEnter={() => setHoveredSec({ ...sec, leftPct })}
            onMouseLeave={() => setHoveredSec(null)}
            onFocus={() => setHoveredSec({ ...sec, leftPct })}
            onBlur={() => setHoveredSec(null)}
            aria-label={`Jump to Section ${sec.num}: ${sec.label}`}
            style={{
              position: 'absolute',
              top: 0,
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
              width: '28px',
              height: '12px',
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                width: isHovered ? '10px' : isReached ? '6px' : '4px',
                height: isHovered ? '6px' : '4px',
                borderRadius: '0 0 4px 4px',
                background: isHovered ? '#F2C879' : isReached ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                boxShadow: isHovered ? '0 0 8px rgba(242, 200, 121, 0.9)' : 'none',
                transition: 'all 0.15s ease',
              }}
            />
          </button>
        );
      })}

      {/* Hover Tooltip Pill */}
      {hoveredSec && (
        <div
          style={{
            position: 'fixed',
            top: '14px',
            left: `clamp(70px, ${hoveredSec.leftPct}%, calc(100vw - 110px))`,
            transform: 'translateX(-50%)',
            padding: '0.24rem 0.65rem',
            borderRadius: '9999px',
            background: 'rgba(8, 13, 11, 0.94)',
            border: '1px solid rgba(52, 211, 153, 0.45)',
            color: '#F8FAFC',
            fontSize: '0.68rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
          }}
        >
          <span className="mono" style={{ color: '#34D399', marginRight: '0.35rem' }}>{hoveredSec.num}</span>
          {hoveredSec.label}
        </div>
      )}
    </div>
  );
}
