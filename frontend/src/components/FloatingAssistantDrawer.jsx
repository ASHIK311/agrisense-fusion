import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import AssistantPanel from './AssistantPanel';
import AiChatbotOrb from './AiChatbotOrb';

let hasCompletedOrbIntro = false;

function getCenterOffset(bottomPx) {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  // Dual-Gyro Orb is 86x86 during intro (radius 43px), anchored at right: 20px, bottom: bottomPx
  return {
    x: -(window.innerWidth / 2 - 20 - 43),
    y: -(window.innerHeight / 2 - bottomPx - 43),
  };
}

/**
 * Persistent bottom-right AgriSense AI Copilot with animated 3D Glowing Orb launcher:
 * 1. Center pop + Double Jump ("Squash & Stretch Hop") with greeting bubble (0s - 2.45s)
 * 2. Smooth spring glide & bounce dock into bottom-right "Ask AgriSense AI" pill (2.45s - 3.4s)
 * 3. All-time aura pulse, idle bobbing, eye blinking, and mouse-tracking / idle eye glances
 */
export default function FloatingAssistantDrawer() {
  const {
    viewMode,
    activeWorkspace,
    selectedFarmId,
    selectedParcel,
    selectedLocation,
    aiDrawerOpen,
    setAiDrawerOpen,
    navigateToWorkspace,
    judgeDemoActive,
    pauseMotion,
    theme,
  } = useAgriSense();

  const bottomPx = judgeDemoActive ? 120 : 20;
  const [stage, setStage] = useState(() => (hasCompletedOrbIntro || pauseMotion ? 'docked' : 'hidden'));
  const [showGreeting, setShowGreeting] = useState(false);
  const [centerOffset, setCenterOffset] = useState(() => getCenterOffset(bottomPx));
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  const eyesRef = useRef(null);
  const timersRef = useRef([]);
  const rafIdsRef = useRef([]);

  const updateCenterCoords = useCallback(() => {
    setCenterOffset(getCenterOffset(bottomPx));
  }, [bottomPx]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    rafIdsRef.current.forEach((id) => window.cancelAnimationFrame(id));
    rafIdsRef.current = [];
  }, []);

  const playEntranceSequence = useCallback(() => {
    clearAllTimers();
    if (pauseMotion) {
      setShowGreeting(false);
      setStage('docked');
      return;
    }

    setCenterOffset(getCenterOffset(bottomPx));
    setAiDrawerOpen(false);
    setShowGreeting(false);
    setStage('hidden');

    // Double rAF guarantees initial 'hidden' frame commits before 'intro' hop & transition begin
    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(() => {
        setStage('intro');

        timersRef.current.push(
          window.setTimeout(() => {
            setShowGreeting(true);
          }, 420)
        );

        timersRef.current.push(
          window.setTimeout(() => {
            setShowGreeting(false);
            setStage('docked');
            hasCompletedOrbIntro = true;
          }, 2450)
        );
      });
      rafIdsRef.current.push(raf2);
    });
    rafIdsRef.current.push(raf1);
  }, [bottomPx, clearAllTimers, pauseMotion, setAiDrawerOpen]);

  // StrictMode-safe: only marks hasCompletedOrbIntro=true when sequence finishes or user docks early
  useEffect(() => {
    updateCenterCoords();
    window.addEventListener('resize', updateCenterCoords);

    if (!hasCompletedOrbIntro && !pauseMotion) {
      playEntranceSequence();
    } else if (pauseMotion) {
      setStage('docked');
    }

    return () => {
      clearAllTimers();
      window.removeEventListener('resize', updateCenterCoords);
    };
  }, [clearAllTimers, pauseMotion, playEntranceSequence, updateCenterCoords]);

  // All-time eye tracking (follows mouse + playful autonomous glance when idle)
  useEffect(() => {
    if (pauseMotion || aiDrawerOpen) return undefined;
    let idleTimer = null;
    let isMoving = false;

    const handleMouseMove = (e) => {
      isMoving = true;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        isMoving = false;
      }, 1800);

      if (!eyesRef.current) return;
      const rect = eyesRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const maxShift = stage === 'intro' ? 4.5 : 2.2;
      setEyeOffset({
        x: Math.cos(angle) * maxShift,
        y: Math.sin(angle) * maxShift,
      });
    };

    const idleInterval = window.setInterval(() => {
      if (isMoving) return;
      const glances = [
        { x: 0, y: 0 },
        { x: -2.2, y: -0.6 },
        { x: 2.2, y: -0.6 },
        { x: 0, y: 1.2 },
        { x: 0, y: 0 },
      ];
      const next = glances[Math.floor(Math.random() * glances.length)];
      const scale = stage === 'intro' ? 1.6 : 1;
      setEyeOffset({ x: next.x * scale, y: next.y * scale });
    }, 2200);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.clearInterval(idleInterval);
      window.clearTimeout(idleTimer);
    };
  }, [stage, pauseMotion, aiDrawerOpen]);

  // Hide floating widget on full Assistant workspace and clean printable Report view
  if (viewMode === 'app' && (activeWorkspace === 'assistant' || activeWorkspace === 'report')) {
    return null;
  }

  const launcherTransform =
    stage === 'docked'
      ? 'translate3d(0px, 0px, 0) scale(1)'
      : stage === 'intro'
        ? `translate3d(${centerOffset.x}px, ${centerOffset.y}px, 0) scale(1)`
        : `translate3d(${centerOffset.x}px, ${centerOffset.y}px, 0) scale(0.2)`;

  const handleOpenLauncher = () => {
    clearAllTimers();
    hasCompletedOrbIntro = true;
    setShowGreeting(false);
    setStage('docked');
    setAiDrawerOpen(true);
  };

  return (
    <div className="no-print">
      {!aiDrawerOpen && (
        <button
          type="button"
          onClick={handleOpenLauncher}
          aria-label="Open Ask AgriSense AI Copilot"
          className={`ai-orb-launcher stage-${stage}`}
          style={{
            bottom: `${bottomPx}px`,
            transform: launcherTransform,
          }}
        >
          {stage === 'intro' && (
            <span className={`ai-intro-bubble ${showGreeting ? 'show' : ''}`}>
              Hi! I&apos;m AgriSense AI
            </span>
          )}

          <AiChatbotOrb
            size={stage === 'docked' ? 'docked' : 'intro'}
            eyeOffset={eyeOffset}
            eyesRef={eyesRef}
          />

          <span className="ai-launcher-label">Ask AgriSense AI</span>
        </button>
      )}

      {aiDrawerOpen && (
        <aside
          aria-label="AgriSense AI Copilot Drawer"
          style={{
            position: 'fixed',
            right: '1.1rem',
            bottom: '1.1rem',
            zIndex: 1260,
            width: 'min(94vw, 460px)',
            height: 'min(82dvh, 660px)',
            borderRadius: '18px',
            overflow: 'hidden',
            background: theme === 'light' ? '#F8FAF8' : '#0B110E',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.72)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 0.85rem',
              background: 'var(--bg-alt)',
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              gap: '0.5rem',
            }}
          >
            <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedLocation?.district || 'Rajshahi'} • {selectedParcel?.code || 'PARCEL A-01'} • {viewMode === 'home' ? 'Home' : activeWorkspace}
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              {!pauseMotion && (
                <button
                  type="button"
                  onClick={playEntranceSequence}
                  aria-label="Replay AI Orb Entrance"
                  title="Replay center double-hop & dock intro"
                  className="btn btn-ghost"
                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', gap: '0.25rem' }}
                >
                  <RotateCcw size={12} />
                  <span>Replay</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAiDrawerOpen(false)}
                aria-label="Close AI Copilot Drawer"
                className="btn btn-ghost"
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <AssistantPanel
              compact
              height="100%"
              selectedFarmId={selectedFarmId}
              onExpandFull={() => {
                setAiDrawerOpen(false);
                navigateToWorkspace('assistant');
              }}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
