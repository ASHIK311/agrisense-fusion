import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FastForward } from 'lucide-react';

// ============================================================================
// CONSTANTS & DIRECT FULL-WINDOW -> NASA LOGO -> AGRISENSE SEQUENCE
// ============================================================================
const DESKTOP_PARTICLE_COUNT = 8600;
const MOBILE_PARTICLE_COUNT = 4200;

const LOADING_STAGES = [
  {
    id: 'FULL_SCATTER_1',
    label: 'Full-Window Field',
    range: [0, 8],
  },
  {
    id: 'NASA_LOGO',
    label: 'NASA Logo',
    range: [8, 52],
  },
  {
    id: 'FULL_SCATTER_2',
    label: 'Cosmic Scatter',
    range: [52, 58],
  },
  {
    id: 'AGRISENSE',
    label: 'AGRISENSE',
    range: [58, 100],
  },
];

// ============================================================================
// MULTI-LAYER OFFSCREEN SAMPLERS (FULL WINDOW, AUTHENTIC NASA LOGO, AGRISENSE)
// ============================================================================

/**
 * Generates Full-Window Edge-to-Edge Cosmic Particle Coordinates (100vw x 100vh)
 * Ensures particles fill the entire browser window from corner to corner.
 */
function generateFullWindowScatterTargets(count, width, height, seedOffset = 0) {
  const targets = new Array(count);
  const spreadX = width * 1.18;
  const spreadY = height * 1.18;
  const spreadZ = Math.min(width, height) * 0.85;

  for (let i = 0; i < count; i++) {
    const u = ((i * 137.508 + seedOffset * 71.3) % 1000) / 1000;
    const v = ((i * 269.317 + seedOffset * 113.7) % 1000) / 1000;

    const rx = (u - 0.5) * spreadX + (Math.random() - 0.5) * (width * 0.16);
    const ry = (v - 0.5) * spreadY + (Math.random() - 0.5) * (height * 0.16);
    const rz = (Math.random() - 0.5) * spreadZ;

    targets[i] = {
      x: rx,
      y: ry,
      z: rz,
      brandColor:
        i % 9 === 0
          ? '#60a5fa'
          : i % 17 === 0
          ? '#fc3d21'
          : i % 23 === 0
          ? '#34d399'
          : '#ffffff',
      sizeMult: 0.7 + (i % 5) * 0.18,
      layerPriority: 0,
    };
  }
  return targets;
}

/**
 * Helper to sample non-transparent pixels from an isolated offscreen canvas layer.
 */
function sampleLayerPixels(canvas, step = 2) {
  const cw = canvas.width;
  const ch = canvas.height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, cw, ch).data;
  const points = [];

  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      const idx = (y * cw + x) * 4;
      if (imgData[idx + 3] > 95) {
        points.push({
          x: x - cw / 2,
          y: y - ch / 2,
        });
      }
    }
  }
  return points;
}

/**
 * Generates the Authentic NASA "Meatball" Logo using 4 isolated vector layers
 * so the Blue Sphere, White Orbital Swoosh, Red Vector Chevron Wing, and Bold White "NASA"
 * letters render with crisp contrast.
 */
function generateNasaLogoTargets(count, width, height) {
  const cw = Math.max(700, Math.min(1300, Math.floor(width)));
  const ch = Math.max(520, Math.min(900, Math.floor(height)));
  const cx = cw / 2;
  const cy = ch / 2;
  const R = Math.min(cw, ch) * 0.33;

  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    return c;
  };

  // LAYER 1: Authentic Tilted White Orbital Ellipse (Swoosh)
  const orbitCanvas = makeCanvas();
  const oCtx = orbitCanvas.getContext('2d');
  oCtx.save();
  oCtx.translate(cx, cy);
  oCtx.rotate(-0.44);
  oCtx.lineWidth = Math.max(4, R * 0.042);
  oCtx.strokeStyle = '#ffffff';
  oCtx.beginPath();
  oCtx.ellipse(0, 0, R * 1.22, R * 0.36, 0, 0, Math.PI * 2);
  oCtx.stroke();
  oCtx.restore();
  const orbitPoints = sampleLayerPixels(orbitCanvas, 2);

  // LAYER 2: Iconic NASA Red Vector Wing / Chevron ("V" Airfoil)
  const wingCanvas = makeCanvas();
  const wCtx = wingCanvas.getContext('2d');
  wCtx.save();
  wCtx.fillStyle = '#fc3d21';
  wCtx.beginPath();
  const startLeftX = cx - R * 1.06;
  const startLeftY = cy + R * 0.44;
  const apexX = cx + R * 0.24;
  const apexY = cy - R * 0.96;
  const endRightX = cx + R * 1.02;
  const endRightY = cy + R * 0.42;

  wCtx.moveTo(startLeftX, startLeftY);
  wCtx.quadraticCurveTo(cx - R * 0.34, cy - R * 0.24, apexX, apexY);
  wCtx.quadraticCurveTo(cx + R * 0.58, cy - R * 0.22, endRightX, endRightY);
  wCtx.lineTo(cx + R * 0.85, cy + R * 0.46);
  wCtx.quadraticCurveTo(cx + R * 0.48, cy - R * 0.08, cx + R * 0.21, cy - R * 0.64);
  wCtx.quadraticCurveTo(cx - R * 0.26, cy - R * 0.02, cx - R * 0.88, cy + R * 0.5);
  wCtx.closePath();
  wCtx.fill();
  wCtx.restore();
  const wingPoints = sampleLayerPixels(wingCanvas, 2);

  // LAYER 3: Bold Central "NASA" Typography
  const textCanvas = makeCanvas();
  const tCtx = textCanvas.getContext('2d');
  tCtx.save();
  const fontSize = Math.floor(R * 0.68);
  tCtx.font = `900 ${fontSize}px "Times New Roman", "Georgia", "Arial Black", serif`;
  tCtx.textAlign = 'center';
  tCtx.textBaseline = 'middle';
  tCtx.fillStyle = '#ffffff';
  tCtx.lineWidth = Math.max(3, fontSize * 0.065);
  tCtx.strokeStyle = '#ffffff';

  const letters = ['N', 'A', 'S', 'A'];
  const letterSpacing = R * 0.46;
  const startTextX = cx - (letterSpacing * (letters.length - 1)) / 2;
  const textY = cy + R * 0.03;

  letters.forEach((chStr, idx) => {
    const lx = startTextX + idx * letterSpacing;
    tCtx.strokeText(chStr, lx, textY);
    tCtx.fillText(chStr, lx, textY);
  });
  tCtx.restore();
  const textPoints = sampleLayerPixels(textCanvas, 2);

  const textQuota = Math.floor(count * 0.31);
  const wingQuota = Math.floor(count * 0.25);
  const orbitQuota = Math.floor(count * 0.11);

  const targets = new Array(count);

  for (let i = 0; i < count; i++) {
    if (i < textQuota && textPoints.length > 0) {
      const pt = textPoints[(i * 73) % textPoints.length];
      targets[i] = {
        x: pt.x + (Math.random() - 0.5) * 2.2,
        y: pt.y + (Math.random() - 0.5) * 2.2,
        z: 24 + (Math.random() - 0.5) * 6,
        brandColor: '#ffffff',
        sizeMult: 1.25,
        layerPriority: 3,
      };
    } else if (i < textQuota + wingQuota && wingPoints.length > 0) {
      const pt = wingPoints[(i * 89) % wingPoints.length];
      targets[i] = {
        x: pt.x + (Math.random() - 0.5) * 2.8,
        y: pt.y + (Math.random() - 0.5) * 2.8,
        z: 12 + (Math.random() - 0.5) * 8,
        brandColor: i % 4 === 0 ? '#ff5733' : '#fc3d21',
        sizeMult: 1.12,
        layerPriority: 2,
      };
    } else if (i < textQuota + wingQuota + orbitQuota && orbitPoints.length > 0) {
      const isStar = i % 6 === 0;
      if (isStar) {
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * R * 0.88;
        targets[i] = {
          x: Math.cos(angle) * rad,
          y: Math.sin(angle) * rad,
          z: 6 + (Math.random() - 0.5) * 8,
          brandColor: '#ffffff',
          sizeMult: 1.15,
          layerPriority: 2,
        };
      } else {
        const pt = orbitPoints[(i * 53) % orbitPoints.length];
        targets[i] = {
          x: pt.x + (Math.random() - 0.5) * 2.4,
          y: pt.y + (Math.random() - 0.5) * 2.4,
          z: 16 + (Math.random() - 0.5) * 6,
          brandColor: i % 3 === 0 ? '#bae6fd' : '#ffffff',
          sizeMult: 1.05,
          layerPriority: 2,
        };
      }
    } else {
      const isRim = i % 5 === 0;
      const angle = ((i * 137.508) % 360) * (Math.PI / 180);
      const normR = isRim
        ? 0.94 + Math.random() * 0.06
        : Math.pow(Math.random(), 0.48) * 0.94;
      const r = R * normR;

      targets[i] = {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        z: -12 + (Math.random() - 0.5) * 14,
        brandColor: isRim ? '#3b82f6' : i % 3 === 0 ? '#2563eb' : '#1d4ed8',
        sizeMult: isRim ? 1.0 : 0.92,
        layerPriority: 1,
      };
    }
  }

  return targets;
}

/**
 * Generates Volumetric "AGRISENSE" Particle Text with NASA Space Apps sub-caption.
 */
function generateAgriSenseTargets(count, width, height) {
  const offCanvas = document.createElement('canvas');
  const cw = Math.max(760, Math.min(1440, Math.floor(width)));
  const ch = Math.max(420, Math.min(800, Math.floor(height)));
  offCanvas.width = cw;
  offCanvas.height = ch;
  const ctx = offCanvas.getContext('2d');

  ctx.clearRect(0, 0, cw, ch);
  const cx = cw / 2;
  const cy = ch / 2;

  const maxTextWidth = cw * 0.86;
  let fontSize = Math.floor(cw * 0.14);
  ctx.font = `900 ${fontSize}px "Arial Black", "Inter", "Impact", sans-serif`;
  const measured = ctx.measureText('AGRISENSE').width;
  if (measured > maxTextWidth) {
    fontSize = Math.floor(fontSize * (maxTextWidth / measured));
  }

  ctx.font = `900 ${fontSize}px "Arial Black", "Inter", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fullText = 'AGRISENSE';
  const charSpacing = fontSize * 0.045;
  const chars = fullText.split('');
  const charWidths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth =
    charWidths.reduce((acc, w) => acc + w, 0) + charSpacing * (chars.length - 1);

  let currentX = cx - totalWidth / 2;
  chars.forEach((char, index) => {
    const w = charWidths[index];
    ctx.fillStyle = index < 4 ? 'rgb(255, 255, 255)' : 'rgb(80, 250, 180)';
    ctx.fillText(char, currentX + w / 2, cy - fontSize * 0.04);
    currentX += w + charSpacing;
  });

  const subFont = Math.max(14, Math.floor(fontSize * 0.19));
  ctx.font = `800 ${subFont}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgb(56, 189, 248)';
  ctx.fillText('N A S A   S P A C E   A P P S   P R O J E C T', cx, cy + fontSize * 0.72);

  const imgData = ctx.getImageData(0, 0, cw, ch).data;
  const textPoints = [];
  const step = 2;

  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      const idx = (y * cw + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a > 90) {
        let brandColor = '#ffffff';
        let isSub = false;

        if (r < 100 && g > 150 && b > 220) {
          brandColor = '#38bdf8';
          isSub = true;
        } else if (r < 140 && g > 220) {
          brandColor = Math.random() > 0.3 ? '#34d399' : '#ecfdf5';
        }

        textPoints.push({
          x: x - cw / 2,
          y: y - ch / 2,
          isSub,
          brandColor,
        });
      }
    }
  }

  const targets = new Array(count);
  const scaleFactor = Math.min(width / cw, height / ch) * 0.96;
  const textParticleQuota = Math.floor(count * 0.92);

  for (let i = 0; i < count; i++) {
    if (i < textParticleQuota && textPoints.length > 0) {
      const pt = textPoints[(i * 97) % textPoints.length];
      const cloudSpread = pt.isSub ? 1.8 : 4.0;
      const jitterX = (Math.random() - 0.5) * cloudSpread;
      const jitterY = (Math.random() - 0.5) * cloudSpread;
      const jitterZ = (Math.random() - 0.5) * 26;

      targets[i] = {
        x: (pt.x + jitterX) * scaleFactor,
        y: (pt.y + jitterY) * scaleFactor,
        z: jitterZ,
        brandColor: pt.brandColor,
        sizeMult: pt.isSub ? 0.85 : 0.85 + Math.random() * 0.45,
        layerPriority: 2,
      };
    } else {
      targets[i] = {
        x: (Math.random() - 0.5) * width * 1.05,
        y: (Math.random() - 0.5) * height * 1.05,
        z: (Math.random() - 0.5) * 180,
        brandColor: '#475569',
        sizeMult: 0.6,
        layerPriority: 0,
      };
    }
  }

  return targets;
}

function createParticlesFromScatter(scatterTargets) {
  const count = scatterTargets.length;
  const particles = new Array(count);
  for (let i = 0; i < count; i++) {
    const s = scatterTargets[i];
    particles[i] = {
      x: s.x,
      y: s.y,
      z: s.z,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      vz: (Math.random() - 0.5) * 2.5,
      tx: s.x,
      ty: s.y,
      tz: s.z,
      baseSize: 0.85 + Math.random() * 1.1,
      sizeMult: s.sizeMult || 1,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.03 + Math.random() * 0.05,
      brandColor: s.brandColor,
      layerPriority: s.layerPriority || 0,
    };
  }
  return particles;
}

// ============================================================================
// MAIN PRELOADER COMPONENT
// ============================================================================
export default function AgriSenseParticlePreloader({ isOpen, onComplete, replayNonce = 0 }) {
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skipHovered, setSkipHovered] = useState(false);

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const formationsRef = useRef({});
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const stageRef = useRef('FULL_SCATTER_1');
  const warpExitRef = useRef(false);
  const timersRef = useRef({ hold: null, exit: null });
  const isClosingRef = useRef(false);

  const clearPendingTimers = useCallback(() => {
    if (timersRef.current.hold) {
      clearTimeout(timersRef.current.hold);
      timersRef.current.hold = null;
    }
    if (timersRef.current.exit) {
      clearTimeout(timersRef.current.exit);
      timersRef.current.exit = null;
    }
  }, []);

  const buildFormations = useCallback((width, height) => {
    const count = width < 768 ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;
    const fullScatter1 = generateFullWindowScatterTargets(count, width, height, 1);
    const nasaLogo = generateNasaLogoTargets(count, width, height);
    const fullScatter2 = generateFullWindowScatterTargets(count, width, height, 2);
    const agriSense = generateAgriSenseTargets(count, width, height);

    formationsRef.current = {
      FULL_SCATTER_1: fullScatter1,
      NASA_LOGO: nasaLogo,
      FULL_SCATTER_2: fullScatter2,
      AGRISENSE: agriSense,
    };

    if (particlesRef.current.length !== count) {
      particlesRef.current = createParticlesFromScatter(fullScatter1);
    }
  }, []);

  const triggerExit = useCallback(
    (durationMs) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      clearPendingTimers();
      warpExitRef.current = true;
      setIsTransitioningOut(true);

      timersRef.current.exit = setTimeout(() => {
        timersRef.current.exit = null;
        if (onComplete) onComplete();
      }, durationMs);
    },
    [clearPendingTimers, onComplete]
  );

  // Reset timeline and scatter particles whenever preloader opens or replays
  useEffect(() => {
    if (!isOpen) {
      clearPendingTimers();
      return;
    }

    clearPendingTimers();
    isClosingRef.current = false;
    stageRef.current = 'FULL_SCATTER_1';
    warpExitRef.current = false;
    setIsTransitioningOut(false);
    setProgress(0);

    const scatterTargets = formationsRef.current.FULL_SCATTER_1;
    if (scatterTargets && particlesRef.current.length > 0) {
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        const s = scatterTargets[i];
        if (s) {
          p.x = s.x;
          p.y = s.y;
          p.z = s.z;
          p.vx = (Math.random() - 0.5) * 2.5;
          p.vy = (Math.random() - 0.5) * 2.5;
          p.vz = (Math.random() - 0.5) * 2.5;
          p.tx = s.x;
          p.ty = s.y;
          p.tz = s.z;
          p.brandColor = s.brandColor;
          p.sizeMult = s.sizeMult || 1;
          p.layerPriority = s.layerPriority || 0;
        }
      }
    }
  }, [isOpen, replayNonce, clearPendingTimers]);

  // Automated timeline progression (0% -> 100%)
  useEffect(() => {
    if (!isOpen) return undefined;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = Math.min(100, +(prev + 0.88).toFixed(2));
        const matchingStage = LOADING_STAGES.find(
          (st) => next >= st.range[0] && next <= st.range[1]
        );
        if (matchingStage && matchingStage.id !== stageRef.current) {
          stageRef.current = matchingStage.id;
        }
        return next;
      });
    }, 38);

    return () => clearInterval(interval);
  }, [isOpen, replayNonce]);

  // Hold briefly on completed AGRISENSE formation, then warp out cleanly
  useEffect(() => {
    if (!isOpen || progress < 100 || isClosingRef.current) return undefined;

    timersRef.current.hold = setTimeout(() => {
      timersRef.current.hold = null;
      triggerExit(600);
    }, 1350);

    return () => {
      if (timersRef.current.hold) {
        clearTimeout(timersRef.current.hold);
        timersRef.current.hold = null;
      }
    };
  }, [isOpen, progress, triggerExit]);

  // Escape key skips immediately
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerExit(450);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, triggerExit]);

  // Cleanup on unmount
  useEffect(() => () => clearPendingTimers(), [clearPendingTimers]);

  // Canvas 60fps particle physics & 3D perspective projection loop
  useEffect(() => {
    if (!isOpen) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildFormations(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let timeCounter = 0;

    const renderLoop = () => {
      timeCounter += 0.016;

      ctx.fillStyle = '#030705';
      ctx.fillRect(0, 0, width, height);

      const currentStage = stageRef.current;
      const targetArray =
        formationsRef.current[currentStage] || formationsRef.current.FULL_SCATTER_1;
      const particles = particlesRef.current;
      const repulsionRadius = 115;
      const isWarping = warpExitRef.current;

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 780;

      const isScatterStage =
        currentStage === 'FULL_SCATTER_1' || currentStage === 'FULL_SCATTER_2';
      const springStrength = isWarping ? 0.032 : isScatterStage ? 0.044 : 0.092;
      const damping = isScatterStage ? 0.89 : 0.80;

      const mx = mouseRef.current.x - centerX;
      const my = mouseRef.current.y - centerY;
      const mouseActive = mouseRef.current.active;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const t = targetArray ? targetArray[i] : null;

        if (t) {
          if (isScatterStage) {
            p.tx = t.x + Math.sin(timeCounter * 0.9 + p.phase) * 24;
            p.ty = t.y + Math.cos(timeCounter * 0.8 + p.phase) * 24;
            p.tz = t.z;
          } else {
            const microJitter = t.layerPriority === 3 ? 0.55 : 0.95;
            p.tx = t.x + Math.sin(timeCounter * 5.5 + p.phase) * microJitter;
            p.ty = t.y + Math.cos(timeCounter * 5.0 + p.phase) * microJitter;
            p.tz = t.z + Math.sin(timeCounter * 2.5 + p.phase) * 1.8;
          }

          p.brandColor = t.brandColor;
          p.sizeMult = t.sizeMult || 1;
          p.layerPriority = t.layerPriority || 0;
        }

        if (isWarping) {
          p.tx *= 2.5;
          p.ty *= 2.5;
          p.tz += 460;
        }

        p.vx += (p.tx - p.x) * springStrength;
        p.vy += (p.ty - p.y) * springStrength;
        p.vz += (p.tz - p.z) * springStrength;

        if (mouseActive) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;
          const rSq = repulsionRadius * repulsionRadius;

          if (distSq < rSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = Math.pow((repulsionRadius - dist) / repulsionRadius, 1.6);
            const angle = Math.atan2(dy, dx);
            const pushMultiplier = 15.0;

            p.vx += Math.cos(angle) * force * pushMultiplier;
            p.vy += Math.sin(angle) * force * pushMultiplier;
            p.vz += Math.sin(p.phase) * force * pushMultiplier * 0.7;
          }
        }

        p.vx *= damping;
        p.vy *= damping;
        p.vz *= damping;

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.phase += p.phaseSpeed;

        const depth = fov + p.z;
        if (depth <= 60) continue;

        const scale = fov / depth;
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;

        if (
          screenX < -10 ||
          screenX > width + 10 ||
          screenY < -10 ||
          screenY > height + 10
        ) {
          continue;
        }

        const radius = Math.max(0.6, p.baseSize * p.sizeMult * scale);
        const shimmer =
          p.layerPriority === 3
            ? 0.88 + 0.12 * Math.sin(p.phase)
            : 0.65 + 0.35 * Math.sin(p.phase);
        const depthAlpha = Math.min(1, Math.max(0.22, (scale - 0.3) * 1.15));

        ctx.globalAlpha = shimmer * depthAlpha;
        ctx.fillStyle = p.brandColor;

        if (radius < 1.35) {
          const d = radius * 1.95;
          ctx.fillRect(screenX - radius, screenY - radius, d, d);
        } else {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, buildFormations]);

  const handlePointerMove = (e) => {
    const point = e.touches ? e.touches[0] : e;
    if (!point) return;
    mouseRef.current.x = point.clientX;
    mouseRef.current.y = point.clientY;
    mouseRef.current.active = true;
  };

  const handlePointerLeave = () => {
    mouseRef.current.active = false;
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AgriSense NASA Particle Intro"
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        overflow: 'hidden',
        background: '#030705',
        fontFamily: 'var(--font-sans, sans-serif)',
        userSelect: 'none',
        opacity: isTransitioningOut ? 0 : 1,
        transform: isTransitioningOut ? 'scale(1.05)' : 'scale(1)',
        transition: 'opacity 580ms cubic-bezier(0.22, 1, 0.36, 1), transform 580ms cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: isTransitioningOut ? 'none' : 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
      />

      {/* Minimal Forest-Emerald Glassmorphic Skip Intro Button */}
      <button
        type="button"
        onClick={() => triggerExit(450)}
        onMouseEnter={() => setSkipHovered(true)}
        onMouseLeave={() => setSkipHovered(false)}
        title="Skip intro (Esc)"
        style={{
          position: 'absolute',
          bottom: '1.15rem',
          right: '1.15rem',
          zIndex: 30,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.48rem 0.92rem',
          borderRadius: '999px',
          background: skipHovered
            ? 'rgba(16, 36, 26, 0.9)'
            : 'rgba(10, 21, 16, 0.78)',
          border: skipHovered
            ? '1px solid rgba(52, 211, 153, 0.55)'
            : '1px solid rgba(52, 211, 153, 0.28)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: '#A7F3D0',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.74rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.45)',
          transition: 'background 180ms ease, border-color 180ms ease, transform 180ms ease',
          transform: skipHovered ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        <span>Skip Intro</span>
        <FastForward size={13} />
      </button>

      {/* Hairline 2px Bottom Progress Bar */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'rgba(255, 255, 255, 0.06)',
          zIndex: 20,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #2563eb 0%, #fc3d21 50%, #34d399 100%)',
            transition: 'width 150ms linear',
          }}
        />
      </div>
    </div>
  );
}
