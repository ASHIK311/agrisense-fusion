import React, { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, Pause, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAgriSense } from '../../context/AgriSenseContext';

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'Edge & Earth Sync',
    subtitle: 'ESP32 VWC + NASA POWER + BMDA',
    metric: '5,760 sim · 1,827 NASA',
    color: '#38bdf8',
    primaryNode: 'nasa_power',
    nodeIds: ['esp32', 'nasa_power', 'groundwater_module'],
  },
  {
    step: '02',
    title: 'Ingress Validation',
    subtitle: 'Schema + UUID 409 + Bounds 422',
    metric: 'VWC ∈ [0.0, 1.0]',
    color: '#34d399',
    primaryNode: 'backend_ingress',
    nodeIds: ['backend_ingress'],
  },
  {
    step: '03',
    title: 'Dual-Mode Storage',
    subtitle: '7-Table DDL / Atomic JSON',
    metric: '7 Relational Tables',
    color: '#818cf8',
    primaryNode: 'database',
    nodeIds: ['database'],
  },
  {
    step: '04',
    title: 'Physics & Crop MCDA',
    subtitle: 'FAO-56 ET₀ + 4-Slider Rank',
    metric: 'Parity Δ < 1e-6',
    color: '#fbbf24',
    primaryNode: 'physics_engine',
    nodeIds: ['physics_engine', 'mcda_engine'],
  },
  {
    step: '05',
    title: 'SPA & Audit Report',
    subtitle: 'Charts, Tables & RAG Copilot',
    metric: '9 Live Tools · SSE',
    color: '#fb923c',
    primaryNode: 'frontend_dashboard',
    nodeIds: ['frontend_dashboard'],
  },
];

const DEPENDENCY_MATRIX = [
  {
    id: 'M1',
    name: 'Satellite LULC',
    color: '#34d399',
    upstream: ['Sentinel-2 L2A (B2/B3/B4/B8/B11)'],
    downstream: ['M4 BARC Field Boundary Mask', 'Spatial Twin Viewer'],
    gate: 'HTTP 422 on unlabelled crop species',
  },
  {
    id: 'M2',
    name: 'NASA POWER Climate',
    color: '#fbbf24',
    upstream: ['MERRA-2 0.5°×0.625°', 'CERES 1.0°'],
    downstream: ['M5 FAO-56 ET₀ Physics', 'M4 Crop Heat/Rain Scoring', 'M6 Pathology Weather Screen'],
    gate: 'HTTP 501 on weather forecast',
  },
  {
    id: 'M3',
    name: 'ESP32 Soil & IoT',
    color: '#fb923c',
    upstream: ['Simulated Capacitive FDR v2 CSV'],
    downstream: ['M5 Root-Zone Depletion (Dr)', 'M6 Edaphic Soil Rules'],
    gate: 'is_simulated: true · UNCALIBRATED',
  },
  {
    id: 'M4',
    name: 'Crop MCDA Engine',
    color: '#34d399',
    upstream: ['BARC AEZ-26 Baseline', 'M2 Climate', 'M5 Water Deficit'],
    downstream: ['What-If Rotation Simulator', 'AI Copilot Recommendation'],
    gate: 'HTTP 501 on ML Yield Prediction',
  },
  {
    id: 'M5',
    name: 'FAO-56 Water Balance',
    color: '#38bdf8',
    upstream: ['M2 Solar/Wind/Temp/RH', 'M3 Soil VWC'],
    downstream: ['M4 Irrigation Constraint', 'Irrigation Stress Trigger (Dr > RAW)'],
    gate: 'Es = null (Single-Kc Mode)',
  },
  {
    id: 'M6',
    name: 'Pathology Knowledge Base',
    color: '#f43f5e',
    upstream: ['60 DOI Literature Rules', 'M2 T2M/RH2M', 'M3 Soil Temp/VWC'],
    downstream: ['Crops & Disease Alert Panel', 'RAG Copilot Grounding'],
    gate: 'leaf_wetness_hours = null (Non-Diagnostic)',
  },
];

const TRACE_ENDPOINTS = [
  { id: 'health', label: 'System Health', url: '/api/health', color: '#34d399' },
  { id: 'dashboard', label: 'Dashboard Fusion', url: '/api/dashboard?farm_id=farm-barind-01&field_id=field-godagari-a', color: '#38bdf8' },
  { id: 'parity', label: 'FAO-56 Parity', url: '/api/v1/physics/parity-check', color: '#fbbf24' },
  { id: 'satellite', label: 'Sentinel-2 Meta', url: '/api/v1/satellite/metadata', color: '#818cf8' },
  { id: 'diseases', label: '60-DOI Pathology', url: '/api/v1/diseases', color: '#fb923c' },
];

/** Animated stage sequencer, live API latency waterfall, and subsystem dependency matrix rendered below the SVG architecture. */
export default function PipelineTelemetryStage({ onStageHighlight, onSelectNodeId }) {
  const { pauseMotion } = useAgriSense();
  const [stageIdx, setStageIdx] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const [traces, setTraces] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [activeMod, setActiveMod] = useState('M2');

  useEffect(() => {
    if (!autoCycle || pauseMotion) return undefined;
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [autoCycle, pauseMotion]);

  useEffect(() => {
    const current = PIPELINE_STAGES[stageIdx];
    if (onStageHighlight && current) {
      onStageHighlight(current.nodeIds);
    }
  }, [stageIdx, onStageHighlight]);

  const runLiveTrace = useCallback(async () => {
    setTracing(true);
    try {
      const results = await Promise.all(
        TRACE_ENDPOINTS.map(async (ep) => {
          const t0 = performance.now();
          try {
            const resp = await fetch(ep.url);
            const ms = Math.max(1, Math.round(performance.now() - t0));
            let body = null;
            try {
              body = await resp.json();
            } catch {
              body = null;
            }
            if (ep.id === 'health' && body) {
              setHealthInfo(body);
            }
            return { ...ep, status: resp.status, ok: resp.ok, ms };
          } catch {
            const ms = Math.max(1, Math.round(performance.now() - t0));
            return { ...ep, status: 0, ok: false, ms };
          }
        })
      );
      setTraces(results);
    } finally {
      setTracing(false);
    }
  }, []);

  useEffect(() => {
    runLiveTrace();
  }, [runLiveTrace]);

  const maxMs = Math.max(25, ...traces.map((t) => t.ms || 0));
  const selectedDependency = DEPENDENCY_MATRIX.find((m) => m.id === activeMod) || DEPENDENCY_MATRIX[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* 1. Always-Running 5-Stage End-to-End Sequencer */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-sky)' }}>
        <div className="methods-card-band">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Activity size={16} color="var(--m-sky)" />
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Live 5-Stage Packet Execution Sequencer
            </strong>
            <span className="methods-chip">
              Synced with diagram nodes above
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAutoCycle((v) => !v)}
            className="btn btn-secondary"
            style={{ padding: '0.28rem 0.7rem', fontSize: '0.72rem', borderRadius: '999px' }}
          >
            {autoCycle && !pauseMotion ? <Pause size={12} /> : <Play size={12} />}
            <span>{autoCycle && !pauseMotion ? 'Auto-Cycling' : 'Paused / Locked'}</span>
          </button>
        </div>
        <div style={{ padding: '1.1rem 1.25rem' }}>

        <div className="methods-stage-grid">
          {PIPELINE_STAGES.map((stage, idx) => {
            const active = idx === stageIdx;
            return (
              <button
                key={stage.step}
                type="button"
                onClick={() => {
                  setStageIdx(idx);
                  setAutoCycle(false);
                  if (onSelectNodeId) onSelectNodeId(stage.primaryNode);
                }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'left',
                  padding: '0.78rem 0.85rem',
                  borderRadius: '12px',
                  background: active ? 'var(--bg-elevated)' : 'var(--bg-alt)',
                  border: `1.5px solid ${active ? stage.color : 'var(--border-subtle)'}`,
                  boxShadow: active ? `0 0 18px ${stage.color}28` : 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                  transform: active ? 'translateY(-2px)' : 'none',
                }}
              >
                {active && !pauseMotion && (
                  <span className="methods-stage-beam" style={{ '--stage-color': stage.color }} aria-hidden="true" />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 800, color: stage.color }}>
                    STAGE {stage.step}
                  </span>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: active ? stage.color : 'var(--border-strong)',
                      boxShadow: active ? `0 0 8px ${stage.color}` : 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                  {stage.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                  {stage.subtitle}
                </div>
                <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 700, color: stage.color }}>
                  {stage.metric}
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* 2. Split Row: Real API Latency Waterfall + M1-M6 Dependency Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.1rem' }}>
        {/* Live Endpoint Latency Waterfall */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-emerald)' }}>
          <div className="methods-card-band">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldCheck size={16} color="var(--m-emerald)" />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Live API Pipeline Latency Waterfall
              </strong>
            </div>
            <button
              type="button"
              onClick={runLiveTrace}
              disabled={tracing}
              className="btn btn-secondary"
              style={{ padding: '0.26rem 0.65rem', fontSize: '0.7rem', borderRadius: '999px' }}
            >
              <RefreshCw size={12} />
              <span>{tracing ? 'Tracing...' : 'Re-Trace Live APIs'}</span>
            </button>
          </div>
          <div style={{ padding: '1.1rem 1.25rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.62rem' }}>
            {traces.map((t, i) => {
              const widthPct = Math.max(8, Math.round((t.ms / maxMs) * 100));
              return (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '115px 1fr 78px', alignItems: 'center', gap: '0.65rem' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.label}</div>
                    <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{t.url.split('?')[0]}</div>
                  </div>
                  <div style={{ height: '10px', borderRadius: '999px', background: 'var(--bg-alt)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <div
                      className="methods-waterfall-bar"
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: t.ok ? t.color : 'var(--m-rose)',
                        animationDelay: `${i * 75}ms`,
                      }}
                    />
                  </div>
                  <div className="mono" style={{ textAlign: 'right', fontSize: '0.68rem', fontWeight: 800, color: t.ok ? t.color : 'var(--m-rose)' }}>
                    {t.status || 'ERR'} · {t.ms}ms
                  </div>
                </div>
              );
            })}
          </div>

          {healthInfo && (
            <div
              className="surface mono"
              style={{
                marginTop: '0.9rem',
                padding: '0.6rem 0.8rem',
                fontSize: '0.67rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                Store: <strong style={{ color: 'var(--m-emerald)' }}>{healthInfo.storageMode}</strong>
              </span>
              <span>
                Uptime: <strong style={{ color: 'var(--m-sky)' }}>{healthInfo.uptimeSeconds}s</strong>
              </span>
            </div>
          )}
          </div>
        </div>

        {/* Interactive M1-M6 Cross-Subsystem Dependency Matrix */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `2px solid ${selectedDependency.color}` }}>
          <div className="methods-card-band">
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Cross-Subsystem Coupling &amp; Gate Matrix (M1–M6)
            </strong>
            <span className="methods-chip">
              Click M1–M6 to trace flow
            </span>
          </div>
          <div style={{ padding: '1.1rem 1.25rem' }}>

          <div style={{ display: 'flex', gap: '0.38rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            {DEPENDENCY_MATRIX.map((mod) => {
              const selected = mod.id === activeMod;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveMod(mod.id)}
                  className="mono"
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: selected ? mod.color : 'var(--bg-alt)',
                    color: selected ? '#04130e' : 'var(--text-secondary)',
                    border: `1px solid ${selected ? mod.color : 'var(--border-subtle)'}`,
                  }}
                >
                  {mod.id} · {mod.name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          <div className="surface" style={{ padding: '0.85rem 1rem', borderLeft: `3px solid ${selectedDependency.color}`, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {selectedDependency.id} — {selectedDependency.name}
              </strong>
              <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--m-rose)' }}>
                Gate: {selectedDependency.gate}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.6rem' }}>
              <div>
                <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.28rem' }}>
                  Upstream Inputs
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {selectedDependency.upstream.map((u) => (
                    <span key={u} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>• {u}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={15} color={selectedDependency.color} />
              <div>
                <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.28rem' }}>
                  Downstream Consumers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {selectedDependency.downstream.map((d) => (
                    <span key={d} style={{ fontSize: '0.72rem', color: selectedDependency.color, fontWeight: 600 }}>→ {d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
