import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Play, ShieldCheck, Calendar } from 'lucide-react';
import ProvenanceBadge from './ProvenanceBadge';
import AnimatedChartCard, { AnimatedCounter } from './charts/AnimatedChartCard';

export default function SatellitePanel() {
  const [metadata, setMetadata] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/satellite/metadata').then((r) => r.json()),
      fetch('/api/v1/satellite/scenes').then((r) => r.json()),
    ])
      .then(([metaData, scenesData]) => {
        if (metaData.success) setMetadata(metaData.metadata);
        if (scenesData.success) setScenes(scenesData.scenes);
      })
      .catch((err) => console.error('Failed to load satellite data:', err))
      .finally(() => setLoading(false));
  }, []);

  const runSampleClassification = async () => {
    setTesting(true);
    try {
      const sampleFeatures = [
        0.045, 0.078, 0.062, 0.345, 0.182,
        0.695, -0.631, 0.309, 0.542, 0.285,
        0.18, 0.72, 0.54, 0.245, 0.19,
      ];
      const res = await fetch('/api/v1/satellite/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: sampleFeatures, parcel_id: 'plot-godagari-a1' }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Classification error:', err);
    } finally {
      setTesting(false);
    }
  };

  const perf = metadata?.verified_performance || {};
  const cvPct = 84.63;
  const cvSd = 3.81;
  const blockCPct = Number(metadata?.block_c_holdout_overall_accuracy ?? perf.block_c_holdout_overall_accuracy ?? 85.77);
  const pureInteriorPct = Number(metadata?.block_c_pure_interior_accuracy ?? perf.block_c_pure_interior_accuracy ?? 90.64);
  const mixedBoundaryPct = Number(metadata?.block_c_boundary_mixed_accuracy ?? perf.block_c_boundary_mixed_accuracy ?? 75.92);

  const partitionRows = useMemo(
    () => [
      {
        id: 'cv5',
        partition: '5-Fold Spatial CV (Primary)',
        accuracy: cvPct,
        spreadSd: cvSd,
        low: Number((cvPct - cvSd).toFixed(2)),
        high: Number((cvPct + cvSd).toFixed(2)),
        sampleNote: 'N = 20,000 • Macro-F1: 0.8342 ± 0.0194 (no inter-block buffer)',
        color: '#16865B',
      },
      {
        id: 'block-b',
        partition: 'Block B Validation Set',
        accuracy: 86.09,
        spreadSd: null,
        low: 86.09,
        high: 86.09,
        sampleNote: 'Balanced Acc: 84.31% • Macro-F1: 0.8436',
        color: '#10B981',
      },
      {
        id: 'block-c',
        partition: 'Block C Holdout (Development)',
        accuracy: blockCPct,
        spreadSd: null,
        low: blockCPct,
        high: blockCPct,
        sampleNote: '5,146 / 6,000 southern latitudinal partition (not external test)',
        color: '#38BDF8',
      },
      {
        id: 'pure-interior',
        partition: 'Block C • Pure Interior',
        accuracy: pureInteriorPct,
        spreadSd: null,
        low: pureInteriorPct,
        high: pureInteriorPct,
        sampleNote: '3,639 / 4,015 homogeneous interior pixels',
        color: '#34D399',
      },
      {
        id: 'mixed-boundary',
        partition: 'Block C • Mixed Boundary',
        accuracy: mixedBoundaryPct,
        spreadSd: null,
        low: mixedBoundaryPct,
        high: mixedBoundaryPct,
        sampleNote: '1,507 / 1,985 sub-pixel terrace boundary pixels',
        color: '#D99A36',
      },
      {
        id: 'prevalence',
        partition: 'Empirical Prevalence Benchmark',
        accuracy: 77.07,
        spreadSd: null,
        low: 77.07,
        high: 77.07,
        sampleNote: '15-feature RF under empirical landscape prevalence',
        color: '#94A3B8',
      },
    ],
    [blockCPct, pureInteriorPct, mixedBoundaryPct]
  );

  const partitionTableCols = useMemo(
    () => [
      { key: 'partition', label: 'Validation Partition' },
      { key: 'accuracy', label: 'Accuracy (%)', align: 'right', format: (v) => `${Number(v).toFixed(2)}%` },
      { key: 'spreadSd', label: 'Fold ±1σ SD', align: 'right', format: (v) => (v !== null && v !== undefined ? `±${Number(v).toFixed(2)}%` : 'Single split') },
      { key: 'sampleNote', label: 'Disclosure / Sample Count' },
    ],
    []
  );

  if (loading) {
    return (
      <div className="surface" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Sentinel-2 Satellite Intelligence...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div
        className="surface"
        style={{
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div className="section-eyebrow" style={{ marginBottom: '0.2rem' }}>
            Subsystem M1 • Sentinel-2 L2A Earth Observation
          </div>
          <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            Multi-Temporal Land-Cover Classification &amp; Spectral Validation
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '720px' }}>
            10m optical bands (B2, B3, B4, B8) + 20m SWIR Band 11 resampled to 10m across 12 cloud-screened Sentinel-2 passes covering Godagari Upazila.
          </p>
        </div>
        <button
          type="button"
          onClick={runSampleClassification}
          disabled={testing}
          className="btn btn-primary"
        >
          <Play size={14} />
          <span>{testing ? 'Running 15-Feature RF...' : 'Test Live 15-Feature Inference'}</span>
        </button>
      </div>

      {/* Reconciled Validation Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="card tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            5-Fold Spatial CV (Primary)
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            <AnimatedCounter value={cvPct} decimals={2} suffix="%" /> <span style={{ fontSize: '0.95rem' }}>± {cvSd}%</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            N=20,000 • Macro-F1: 0.8342 ± 0.0194
          </div>
        </div>

        <div className="card tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Block C Holdout Overall
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-water)', marginTop: '0.2rem' }}>
            <AnimatedCounter value={blockCPct} decimals={2} suffix="%" />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Development holdout (5,146 / 6,000)
          </div>
        </div>

        <div className="card tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Pure Interior Centroids
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
            <AnimatedCounter value={pureInteriorPct} decimals={2} suffix="%" />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Homogeneous interior (3,639 / 4,015)
          </div>
        </div>

        <div className="card tilt-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Mixed Boundary Pixels
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
            <AnimatedCounter value={mixedBoundaryPct} decimals={2} suffix="%" />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Sub-pixel terrace edge (1,507 / 1,985)
          </div>
        </div>
      </div>

      {/* Spatial Validation Uncertainty & Partition Breakdown (Chart <-> Table) */}
      <AnimatedChartCard
        title="Sentinel-2 Spatial Validation Partitions & ±1σ Fold Dispersion"
        subtitle="5-Fold Spatial CV standard deviation (±3.81%) alongside Block B/C development holdout strata"
        unit="Accuracy (%)"
        badgeType="MODEL-DERIVED"
        badgeLabel="SPATIAL CV + BLOCK C"
        source="/api/v1/satellite/metadata"
        provenanceNote="No inter-block geographic buffer was applied between contiguous training/validation blocks; Block C is a southern latitudinal development holdout, not an untouched external region."
        tableColumns={partitionTableCols}
        tableRows={partitionRows}
      >
        {() => (
          <div className="surface" style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {partitionRows.map((row) => {
              const barLeft = 50;
              const span = 50;
              const pctPos = Math.max(0, Math.min(100, ((row.accuracy - barLeft) / span) * 100));
              const lowPos = Math.max(0, Math.min(100, ((row.low - barLeft) / span) * 100));
              const highPos = Math.max(0, Math.min(100, ((row.high - barLeft) / span) * 100));
              return (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 230px) 1fr 92px', gap: '0.75rem', alignItems: 'center', fontSize: '0.76rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.partition}</div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>{row.sampleNote}</div>
                  </div>
                  <div style={{ position: 'relative', height: '16px', background: 'var(--bg-alt)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pctPos}%`,
                        background: row.color,
                        opacity: 0.78,
                        borderRadius: '999px',
                        transition: 'width 0.55s ease',
                      }}
                    />
                    {row.spreadSd !== null && (
                      <div
                        title={`±1σ Fold SD: ${row.low}% – ${row.high}%`}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `${lowPos}%`,
                          width: `${Math.max(2, highPos - lowPos)}%`,
                          height: '3px',
                          transform: 'translateY(-50%)',
                          background: '#FFFFFF',
                          boxShadow: '0 0 6px rgba(255,255,255,0.65)',
                          borderRadius: '2px',
                        }}
                      />
                    )}
                  </div>
                  <div className="mono" style={{ textAlign: 'right', fontWeight: 800, color: row.color }}>
                    {row.accuracy.toFixed(2)}%{row.spreadSd !== null ? ` ±${row.spreadSd}` : ''}
                  </div>
                </div>
              );
            })}
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-dim)', paddingLeft: '242px', paddingRight: '104px' }}>
              <span>50%</span>
              <span>62.5%</span>
              <span>75%</span>
              <span>87.5%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </AnimatedChartCard>

      {/* Live Inference Result */}
      {testResult && (
        <div
          className="surface"
          style={{
            padding: '1.15rem',
            borderLeft: '4px solid var(--accent-primary)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
            Live 15-Feature RF Inference Result — {testResult.parcel_id}
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Predicted LULC Class</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {testResult.prediction?.class_label} ({Math.round((testResult.prediction?.confidence || 0) * 100)}% Confidence)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Engine Source</div>
              <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {testResult.source}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Provenance Note</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {testResult.provenance?.note}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12 Valid Sentinel-2 Scenes & 15-Feature Architecture */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1.15rem' }}>
          <div className="card-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} /> 12 Cloud-Screened Sentinel-2 L2A Scenes
            </span>
            <ProvenanceBadge type="SATELLITE-DERIVED" compact />
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {scenes.map((s, idx) => (
              <div
                key={s.scene_id}
                className="surface"
                style={{
                  padding: '0.68rem 0.88rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                  flexShrink: 0,
                  minHeight: '54px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.18rem 0.42rem',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      color: 'var(--accent-primary)',
                      flexShrink: 0,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong className="mono" style={{ color: 'var(--text-main)', display: 'block', lineHeight: 1.25 }}>{s.date}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', lineHeight: 1.3, marginTop: '0.12rem' }}>{s.season}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 700, display: 'block', lineHeight: 1.25 }}>
                    Cloud: {s.cloud_pct}%
                  </span>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', lineHeight: 1.3, marginTop: '0.12rem' }}>SCL Screened</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={15} /> 15-Feature Multi-Temporal Schema
              </span>
              <ProvenanceBadge type="MODEL-DERIVED" compact />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Resolves single-date spectral confusion between harvested fallow land and bare riverbed soils using seasonal phenology amplitude.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.78rem' }}>
              <div className="surface" style={{ padding: '0.65rem' }}>
                <strong style={{ color: 'var(--accent-primary)' }}>5 Spectral Bands</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  10m B2, B3, B4, B8 + 20m SWIR B11 (resampled to 10m)
                </div>
              </div>
              <div className="surface" style={{ padding: '0.65rem' }}>
                <strong style={{ color: 'var(--accent-water)' }}>5 Spectral Indices</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  NDVI, McFeeters NDWI, NDMI, EVI, Delta-NDVI
                </div>
              </div>
              <div className="surface" style={{ padding: '0.65rem', gridColumn: 'span 2' }}>
                <strong style={{ color: 'var(--accent-terracotta)' }}>5 Temporal Phenology Metrics</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Seasonal Min NDVI, Max NDVI, Amplitude, Mean NDMI, EVI Temporal Change
                </div>
              </div>
            </div>
          </div>

          <div
            className="surface"
            style={{
              marginTop: '0.9rem',
              padding: '0.7rem 0.85rem',
              borderLeft: '3px solid #FBBF24',
              borderRadius: '10px',
              fontSize: '0.76rem',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldCheck size={16} style={{ color: '#FBBF24', flexShrink: 0 }} />
            <span>
              <strong>HTTP 422 Scientific Gate:</strong> Crop-species satellite classification (e.g. Wheat vs Mustard) is blocked until field-level ground-truth labels are collected.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
