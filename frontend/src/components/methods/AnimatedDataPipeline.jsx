import React, { useEffect, useRef, useState } from 'react';
import { useAgriSense } from '../../context/AgriSenseContext';

const PIPELINE_NODES = [
  { id: 'esp32', x: 24, y: 38, w: 175, h: 66, title: 'ESP32 Edge Probe', sub: 'VWC / Temp [SIMULATED]', color: '#fb923c', badge: 'SIMULATED' },
  { id: 'nasa_power', x: 24, y: 124, w: 175, h: 66, title: 'NASA POWER + S2', sub: 'MERRA-2 · Sentinel-2 10m', color: '#38bdf8', badge: 'LIVE' },
  { id: 'groundwater_module', x: 24, y: 210, w: 175, h: 66, title: 'BMDA Piezometer', sub: '26.4m / 28.0m [PROXY]', color: '#fbbf24', badge: 'PROXY' },
  { id: 'backend_ingress', x: 262, y: 124, w: 180, h: 66, title: 'Express 5 Ingress', sub: 'HTTP 409/422 + Auth Gate', color: '#34d399', badge: 'LIVE' },
  { id: 'database', x: 498, y: 124, w: 170, h: 66, title: 'PostgreSQL / Store', sub: '7-Table DDL + Atomic JSON', color: '#818cf8', badge: 'LIVE' },
  { id: 'physics_engine', x: 262, y: 222, w: 180, h: 66, title: 'FAO-56 Physics', sub: 'ET₀ · TAW · Dr (Es=null)', color: '#38bdf8', badge: 'PARITY' },
  { id: 'mcda_engine', x: 498, y: 222, w: 170, h: 66, title: 'Crop MCDA + RAG', sub: '4-Slider · 83 KB Chunks', color: '#34d399', badge: 'RULE' },
  { id: 'frontend_dashboard', x: 722, y: 172, w: 158, h: 72, title: 'AgriSense SPA', sub: 'Charts · Tables · Reports', color: '#fbbf24', badge: 'UI' },
];

const PIPELINE_EDGES = [
  { id: 'e1', from: 'esp32', to: 'backend_ingress', d: 'M 199 71 C 232 71, 232 142, 262 142', color: '#fb923c', speed: 0.42 },
  { id: 'e2', from: 'nasa_power', to: 'backend_ingress', d: 'M 199 157 L 262 157', color: '#38bdf8', speed: 0.54 },
  { id: 'e3', from: 'groundwater_module', to: 'backend_ingress', d: 'M 199 243 C 232 243, 232 172, 262 172', color: '#fbbf24', speed: 0.40 },
  { id: 'e4', from: 'backend_ingress', to: 'database', d: 'M 442 157 L 498 157', color: '#34d399', speed: 0.58 },
  { id: 'e5', from: 'database', to: 'physics_engine', d: 'M 583 190 C 583 206, 352 206, 352 222', color: '#818cf8', speed: 0.44 },
  { id: 'e6', from: 'physics_engine', to: 'mcda_engine', d: 'M 442 255 L 498 255', color: '#38bdf8', speed: 0.56 },
  { id: 'e7', from: 'database', to: 'frontend_dashboard', d: 'M 668 157 C 696 157, 696 196, 722 196', color: '#818cf8', speed: 0.49 },
  { id: 'e8', from: 'mcda_engine', to: 'frontend_dashboard', d: 'M 668 255 C 696 255, 696 220, 722 220', color: '#34d399', speed: 0.52 },
];

const SWIMLANES = [
  { x: 16, w: 192, label: '1. DATA SOURCES', accent: '#38bdf8' },
  { x: 252, w: 200, label: '2. INGRESS & PHYSICS', accent: '#34d399' },
  { x: 488, w: 190, label: '3. STORE & DECISION', accent: '#818cf8' },
  { x: 714, w: 174, label: '4. PRESENTATION', accent: '#fbbf24' },
];

export default function AnimatedDataPipeline({ selectedNodeId, highlightedNodeIds = [], onSelectNodeId }) {
  const { pauseMotion } = useAgriSense();
  const wrapRef = useRef(null);
  const pathRefs = useRef({});
  const packetCircleRefs = useRef({});
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animatePackets = inView && !pauseMotion;

  useEffect(() => {
    // Place initial static positions immediately so SSR/paused view still displays clean nodes & packets
    const setPacketPositions = (elapsedSec) => {
      PIPELINE_EDGES.forEach((edge, idx) => {
        const pathEl = pathRefs.current[edge.id];
        if (!pathEl || typeof pathEl.getTotalLength !== 'function') return;
        const len = pathEl.getTotalLength();
        if (!len) return;

        // Three staggered samples along each edge (leading bright packet, trailing halo, tail dot)
        const baseT = (elapsedSec * edge.speed + idx * 0.21) % 1;
        const offsets = [0, 0.5, 0.94];
        offsets.forEach((off, pIdx) => {
          const t = (baseT + off) % 1;
          const pt = pathEl.getPointAtLength(t * len);
          const groupEls = packetCircleRefs.current[`${edge.id}_${pIdx}`];
          if (groupEls) {
            groupEls.forEach((circle) => {
              if (circle) {
                circle.setAttribute('cx', pt.x.toFixed(1));
                circle.setAttribute('cy', pt.y.toFixed(1));
              }
            });
          }
        });
      });
    };

    setPacketPositions(0.35);
    if (!animatePackets) return undefined;

    let rafId = 0;
    const startMs = performance.now();
    const tick = (now) => {
      const elapsedSec = (now - startMs) / 1000;
      setPacketPositions(elapsedSec);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [animatePackets]);

  const registerPacketCircle = (key, slot) => (el) => {
    if (!packetCircleRefs.current[key]) packetCircleRefs.current[key] = [];
    packetCircleRefs.current[key][slot] = el;
  };

  return (
    <div ref={wrapRef} className="surface" style={{ padding: '0.95rem', overflowX: 'auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.67rem',
            fontWeight: 700,
            color: animatePackets ? '#34d399' : 'var(--text-muted)',
            padding: '0.2rem 0.58rem',
            borderRadius: '999px',
            border: `1px solid ${animatePackets ? 'rgba(52, 211, 153, 0.35)' : 'var(--border-subtle)'}`,
            background: animatePackets ? 'rgba(52, 211, 153, 0.08)' : 'var(--bg-alt)',
          }}
        >
          <span
            className={animatePackets ? 'methods-kicker-dot' : undefined}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: animatePackets ? '#34d399' : '#94a3b8',
              boxShadow: animatePackets ? '0 0 8px #34d399' : 'none',
            }}
          />
          {animatePackets ? 'LIVE 60FPS PACKET FLOW ACTIVE' : 'MOTION PAUSED BY USER'}
        </span>

        <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
          {PIPELINE_NODES.length} Nodes · {PIPELINE_EDGES.length} Verified Channels · Click any node to inspect schema
        </span>
      </div>

      <svg
        viewBox="0 0 904 316"
        role="img"
        aria-label="Interactive animated AgriSense Fusion system data pipeline"
        style={{ width: '100%', minWidth: '680px', height: 'auto', display: 'block' }}
      >
        <defs>
          <pattern id="pipeGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--border-subtle)" strokeWidth="0.6" opacity="0.4" />
          </pattern>
          <filter id="packetGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="904" height="316" rx="12" fill="url(#pipeGrid)" />

        {/* Swimlane column headers */}
        {SWIMLANES.map((lane) => (
          <g key={lane.label}>
            <rect x={lane.x} y="8" width={lane.w} height="296" rx="10" fill="var(--bg-alt)" fillOpacity="0.28" stroke="var(--border-subtle)" strokeDasharray="3 4" />
            <circle cx={lane.x + 14} cy="20" r="3" fill={lane.accent} />
            <text x={lane.x + 22} y="23.5" fontSize="8.5" fontWeight="700" fill="var(--text-dim)" className="mono">
              {lane.label}
            </text>
          </g>
        ))}

        {/* Edges + Always-Running RAF-Driven Multi-Halo Data Packets */}
        {PIPELINE_EDGES.map((edge) => {
          const isEdgeHighlighted =
            edge.from === selectedNodeId ||
            edge.to === selectedNodeId ||
            highlightedNodeIds.includes(edge.from) ||
            highlightedNodeIds.includes(edge.to);
          return (
            <g key={edge.id}>
              {/* Base wire */}
              <path
                ref={(el) => {
                  pathRefs.current[edge.id] = el;
                }}
                d={edge.d}
                fill="none"
                stroke={edge.color}
                strokeOpacity={isEdgeHighlighted ? 0.55 : 0.25}
                strokeWidth={isEdgeHighlighted ? 4.2 : 3}
              />
              {/* Flowing dashed energy stream */}
              <path
                d={edge.d}
                fill="none"
                stroke={edge.color}
                strokeWidth={isEdgeHighlighted ? 2.5 : 1.9}
                strokeOpacity={isEdgeHighlighted ? 0.95 : 0.72}
                className={animatePackets ? 'methods-packet-flow' : undefined}
              />

              {/* Packet 1: Bright hero orb with white hot center & soft glow */}
              <circle
                ref={registerPacketCircle(`${edge.id}_0`, 0)}
                r="8.5"
                fill={edge.color}
                fillOpacity="0.22"
                filter="url(#packetGlow)"
              />
              <circle
                ref={registerPacketCircle(`${edge.id}_0`, 1)}
                r="4.5"
                fill={edge.color}
                fillOpacity="0.88"
              />
              <circle
                ref={registerPacketCircle(`${edge.id}_0`, 2)}
                r="2.1"
                fill="#ffffff"
              />

              {/* Packet 2: Secondary staggered data frame */}
              <circle
                ref={registerPacketCircle(`${edge.id}_1`, 0)}
                r="6.2"
                fill={edge.color}
                fillOpacity="0.2"
              />
              <circle
                ref={registerPacketCircle(`${edge.id}_1`, 1)}
                r="3.2"
                fill="#ffffff"
                stroke={edge.color}
                strokeWidth="1.4"
              />

              {/* Packet 3: Micro pulse */}
              <circle
                ref={registerPacketCircle(`${edge.id}_2`, 0)}
                r="2.2"
                fill={edge.color}
                fillOpacity="0.85"
              />
            </g>
          );
        })}

        {/* Interactive Nodes */}
        {PIPELINE_NODES.map((node) => {
          const active = selectedNodeId === node.id;
          const stageHighlighted = highlightedNodeIds.includes(node.id);
          const lit = active || stageHighlighted;
          return (
            <g
              key={node.id}
              onClick={() => onSelectNodeId && onSelectNodeId(node.id)}
              style={{ cursor: 'pointer' }}
            >
              {lit && (
                <rect
                  x={node.x - 4}
                  y={node.y - 4}
                  width={node.w + 8}
                  height={node.h + 8}
                  rx="13"
                  fill="none"
                  stroke={node.color}
                  strokeWidth={active ? '2' : '1.4'}
                  strokeDasharray={stageHighlighted && !active ? '5 3' : undefined}
                  opacity={active ? '0.82' : '0.62'}
                />
              )}
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx="11"
                fill="var(--bg-surface)"
                stroke={lit ? node.color : 'var(--border-subtle)'}
                strokeWidth={active ? 2.4 : stageHighlighted ? 1.9 : 1.2}
              />
              <rect x={node.x} y={node.y} width="5" height={node.h} rx="2.5" fill={node.color} />
              <circle
                cx={node.x + node.w - 14}
                cy={node.y + node.h - 14}
                r="3.5"
                fill={node.color}
                className={animatePackets ? 'methods-pulse-dot' : undefined}
              />
              <text x={node.x + 14} y={node.y + 24} fontSize="11.2" fontWeight="800" fill="var(--text-main)" className="font-display">
                {node.title}
              </text>
              <text x={node.x + 14} y={node.y + 42} fontSize="9" fill="var(--text-muted)" className="mono">
                {node.sub}
              </text>
              <text x={node.x + node.w - 10} y={node.y + 18} textAnchor="end" fontSize="7.8" fontWeight="700" fill={node.color} className="mono">
                {node.badge}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
