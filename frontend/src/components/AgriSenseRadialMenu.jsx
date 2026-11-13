import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Rocket,
  Globe,
  Sparkles,
  Bot,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import { useAgriSense } from '../context/AgriSenseContext';

export default function AgriSenseRadialMenu({
  githubUrl = 'https://github.com/ASHIK311/agrisense-fusion',
  nasaPageUrl = 'https://www.spaceappschallenge.org/',
  onOpenTeamModal,
}) {
  const {
    viewMode,
    activeWorkspace,
    navigateToWorkspace,
    setAiDrawerOpen,
    judgeDemoActive,
    pauseMotion,
    setTeamModalOpen,
  } = useAgriSense();

  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const menuRef = useRef(null);

  // Close radial menu if Escape is pressed or user clicks outside
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Hide or collapse radial menu if in printable report view
  if (viewMode === 'app' && activeWorkspace === 'report') {
    return null;
  }

  // Position: Anchored comfortably above the bottom-right AI Copilot launcher
  // When judge demo is active, bottom shifts up to clear the bottom demo bar
  const baseBottom = judgeDemoActive ? 180 : 76;

  const handleOpenTeam = () => {
    setIsOpen(false);
    if (onOpenTeamModal) {
      onOpenTeamModal();
    } else if (setTeamModalOpen) {
      setTeamModalOpen(true);
    }
  };

  const handleOpenAi = () => {
    setIsOpen(false);
    setAiDrawerOpen(true);
  };

  const handleNavigate = (workspaceId) => {
    setIsOpen(false);
    navigateToWorkspace(workspaceId);
  };

  const items = [
    {
      id: 'team',
      label: 'AgriSense Team',
      shortLabel: 'Team',
      sublabel: '6-Member Engineering Squad & Contacts',
      action: handleOpenTeam,
      icon: <Users size={14} />,
      accentColor: '#34D399',
    },
    {
      id: 'github',
      label: 'NASA GitHub Repo',
      shortLabel: 'GitHub',
      sublabel: 'Official Project Source Code',
      href: githubUrl,
      action: () => {
        window.open(githubUrl, '_blank', 'noopener,noreferrer');
        setIsOpen(false);
      },
      icon: <GithubIcon size={14} color="#38BDF8" />,
      accentColor: '#38BDF8',
    },
    {
      id: 'nasa-page',
      label: 'NASA AgriFusion Page',
      shortLabel: 'AgriFusion',
      sublabel: 'Space Apps Official Showcase',
      href: nasaPageUrl,
      action: () => {
        window.open(nasaPageUrl, '_blank', 'noopener,noreferrer');
        setIsOpen(false);
      },
      icon: <Rocket size={14} />,
      accentColor: '#F59E0B',
    },
    {
      id: 'ai-copilot',
      label: 'AgriSense AI Copilot',
      shortLabel: 'Ask AI',
      sublabel: 'Evidence-Backed Barind Assistant',
      action: handleOpenAi,
      icon: <Bot size={14} />,
      accentColor: '#A78BFA',
    },
    {
      id: 'twin',
      label: '3D Spatial Twin',
      shortLabel: '3D Twin',
      sublabel: 'Earth Lab & Radar Stratigraphy',
      action: () => handleNavigate('earth-lab'),
      icon: <Globe size={14} />,
      accentColor: '#2DD4BF',
    },
    {
      id: 'methods',
      label: 'Methods & Verification',
      shortLabel: 'Methods',
      sublabel: 'FAO-56 Equations & 60 DOIs',
      action: () => handleNavigate('methods'),
      icon: <Sparkles size={14} />,
      accentColor: '#FB7185',
    },
  ];

  /**
   * UPWARD-ONLY ORBIT CONFIGURATION:
   * To prevent any button from dipping downwards or hiding behind the chatbot / taskbar,
   * all angles are kept strictly between 0° (Straight UP) and -90° (Straight LEFT).
   * A staggered dual-radius (outer: 88px, inner: 64px) ensures zero button overlap.
   */
  const orbitConfig = [
    { angle: 0, radius: 88 },    // 1. Team: Straight UP (Outer)
    { angle: -18, radius: 64 },  // 2. GitHub: UP-slight-left (Inner)
    { angle: -36, radius: 88 },  // 3. AgriFusion: UP-left (Outer)
    { angle: -54, radius: 64 },  // 4. Ask AI: UP-left (Inner)
    { angle: -72, radius: 88 },  // 5. 3D Twin: UP-left (Outer)
    { angle: -90, radius: 64 },  // 6. Methods: Straight LEFT (Inner)
  ];

  return (
    <div
      ref={menuRef}
      className="agrisense-radial-menu-root no-print"
      style={{
        position: 'fixed',
        right: '28px',
        bottom: `${baseBottom}px`,
        zIndex: 1240,
        width: '38px',
        height: '38px',
        userSelect: 'none',
      }}
    >
      {/* Light Backdrop Overlay when Radial Menu is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            background: 'rgba(3, 8, 5, 0.45)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* Floating Tooltip Pill (Positioned above the entire orbit cluster) */}
      <div
        style={{
          position: 'absolute',
          bottom: '104px',
          right: '50%',
          transform: `translateX(50%) ${isOpen && hoveredItem ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.92)'}`,
          opacity: isOpen && hoveredItem ? 1 : 0,
          pointerEvents: 'none',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          whiteSpace: 'nowrap',
          zIndex: 30,
        }}
      >
        {hoveredItem && (
          <div
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '12px',
              background: 'rgba(6, 16, 12, 0.96)',
              border: `1px solid ${hoveredItem.accentColor}60`,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: hoveredItem.accentColor,
                letterSpacing: '0.02em',
              }}
            >
              {hoveredItem.label}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#94A3B8', marginTop: '1px' }}>
              {hoveredItem.sublabel}
            </div>
          </div>
        )}
      </div>

      {/* Upward-Fanning Radial Orbit Items */}
      {items.map((item, idx) => {
        const cfg = orbitConfig[idx] || { angle: -idx * 18, radius: 76 };
        const angle = cfg.angle;
        const radius = cfg.radius;
        const delay = idx * 30;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transformOrigin: '50% 50%',
              transform: `rotate(${angle}deg)`,
              pointerEvents: 'none',
            }}
          >
            <button
              type="button"
              onClick={item.action}
              aria-label={item.label}
              onMouseEnter={(e) => {
                setHoveredItem(item);
                e.currentTarget.style.transform = `translateY(-${radius}px) rotate(${-angle}deg) scale(1.15)`;
                e.currentTarget.style.borderColor = item.accentColor;
                e.currentTarget.style.boxShadow = `0 8px 22px rgba(0, 0, 0, 0.6), 0 0 16px ${item.accentColor}70`;
              }}
              onMouseLeave={(e) => {
                setHoveredItem(null);
                e.currentTarget.style.transform = `translateY(-${radius}px) rotate(${-angle}deg) scale(1)`;
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.boxShadow = `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${item.accentColor}25`;
              }}
              style={{
                position: 'absolute',
                top: '1px',
                left: '1px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1px',
                background: 'rgba(10, 24, 18, 0.94)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${item.accentColor}25`,
                color: '#FFFFFF',
                cursor: 'pointer',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: pauseMotion
                  ? 'none'
                  : 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                transitionDelay: isOpen ? `${delay}ms` : '0ms',
                transform: isOpen
                  ? `translateY(-${radius}px) rotate(${-angle}deg) scale(1)`
                  : `translateY(0px) rotate(${-angle}deg) scale(0.35)`,
              }}
            >
              <span style={{ color: item.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: '0.48rem',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  color: '#E2E8F0',
                  lineHeight: 1,
                }}
              >
                {item.shortLabel}
              </span>
            </button>
          </div>
        );
      })}

      {/* Central Trigger Button (Compact 38x38px FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle AgriSense Radial Orbit Menu"
        title={isOpen ? 'Close Radial Menu' : 'Open AgriSense Radial Menu (Team, GitHub, Showcase)'}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: isOpen
            ? 'rgba(239, 68, 68, 0.28)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.28) 0%, rgba(8, 20, 16, 0.94) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isOpen
            ? '1.5px solid rgba(239, 68, 68, 0.65)'
            : '1.5px solid rgba(52, 211, 153, 0.5)',
          boxShadow: isOpen
            ? '0 6px 20px rgba(239, 68, 68, 0.4)'
            : '0 6px 20px rgba(0, 0, 0, 0.5), 0 0 14px rgba(52, 211, 153, 0.35)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* Animated Hamburger (≡) to (✕) Morph */}
        <div
          style={{
            position: 'relative',
            width: '15px',
            height: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '2px',
              backgroundColor: isOpen ? '#EF4444' : '#34D399',
              borderRadius: '2px',
              transition: 'transform 0.3s ease, top 0.3s ease, background-color 0.25s ease',
              transform: isOpen ? 'rotate(45deg)' : 'translateY(-4.5px)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '2px',
              backgroundColor: isOpen ? '#EF4444' : '#34D399',
              borderRadius: '2px',
              transition: 'opacity 0.22s ease, transform 0.22s ease',
              opacity: isOpen ? 0 : 1,
              transform: isOpen ? 'scaleX(0)' : 'scaleX(1)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '2px',
              backgroundColor: isOpen ? '#EF4444' : '#34D399',
              borderRadius: '2px',
              transition: 'transform 0.3s ease, top 0.3s ease, background-color 0.25s ease',
              transform: isOpen ? 'rotate(-45deg)' : 'translateY(4.5px)',
            }}
          />
        </div>
      </button>

      {/* Orbit Pulsing Satellite Ring when Closed */}
      {!isOpen && (
        <span
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            border: '1px dashed rgba(52, 211, 153, 0.35)',
            pointerEvents: 'none',
            animation: 'spin 18s linear infinite',
          }}
        />
      )}
    </div>
  );
}
