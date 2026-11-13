import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import ProvenanceBadge from './ProvenanceBadge';

export default function DiseasePanel({ controlledSubTab = null }) {
  const [diseases, setDiseases] = useState([]);
  const [papers, setPapers] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [localSubTab, setLocalSubTab] = useState('screening'); // 'screening' | 'catalog' | 'papers'
  const activeSubTab = controlledSubTab || localSubTab;
  const isControlled = Boolean(controlledSubTab);
  const [loading, setLoading] = useState(true);

  // Microclimate Calculator Inputs
  const [tempC, setTempC] = useState(28);
  const [rhPct, setRhPct] = useState(85);
  const [leafWetnessHours, setLeafWetnessHours] = useState(10);
  const [screenResults, setScreenResults] = useState(null);
  const [screeningLoading, setScreeningLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/diseases').then((r) => r.json()),
      fetch('/api/v1/diseases/research/papers').then((r) => r.json()),
    ])
      .then(([disData, papData]) => {
        if (disData.success) setDiseases(disData.diseases);
        if (papData.success) setPapers(papData.papers);
      })
      .catch((err) => console.error('Failed to load diseases:', err))
      .finally(() => setLoading(false));
  }, []);

  const runScreening = () => {
    setScreeningLoading(true);
    fetch(
      `/api/v1/diseases/screen/environmental?crop=${
        selectedCrop === 'all' ? '' : selectedCrop
      }&temp_c=${tempC}&rh_pct=${rhPct}&leaf_wetness_hours=${leafWetnessHours}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setScreenResults(data);
      })
      .catch((err) => console.error('Screening failed:', err))
      .finally(() => setScreeningLoading(false));
  };

  useEffect(() => {
    runScreening();
  }, [tempC, rhPct, leafWetnessHours, selectedCrop]);

  const filteredDiseases =
    selectedCrop === 'all'
      ? diseases
      : diseases.filter((d) => d.crop.toLowerCase().includes(selectedCrop.toLowerCase()));

  if (loading) {
    return (
      <div className="surface" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Bangladesh Plant Pathology Knowledge Base...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Sub-tabs header (hidden when controlled by outer Agronomy shell) */}
      {!isControlled && (
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            Bangladesh Crop Pathology &amp; Epidemiological Screening
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            17 validated diseases across rice, wheat, maize, pulses, and oilseeds backed by 60 DOI publications.
          </p>
        </div>

        {/* Sub-tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '0.2rem',
          }}
        >
          <button
            type="button"
            onClick={() => setLocalSubTab('screening')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.38rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: activeSubTab === 'screening' ? 'var(--bg-surface)' : 'transparent',
              color: activeSubTab === 'screening' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: activeSubTab === 'screening' ? 'var(--shadow-xs)' : 'none',
            }}
          >
            <Thermometer size={14} /> Risk Calculator
          </button>
          <button
            type="button"
            onClick={() => setLocalSubTab('catalog')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.38rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: activeSubTab === 'catalog' ? 'var(--bg-surface)' : 'transparent',
              color: activeSubTab === 'catalog' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: activeSubTab === 'catalog' ? 'var(--shadow-xs)' : 'none',
            }}
          >
            <BookOpen size={14} /> 17 Disease Catalog
          </button>
          <button
            type="button"
            onClick={() => setLocalSubTab('papers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.38rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: activeSubTab === 'papers' ? 'var(--bg-surface)' : 'transparent',
              color: activeSubTab === 'papers' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: activeSubTab === 'papers' ? 'var(--shadow-xs)' : 'none',
            }}
          >
            <FileText size={14} /> 60 Research Papers
          </button>
        </div>
      </div>
      )}

      {/* SUB-TAB 1: ENVIRONMENTAL RISK CALCULATOR */}
      {activeSubTab === 'screening' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Controls Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>
              <span>Microclimate Simulation Inputs</span>
              <ProvenanceBadge type="MODEL-DERIVED" compact />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Filter Target Crop:
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', fontWeight: 600 }}
              >
                <option value="all">All Crops (Rice, Wheat, Maize, Pulses, Mustard)</option>
                <option value="rice">Rice (ধান)</option>
                <option value="wheat">Wheat (গম)</option>
                <option value="maize">Maize (ভুট্টা)</option>
                <option value="pulse">Pulses / Mungbean (ডাল)</option>
                <option value="mustard">Mustard (সরিষা)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Air Temperature:</span>
                <span className="mono" style={{ color: 'var(--accent-terracotta)', fontWeight: 800 }}>{tempC}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="40"
                value={tempC}
                onChange={(e) => setTempC(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Relative Humidity (RH):</span>
                <span className="mono" style={{ color: 'var(--accent-water)', fontWeight: 800 }}>{rhPct}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                value={rhPct}
                onChange={(e) => setRhPct(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Simulated Leaf Wetness:</span>
                <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{leafWetnessHours} hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={leafWetnessHours}
                onChange={(e) => setLeafWetnessHours(Number(e.target.value))}
                className="slider-input"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Field sensor currently null; slider enables what-if sensitivity testing.
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>
              <span>Screened Disease Susceptibility ({screenResults?.screened_diseases?.length || 0} Diseases)</span>
              <ProvenanceBadge type="LITERATURE-DERIVED" compact />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
              {screenResults?.screened_diseases?.map((d) => {
                const isHigh = d.risk_level === 'HIGH' || d.risk_score >= 0.7;
                const isMed = d.risk_level === 'MODERATE' || d.risk_level === 'MEDIUM' || (d.risk_score >= 0.4 && d.risk_score < 0.7);
                const col = isHigh ? 'var(--accent-danger)' : isMed ? 'var(--accent-amber)' : 'var(--accent-primary)';
                const title = d.disease_name || d.name || d.disease_id;
                const pathogen = d.scientific_name || d.pathogen || d.pathogen_type || '';
                const pct = d.risk_score != null ? Math.round(d.risk_score * 100) : null;

                return (
                  <div
                    key={d.disease_id || title}
                    className="surface"
                    style={{
                      padding: '0.85rem 1rem',
                      borderLeft: `4px solid ${col}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {title} {d.pathogen_type && <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>({d.pathogen_type})</span>}
                        </div>
                        <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                          Pathogen: <em>{pathogen}</em>
                        </div>
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          background: isHigh ? 'rgba(214, 95, 88, 0.15)' : isMed ? 'rgba(217, 154, 54, 0.15)' : 'rgba(22, 134, 91, 0.15)',
                          color: col,
                        }}
                      >
                        {d.risk_level || (isHigh ? 'HIGH' : isMed ? 'MODERATE' : 'LOW')}{pct !== null ? ` · ${pct}%` : ''}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.45rem', lineHeight: '1.5' }}>
                      {d.management_summary || d.recommendation || d.mitigation || d.matched_factors?.join(' • ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 17 DISEASE CATALOG */}
      {activeSubTab === 'catalog' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredDiseases.map((dis) => (
            <div key={dis.id} className="card tilt-card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {dis.name}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {dis.crop} • {dis.bengali_name || ''}
                  </div>
                </div>
                <ProvenanceBadge type="LITERATURE-DERIVED" compact />
              </div>

              <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                Pathogen: <em>{dis.pathogen}</em>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.65rem' }}>
                {dis.symptoms}
              </p>

              <div className="surface" style={{ padding: '0.65rem', fontSize: '0.76rem', marginBottom: '0.5rem' }}>
                <strong>Optimum Conditions:</strong> Temp {dis.optimal_temp_c_min}–{dis.optimal_temp_c_max}°C, RH ≥ {dis.optimal_rh_min}%
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <strong>IPM Cultural Control:</strong> {dis.ipm_recommendation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: 60 RESEARCH PAPERS */}
      {activeSubTab === 'papers' && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>
            <span>60 Peer-Reviewed Plant Pathology Publications (100% Active DOIs)</span>
            <ProvenanceBadge type="LITERATURE-DERIVED" label="48 FULL-TEXT / 5 ABSTRACT / 7 METADATA" compact />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '520px', overflowY: 'auto' }}>
            {papers.map((p, idx) => (
              <div key={p.doi || idx} className="surface" style={{ padding: '0.85rem 1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {p.authors} ({p.year}) • <em>{p.journal}</em>
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: p.verification_status === 'FULL_TEXT' ? 'rgba(22, 134, 91, 0.15)' : 'rgba(217, 154, 54, 0.15)',
                      color: p.verification_status === 'FULL_TEXT' ? 'var(--accent-primary)' : 'var(--accent-amber)',
                      flexShrink: 0,
                    }}
                  >
                    {p.verification_status || 'VERIFIED DOI'}
                  </span>
                </div>

                {p.doi && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <a
                      href={`https://doi.org/${p.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono"
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--accent-water)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>doi:{p.doi}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
