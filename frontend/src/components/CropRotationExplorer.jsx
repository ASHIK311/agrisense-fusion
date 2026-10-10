import React, { useState, useEffect } from 'react';

export default function CropRotationExplorer({ farm, field, weather }) {
  // 1. Dynamic MCDA Weights
  const [weights, setWeights] = useState({
    waterConservation: 35,
    soilHealth: 25,
    heatResilience: 20,
    economicPreference: 20
  });

  // 2. Field & Soil Context
  const [soilType, setSoilType] = useState(field?.soil_type || 'clay_loam');
  const [soilPh, setSoilPh] = useState(6.4);
  const [previousCrop, setPreviousCrop] = useState('T_AMAN_RICE');

  // Results State
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Trigger evaluation on weight or context changes
  const runEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rotation/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights,
          soilInfo: { soilType, ph: soilPh },
          previousCrops: [previousCrop],
          weatherContext: {
            meanTemp: weather?.latest?.t2m || 28.5,
            recentRainfallMm: weather?.latest?.precip_mm || 5.0
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvaluation(data);
        if (!expandedCardId && data.rankedRotations.length > 0) {
          setExpandedCardId(data.rankedRotations[0].id);
        }
      }
    } catch (err) {
      console.error('Error evaluating crop rotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, [weights, soilType, soilPh, previousCrop]);

  const handleSliderChange = (key, value) => {
    setWeights((prev) => ({
      ...prev,
      [key]: parseInt(value)
    }));
  };

  // Helper preset configurations
  const applyPreset = (presetName) => {
    if (presetName === 'water') {
      setWeights({ waterConservation: 75, soilHealth: 15, heatResilience: 5, economicPreference: 5 });
    } else if (presetName === 'economic') {
      setWeights({ waterConservation: 5, soilHealth: 10, heatResilience: 10, economicPreference: 75 });
    } else if (presetName === 'soil') {
      setWeights({ waterConservation: 20, soilHealth: 60, heatResilience: 10, economicPreference: 10 });
    } else if (presetName === 'balanced') {
      setWeights({ waterConservation: 35, soilHealth: 25, heatResilience: 20, economicPreference: 20 });
    }
  };

  return (
    <div>
      {/* Title & Mission Statement */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-live">CORE SCIENTIFIC PRODUCT</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>MCDA ENGINE v1.0</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Crop-Rotation Explorer
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '800px', marginTop: '0.2rem' }}>
            Transparent Multi-Criteria Decision Analysis for climate adaptation in Northern Bangladesh. 
            Adjust your agronomic priorities below to observe real-time algorithmic re-ranking with explainable scoring.
          </p>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', borderColor: '#3b82f6', color: '#93c5fd' }}
            onClick={() => applyPreset('water')}
          >
            💧 Water Saver
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', borderColor: '#ec4899', color: '#f472b6' }}
            onClick={() => applyPreset('economic')}
          >
            💰 Max Profit
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', borderColor: '#10b981', color: '#34d399' }}
            onClick={() => applyPreset('soil')}
          >
            🌱 Soil Health
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
            onClick={() => applyPreset('balanced')}
          >
            ⚖️ Balanced
          </button>
        </div>
      </div>

      {/* Provisional Caution Banner */}
      <div className="banner banner-warning">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <strong>Provisional Agronomic Model:</strong> Recommendations are calculated using FAO-56 crop coefficients, 
          empirical Barind irrigation benchmarks, and biological nitrogen rules. Must be validated with local DAE (Department of 
          Agricultural Extension) / BARI specialists before field implementation.
        </div>
      </div>

      <div className="rotation-grid">
        {/* Left Column: Farm Context & Dynamic Sliders */}
        <div>
          {/* Priority Sliders Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">
              <span>Decision Priorities</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>MCDA WEIGHTS</span>
            </div>

            {/* Slider 1: Water Conservation */}
            <div className="slider-container">
              <div className="slider-header">
                <span style={{ color: '#60a5fa' }}>💧 Water Conservation</span>
                <span style={{ color: '#60a5fa' }}>{weights.waterConservation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.waterConservation}
                onChange={(e) => handleSliderChange('waterConservation', e.target.value)}
                className="slider-input"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Penalizes heavy tubewell extraction; protects Barind aquifer.
              </div>
            </div>

            {/* Slider 2: Soil Health & Legumes */}
            <div className="slider-container">
              <div className="slider-header">
                <span style={{ color: '#34d399' }}>🌱 Soil Health &amp; Nitrogen</span>
                <span style={{ color: '#34d399' }}>{weights.soilHealth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.soilHealth}
                onChange={(e) => handleSliderChange('soilHealth', e.target.value)}
                className="slider-input"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Rewards biological nitrogen fixation (Mungbean/Lentil).
              </div>
            </div>

            {/* Slider 3: Heat Resilience */}
            <div className="slider-container">
              <div className="slider-header">
                <span style={{ color: '#fbbf24' }}>☀️ Heat &amp; Climate Resilience</span>
                <span style={{ color: '#fbbf24' }}>{weights.heatResilience}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.heatResilience}
                onChange={(e) => handleSliderChange('heatResilience', e.target.value)}
                className="slider-input"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Tolerates late dry-season heat spells (&gt;34°C).
              </div>
            </div>

            {/* Slider 4: Economic Return */}
            <div className="slider-container">
              <div className="slider-header">
                <span style={{ color: '#f472b6' }}>💰 Farmer Profit &amp; Margin</span>
                <span style={{ color: '#f472b6' }}>{weights.economicPreference}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.economicPreference}
                onChange={(e) => handleSliderChange('economicPreference', e.target.value)}
                className="slider-input"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Maximizes gross margin from high-value cash crops.
              </div>
            </div>
          </div>

          {/* Field & Soil Context Card */}
          <div className="card">
            <div className="card-title">
              <span>Field Context</span>
              <span className="badge badge-live">Ag-Zone Data</span>
            </div>

            <div className="form-group">
              <label>Target Soil Texture:</label>
              <select
                className="form-control"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
              >
                <option value="clay_loam">Barind Heavy Clay Loam (ভারী এঁটেল দোআঁশ)</option>
                <option value="silt_loam">Tista Alluvial Silt Loam (পলি দোআঁশ)</option>
                <option value="sandy_loam">Old Himalayan Sandy Loam (বেলে দোআঁশ)</option>
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ margin: 0 }}>Soil pH Scale:</label>
                <strong style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>pH {soilPh}</strong>
              </div>
              <input
                type="range"
                min="4.5"
                max="8.5"
                step="0.1"
                value={soilPh}
                onChange={(e) => setSoilPh(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Previous Crop Season:</label>
              <select
                className="form-control"
                value={previousCrop}
                onChange={(e) => setPreviousCrop(e.target.value)}
              >
                <option value="T_AMAN_RICE">T. Aman Rice (Monsoon Harvested)</option>
                <option value="BORO_RICE">Boro Rice (Dry Season Irrigated)</option>
                <option value="FALLOW">Seasonal Fallow Land</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Ranked Candidate Rotations */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Ranked Rotations ({evaluation?.rankedRotations?.length || 0} Candidates Evaluated)
            </h3>
            {loading && <span style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>MCDA COMPUTING...</span>}
          </div>

          {evaluation?.rankedRotations?.map((candidate) => {
            const isTop = candidate.rank === 1;
            const isExpanded = expandedCardId === candidate.id;
            const waterSavings = 1350 - candidate.estimatedWaterUseMm;

            return (
              <div
                key={candidate.id}
                className={`rotation-card ${isTop ? 'top-rank' : ''}`}
              >
                <div className="rotation-header">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div className="rank-badge">#{candidate.rank}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ffffff' }}>
                          {candidate.name}
                        </h4>
                        {isTop && (
                          <span className="badge badge-live" style={{ fontSize: '0.68rem' }}>
                            ★ OPTIMAL MATCH
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {candidate.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="score-badge">{candidate.scores.composite}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>COMPOSITE / 100</div>
                  </div>
                </div>

                {/* Crop Sequence Tags & Water Meter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', margin: '0.85rem 0' }}>
                  <div className="crop-sequence-tags" style={{ margin: 0 }}>
                    {candidate.crops.map((crop, cIdx) => (
                      <span
                        key={cIdx}
                        className={`crop-tag ${crop.nitrogenFixing ? 'legume-tag' : ''}`}
                      >
                        {crop.name}
                        {crop.nitrogenFixing && ' (N-Fixer)'}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Footprint: <strong style={{ color: '#60a5fa' }}>{candidate.estimatedWaterUseMm} mm</strong>{' '}
                    {waterSavings > 0 ? (
                      <span style={{ color: '#34d399' }}>(-{waterSavings}mm vs Boro)</span>
                    ) : (
                      <span style={{ color: '#f87171' }}>(High Extraction)</span>
                    )}
                  </div>
                </div>

                {/* 4 Pillars Progress Bars */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', margin: '1rem 0' }}>
                  <div style={{ background: 'rgba(11, 20, 38, 0.7)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600 }}>Water Efficiency</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{candidate.scores.water}<span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/100</span></div>
                  </div>
                  <div style={{ background: 'rgba(11, 20, 38, 0.7)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>Soil Health</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{candidate.scores.soil}<span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/100</span></div>
                  </div>
                  <div style={{ background: 'rgba(11, 20, 38, 0.7)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>Heat Tolerance</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{candidate.scores.heat}<span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/100</span></div>
                  </div>
                  <div style={{ background: 'rgba(11, 20, 38, 0.7)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(244, 114, 182, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#f472b6', fontWeight: 600 }}>Gross Margin</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>{candidate.scores.economic}<span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/100</span></div>
                  </div>
                </div>

                {/* Toggle Explanations Button */}
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', fontSize: '0.82rem' }}
                  onClick={() => setExpandedCardId(isExpanded ? null : candidate.id)}
                >
                  {isExpanded ? 'Hide Agronomic Breakdown ▲' : 'View Agronomic Breakdown & Explanations ▼'}
                </button>

                {/* Detailed Explanations Panel */}
                {isExpanded && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1.25rem',
                    background: 'rgba(7, 13, 30, 0.85)',
                    border: '1px solid var(--border-glass-bright)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem'
                  }}>
                    {/* Reason Codes */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      {candidate.reasonCodes.map((rc, rIdx) => (
                        <span key={rIdx} className="badge badge-live" style={{ fontSize: '0.7rem' }}>
                          {rc}
                        </span>
                      ))}
                    </div>

                    {/* Explanations List */}
                    <div style={{ marginBottom: '0.85rem' }}>
                      <strong style={{ color: 'var(--neon-cyan)' }}>Agronomic Justification:</strong>
                      <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
                        {candidate.explanations.map((exp, eIdx) => (
                          <li key={eIdx} style={{ marginBottom: '0.35rem', color: '#e2e8f0' }}>{exp}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Pros and Cons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '0.85rem 0' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <strong style={{ color: '#34d399', fontSize: '0.78rem', textTransform: 'uppercase' }}>Key Advantages:</strong>
                        <ul style={{ paddingLeft: '1.1rem', marginTop: '0.35rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
                          {candidate.pros.map((p, pIdx) => (
                            <li key={pIdx}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        <strong style={{ color: '#fb7185', fontSize: '0.78rem', textTransform: 'uppercase' }}>Operational Caveats:</strong>
                        <ul style={{ paddingLeft: '1.1rem', marginTop: '0.35rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
                          {candidate.cons.map((c, cIdx) => (
                            <li key={cIdx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Warnings & Constraints */}
                    {candidate.warnings.length > 0 && (
                      <div style={{ color: '#fbbf24', marginTop: '0.75rem' }}>
                        <strong>Constraints &amp; Cautions:</strong>
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
                          {candidate.warnings.map((w, wIdx) => (
                            <li key={wIdx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
