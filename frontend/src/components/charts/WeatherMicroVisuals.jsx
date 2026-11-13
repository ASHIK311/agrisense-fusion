import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

function isAppMotionPaused() {
  return typeof document !== 'undefined' && document.body.classList.contains('pause-motion');
}

/**
 * Spinning 3-blade wind turbine/anemometer icon whose rotation rate scales with wind speed (ws10m).
 */
export function WindRotorGlyph({ speedMs = 2.4, size = 18 }) {
  const rotorRef = useRef(null);

  useEffect(() => {
    const el = rotorRef.current;
    if (!el) return undefined;
    if (isAppMotionPaused()) return undefined;
    const revSec = Math.max(0.85, 3.2 - Math.min(2.1, Number(speedMs || 2) * 0.35));
    const tween = gsap.to(el, {
      rotation: 360,
      duration: revSec,
      repeat: -1,
      ease: 'none',
      transformOrigin: '50% 50%',
    });
    return () => tween.kill();
  }, [speedMs]);

  return (
    <svg
      ref={rotorRef}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ color: '#22d3ee', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="2.1" fill="#22d3ee" />
      <path d="M12 10C12 6.5 13.6 3.5 12 2C10.4 3.5 10.7 7 12 10Z" fill="#38bdf8" opacity="0.92" />
      <path d="M13.8 13C16.8 14.7 19.8 14.8 20.6 12.8C18.6 11.9 15.8 11.7 13.8 13Z" fill="#22d3ee" opacity="0.92" />
      <path d="M10.2 13C7.2 14.7 5.7 17.5 7.2 19.2C8.9 17.8 10 15.3 10.2 13Z" fill="#7dd3fc" opacity="0.92" />
    </svg>
  );
}

/**
 * Continuous 60fps HTML5 Canvas atmosphere overlay for Rain, Wind, Solar/ET0, and River Discharge cards.
 * Keeps left text zone clear while running smoothly at all times (unless user clicks Pause Motion).
 */
export function WeatherAtmosphereOverlay({ type, value = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = 0;
    let isVisible = true;
    let width = 260;
    let height = 96;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = Math.max(180, Math.floor(rect?.width || 260));
      height = Math.max(84, Math.floor(rect?.height || 96));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    const num = Number(value) || 0;

    // Initialize particle pools per type
    const drops = Array.from({ length: Math.min(28, Math.max(12, Math.round(num * 4))) }, (_, i) => ({
      x: (i / 18) * width + Math.random() * 24,
      y: Math.random() * height,
      len: 10 + Math.random() * 8,
      vy: 2.3 + Math.random() * 1.5,
      alpha: 0.25 + Math.random() * 0.5,
    }));
    const ripples = [];

    const windParticles = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * width,
      y: 12 + ((i * 19) % Math.max(36, height - 18)),
      len: 16 + Math.random() * 24,
      vx: (1.1 + Math.min(2.2, num * 0.35)) * (0.85 + Math.random() * 0.4),
      amp: 2.2 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.22 + Math.random() * 0.42,
    }));

    const vaporParticles = Array.from({ length: 14 }, () => ({
      x: width * 0.45 + Math.random() * (width * 0.5),
      y: height * (0.4 + Math.random() * 0.6),
      r: 1.4 + Math.random() * 2.2,
      vy: 0.35 + Math.random() * 0.45,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.2 + Math.random() * 0.45,
    }));

    let t = 0;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.032;

      if (type === 'rain') {
        if (num > 0.05) {
          for (const d of drops) {
            // Fade rain softly on the far-left label side, full brightness on right & lower band
            const zoneFade = d.x < width * 0.38 ? 0.35 : 1.0;
            ctx.strokeStyle = `rgba(56, 189, 248, ${(d.alpha * zoneFade).toFixed(2)})`;
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 2.2, d.y + d.len);
            ctx.stroke();

            d.y += d.vy;
            d.x -= 0.35;
            if (d.y > height - 4) {
              if (ripples.length < 10) {
                ripples.push({ x: d.x, y: height - 3, r: 2, maxR: 12 + Math.random() * 8, a: 0.65 });
              }
              d.y = -d.len;
              d.x = Math.random() * (width + 20);
            }
          }
          for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            ctx.strokeStyle = `rgba(125, 211, 252, ${rp.a.toFixed(2)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
            ctx.stroke();
            rp.r += 0.42;
            rp.a -= 0.03;
            if (rp.a <= 0.02 || rp.r >= rp.maxR) ripples.splice(i, 1);
          }
        } else {
          // Zero rainfall dry shimmer wave along bottom horizon
          const g = ctx.createLinearGradient(0, height - 22, 0, height);
          g.addColorStop(0, 'rgba(245, 158, 11, 0)');
          g.addColorStop(1, 'rgba(245, 158, 11, 0.16)');
          ctx.fillStyle = g;
          ctx.fillRect(0, height - 22, width, 22);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.38)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          for (let x = 0; x <= width; x += 6) {
            const y = height - 8 + Math.sin(x * 0.04 + t * 1.4) * 2.2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (type === 'wind') {
        // Gentle curved streamlines biased cleanly away from primary numeric readout
        for (const wp of windParticles) {
          const textProtect = wp.x < width * 0.45 && wp.y > 22 && wp.y < 64 ? 0.22 : 1.0;
          const grad = ctx.createLinearGradient(wp.x, wp.y, wp.x + wp.len, wp.y);
          grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
          grad.addColorStop(0.55, `rgba(56, 189, 248, ${(wp.alpha * textProtect).toFixed(2)})`);
          grad.addColorStop(1, `rgba(186, 230, 253, ${((wp.alpha + 0.18) * textProtect).toFixed(2)})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let dx = 0; dx <= wp.len; dx += 4) {
            const px = wp.x + dx;
            const py = wp.y + Math.sin(px * 0.035 + wp.phase + t * 1.6) * wp.amp;
            if (dx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          wp.x += wp.vx;
          if (wp.x > width + 10) {
            wp.x = -wp.len - Math.random() * 20;
            wp.y = 10 + Math.random() * (height - 20);
          }
        }
      } else if (type === 'solar' || type === 'et0') {
        // Warm solar corona on top-right + upward evaporative moisture particles
        const sunGrad = ctx.createRadialGradient(width - 18, 18, 2, width - 18, 18, 52 + Math.sin(t) * 6);
        sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
        sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(width - 80, 0, 80, 75);

        for (const vp of vaporParticles) {
          ctx.fillStyle = `rgba(251, 191, 36, ${vp.alpha.toFixed(2)})`;
          ctx.beginPath();
          const px = vp.x + Math.sin(t + vp.sway) * 4;
          ctx.arc(px, vp.y, vp.r, 0, Math.PI * 2);
          ctx.fill();
          vp.y -= vp.vy;
          if (vp.y < 8) {
            vp.y = height - 4;
            vp.x = width * 0.45 + Math.random() * (width * 0.5);
          }
        }
      } else if (type === 'river') {
        // Flowing dual river wave across bottom surface
        const waveLayers = [
          { amp: 3.5, freq: 0.03, speed: 1.5, baseOffset: height - 13, fill: 'rgba(56, 189, 248, 0.14)', stroke: 'rgba(96, 165, 250, 0.55)' },
          { amp: 2.6, freq: 0.042, speed: -1.15, baseOffset: height - 9, fill: 'rgba(37, 99, 235, 0.16)', stroke: 'rgba(56, 189, 248, 0.45)' },
        ];
        for (const layer of waveLayers) {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 5) {
            const y = layer.baseOffset + Math.sin(x * layer.freq + t * layer.speed) * layer.amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = layer.fill;
          ctx.fill();

          ctx.beginPath();
          for (let x = 0; x <= width; x += 5) {
            const y = layer.baseOffset + Math.sin(x * layer.freq + t * layer.speed) * layer.amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = layer.stroke;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      if (isVisible && !isAppMotionPaused()) {
        rafId = window.requestAnimationFrame(drawFrame);
      } else {
        rafId = 0;
      }
    };

    drawFrame();

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            isVisible = entries.some((e) => e.isIntersecting);
            if (isVisible && !isAppMotionPaused() && !rafId) {
              rafId = window.requestAnimationFrame(drawFrame);
            }
          },
          { threshold: 0.05 }
        )
      : null;
    if (io) io.observe(canvas);

    const observer = new MutationObserver(() => {
      if (isVisible && !isAppMotionPaused() && !rafId) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      io?.disconnect();
      observer.disconnect();
    };
  }, [type, value]);

  return <canvas ref={canvasRef} className="weather-fx-canvas" aria-hidden="true" />;
}
