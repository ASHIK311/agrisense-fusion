import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PARCELS } from '../context/AgriSenseContext';

const CROP_MODEL_VERSIONS = [
  { v: 1, label: 'sentinel2 L2A raw' },
  { v: 12, label: 'temporal 12-pass stack' },
  { v: 26, label: 'AEZ-26 Barind twin' },
  { v: 56, label: 'FAO-56 Penman fusion' },
];

const CropModelSyncCard = React.memo(function CropModelSyncCard({ accentHex, paused }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % CROP_MODEL_VERSIONS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [paused]);

  const active = CROP_MODEL_VERSIONS[idx];

  return (
    <div className="orbital-hud-panel">
      <div className="orbital-hud-panel-head">
        <span>
          <strong style={{ color: accentHex }}>04</strong> CROP MODEL SYNC
        </span>
        <span>12 PASSES</span>
      </div>
      <div className="orbital-hud-sync-body">
        <div key={active.v} style={{ color: accentHex }} className="orbital-hud-version-num">
          v{active.v}
        </div>
        <div className="orbital-hud-version-stack">
          <div>v1 — sentinel2 L2A raw</div>
          <div>v26 — AEZ-26 Barind twin</div>
          <div style={{ color: '#f8fafc', fontWeight: 600 }}>
            v{active.v} — {active.label}
          </div>
        </div>
      </div>
      <div className="orbital-hud-panel-foot">
        <span>5-FOLD CV 84.63% ± 3.81% // BLOCK C 85.77%</span>
      </div>
    </div>
  );
});

export default function AgriSenseOrbitalHUD({
  selectedParcel,
  activeLat,
  activeLon,
  dashboardData,
  vwcVal = 24.2,
  drVal = 38.2,
  pauseMotion = false,
  height = 465,
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sizeRef = useRef({ width: 920, height });
  const rotationRef = useRef(0.42);
  const tiltRef = useRef(0.60);
  const velRef = useRef({ vx: 0, vy: 0 });
  const speedRef = useRef(0.0042);

  const [isPaused, setIsPaused] = useState(false);
  const [hudTheme, setHudTheme] = useState('amber');
  const [inView, setInView] = useState(true);
  const [pageHidden, setPageHidden] = useState(
    typeof document !== 'undefined' ? document.hidden : false
  );

  const effectivePaused = isPaused || pauseMotion || !inView || pageHidden;

  // Keep latest values in refs so the RAF loop never tears down on theme/data/pause toggles
  const pausedRef = useRef(effectivePaused);
  const themeRef = useRef(hudTheme);
  pausedRef.current = effectivePaused;
  themeRef.current = hudTheme;

  const latNum = Number(activeLat ?? selectedParcel?.centroid?.lat ?? 24.469);
  const lonNum = Number(activeLon ?? selectedParcel?.centroid?.lon ?? 88.33);
  const wb = dashboardData?.waterBalance || {};
  const et0Num = Number(wb.et0_mm_day ?? wb.et0_mm ?? 4.82);
  const ndviNum = Number(selectedParcel?.ndvi ?? 0.68);
  const ndmiNum = Number(selectedParcel?.ndmi ?? 0.24);
  const elevNum = Number(selectedParcel?.elevation_m ?? 37.5);
  const parcelCode = selectedParcel?.code || 'PARCEL A-01';
  const parcelArea = Number(selectedParcel?.area_ha ?? 2.4).toFixed(2);
  const vwcPct = Number(vwcVal) <= 1 ? Number(vwcVal) * 100 : Number(vwcVal);
  const drMm = Number(drVal ?? 38.2);

  const callouts = useMemo(
    () => [
      {
        angle: 0.45,
        radius: 75,
        height: 55,
        title: `${parcelCode} • Peak Window`,
        subtitle: `fao56_et0 // ${et0Num.toFixed(2)} mm/day`,
        accent: true,
      },
      {
        angle: 2.1,
        radius: 175,
        height: 92,
        title: 'sim_esp32_mesh • demo',
        subtitle: `root_vwc: ${vwcPct.toFixed(1)}% // Dr ${drMm.toFixed(1)}mm`,
      },
      {
        angle: 3.65,
        radius: 145,
        height: 42,
        title: 'barind clay loam strata',
        subtitle: `aquifer_dtw // 26.4m (28m limit)`,
      },
      {
        angle: 4.85,
        radius: 190,
        height: 68,
        title: 'nasa_power tether • 34.8 km',
        subtitle: `24.3636°N, 88.6241°E sync`,
      },
      {
        angle: 5.75,
        radius: 132,
        height: 82,
        title: 'sentinel2_ndvi_10m',
        subtitle: `ndvi ${ndviNum.toFixed(2)} // ndmi ${ndmiNum.toFixed(2)}`,
      },
    ],
    [parcelCode, et0Num, vwcPct, drMm, ndviNum, ndmiNum]
  );

  const calloutsRef = useRef(callouts);
  calloutsRef.current = callouts;

  const weatherSeries = useMemo(() => {
    const hist = dashboardData?.weatherHistory;
    if (!Array.isArray(hist) || hist.length < 3) {
      return [2.9, 3.3, 3.1, 4.4, 3.7, 4.1, 5.2, 4.0, 4.8, 4.3, 5.0];
    }
    return hist
      .slice(-14)
      .map((d) => Number(d.solar_mj ?? d.et0_mm ?? d.t2m ?? 4.0))
      .filter((v) => Number.isFinite(v));
  }, [dashboardData]);

  const fluxPolyline = useMemo(() => {
    const pts = weatherSeries.length >= 2 ? weatherSeries : [3.2, 4.1, 3.8, 4.9, 4.5, 5.1];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(max - min, 0.5);
    const coords = pts.map((v, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * 240;
      const y = 60 - ((v - min) / span) * 44;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = coords.join(' ');
    const area = `M${coords.join(' L')} L240,68 L0,68 Z`;
    const latest = pts[pts.length - 1];
    return { line, area, latest };
  }, [weatherSeries]);

  const parcelStressBars = useMemo(() => {
    const base = PARCELS.map((p) => {
      const pVwc = p.vwc <= 1 ? p.vwc * 100 : p.vwc;
      const pct = Math.max(18, Math.min(95, Math.round((1 - (pVwc - 16.5) / 22) * 88)));
      return {
        name: `${p.code.toLowerCase().replace(' ', '_')}`,
        pct,
        metric: `${pVwc.toFixed(1)}%`,
        active: p.id === selectedParcel?.id,
      };
    });
    return [
      ...base,
      { name: 'topsoil_0_15cm', pct: 62, metric: `${vwcPct.toFixed(1)}%`, active: true },
      { name: 'rootzone_40cm', pct: Math.min(92, Math.round((drMm / 55) * 85)), metric: `${drMm.toFixed(0)}mm`, active: false },
      { name: 'deep_terrace', pct: 34, metric: `${elevNum.toFixed(1)}m`, active: false },
    ];
  }, [selectedParcel?.id, vwcPct, drMm, elevNum]);

  const streamRows = useMemo(
    () => [
      { name: 'sentinel2_ndvi_10m', val: ndviNum.toFixed(2), color: '#10b981' },
      { name: 'sentinel2_ndmi_20m', val: ndmiNum.toFixed(2), color: '#38bdf8' },
      { name: 'nasa_power_tether', val: '34.8 km', color: '#f59e0b' },
      { name: 'fao56_et0_penman', val: `${et0Num.toFixed(2)} mm`, color: '#34d399' },
      { name: 'terrarium_dem_elev', val: `${elevNum.toFixed(1)} m`, color: '#94a3b8' },
      { name: 'esp32_lora_sim', val: `${vwcPct.toFixed(1)}%`, color: '#fb923c' },
    ],
    [ndviNum, ndmiNum, et0Num, elevNum, vwcPct]
  );

  const terminalLogs = useMemo(
    () => [
      { time: 'SYNC', tag: 'NASA_PWR', msg: `24.36°N, 88.62°E (${weatherSeries.length}d series)` },
      { time: 'PASS', tag: 'SENTINEL2', msg: `${parcelCode} NDVI=${ndviNum.toFixed(2)} (12 scenes)` },
      { time: 'CALC', tag: 'FAO56_WB', msg: `ET0=${et0Num.toFixed(2)} mm/d | Dr=${drMm.toFixed(1)} mm` },
      { time: 'GRID', tag: 'DEM_SLOPE', msg: `Elev ${elevNum.toFixed(1)}m ASL • AEZ-26 Terrace` },
      { time: 'MESH', tag: 'SIM_ESP32', msg: `Root VWC ${vwcPct.toFixed(1)}% (Simulated Demo)` },
      { time: 'GUARD', tag: 'AQUIFER', msg: `Barind DTW 26.4m vs 28.0m threshold` },
    ],
    [weatherSeries.length, parcelCode, ndviNum, et0Num, drMm, elevNum, vwcPct]
  );

  // IntersectionObserver & visibility listener so GPU rests cleanly off-screen
  useEffect(() => {
    const el = rootRef.current;
    let io;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => setInView(entries.some((e) => e.isIntersecting)),
        { threshold: 0.05 }
      );
      io.observe(el);
    }
    const onVis = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // 3D Orbital Hologram Canvas Engine (single persistent RAF loop, zero per-frame layout reads)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let animId = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastTs = performance.now();

    const spikes = Array.from({ length: 140 }, (_, i) => {
      const a = (i / 140) * Math.PI * 2;
      const isCluster = (a > 0.2 && a < 1.1) || (a > 2.4 && a < 3.1) || (a > 4.5 && a < 5.3);
      return {
        angle: a,
        radius: 192,
        height: isCluster ? 14 + Math.sin(i * 1.7) * 12 + (i % 5) * 6 : 3 + (i % 4) * 2,
        hot: isCluster && i % 4 === 0,
      };
    });

    const wedges = Array.from({ length: 12 }, (_, i) => {
      const start = (i / 12) * Math.PI * 2;
      const end = ((i + 0.86) / 12) * Math.PI * 2;
      const isHot = i === 0 || i === 1 || i === 2;
      return {
        start,
        end,
        innerR: 12,
        outerR: isHot ? 64 : 46 + (i % 3) * 10,
        height: isHot ? 46 + (i === 1 ? 14 : 0) : 16 + (i % 4) * 6,
        isHot,
      };
    });

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(rect.width, 300);
      const h = Math.max(rect.height, 420);
      sizeRef.current = { width: w, height: h };
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncCanvasSize);
      resizeObserver.observe(canvas);
    }

    const project = (x, y, z, cx, cy, scale) => {
      const rotation = rotationRef.current;
      const tilt = tiltRef.current;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const rx = x * cosR - z * sinR;
      const rz = x * sinR + z * cosR;

      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const py = y * cosT - rz * sinT;
      const pz = y * sinT + rz * cosT;

      const fov = 780;
      const depth = fov / (fov + pz + 240);
      return {
        x: cx + rx * depth * scale,
        y: cy - py * depth * scale,
        z: pz,
        depth,
      };
    };

    const drawRing = (radius, yOffset, cx, cy, scale, stroke, lineWidth = 1, dashed = []) => {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(dashed);
      const steps = 88;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const p = project(Math.cos(a) * radius, yOffset, Math.sin(a) * radius, cx, cy, scale);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    };

    const render = (now) => {
      const dt = Math.min((now - lastTs) / 16.667, 2.5);
      lastTs = now;

      const activeTheme = themeRef.current;
      const isAmber = activeTheme === 'amber';
      const accentMain = isAmber ? '#ff6b1a' : '#10b981';
      const accentSoft = isAmber ? '#ff9e5e' : '#6ee7b7';
      const accentGlow = isAmber ? 'rgba(255, 107, 26, 0.28)' : 'rgba(16, 185, 129, 0.28)';
      const ringColor = isAmber ? 'rgba(255, 148, 82, 0.28)' : 'rgba(52, 211, 153, 0.28)';

      const { width: W, height: H } = sizeRef.current;
      const cx = W * 0.5;
      const cy = H * 0.54;
      const scale = Math.min(W, H) / 470;

      // Smooth angular velocity & drag momentum damping
      const targetSpeed = pausedRef.current || isDragging ? 0 : 0.0042;
      speedRef.current += (targetSpeed - speedRef.current) * 0.08 * dt;
      if (!isDragging) {
        rotationRef.current += (speedRef.current + velRef.current.vx) * dt;
        tiltRef.current = Math.max(0.25, Math.min(1.15, tiltRef.current + velRef.current.vy * dt));
        velRef.current.vx *= Math.pow(0.92, dt);
        velRef.current.vy *= Math.pow(0.92, dt);
        if (Math.abs(velRef.current.vx) < 0.00005) velRef.current.vx = 0;
        if (Math.abs(velRef.current.vy) < 0.00005) velRef.current.vy = 0;
      }

      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 260 * scale);
      grad.addColorStop(0, accentGlow);
      grad.addColorStop(0.48, 'rgba(6, 18, 14, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      drawRing(235, 0, cx, cy, scale, 'rgba(148, 163, 184, 0.14)', 1, [3, 6]);
      drawRing(210, 0, cx, cy, scale, ringColor, 1.4);
      drawRing(192, 0, cx, cy, scale, 'rgba(255, 255, 255, 0.12)', 1);
      drawRing(155, 0, cx, cy, scale, ringColor, 1, [6, 4]);
      drawRing(118, 0, cx, cy, scale, 'rgba(148, 163, 184, 0.18)', 1);
      drawRing(82, 0, cx, cy, scale, ringColor, 1, [2, 4]);

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const p1 = project(Math.cos(a) * 68, 0, Math.sin(a) * 68, cx, cy, scale);
        const p2 = project(Math.cos(a) * 232, 0, Math.sin(a) * 232, cx, cy, scale);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      spikes.forEach((sp) => {
        const x = Math.cos(sp.angle) * sp.radius;
        const z = Math.sin(sp.angle) * sp.radius;
        const b = project(x, 0, z, cx, cy, scale);
        const t = project(x, sp.height, z, cx, cy, scale);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = sp.hot ? accentMain : 'rgba(226, 232, 240, 0.42)';
        ctx.lineWidth = sp.hot ? 2.2 : 1.2;
        ctx.stroke();
      });

      const sortedWedges = [...wedges].sort((a, b) => {
        const midA = (a.start + a.end) / 2;
        const midB = (b.start + b.end) / 2;
        const pa = project(Math.cos(midA) * 40, 0, Math.sin(midA) * 40, cx, cy, scale);
        const pb = project(Math.cos(midB) * 40, 0, Math.sin(midB) * 40, cx, cy, scale);
        return pb.z - pa.z;
      });

      sortedWedges.forEach((w) => {
        const arcSteps = 10;
        const topPoly = [];
        const botOuter = [];
        const topOuter = [];

        for (let i = 0; i <= arcSteps; i++) {
          const a = w.start + ((w.end - w.start) * i) / arcSteps;
          topPoly.push(project(Math.cos(a) * w.outerR, w.height, Math.sin(a) * w.outerR, cx, cy, scale));
          topOuter.push(project(Math.cos(a) * w.outerR, w.height, Math.sin(a) * w.outerR, cx, cy, scale));
          botOuter.push(project(Math.cos(a) * w.outerR, 0, Math.sin(a) * w.outerR, cx, cy, scale));
        }
        for (let i = arcSteps; i >= 0; i--) {
          const a = w.start + ((w.end - w.start) * i) / arcSteps;
          topPoly.push(project(Math.cos(a) * w.innerR, w.height, Math.sin(a) * w.innerR, cx, cy, scale));
        }

        ctx.beginPath();
        topOuter.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        for (let i = botOuter.length - 1; i >= 0; i--) {
          ctx.lineTo(botOuter[i].x, botOuter[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = w.isHot
          ? isAmber
            ? 'rgba(194, 65, 12, 0.88)'
            : 'rgba(5, 150, 105, 0.88)'
          : 'rgba(20, 32, 28, 0.84)';
        ctx.fill();

        ctx.beginPath();
        topPoly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = w.isHot ? accentMain : 'rgba(55, 74, 67, 0.86)';
        ctx.fill();
        ctx.strokeStyle = w.isHot ? '#ffffff' : 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = w.isHot ? 1.2 : 0.7;
        ctx.stroke();
      });

      const drawOrbitalArc = (startAngle, span, radius, maxH, bright) => {
        ctx.beginPath();
        const steps = 44;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const a = startAngle + span * t;
          const h = Math.sin(t * Math.PI) * maxH;
          const p = project(Math.cos(a) * radius, h, Math.sin(a) * radius, cx, cy, scale);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = bright ? '#ffffff' : accentSoft;
        ctx.lineWidth = bright ? 1.7 : 1.1;
        ctx.stroke();
      };

      drawOrbitalArc(0.2, 2.5, 168, 88, true);
      drawOrbitalArc(2.9, 2.2, 145, 64, false);
      drawOrbitalArc(4.4, 1.9, 198, 52, false);

      calloutsRef.current.forEach((node) => {
        const gx = Math.cos(node.angle) * node.radius;
        const gz = Math.sin(node.angle) * node.radius;
        const groundPt = project(gx, 0, gz, cx, cy, scale);
        const airPt = project(gx, node.height, gz, cx, cy, scale);

        ctx.beginPath();
        ctx.arc(groundPt.x, groundPt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = node.accent ? accentMain : '#f8fafc';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(groundPt.x, groundPt.y);
        ctx.lineTo(airPt.x, airPt.y);
        ctx.lineTo(airPt.x + 14, airPt.y);
        ctx.strokeStyle = node.accent ? accentMain : 'rgba(226, 232, 240, 0.65)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        const boxW = 172;
        const boxH = 36;
        const bx = Math.min(Math.max(airPt.x + 14, 10), W - boxW - 10);
        const by = Math.min(Math.max(airPt.y - boxH / 2, 10), H - boxH - 10);

        ctx.fillStyle = 'rgba(6, 12, 10, 0.9)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = node.accent ? accentMain : 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(node.title, bx + 8, by + 14);

        ctx.font = '400 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = node.accent ? accentSoft : '#94a3b8';
        ctx.fillText(node.subtitle, bx + 8, by + 27);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const onPointerDown = (e) => {
      isDragging = true;
      velRef.current = { vx: 0, vy: 0 };
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
    };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const stepVx = dx * 0.007;
      const stepVy = dy * 0.005;
      rotationRef.current += stepVx;
      tiltRef.current = Math.max(0.25, Math.min(1.15, tiltRef.current + stepVy));
      velRef.current = { vx: stepVx * 0.65, vy: stepVy * 0.45 };
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', syncCanvasSize);
      if (resizeObserver) resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  const accentHex = hudTheme === 'amber' ? '#ff6b1a' : '#10b981';

  return (
    <div ref={rootRef} className="orbital-hud-shell">
      {/* 1. TOP MISSION CONTROL HEADER BAR */}
      <header className="orbital-hud-header">
        <div className="orbital-hud-brand">
          <div style={{ backgroundColor: accentHex }} className="orbital-hud-badge">
            <div className="orbital-hud-badge-title">AGRISENSE ORBITAL TWIN</div>
            <div className="orbital-hud-badge-sub">AEZ-26 HIGH BARIND</div>
          </div>
          <div>
            <div className="orbital-hud-title">
              {parcelCode} // SENTINEL-2 + NASA POWER + FAO-56 ORBITAL HUD
            </div>
            <div className="orbital-hud-subtitle">
              GODAGARI UPAZILA ({latNum.toFixed(4)}°N, {lonNum.toFixed(4)}°E) // 34.8 km NASA POWER TETHER
            </div>
          </div>
        </div>

        <div className="orbital-hud-controls-wrap">
          <div className="orbital-hud-counters">
            {[
              { v: `${parcelArea}`, l: 'HA PLOT' },
              { v: ndviNum.toFixed(2), l: 'NDVI' },
              { v: `${drMm.toFixed(1)}`, l: 'DR MM' },
              { v: '84.6%', l: 'S2 CV' },
              { v: '34.8', l: 'KM LINK' },
            ].map((item) => (
              <div key={item.l} className="orbital-hud-counter-item">
                <div style={{ color: accentHex }} className="orbital-hud-counter-val">
                  {item.v}
                </div>
                <div className="orbital-hud-counter-lbl">{item.l}</div>
              </div>
            ))}
          </div>

          <div className="orbital-hud-btn-group">
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="orbital-hud-btn"
            >
              {isPaused || pauseMotion ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
            <div className="orbital-hud-seg" role="group" aria-label="Orbital HUD Color Mode">
              <button
                type="button"
                aria-pressed={hudTheme === 'emerald'}
                onClick={() => setHudTheme('emerald')}
                className={`orbital-hud-seg-btn ${hudTheme === 'emerald' ? 'is-active--emerald' : ''}`}
              >
                <span className="orbital-hud-seg-dot" />
                EMERALD HUD
              </button>
              <button
                type="button"
                aria-pressed={hudTheme === 'amber'}
                onClick={() => setHudTheme('amber')}
                className={`orbital-hud-seg-btn ${hudTheme === 'amber' ? 'is-active--amber' : ''}`}
              >
                <span className="orbital-hud-seg-dot" />
                AMBER
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN 3D HOLOGRAPHIC ORBITAL VIEWPORT */}
      <div
        className={`orbital-hud-viewport ${hudTheme === 'amber' ? 'orbital-hud-viewport--amber' : ''}`}
        style={{ height: `${height}px` }}
      >
        <canvas ref={canvasRef} className="orbital-hud-canvas" />

        {/* Top-Left Floating Legend Card */}
        <div className="orbital-hud-float orbital-hud-float--tl">
          <div className="orbital-hud-float-head">
            <span>00 // TELEMETRY STREAMS</span>
            <span style={{ color: accentHex }}>{effectivePaused ? 'PAUSED' : 'LIVE'}</span>
          </div>
          <div className="orbital-hud-stream-list">
            {streamRows.map((item) => (
              <div key={item.name} className="orbital-hud-stream-row">
                <div className="orbital-hud-stream-name">
                  <span className="orbital-hud-dot" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="orbital-hud-stream-val">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Right Polar Satellite Radar Scope */}
        <div className="orbital-hud-float orbital-hud-float--tr">
          <div className="orbital-hud-float-head">
            <span>SAT PASS</span>
            <span style={{ color: accentHex }}>S2 L2A</span>
          </div>
          <svg viewBox="0 0 100 100" className="orbital-hud-radar-svg">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.1)" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.1)" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.1)" />
            <path d="M 18 72 Q 48 20 82 36" fill="none" stroke={accentHex} strokeWidth="1.8" />
            <circle cx="56" cy="36" r="3" fill="#ffffff" />
            <circle cx="32" cy="54" r="2.2" fill={accentHex} />
          </svg>
          <div className="orbital-hud-radar-foot">TETHER 34.8 km ESE // 10m RES</div>
        </div>

        {/* Bottom-Left Coordinates Readout */}
        <div className="orbital-hud-float orbital-hud-float--bl">
          <div style={{ color: '#94a3b8' }}>
            LAT {latNum.toFixed(4)}° N // LON {lonNum.toFixed(4)}° E
          </div>
          <div className="orbital-hud-kv">
            <span>ET0 PENMAN:</span>
            <strong style={{ color: accentHex }}>{et0Num.toFixed(2)} mm/d</strong>
          </div>
          <div className="orbital-hud-kv">
            <span>ROOT VWC / DR:</span>
            <strong style={{ color: '#e2e8f0' }}>
              {vwcPct.toFixed(1)}% ({drMm.toFixed(1)} mm)
            </strong>
          </div>
        </div>

        {/* Bottom-Right Drag Hint */}
        <div className="orbital-hud-float orbital-hud-float--br">
          DRAG TO ROTATE 360° &amp; TILT
        </div>
      </div>

      {/* 3. BOTTOM 8-PANEL MODULAR TELEMETRY MATRIX */}
      <section className="orbital-hud-matrix">
        {/* Panel 01: Crop Water Stress & Parcels */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>01</strong> BARIND PLOT VWC &amp; STRESS
            </span>
            <span>3 PARCELS</span>
          </div>
          <div className="orbital-hud-bars">
            {parcelStressBars.map((b) => (
              <div key={b.name} className="orbital-hud-bar-row">
                <span className="orbital-hud-bar-lbl">{b.name}</span>
                <div className="orbital-hud-bar-track">
                  <div
                    className="orbital-hud-bar-fill"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: b.active ? accentHex : '#475569',
                    }}
                  />
                </div>
                <span className="orbital-hud-bar-num">{b.metric}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 02: NASA POWER Radiative / ET Flux */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>02</strong> SOLAR / ET0 FLUX TREND
            </span>
            <span>{fluxPolyline.latest.toFixed(1)} UNIT</span>
          </div>
          <svg viewBox="0 0 240 70" className="orbital-hud-flux-svg">
            <defs>
              <linearGradient id="orbitalEtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentHex} stopOpacity="0.45" />
                <stop offset="100%" stopColor={accentHex} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={fluxPolyline.area} fill="url(#orbitalEtGrad)" />
            <polyline fill="none" stroke={accentHex} strokeWidth="1.8" points={fluxPolyline.line} />
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="1.1"
              strokeDasharray="3 3"
              points="0,58 60,52 120,46 180,42 240,36"
            />
          </svg>
          <div className="orbital-hud-panel-foot orbital-hud-panel-foot--split">
            <span>-{weatherSeries.length}D NASA POWER</span>
            <span>LATEST {et0Num.toFixed(2)} mm/d</span>
          </div>
        </div>

        {/* Panel 03: Diurnal Heat & Low-Loss Matrix */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>03</strong> DIURNAL IRRIGATION MATRIX
            </span>
            <span>6–9 AM PEAK</span>
          </div>
          <div className="orbital-hud-heat-grid">
            {Array.from({ length: 48 }).map((_, idx) => {
              const col = idx % 12;
              const isPeakCol = col === 3 || col === 4;
              return (
                <div
                  key={idx}
                  className="orbital-hud-heat-cell"
                  style={{
                    backgroundColor: isPeakCol
                      ? accentHex
                      : idx % 5 === 0
                      ? 'rgba(148, 163, 184, 0.32)'
                      : 'rgba(20, 32, 28, 0.72)',
                  }}
                />
              );
            })}
          </div>
          <div className="orbital-hud-panel-foot orbital-hud-panel-foot--split">
            <span>00h</span>
            <span style={{ color: accentHex }}>06h–09h OPTIMAL WINDOW</span>
            <span>23h</span>
          </div>
        </div>

        {/* Panel 04: Cycling Model Provenance */}
        <CropModelSyncCard accentHex={accentHex} paused={effectivePaused} />

        {/* Panel 05: Live Telemetry Log Stream */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>05</strong> TELEMETRY LOG // STREAM
            </span>
            <span>VERIFIED</span>
          </div>
          <div className="orbital-hud-logs">
            {terminalLogs.map((log, i) => (
              <div key={log.tag} className="orbital-hud-log-row">
                <span className="orbital-hud-log-time">{log.time}</span>
                <span
                  className="orbital-hud-log-tag"
                  style={{ backgroundColor: i % 2 === 0 ? accentHex : '#94a3b8' }}
                >
                  {log.tag}
                </span>
                <span className="orbital-hud-log-msg">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 06: Field Shift Advisory */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>06</strong> FIELD SHIFT // ADVISORY
            </span>
            <span>FAO-56</span>
          </div>
          <div className="orbital-hud-advisory">
            <div style={{ color: '#94a3b8' }}>{parcelCode} • {selectedParcel?.stage || 'Active Season'}</div>
            <div className="orbital-hud-advisory-main">
              Schedule drip pulse between <span style={{ color: accentHex }}>06:00–09:00 AM</span> while Barind DTW stays at{' '}
              <span style={{ color: accentHex }}>26.4 m</span> (28.0 m limit).
            </div>
            <div className="orbital-hud-panel-foot">
              <span>Crop: {selectedParcel?.crop || 'Boro → Mustard-Mungbean'}</span>
            </div>
          </div>
        </div>

        {/* Panel 07: Simulated ESP32 Mesh Health */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>07</strong> ESP32_MESH (SIMULATED)
            </span>
            <span>DEMO</span>
          </div>
          <div className="orbital-hud-mesh-list">
            {[
              { k: 'soil_capacitive_vwc', v: `${vwcPct.toFixed(1)}%`, w: '92%' },
              { k: 'aquifer_dtw_gauge', v: '26.4 m', w: '78%' },
              { k: 'dht22_canopy_rh', v: `${et0Num.toFixed(1)}mm`, w: '64%' },
              { k: 'lora_gateway_tether', v: '34.8 km', w: '48%' },
            ].map((row) => (
              <div key={row.k} className="orbital-hud-mesh-item">
                <div className="orbital-hud-mesh-meta">
                  <span>{row.k}</span>
                  <span style={{ color: '#94a3b8' }}>{row.v}</span>
                </div>
                <div className="orbital-hud-mesh-track">
                  <div className="orbital-hud-mesh-fill" style={{ width: row.w, backgroundColor: accentHex }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 08: Simulated Node Status Matrix */}
        <div className="orbital-hud-panel">
          <div className="orbital-hud-panel-head">
            <span>
              <strong style={{ color: accentHex }}>08</strong> MESH BLOCKS (SIM DEMO)
            </span>
            <span>VWC {vwcPct.toFixed(0)}%</span>
          </div>
          <div className="orbital-hud-blocks-grid">
            {Array.from({ length: 32 }).map((_, i) => {
              const isTrigger = i < Math.max(1, Math.min(4, Math.round(drMm / 18)));
              return (
                <div
                  key={i}
                  className="orbital-hud-block"
                  style={{
                    backgroundColor: isTrigger
                      ? accentHex
                      : i < 29
                      ? 'rgba(148, 163, 184, 0.25)'
                      : 'rgba(20, 32, 28, 0.48)',
                  }}
                />
              );
            })}
          </div>
          <div className="orbital-hud-panel-foot orbital-hud-panel-foot--split">
            <span>UN-CALIBRATED PROVISIONAL DEMO</span>
            <span>AEZ-26</span>
          </div>
        </div>
      </section>
    </div>
  );
}
