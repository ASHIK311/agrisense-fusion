import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  RefreshCw,
  Bot,
  Flame,
  Droplets,
  MapPin,
  Award,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import HydrologyRiskGaugeCard from './whatif/HydrologyRiskGaugeCard';
import RulerSlider from './whatif/RulerSlider';
import AquiferHorizonProjectionCard from './whatif/AquiferHorizonProjectionCard';
import { IrrigationScenarioComparison } from './charts/SeasonalScenarioCharts';

const SCENARIO_PRESETS = {
  boro_baseline: {
    name: 'Scenario A: Boro-Heavy Monoculture Baseline',
    cropPattern: 'Boro Rice → Fallow → T. Aman Rice',
    cropKey: 'rice_boro',
    kc: 1.2,
    irrigationEfficiency: 70,
    seasonalNetWaterMm: 820,
    barcSuitability: 40.51,
  },
  water_smart: {
    name: 'Scenario B: Water-Smart Pulse-Oilseed Rotation',
    cropPattern: 'Mustard → Mungbean → T. Aman Rice',
    cropKey: 'mustard_mung_aman',
    kc: 0.85,
    irrigationEfficiency: 85,
    seasonalNetWaterMm: 310,
    barcSuitability: 78.92,
  },
  maize_strip: {
    name: 'Scenario C: High-Efficiency Rabi Maize + Chickpea',
    cropPattern: 'Rabi Maize → Chickpea Relay → T. Aman',
    cropKey: 'maize_rabi',
    kc: 0.95,
    irrigationEfficiency: 85,
    seasonalNetWaterMm: 410,
    barcSuitability: 73.44,
  },
};

const CLIMATE_STRESS_PRESETS = [
  { id: 'normal', label: 'Normal Dry Season', et0: 4.63, meanTemp: 28.5, rainMm: 12.4 },
  { id: 'heatwave', label: 'April +3.5°C Heatwave', et0: 6.1, meanTemp: 35.8, rainMm: 2.0 },
  { id: 'drought', label: 'Severe Dry Spell', et0: 5.4, meanTemp: 32.0, rainMm: 0.0 },
];

const MCDA_PROFILES = [
  { id: 'aquifer', label: 'Conserve Aquifer', weights: { waterConservation: 50, soilHealth: 25, heatResilience: 15, economicPreference: 10 } },
  { id: 'balanced', label: 'Balanced Barind', weights: { waterConservation: 35, soilHealth: 25, heatResilience: 20, economicPreference: 20 } },
  { id: 'profit', label: 'Max Farm Profit', weights: { waterConservation: 15, soilHealth: 15, heatResilience: 20, economicPreference: 50 } },
];

const STORAGE_KEY = 'agrisense_whatif_saved';
const DEFAULT_SNAPSHOT = {
  leftPresetKey: 'boro_baseline',
  rightPresetKey: 'water_smart',
  leftEfficiency: 70,
  rightEfficiency: 85,
  et0Input: 4.63,
  climateId: 'normal',
  mcdaProfileId: 'aquifer',
  weights: MCDA_PROFILES[0].weights,
};

function loadSavedSnapshot() {
  if (typeof window === 'undefined') return DEFAULT_SNAPSHOT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SNAPSHOT;
    const parsed = JSON.parse(raw);
    if (SCENARIO_PRESETS[parsed?.leftPresetKey] && SCENARIO_PRESETS[parsed?.rightPresetKey]) {
      return { ...DEFAULT_SNAPSHOT, ...parsed };
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_SNAPSHOT;
}

export default function WhatIfSimulatorWorkspace({ dashboardData }) {
  const {
    askAssistantWithPrompt,
    selectedFieldId,
    setSelectedFieldId,
    selectedParcel,
    dynamicFields,
  } = useAgriSense();

  const [savedSnapshot, setSavedSnapshot] = useState(loadSavedSnapshot);
  const [leftPresetKey, setLeftPresetKey] = useState(savedSnapshot.leftPresetKey);
  const [rightPresetKey, setRightPresetKey] = useState(savedSnapshot.rightPresetKey);
  const [leftEfficiency, setLeftEfficiency] = useState(savedSnapshot.leftEfficiency);
  const [rightEfficiency, setRightEfficiency] = useState(savedSnapshot.rightEfficiency);
  const [et0Input, setEt0Input] = useState(savedSnapshot.et0Input);
  const [climateId, setClimateId] = useState(savedSnapshot.climateId || 'normal');
  const [mcdaProfileId, setMcdaProfileId] = useState(savedSnapshot.mcdaProfileId || 'aquifer');
  const [mcdaWeights, setMcdaWeights] = useState(savedSnapshot.weights || MCDA_PROFILES[0].weights);
  const [isSaved, setIsSaved] = useState(false);

  const [engineResult, setEngineResult] = useState(null);
  const [runningSim, setRunningSim] = useState(false);

  const leftPreset = SCENARIO_PRESETS[leftPresetKey];
  const rightPreset = SCENARIO_PRESETS[rightPresetKey];
  const activeClimate = CLIMATE_STRESS_PRESETS.find((c) => c.id === climateId) || CLIMATE_STRESS_PRESETS[0];

  const hasUnsavedChanges =
    leftPresetKey !== savedSnapshot.leftPresetKey ||
    rightPresetKey !== savedSnapshot.rightPresetKey ||
    leftEfficiency !== savedSnapshot.leftEfficiency ||
    rightEfficiency !== savedSnapshot.rightEfficiency ||
    et0Input !== savedSnapshot.et0Input ||
    climateId !== savedSnapshot.climateId ||
    mcdaProfileId !== savedSnapshot.mcdaProfileId;

  // Deterministic FAO-56 + Parcel Volumetric calculations (1 mm * 1 ha = 10 m3 = 10,000 L)
  const areaHa = Number(selectedParcel?.area_ha ?? 2.4);
  const et0Scale = et0Input / 4.63;
  const leftDailyEtc = Number((et0Input * leftPreset.kc).toFixed(2));
  const rightDailyEtc = Number((et0Input * rightPreset.kc).toFixed(2));

  const leftEffectiveNetMm = Math.round(leftPreset.seasonalNetWaterMm * et0Scale);
  const rightEffectiveNetMm = Math.round(rightPreset.seasonalNetWaterMm * et0Scale);
  const leftGrossSeasonalMm = Math.round(leftEffectiveNetMm / (leftEfficiency / 100));
  const rightGrossSeasonalMm = Math.round(rightEffectiveNetMm / (rightEfficiency / 100));
  const seasonalSavingMm = leftGrossSeasonalMm - rightGrossSeasonalMm;
  const seasonalSavingPct = Math.round((seasonalSavingMm / Math.max(1, leftGrossSeasonalMm)) * 100);

  const volumetricSavedM3 = Math.round(seasonalSavingMm * areaHa * 10);
  const volumetricSavedML = Number(((volumetricSavedM3 * 1000) / 1_000_000).toFixed(2));

  // Query REAL backend MCDA endpoint: POST /api/v1/rotation/compare
  const runDeterministicComparison = useCallback(async (weightsPayload = mcdaWeights, climate = activeClimate) => {
    setRunningSim(true);
    try {
      const res = await fetch('/api/v1/rotation/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: weightsPayload,
          soilInfo: { soilType: 'clay_loam', ph: 6.4 },
          previousCrops: ['T_AMAN_RICE'],
          weatherContext: {
            meanTemp: climate.meanTemp,
            recentRainfallMm: climate.rainMm,
          },
        }),
      });
      const data = await res.json();
      if (data?.success && data?.topRecommendation) {
        setEngineResult(data);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setRunningSim(false);
    }
  }, [mcdaWeights, activeClimate]);

  useEffect(() => {
    runDeterministicComparison(mcdaWeights, activeClimate);
  }, [mcdaWeights, climateId]);

  const markDirty = (setter) => (val) => {
    setter(val);
    setIsSaved(false);
  };

  const handleSelectClimate = (preset) => {
    setClimateId(preset.id);
    setEt0Input(preset.et0);
    setIsSaved(false);
  };

  const handleSelectMcdaProfile = (prof) => {
    setMcdaProfileId(prof.id);
    setMcdaWeights(prof.weights);
    setIsSaved(false);
  };

  const handleSaveScenario = async () => {
    const nextSnap = {
      leftPresetKey,
      rightPresetKey,
      leftEfficiency,
      rightEfficiency,
      et0Input,
      climateId,
      mcdaProfileId,
      weights: mcdaWeights,
    };
    setSavedSnapshot(nextSnap);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnap));
    } catch {
      // Ignore storage write errors
    }
    setIsSaved(true);
    await runDeterministicComparison(mcdaWeights, activeClimate);
  };

  const handleCancelChanges = () => {
    setLeftPresetKey(savedSnapshot.leftPresetKey);
    setRightPresetKey(savedSnapshot.rightPresetKey);
    setLeftEfficiency(savedSnapshot.leftEfficiency);
    setRightEfficiency(savedSnapshot.rightEfficiency);
    setEt0Input(savedSnapshot.et0Input);
    setClimateId(savedSnapshot.climateId || 'normal');
    setMcdaProfileId(savedSnapshot.mcdaProfileId || 'aquifer');
    setMcdaWeights(savedSnapshot.weights || MCDA_PROFILES[0].weights);
    setIsSaved(false);
  };

  const topRec = engineResult?.topRecommendation;
  const rankedList = engineResult?.rankedRotations || [];

  return (
    <div className="whatif-workspace" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Honest Disclosure Header + Inline Compact Parcel Switcher (replaces bulky olive ribbon) */}
      <div
        className="surface"
        style={{
          padding: '1rem 1.35rem',
          borderLeft: '4px solid var(--accent-amber)',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flexWrap: 'wrap' }}>
          <Scale size={21} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '0.15rem' }} />
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <strong className="mono" style={{ color: 'var(--accent-amber)', fontSize: '0.86rem' }}>
                SIMULATED SCENARIO — NOT FIELD-VALIDATED SAVINGS
              </strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={13} style={{ color: 'var(--accent-amber)' }} />
                  <label htmlFor="whatif-parcel-select" className="visually-hidden">Select Field Parcel</label>
                  <select
                    id="whatif-parcel-select"
                    value={selectedFieldId}
                    onChange={(e) => setSelectedFieldId(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto', padding: '0.22rem 0.55rem', fontSize: '0.74rem', fontWeight: 700 }}
                  >
                    {PARCELS.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} ({p.area_ha} ha • {p.crop})</option>
                    ))}
                    {dynamicFields
                      .filter((df) => !df.is_demo && !PARCELS.some((p) => p.id === df.id))
                      .map((df) => (
                        <option key={df.id} value={df.id}>
                          {df.name} ({Math.round(((df.area_m2 || 10000) / 10000) * 100) / 100} ha)
                        </option>
                      ))}
                  </select>
                </div>
                <ProvenanceBadge
                  type="SIMULATED"
                  label="FAO-56 + LIVE MCDA"
                  source="POST /api/v1/rotation/compare"
                  compact
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.55rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.79rem' }}>
                Stress-test cropping &amp; efficiency scenarios under Godagari microclimate forcing ({areaHa} ha parcel scale).
              </span>

              {/* Climate Stress Test Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={12} style={{ color: 'var(--accent-amber)' }} /> Stress Test:
                </span>
                {CLIMATE_STRESS_PRESETS.map((cl) => (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => handleSelectClimate(cl)}
                    className={climateId === cl.id ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '0.24rem 0.62rem', fontSize: '0.71rem' }}
                  >
                    {cl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Split: Left 3-Zone Aquifer Gauge Card + Right Scenario A/B + Bars */}
      <div className="whatif-main-grid">
        <HydrologyRiskGaugeCard
          rightPreset={rightPreset}
          rightEfficiency={rightEfficiency}
          onChangeRightEfficiency={markDirty(setRightEfficiency)}
          et0Input={et0Input}
          onChangeEt0={markDirty(setEt0Input)}
          rightGrossMm={rightGrossSeasonalMm}
          seasonalSavingMm={seasonalSavingMm}
          isSaved={isSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSaveScenario}
          onCancel={handleCancelChanges}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Scenario A vs Scenario B Preset Selectors & Baseline Ruler */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* SCENARIO A */}
            <div className="card tilt-card" style={{ padding: '1.2rem', borderTop: '3px solid var(--accent-danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span className="badge badge-danger">SCENARIO A (BASELINE)</span>
                <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  BARC: <strong>{leftPreset.barcSuitability}%</strong>
                </span>
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label htmlFor="whatif-preset-a" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Baseline Cropping System:
                </label>
                <select
                  id="whatif-preset-a"
                  value={leftPresetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setLeftPresetKey(key);
                    setLeftEfficiency(SCENARIO_PRESETS[key].irrigationEfficiency);
                    setIsSaved(false);
                  }}
                  className="form-control"
                  style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.45rem 0.65rem' }}
                >
                  {Object.entries(SCENARIO_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <RulerSlider
                label="Baseline Efficiency (η_irrig)"
                value={leftEfficiency}
                min={55}
                max={90}
                step={5}
                onChange={markDirty(setLeftEfficiency)}
                displayValue={`${leftEfficiency}%`}
                badgeText={`ETc ${leftDailyEtc} mm/d`}
                badgeColor="var(--accent-terracotta)"
                fillColor="#f59e0b"
              />

              <div className="surface" style={{ padding: '0.7rem 0.85rem', marginTop: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GROSS EXTRACTION</span>
                <strong className="mono" style={{ fontSize: '1.05rem', color: 'var(--accent-danger)' }}>{leftGrossSeasonalMm} mm</strong>
              </div>
            </div>

            {/* SCENARIO B */}
            <div className="card tilt-card" style={{ padding: '1.2rem', borderTop: '3px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span className="badge badge-live">SCENARIO B (INTERVENTION)</span>
                <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--accent-primary)' }}>
                  BARC: <strong>{rightPreset.barcSuitability}%</strong>
                </span>
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label htmlFor="whatif-preset-b" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Intervention Cropping System:
                </label>
                <select
                  id="whatif-preset-b"
                  value={rightPresetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setRightPresetKey(key);
                    setRightEfficiency(SCENARIO_PRESETS[key].irrigationEfficiency);
                    setIsSaved(false);
                  }}
                  className="form-control"
                  style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.45rem 0.65rem' }}
                >
                  {Object.entries(SCENARIO_PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="surface" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DAILY CROP ETc</div>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.18rem' }}>
                    {rightDailyEtc} mm/d
                  </div>
                  <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Kc = {rightPreset.kc}</div>
                </div>
                <div className="surface" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>NET WATER</div>
                  <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-water)', marginTop: '0.18rem' }}>
                    {rightEffectiveNetMm} mm
                  </div>
                  <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>@ {rightEfficiency}% eff</div>
                </div>
              </div>

              {/* Parcel-Scale Volumetric Water Saved */}
              <div className="surface" style={{ padding: '0.65rem 0.85rem', marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <Droplets size={14} style={{ color: '#38bdf8' }} />
                  <span>Volumetric Saved ({areaHa} ha):</span>
                </div>
                <strong className="mono" style={{ fontSize: '0.92rem', color: '#38bdf8' }}>
                  {volumetricSavedM3 >= 0 ? `${volumetricSavedM3.toLocaleString()} m³ (${volumetricSavedML} ML)` : `+${Math.abs(volumetricSavedM3).toLocaleString()} m³`}
                </strong>
              </div>
            </div>
          </div>

          {/* Animated Seasonal Bar Comparison Card (Fixed unit: mm / season) */}
          <IrrigationScenarioComparison
            unit="mm / season"
            scenarios={[
              {
                label: 'Scenario A Gross',
                grossMm: leftGrossSeasonalMm,
                color: 'linear-gradient(90deg, #fb7185, #fbbf24)',
              },
              {
                label: '500 mm Safe Buffer',
                grossMm: 500,
                color: 'linear-gradient(90deg, #64748b, #94a3b8)',
              },
              {
                label: 'Scenario B Gross',
                grossMm: rightGrossSeasonalMm,
                color: 'linear-gradient(90deg, #10b981, #38bdf8)',
              },
            ]}
          />
        </div>
      </div>

      {/* Live 4-Pillar MCDA Comparison (POST /api/v1/rotation/compare) + 5-Year BMDA Horizon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.15rem' }}>
        {/* 4-Pillar Live MCDA Card */}
        <div className="card" style={{ padding: '1.2rem 1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.9rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Award size={16} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="font-display" style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0 }}>
                  Live MCDA Priority &amp; 4-Pillar Engine
                </h3>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Backend ranking via <code>POST /api/v1/rotation/compare</code> ({activeClimate.meanTemp}°C mean temp)
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.28rem 0.65rem' }}
              onClick={() => runDeterministicComparison(mcdaWeights, activeClimate)}
              disabled={runningSim}
            >
              <RefreshCw size={12} className={runningSim ? 'water-spin' : ''} />
              <span>{runningSim ? 'Running...' : 'Re-Score'}</span>
            </button>
          </div>

          {/* Priority Strategy Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.95rem' }}>
            {MCDA_PROFILES.map((prof) => (
              <button
                key={prof.id}
                type="button"
                onClick={() => handleSelectMcdaProfile(prof)}
                className={mcdaProfileId === prof.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.28rem 0.7rem', fontSize: '0.73rem' }}
              >
                {prof.label}
              </button>
            ))}
          </div>

          {topRec ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="surface" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>#1 {topRec.name}</strong>
                  <span className="mono" style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.92rem' }}>
                    {topRec.scores.composite} / 100
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.6rem', fontSize: '0.72rem' }}>
                  {[
                    { k: 'Water', v: topRec.scores.water, c: '#38bdf8' },
                    { k: 'Soil', v: topRec.scores.soil, c: '#10b981' },
                    { k: 'Heat', v: topRec.scores.heat, c: '#f59e0b' },
                    { k: 'Profit', v: topRec.scores.economic, c: '#a78bfa' },
                  ].map((p) => (
                    <div key={p.k} style={{ background: 'var(--bg-alt)', padding: '0.4rem 0.5rem', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>{p.k}</div>
                      <div className="mono" style={{ fontWeight: 800, color: p.c }}>{p.v}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranked Runners-Up */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {rankedList.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="surface"
                    style={{
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong className="mono">#{item.rank}</strong> {item.name}
                    </span>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.scores.composite}/100 · {item.estimatedWaterUseMm}mm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="surface" style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Evaluating MCDA rotation scores...
            </div>
          )}
        </div>

        {/* 5-Year BMDA Cavitation Linear Projection Chart */}
        <AquiferHorizonProjectionCard
          groundwater={dashboardData?.groundwater}
          leftGrossMm={leftGrossSeasonalMm}
          rightGrossMm={rightGrossSeasonalMm}
        />
      </div>

      {/* Deterministic Scenario Delta Summary & AI Consultation */}
      <div className="card" style={{ padding: '1.2rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GROSS WATER SAVING (B vs A)</div>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {seasonalSavingMm > 0 ? `-${seasonalSavingMm} mm` : `+${Math.abs(seasonalSavingMm)} mm`} ({seasonalSavingPct}%)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PARCEL {selectedParcel?.code || 'A-01'} VOLUME SAVED</div>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-water)' }}>
              {volumetricSavedM3.toLocaleString()} m³
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DAILY ETc DELTA</div>
            <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              {(rightDailyEtc - leftDailyEtc).toFixed(2)} mm/day
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            askAssistantWithPrompt(
              `Compare Scenario A (${leftPreset.cropPattern} at ${leftEfficiency}% efficiency, ${leftGrossSeasonalMm} mm/season) with Scenario B (${rightPreset.cropPattern} at ${rightEfficiency}% efficiency, ${rightGrossSeasonalMm} mm/season) for parcel ${selectedParcel?.code || 'PARCEL A-01'} (${areaHa} ha) under ${activeClimate.label} in Godagari Upazila.`
            )
          }
        >
          <Bot size={15} />
          <span>Ask AI to Analyze Scenario Trade-Off</span>
        </button>
      </div>
    </div>
  );
}
