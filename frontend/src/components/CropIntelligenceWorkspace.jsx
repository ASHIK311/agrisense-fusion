import React from 'react';
import { Wheat, Sliders, Bot, ArrowRight, Scale, Droplets } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import CropRotationExplorer from './CropRotationExplorer';

const BARC_SUITABILITY_SCORES = [
  {
    crop: 'T. Aman Rice (Kharif-II Monsoon)',
    score: 78.92,
    season: 'Jul – Nov',
    kcProfile: '1.05 → 1.20 → 0.70',
    waterNeedMm: 420,
    riskNote: 'Rainfed-supported; highest historical BARC suitability in AEZ-26',
    color: '#16865B',
  },
  {
    crop: 'Rabi Maize (Winter Hybrid)',
    score: 73.44,
    season: 'Nov – Apr',
    kcProfile: '0.30 → 1.20 → 0.35',
    waterNeedMm: 480,
    riskNote: 'High solar radiation conversion; moderate irrigation requirement',
    color: '#22C55E',
  },
  {
    crop: 'Wheat (BARI Gom-30/32)',
    score: 57.41,
    season: 'Nov – Mar',
    kcProfile: '0.30 → 1.15 → 0.40',
    waterNeedMm: 310,
    riskNote: 'Low water footprint; sensitive to terminal February heat spikes',
    color: '#0284C7',
  },
  {
    crop: 'T. Aus Rice (Pre-Monsoon)',
    score: 40.98,
    season: 'Apr – Jul',
    kcProfile: '1.00 → 1.15 → 0.75',
    waterNeedMm: 610,
    riskNote: 'Exposed to pre-monsoon heat-dryness (Tmax ≥ 35°C) during establishment',
    color: '#D99A36',
  },
  {
    crop: 'Boro Rice (Dry Season Irrigated)',
    score: 40.51,
    season: 'Jan – May',
    kcProfile: '1.05 → 1.20 → 0.90',
    waterNeedMm: 1150,
    riskNote: 'Severe groundwater overdraft driver (+0.65 m/yr DTW drawdown)',
    color: '#D65F58',
  },
];

export default function CropIntelligenceWorkspace({ rotationResult, onUpdateWeights }) {
  const { navigateToWorkspace, askAssistantWithPrompt } = useAgriSense();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Workspace Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-terracotta">
                <Wheat size={13} /> Subsystem M4 • Agronomic Planning
              </span>
              <ProvenanceBadge
                type="HISTORICAL BASELINE"
                label="BARC AEZ-26 SUITABILITY BASELINE + 4-SLIDER MCDA"
                source="Bangladesh Agricultural Research Council (BARC) AEZ-26 Suitability Dataset"
                calibration="Weighted historical land-suitability index — NOT yield probability or guaranteed harvest"
                compact
              />
            </div>
            <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
              BARC Historical Suitability &amp; MCDA Rotation Explorer
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Multi-Criteria Decision Analysis evaluating water-saving alternatives to unsustainable Boro monoculture in Godagari Upazila.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigateToWorkspace('simulator')}
            >
              <Scale size={14} />
              <span>Compare Scenarios in Simulator</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                askAssistantWithPrompt(
                  'Compare the BARC historical baseline suitability scores for Aman (78.92%), Maize (73.44%), Wheat (57.41%), Aus (40.98%), and Boro (40.51%) in Godagari Upazila.'
                )
              }
            >
              <Bot size={14} />
              <span>Ask AI About BARC Suitability</span>
            </button>
          </div>
        </div>
      </div>

      {/* BARC Historical Weighted Suitability Baseline Table & Bars */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="card-title" style={{ marginBottom: '0.5rem' }}>
          <span>BARC AEZ-26 Historical Weighted Crop Suitability Baselines</span>
          <ProvenanceBadge
            type="HISTORICAL BASELINE"
            label="HISTORICAL SUITABILITY ≠ YIELD PROBABILITY"
            source="Member 4 BARC Suitability Matrix for Godagari Upazila"
            compact
          />
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.1rem', lineHeight: '1.6' }}>
          These percentages represent edaphic, agroclimatic, and hydrological suitability weights for the High Barind Tract (<code>AEZ 26</code>). Notice how monsoon-supported <strong>T. Aman (78.92%)</strong> and <strong>Rabi Maize (73.44%)</strong> significantly outperform dry-season irrigated <strong>Boro Rice (40.51%)</strong>.
        </p>

        <div className="table-container">
          <table>
            <caption className="visually-hidden">
              BARC AEZ-26 Historical Weighted Crop Suitability Scores and FAO-56 Kc Profiles
            </caption>
            <thead>
              <tr>
                <th scope="col">Crop &amp; Season</th>
                <th scope="col">BARC Weighted Suitability</th>
                <th scope="col">Window</th>
                <th scope="col">FAO-56 Kc Curve (Ini→Mid→End)</th>
                <th scope="col">Seasonal Water Need</th>
                <th scope="col">Agronomic &amp; Hydrological Note</th>
              </tr>
            </thead>
            <tbody>
              {BARC_SUITABILITY_SCORES.map((item) => (
                <tr key={item.crop}>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{item.crop}</strong>
                  </td>
                  <td style={{ minWidth: '185px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <strong className="mono" style={{ color: item.color, width: '60px' }}>
                        {item.score.toFixed(2)}%
                      </strong>
                      <div className="score-bar-bg" style={{ flex: 1, height: '8px', background: 'var(--bg-alt)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          className="score-bar-fill"
                          style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: '999px' }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="mono">{item.season}</td>
                  <td className="mono">{item.kcProfile}</td>
                  <td className="mono">~{item.waterNeedMm} mm</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.riskNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Crop Rotation Explorer (MCDA Engine) */}
      <CropRotationExplorer
        rotationResult={rotationResult}
        onUpdateWeights={onUpdateWeights}
      />
    </div>
  );
}
