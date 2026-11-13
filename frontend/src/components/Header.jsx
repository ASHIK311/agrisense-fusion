import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Sprout,
  LayoutDashboard,
  Map,
  Layers,
  CloudSun,
  Droplets,
  Cpu,
  Wheat,
  ShieldAlert,
  Sliders,
  Bot,
  FileText,
  CheckCircle2,
  BookOpen,
  Network,
  Settings,
  Compass,
  Home,
  Search,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import { getEdges, slideFill } from '../utils/motion';
import AgriSenseBrandBadge from './AgriSenseBrandBadge';

export const WORKSPACE_ICON_MAP = {
  LayoutDashboard,
  Map,
  Layers,
  CloudSun,
  Droplets,
  Cpu,
  Wheat,
  Sprout,
  ShieldAlert,
  Sliders,
  Bot,
  FileText,
  CheckCircle2,
  BookOpen,
  Compass,
  Network,
  Settings,
};

export const PRIMARY_DESTINATIONS = [
  { id: 'home', label: 'Home', icon: Home, type: 'home' },
  { id: 'command', label: 'Command Hub', icon: Compass, type: 'app' },
  { id: 'earth-lab', label: 'Earth Lab', icon: Layers, type: 'app' },
  { id: 'hydrology', label: 'Water & Soil', icon: Droplets, type: 'app' },
  { id: 'agronomy', label: 'Crops & Disease', icon: Sprout, type: 'app' },
  { id: 'simulator', label: 'What-If Lab', icon: Sliders, type: 'app' },
  { id: 'methods', label: 'Methods & Learn', icon: BookOpen, type: 'app' },
];

/** Single unified 3-zone header: Brand (Left) | Clean 7-Tab Pill Bar (Center) | Search + Alerts + Settings Cluster (Right). */
export default function Header() {
  const {
    viewMode,
    activeWorkspace,
    navigateToHome,
    navigateToWorkspace,
    setCommandPaletteOpen,
    setAlertsDrawerOpen,
    setSettingsDrawerOpen,
    activeAlertCount,
    user,
    theme,
    toggleTheme,
  } = useAgriSense();

  const activeDestId = viewMode === 'home' ? 'home' : activeWorkspace;
  const isPrimaryActive = PRIMARY_DESTINATIONS.some((d) => d.id === activeDestId);

  const [hoveredDest, setHoveredDest] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const targetPillId = hoveredDest || (isPrimaryActive ? activeDestId : null);

  const navContainerRef = useRef(null);
  const fillLayerRef = useRef(null);
  const baseBtnRefs = useRef({});
  const isInitialMountRef = useRef(true);

  useLayoutEffect(() => {
    const container = navContainerRef.current;
    const fill = fillLayerRef.current;
    const btn = targetPillId ? baseBtnRefs.current[targetPillId] : null;
    if (!container || !fill) return undefined;

    if (!btn) {
      fill.style.opacity = '0';
      return undefined;
    }

    fill.style.opacity = '1';
    const immediate = isInitialMountRef.current;
    slideFill(fill, getEdges(container, btn), immediate);
    isInitialMountRef.current = false;
    return undefined;
  }, [targetPillId, viewMode, activeWorkspace]);

  useEffect(() => {
    const syncImmediate = () => {
      const container = navContainerRef.current;
      const fill = fillLayerRef.current;
      const btn = targetPillId ? baseBtnRefs.current[targetPillId] : null;
      if (container && fill && btn) {
        fill.style.opacity = '1';
        slideFill(fill, getEdges(container, btn), true);
      }
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncImmediate).catch(() => {});
    }
    window.addEventListener('resize', syncImmediate);
    return () => window.removeEventListener('resize', syncImmediate);
  }, [targetPillId]);

  const handleDestClick = (dest) => {
    setMobileMenuOpen(false);
    if (dest.type === 'home') {
      navigateToHome();
    } else {
      navigateToWorkspace(dest.id);
    }
  };

  return (
    <header
      className="home-top-header no-print"
      style={{
        position: 'fixed',
        top: '0.65rem',
        left: 0,
        right: 0,
        zIndex: 950,
        padding: '0 1.15rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '0.75rem',
        pointerEvents: 'none',
      }}
    >
      {/* Left Zone: Cosmic Brand Mark */}
      <button
        type="button"
        onClick={() => {
          setMobileMenuOpen(false);
          navigateToHome();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="AgriSense Fusion — Home"
        title="AgriSense Fusion — Living Landscape Intelligence"
        style={{
          pointerEvents: 'auto',
          justifySelf: 'start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          background: 'transparent',
          border: 'none',
          padding: '0.15rem 0.25rem',
          borderRadius: '9999px',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', borderRadius: '9999px', filter: 'drop-shadow(0 4px 14px rgba(56, 189, 248, 0.28))' }}>
          <AgriSenseBrandBadge size={38} />
        </span>
        <span className="home-brand-wordmark" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.38rem', whiteSpace: 'nowrap' }}>
          <span className="brand-word-primary" style={{ fontFamily: "'Michroma', 'Plus Jakarta Sans', sans-serif", fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.18em' }}>
            AGRISENSE
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.16em', color: '#38BDF8' }}>
            FUSION
          </span>
        </span>
      </button>

      {/* Center Zone: Pure Floating Glass 7-Tab Menu Bar */}
      <div
        className="glass-header home-minimal-nav home-desktop-nav"
        style={{
          pointerEvents: 'auto',
          position: 'relative',
          top: 0,
          margin: '0 auto',
          width: 'fit-content',
          padding: '0.4rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'nowrap',
        }}
      >
        <nav
          ref={navContainerRef}
          aria-label="Primary Platform Navigation"
          onMouseLeave={() => setHoveredDest(null)}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.14rem',
            flexWrap: 'nowrap',
            flexShrink: 0,
            borderRadius: '9999px',
          }}
        >
          {PRIMARY_DESTINATIONS.map((dest) => {
            const isActive = activeDestId === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                ref={(el) => {
                  baseBtnRefs.current[dest.id] = el;
                }}
                onClick={() => handleDestClick(dest)}
                onMouseEnter={() => setHoveredDest(dest.id)}
                onFocus={() => setHoveredDest(dest.id)}
                onBlur={() => setHoveredDest(null)}
                aria-current={isActive ? 'page' : undefined}
                className="header-nav-item"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.38rem 0.78rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  borderRadius: '9999px',
                  background: 'transparent',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {dest.label}
              </button>
            );
          })}

          {/* GSAP Adaptive Pill Sliding Overlay */}
          <div
            ref={fillLayerRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.14rem',
              background: 'var(--nav-pill-bg, linear-gradient(135deg, #34D399 0%, #10B981 100%))',
              color: 'var(--nav-pill-fg, #031912)',
              pointerEvents: 'none',
              borderRadius: '9999px',
              clipPath: 'inset(0px 100% 0px 0px round 99px)',
              willChange: 'clip-path',
              boxShadow: 'var(--nav-pill-shadow, 0 0 18px rgba(52, 211, 153, 0.4))',
              transition: 'opacity 0.18s ease, background 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            {PRIMARY_DESTINATIONS.map((dest) => (
              <span
                key={dest.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.38rem 0.78rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  color: 'var(--nav-pill-fg, #031912)',
                }}
              >
                {dest.label}
              </span>
            ))}
          </div>
        </nav>
      </div>

      {/* Right Zone: Standalone Light/Dark Pill + Separate Ctrl+K, Alerts & Settings Capsule */}
      <div
        className="home-desktop-nav"
        style={{
          pointerEvents: 'auto',
          justifySelf: 'end',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          className="glass-header"
          style={{
            position: 'relative',
            top: 0,
            margin: 0,
            width: 'fit-content',
            padding: '0.32rem',
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '999px',
          }}
        >
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              width: '32px',
              height: '32px',
              minBlockSize: '32px',
              padding: 0,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        <div
          className="glass-header"
          style={{
            position: 'relative',
            top: 0,
            margin: 0,
            width: 'fit-content',
            padding: '0.36rem 0.48rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.38rem',
          }}
        >
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
          className="btn btn-secondary"
          style={{ padding: '0.34rem 0.68rem', fontSize: '0.73rem', whiteSpace: 'nowrap', borderRadius: '999px' }}
          title="Search Everything (Ctrl+K)"
        >
          <Search size={13} />
          <span className="mono" style={{ fontSize: '0.66rem', opacity: 0.85 }}>Ctrl K</span>
        </button>

        <button
          type="button"
          onClick={() => setAlertsDrawerOpen(true)}
          aria-label="Open Alerts Inbox"
          title="Field & Aquifer Alerts"
          className="btn btn-secondary"
          style={{ position: 'relative', padding: '0.34rem 0.56rem', borderRadius: '999px' }}
        >
          <Bell size={14} />
          {activeAlertCount > 0 && (
            <span
              className="mono"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '999px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '0.6rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {activeAlertCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSettingsDrawerOpen(true)}
          aria-label="Account & Settings"
          title={user ? `Signed in (${user.role}) • Settings` : 'Account, JWT Session & Settings'}
          className="btn btn-secondary"
          style={{
            padding: user ? '0.34rem 0.64rem' : '0.34rem 0.56rem',
            borderRadius: '999px',
            fontSize: '0.7rem',
            borderColor: user ? 'rgba(52, 211, 153, 0.5)' : undefined,
          }}
        >
          <Settings size={14} />
          {user && <span className="mono">{user.role?.toUpperCase()}</span>}
        </button>
        </div>
      </div>

      {/* Mobile / Narrow Viewport Controls */}
      <div
        className="home-mobile-controls"
        style={{
          pointerEvents: 'auto',
          gridColumn: '3',
          justifySelf: 'end',
          alignItems: 'center',
          gap: '0.38rem',
        }}
      >
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="btn btn-secondary"
          style={{ padding: '0.38rem 0.55rem', borderRadius: '999px', color: 'var(--accent-primary)' }}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search Everything"
          className="btn btn-secondary"
          style={{ padding: '0.38rem 0.55rem', borderRadius: '999px' }}
        >
          <Search size={15} />
        </button>
        <button
          type="button"
          onClick={() => setAlertsDrawerOpen(true)}
          aria-label="Open Alerts Inbox"
          className="btn btn-secondary"
          style={{ position: 'relative', padding: '0.38rem 0.55rem', borderRadius: '999px' }}
        >
          <Bell size={15} />
          {activeAlertCount > 0 && (
            <span
              className="mono"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '999px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '0.6rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeAlertCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSettingsDrawerOpen(true)}
          aria-label="Account & Settings"
          className="btn btn-secondary"
          style={{ padding: '0.38rem 0.55rem', borderRadius: '999px' }}
        >
          <Settings size={15} />
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
          aria-expanded={mobileMenuOpen}
          className="btn btn-primary"
          style={{ padding: '0.38rem 0.72rem', borderRadius: '999px', fontSize: '0.74rem' }}
        >
          {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Slide-Down Navigation Sheet */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-sheet"
          style={{
            pointerEvents: 'auto',
            position: 'fixed',
            top: '4.1rem',
            left: '0.75rem',
            right: '0.75rem',
            zIndex: 960,
            borderRadius: '18px',
            padding: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          }}
        >
          {PRIMARY_DESTINATIONS.map((dest) => {
            const IconComp = dest.icon;
            const active = activeDestId === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => handleDestClick(dest)}
                className={`glass-pill-tab ${active ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.55rem 0.85rem' }}
              >
                <IconComp size={15} />
                <span>{dest.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigateToWorkspace('report');
            }}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.76rem', marginTop: '0.25rem' }}
          >
            <FileText size={14} /> Open Field Report
          </button>
        </div>
      )}
    </header>
  );
}
