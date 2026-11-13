import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  Sprout,
  Sliders,
  Microscope,
  BookOpen,
  ShieldAlert,
  Thermometer,
  Scale,
  Bot,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../../context/AgriSenseContext';
import { slideFill, getRelativeEdges } from '../../utils/motion';
import ProvenanceBadge from '../ProvenanceBadge';
import { CROP_3D_SPECS } from './cropSpecs';
import CropCompareDrawer from './CropCompareDrawer';
import { SeasonalKcCurveChart, DiseaseRiskEnvelopeChart } from './AgronomyVisuals';
import { CropSuitabilityComparison } from '../charts/SeasonalScenarioCharts';
import CropRotationExplorer from '../CropRotationExplorer';
import DiseasePanel from '../DiseasePanel';
import DualInspector from '../DualInspector';
import RulerSlider from '../whatif/RulerSlider';

const ThreeCropCompareStage = lazy(() => import('./ThreeCropCompareStage'));

const BARC_SUITABILITY_SCORES = [
  { name: 'T. Aman Rice', crop: 'T. Aman Rice (Kharif-II Monsoon)', score: 78.92, season: 'Jul – Nov', kcProfile: '1.05 → 1.20 → 0.70', waterNeedMm: 420, riskNote: 'Rainfed-supported; highest historical BARC suitability in AEZ-26', color: '#7cc8a0' },
  { name: 'Rabi Maize', crop: 'Rabi Maize (Winter Hybrid)', score: 73.44, season: 'Nov – Apr', kcProfile: '0.30 → 1.20 → 0.35', waterNeedMm: 480, riskNote: 'High solar radiation conversion; moderate irrigation requirement', color: '#60a5fa' },
  { name: 'Wheat (BARI)', crop: 'Wheat (BARI Gom-30/32)', score: 57.41, season: 'Nov – Mar', kcProfile: '0.30 → 1.15 → 0.40', waterNeedMm: 310, riskNote: 'Low water footprint; sensitive to terminal February heat spikes', color: '#f2c879' },
  { name: 'T. Aus Rice', crop: 'T. Aus Rice (Pre-Monsoon)', score: 40.98, season: 'Apr – Jul', kcProfile: '1.00 → 1.15 → 0.75', waterNeedMm: 610, riskNote: 'Exposed to pre-monsoon heat-dryness (Tmax ≥ 35°C) during establishment', color: '#e3b35e' },
  { name: 'Boro Rice', crop: 'Boro Rice (Dry Season Irrigated)', score: 40.51, season: 'Jan – May', kcProfile: '1.05 → 1.20 → 0.90', waterNeedMm: 1150, riskNote: 'Severe groundwater overdraft driver (+0.65 m/yr DTW drawdown)', color: '#e47a63' },
];

const PATHOLOGY_CROPS = [
  { id: 'all', label: 'All Crops' },
  { id: 'Rice', label: 'Rice' },
  { id: 'Wheat', label: 'Wheat' },
  { id: 'Maize', label: 'Maize' },
  { id: 'Potato', label: 'Potato' },
  { id: 'Tomato', label: 'Tomato' },
  { id: 'Mustard', label: 'Mustard' },
  { id: 'Pulse', label: 'Pulse / Lentil' },
];

const SIDE_CATEGORIES = [
  {
    id: 'crops-3d',
    label: 'Dual 3D Crop Compare',
    icon: Sprout,
    tabs: ['Side-by-Side 3D Canopies', 'BARC Suitability & Table'],
  },
  {
    id: 'mcda',
    label: 'MCDA Rotation Lab',
    icon: Sliders,
    tabs: ['Interactive Rotation Explorer'],
  },
  {
    id: 'pathology-3d',
    label: '3D Pathology & Sandbox',
    icon: Microscope,
    tabs: ['3D Stress & Risk Inputs', 'Screened Risk Ledger'],
  },
  {
    id: 'corpus',
    label: 'Rule Tree & Literature',
    icon: BookOpen,
    tabs: ['5-Stage Rule Tree & AI', '17 Disease Catalog', '60 DOI Papers'],
  },
];

const PATHOLOGY_PRESETS = [
  { id: 'blast', label: 'Blast Window (27°C · 88% RH)', temp: 27, rh: 88, wet: 10, vwc: 0.28, crop: 'Rice' },
  { id: 'wilt', label: 'Bacterial Wilt (32°C · 0.36 VWC)', temp: 32, rh: 78, wet: 0, vwc: 0.36, crop: 'Potato' },
  { id: 'whitefly', label: 'Whitefly Vector (30°C · 65% RH)', temp: 30, rh: 65, wet: 2, vwc: 0.2, crop: 'Tomato' },
];

export default function AgronomyCropsShellWorkspace({ dashboardData }) {
  const {
    workspaceModes,
    setWorkspaceSubMode,
    navigateToWorkspace,
    askAssistantWithPrompt,
    selectedFieldId,
    setSelectedFieldId,
    dynamicFields,
  } = useAgriSense();

  const [activeSideIdx, setActiveSideIdx] = useState(() =>
    workspaceModes?.agronomy === 'disease' ? 2 : 0
  );
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // Dual 3D Crop Comparison state
  const [leftCropKey, setLeftCropKey] = useState('rice_aman');
  const [rightCropKey, setRightCropKey] = useState('rice_boro');

  // Interactive Pathology Screening User Inputs
  const latestWeather = dashboardData?.latestWeather;
  const latestSensor = dashboardData?.latestSensor;
  const [pathCropFilter, setPathCropFilter] = useState('Rice');
  const [testTempC, setTestTempC] = useState(() => Math.round(latestWeather?.t2m ?? 28));
  const [testRhPct, setTestRhPct] = useState(() => Math.round(latestWeather?.rh2m ?? 84));
  const [testWetHours, setTestWetHours] = useState(8);
  const [testVwc, setTestVwc] = useState(() =>
    Number((latestSensor?.soil_moisture_vwc ?? 0.25).toFixed(2))
  );
  const [screenResult, setScreenResult] = useState(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const [explainCropOpen, setExplainCropOpen] = useState(false);
  const [barcViewMode, setBarcViewMode] = useState('both');
  const [committedVwc, setCommittedVwc] = useState(() =>
    Number((latestSensor?.soil_moisture_vwc ?? 0.25).toFixed(2))
  );
  const vwcRafRef = useRef(0);
  const lastVwcPushRef = useRef(0);

  const handleVwcChange = (nextVal) => {
    setTestVwc(nextVal);
    if (vwcRafRef.current) return;
    vwcRafRef.current = window.requestAnimationFrame(() => {
      vwcRafRef.current = 0;
      const now = performance.now();
      if (now - lastVwcPushRef.current >= 68) {
        lastVwcPushRef.current = now;
        setCommittedVwc(nextVal);
      }
    });
  };

  const handleVwcCommit = (finalVal) => {
    if (vwcRafRef.current) {
      window.cancelAnimationFrame(vwcRafRef.current);
      vwcRafRef.current = 0;
    }
    lastVwcPushRef.current = performance.now();
    setCommittedVwc(finalVal);
  };

  const sideFillRef = useRef(null);
  const sideBtnRefs = useRef([]);
  const topFillRef = useRef(null);
  const topBtnRefs = useRef([]);
  const firstMountSide = useRef(true);
  const lastTabSide = useRef(activeSideIdx);

  const currentMenu = SIDE_CATEGORIES[activeSideIdx];

  // Sync deep links between Command Hub / Ctrl+K & Agronomy shell
  useEffect(() => {
    if (workspaceModes?.agronomy === 'disease' && activeSideIdx < 2) {
      setActiveSideIdx(2);
      setActiveTabIdx(0);
    } else if (workspaceModes?.agronomy === 'crops' && activeSideIdx >= 2) {
      setActiveSideIdx(0);
      setActiveTabIdx(0);
    }
  }, [workspaceModes?.agronomy]);

  const positionSidePill = (immediate = false) => {
    const fill = sideFillRef.current;
    const btn = sideBtnRefs.current[activeSideIdx];
    if (!fill || !btn) return;
    const isStacked = window.innerWidth <= 768;
    slideFill(fill, getRelativeEdges(fill, btn), immediate, {
      axis: isStacked ? 'horizontal' : 'vertical',
      radius: '10px',
    });
  };

  useLayoutEffect(() => {
    positionSidePill(firstMountSide.current);
    firstMountSide.current = false;
  }, [activeSideIdx]);

  const positionTopPill = (immediate = false) => {
    const fill = topFillRef.current;
    const btn = topBtnRefs.current[activeTabIdx];
    if (!fill || !btn) return;
    slideFill(fill, getRelativeEdges(fill, btn), immediate, {
      axis: 'horizontal',
      radius: '8px',
    });
  };

  useLayoutEffect(() => {
    const switchedCategory = lastTabSide.current !== activeSideIdx;
    lastTabSide.current = activeSideIdx;
    positionTopPill(switchedCategory);
  }, [activeSideIdx, activeTabIdx]);

  useEffect(() => {
    const onResize = () => {
      positionSidePill(true);
      positionTopPill(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeSideIdx, activeTabIdx]);

  const handleSelectSide = (idx) => {
    setActiveSideIdx(idx);
    setActiveTabIdx(0);
    setWorkspaceSubMode('agronomy', idx >= 2 ? 'disease' : 'crops');
  };

  // Query live backend pathology environmental screening endpoint
  const runLiveScreening = useCallback(async () => {
    setScreenLoading(true);
    try {
      const cropParam = pathCropFilter === 'all' ? '' : pathCropFilter;
      const url = `/api/v1/diseases/screen/environmental?crop=${encodeURIComponent(cropParam)}&temp_c=${testTempC}&rh_pct=${testRhPct}&leaf_wetness_hours=${testWetHours}&soil_temp_c=${testTempC}&soil_moisture_vwc=${testVwc}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.success) {
        setScreenResult(data);
      }
    } catch (err) {
      console.error('Pathology screening failed:', err);
    } finally {
      setScreenLoading(false);
    }
  }, [pathCropFilter, testTempC, testRhPct, testWetHours, testVwc]);

  useEffect(() => {
    runLiveScreening();
  }, [runLiveScreening]);

  const screenedList = screenResult?.screened_diseases || [];
  const topDisease = screenedList[0] || null;

  const cropKeyForPathology =
    pathCropFilter === 'Maize'
      ? 'maize_rabi'
      : pathCropFilter === 'Wheat'
        ? 'wheat'
        : pathCropFilter === 'Mustard'
          ? 'mustard'
          : pathCropFilter === 'Pulse'
            ? 'pulse'
            : 'rice_aman';

  const applyPathologyPreset = (p) => {
    setPathCropFilter(p.crop);
    setTestTempC(p.temp);
    setTestRhPct(p.rh);
    setTestWetHours(p.wet);
    setTestVwc(p.vwc);
    setCommittedVwc(p.vwc);
  };

  useEffect(() => () => {
    if (vwcRafRef.current) window.cancelAnimationFrame(vwcRafRef.current);
  }, []);

  const tempCDisplay = latestWeather?.t2m ?? 29.4;
  const rhPctDisplay = latestWeather?.rh2m ?? 82.0;
  const soilPhDisplay = latestSensor?.soil_ph ?? 6.4;

  const renderPanelContent = () => {
    // 1. DUAL 3D CROP COMPARE
    if (activeSideIdx === 0) {
      const leftSpec = CROP_3D_SPECS[leftCropKey] || CROP_3D_SPECS.rice_aman;
      const rightSpec = CROP_3D_SPECS[rightCropKey] || CROP_3D_SPECS.rice_boro;
      const waterDeltaMm = rightSpec.waterMm - leftSpec.waterMm;
      const bothHaveBarc = leftSpec.barcScore !== null && rightSpec.barcScore !== null;
      const barcDiffPp = bothHaveBarc ? Number((leftSpec.barcScore - rightSpec.barcScore).toFixed(2)) : null;

      if (activeTabIdx === 0) {
        return (
          <div className="mcda-shell">
            {/* Collapsible Observatory Control Drawer */}
            <CropCompareDrawer
              leftCropKey={leftCropKey}
              rightCropKey={rightCropKey}
              onSelectLeft={(k) => setLeftCropKey(k)}
              onSelectRight={(k) => setRightCropKey(k)}
              onSwap={() => {
                setLeftCropKey(rightCropKey);
                setRightCropKey(leftCropKey);
              }}
            />

            {/* Right Synchronized Dual 3D + Animated Kc Trajectory Column */}
            <div className="mcda-compare-main">
              <div className="card" style={{ padding: '0.9rem 1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span className="badge badge-live">
                        <Sprout size={12} /> Synchronized Dual-3D Agronomy Compare
                      </span>
                      <ProvenanceBadge type="MODEL-DERIVED" label="SIMULATED SCENARIO — NOT FIELD-VALIDATED SAVINGS" compact />
                    </div>
                    <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                      Side-by-Side 3D Canopy, Root Depth &amp; Kc Trajectory
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'T. Aman vs Boro', l: 'rice_aman', r: 'rice_boro' },
                      { label: 'Mustard vs Boro', l: 'mustard', r: 'rice_boro' },
                      { label: 'Maize vs Wheat', l: 'maize_rabi', r: 'wheat' },
                      { label: 'Legume vs Boro', l: 'pulse', r: 'rice_boro' },
                    ].map((pair) => (
                      <button
                        key={pair.label}
                        type="button"
                        className={leftCropKey === pair.l && rightCropKey === pair.r ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ padding: '0.28rem 0.65rem', fontSize: '0.72rem' }}
                        onClick={() => {
                          setLeftCropKey(pair.l);
                          setRightCropKey(pair.r);
                        }}
                      >
                        {pair.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamically Computed Verdict Strip (Zero Hardcoded Figures) */}
                <div className="agronomy-verdict-strip">
                  <span style={{ color: '#7cc8a0', fontWeight: 700 }}>{leftSpec.label}</span>
                  <span> vs </span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>{rightSpec.label}</span>
                  <span> · </span>
                  <strong className="mono" style={{ color: '#60a5fa' }}>
                    {waterDeltaMm > 0
                      ? `Modeled water reduction: ${waterDeltaMm} mm/season (Left lower)`
                      : waterDeltaMm < 0
                        ? `Modeled water increase: ${Math.abs(waterDeltaMm)} mm/season (Left higher)`
                        : 'Equal modeled water demand'}
                  </strong>
                  <span> · </span>
                  {bothHaveBarc ? (
                    <span className="mono" style={{ color: '#f2c879' }}>
                      BARC Baseline Diff: {barcDiffPp >= 0 ? `+${barcDiffPp}` : barcDiffPp} percentage points ({leftSpec.barcScore.toFixed(2)}% vs {rightSpec.barcScore.toFixed(2)}%)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Qualitative relay comparison ({leftSpec.key === 'pulse' || leftCropKey === 'pulse' || rightCropKey === 'pulse' ? 'Legume enriches soil N₂' : 'Short-duration Rabi break'}) — outside 5-crop BARC raster baseline
                    </span>
                  )}
                </div>
              </div>

              {/* Lazy-Loaded Dual Synchronized 3D Three.js Stage */}
              <Suspense
                fallback={
                  <div className="dual3d-stage" style={{ height: '380px', display: 'grid', placeItems: 'center' }}>
                    <span className="mono" style={{ color: '#a8a59e', fontSize: '0.8rem' }}>
                      Initializing WebGL 3D crop &amp; rhizosphere specimens...
                    </span>
                  </div>
                }
              >
                <ThreeCropCompareStage
                  mode="crops"
                  leftCropKey={leftCropKey}
                  rightCropKey={rightCropKey}
                  height={380}
                />
              </Suspense>

              {/* Animated FAO-56 Kc Comparison Chart (with Chart/Table Toggle) */}
              <SeasonalKcCurveChart leftKey={leftCropKey} rightKey={rightCropKey} />

              {/* Expandable "Explain This Result" Panel */}
              <div className="card" style={{ padding: '0.9rem 1.15rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-expanded={explainCropOpen}
                  onClick={() => setExplainCropOpen((v) => !v)}
                  style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <HelpCircle size={14} style={{ color: '#f2c879' }} />
                    Explain This Result (Methodology, Active Inputs, Dataset &amp; Limitations)
                  </span>
                  {explainCropOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {explainCropOpen && (
                  <div className="agronomy-explain-grid">
                    <div className="surface" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#7cc8a0' }}>1. DRIVING PARAMETERS</strong>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        Left plot models <strong>{leftSpec.label}</strong> ({leftSpec.waterMm} mm, root ~{leftSpec.rootDepth} m); Right plot models <strong>{rightSpec.label}</strong> ({rightSpec.waterMm} mm, root ~{rightSpec.rootDepth} m).
                      </p>
                    </div>
                    <div className="surface" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#60a5fa' }}>2. EQUATIONS &amp; DATASETS</strong>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        Crop demand uses FAO-56 phenological multipliers (<code>ETc = Kc × ET₀</code>, Allen et al. 1998). Suitability ratings reference historical <strong>BARC AEZ-26 (Godagari)</strong> weighted ratings where mapped.
                      </p>
                    </div>
                    <div className="surface" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#e47a63' }}>3. ASSUMPTIONS &amp; RELIABILITY</strong>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        3D canopy height &amp; root depth scale conceptually from catalog priors. <strong>HISTORICAL SUITABILITY ≠ YIELD PROBABILITY</strong> and water deltas represent modeled scenario baselines, not metered tubewell trials.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Tab 1: BARC Suitability & Table (with Chart / Table / Both Toggle)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="card" style={{ padding: '0.85rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <strong style={{ fontSize: '0.92rem' }}>BARC AEZ-26 Land Suitability Baseline (Godagari)</strong>
              <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                HISTORICAL SUITABILITY ≠ YIELD PROBABILITY
              </div>
            </div>
            <div className="ag-view-toggle" role="group" aria-label="BARC Suitability View Mode">
              <button
                type="button"
                className={`ag-view-btn ${barcViewMode === 'chart' ? 'active' : ''}`}
                aria-pressed={barcViewMode === 'chart'}
                onClick={() => setBarcViewMode('chart')}
              >
                <BarChart3 size={12} /> Chart
              </button>
              <button
                type="button"
                className={`ag-view-btn ${barcViewMode === 'table' ? 'active' : ''}`}
                aria-pressed={barcViewMode === 'table'}
                onClick={() => setBarcViewMode('table')}
              >
                <TableIcon size={12} /> Table
              </button>
              <button
                type="button"
                className={`ag-view-btn ${barcViewMode === 'both' ? 'active' : ''}`}
                aria-pressed={barcViewMode === 'both'}
                onClick={() => setBarcViewMode('both')}
              >
                Both
              </button>
            </div>
          </div>

          {(barcViewMode === 'chart' || barcViewMode === 'both') && (
            <CropSuitabilityComparison crops={BARC_SUITABILITY_SCORES} />
          )}

          {(barcViewMode === 'table' || barcViewMode === 'both') && (
            <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>
                <span>BARC AEZ-26 Weighted Land Suitability Ledger</span>
                <ProvenanceBadge type="HISTORICAL BASELINE" label="SUITABILITY ≠ YIELD PROBABILITY" compact />
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Crop &amp; Season</th>
                      <th>Suitability</th>
                      <th>Window</th>
                      <th>Kc Curve</th>
                      <th>Seasonal Water</th>
                      <th>Hydrological Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BARC_SUITABILITY_SCORES.map((item) => (
                      <tr key={item.crop}>
                        <td><strong>{item.crop}</strong></td>
                        <td className="mono" style={{ color: item.color, fontWeight: 800 }}>{item.score.toFixed(2)}%</td>
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
          )}
        </div>
      );
    }

    // 2. MCDA ROTATION LAB
    if (activeSideIdx === 1) {
      return (
        <CropRotationExplorer
          farm={dashboardData?.farm}
          field={dashboardData?.field}
          weather={dashboardData?.weather}
        />
      );
    }

    // 3. 3D PATHOLOGY & INTERACTIVE USER INPUT SANDBOX
    if (activeSideIdx === 2) {
      if (activeTabIdx === 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Mandatory Honest Screening Disclaimer */}
            <div className="surface" style={{ padding: '0.95rem 1.25rem', borderLeft: '4px solid var(--accent-danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <ShieldAlert size={18} style={{ color: 'var(--accent-danger)' }} />
                  <strong className="mono" style={{ color: 'var(--accent-danger)', fontSize: '0.84rem' }}>
                    ENVIRONMENTAL SUSCEPTIBILITY SIMULATION — NOT CONFIRMED VISUAL DIAGNOSIS
                  </strong>
                </div>
                <ProvenanceBadge
                  type="LITERATURE-DERIVED"
                  label="17 DISEASES • LEAF_WETNESS = NULL IN FIELD"
                  source="GET /api/v1/diseases/screen/environmental"
                  compact
                />
              </div>
            </div>

            {/* Interactive User Microclimate Checking Controls */}
            <div className="card" style={{ padding: '1.15rem 1.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.9rem' }}>
                <div>
                  <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                    Interactive Pathology &amp; Field Condition Tester
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Adjust temperature, humidity, soil moisture, or hypothetical leaf wetness to test backend susceptibility &amp; 3D canopy response live.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={12} style={{ color: '#f2c879' }} /> Quick Check:
                  </span>
                  {PATHOLOGY_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.24rem 0.6rem', fontSize: '0.71rem' }}
                      onClick={() => applyPathologyPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessible Crop Selector Pill Radiogroup (replaces native select) */}
              <div style={{ marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  TARGET CROP:
                </span>
                <div role="radiogroup" aria-label="Filter Disease Target Crop" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {PATHOLOGY_CROPS.map((c) => {
                    const active = pathCropFilter === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`mcda-chip ${active ? 'active' : ''}`}
                        style={{ padding: '4px 11px', fontSize: '11.5px' }}
                        onClick={() => setPathCropFilter(c.id)}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                <RulerSlider
                  label="Air / Soil Temp (°C)"
                  value={testTempC}
                  min={15}
                  max={40}
                  step={1}
                  onChange={setTestTempC}
                  displayValue={`${testTempC}°C`}
                  badgeText={testTempC >= 25 && testTempC <= 32 ? 'Optimal Fungal' : 'Out of Peak'}
                  badgeColor={testTempC >= 25 && testTempC <= 32 ? '#f2c879' : 'var(--text-muted)'}
                  fillColor="#f2c879"
                />
                <RulerSlider
                  label="Relative Humidity (%)"
                  value={testRhPct}
                  min={40}
                  max={100}
                  step={1}
                  onChange={setTestRhPct}
                  displayValue={`${testRhPct}%`}
                  badgeText={testRhPct >= 80 ? 'High Moisture' : 'Dry/Mod'}
                  badgeColor={testRhPct >= 80 ? '#60a5fa' : 'var(--text-muted)'}
                  fillColor="#60a5fa"
                />
                <RulerSlider
                  label="Hypothetical Leaf Wetness"
                  value={testWetHours}
                  min={0}
                  max={24}
                  step={1}
                  onChange={setTestWetHours}
                  displayValue={`${testWetHours} hrs`}
                  badgeText={testWetHours === 0 ? 'Field Null Baseline' : 'Sensitivity Test'}
                  badgeColor={testWetHours === 0 ? '#7cc8a0' : '#f2c879'}
                  fillColor="#f2c879"
                />
                <RulerSlider
                  label="Soil Moisture (VWC)"
                  value={testVwc}
                  min={0.1}
                  max={0.45}
                  step={0.01}
                  onChange={handleVwcChange}
                  onCommit={handleVwcCommit}
                  displayValue={`${testVwc.toFixed(2)}`}
                  badgeText={testVwc >= 0.3 ? 'Wilt Risk (≥0.30)' : 'Normal'}
                  badgeColor={testVwc >= 0.3 ? '#e47a63' : '#7cc8a0'}
                  fillColor={testVwc >= 0.3 ? '#e47a63' : '#7cc8a0'}
                />
              </div>
            </div>

            {/* Lazy-Loaded Dual Synchronized 3D Healthy vs Microclimate-Stressed Stage */}
            <Suspense
              fallback={
                <div className="dual3d-stage" style={{ height: '360px', display: 'grid', placeItems: 'center' }}>
                  <span className="mono" style={{ color: '#a8a59e', fontSize: '0.8rem' }}>
                    Initializing WebGL 3D pathology specimen...
                  </span>
                </div>
              }
            >
              <ThreeCropCompareStage
                mode="pathology"
                leftCropKey={cropKeyForPathology}
                rightCropKey={cropKeyForPathology}
                pathologyState={{
                  riskScore: topDisease?.risk_score ?? 0.15,
                  riskLevel: topDisease?.risk_level ?? 'LOW',
                  pathway: topDisease?.infection_pathway ?? 'foliar_canopy_wetness',
                  topDiseaseName: topDisease?.disease_name ?? 'No Active Match',
                  soilMoistureVwc: committedVwc,
                }}
                height={360}
              />
            </Suspense>

            {/* Animated Temp x RH Envelope + Screened Bars */}
            <DiseaseRiskEnvelopeChart
              tempC={testTempC}
              rhPct={testRhPct}
              diseases={screenedList}
              loading={screenLoading}
            />
          </div>
        );
      }

      return <DiseasePanel controlledSubTab="screening" />;
    }

    // 4. RULE TREE & 60-PAPER CORPUS
    if (activeTabIdx === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>
              <span>Explainable 5-Stage Epidemiological Rule Tree &amp; 60-Paper Corpus Tiers</span>
              <ProvenanceBadge type="LITERATURE-DERIVED" label="48 FULL-TEXT • 5 ABSTRACT • 7 META" compact />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '0.75rem' }}>
              <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-water)' }}>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-water)', fontWeight: 700 }}>1. ENVIRONMENTAL INPUT</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.2rem' }}>T = {tempCDisplay}°C, RH = {rhPctDisplay}%, pH = {soilPhDisplay}</div>
                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginTop: '0.15rem' }}>leaf_wetness_hours = null</div>
              </div>
              <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-amber)' }}>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 700 }}>2. RULE CONDITION</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.2rem' }}>Temp 24–30°C &amp; RH ≥ 80%</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>+ Soil pH / VWC window</div>
              </div>
              <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-terracotta)' }}>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-terracotta)', fontWeight: 700 }}>3. EVIDENCE TIER</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.2rem' }}>60 Verified DOIs</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>17 Bangladesh Crop Diseases</div>
              </div>
              <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-danger)' }}>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-danger)', fontWeight: 700 }}>4. SCREENING OUTPUT</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.2rem' }}>Susceptibility Index</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Capped when wetness = null</div>
              </div>
              <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-primary)' }}>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>5. IPM GUIDANCE</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.2rem' }}>Cultural Control First</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>BRRI / BARI scouting first</div>
              </div>
            </div>
          </div>

          <DualInspector
            title="Epidemiological Rule Engine vs. Grounded Pathology RAG Dual-Inspector"
            deterministicTitle="Member 6 Epidemiological Susceptibility Rule Trace"
            deterministicBadge="LITERATURE-DERIVED"
            equationOrRule={'IF (T_opt_min <= AirTemp <= T_opt_max) AND (RH >= RH_threshold) -> Trigger Microclimatic Susceptibility\nIF (leaf_wetness_hours == null) -> Flag Missing Input & Require Visual Canopy Scouting'}
            inputs={[
              { label: 'Ambient Temp', value: `${tempCDisplay}°C` },
              { label: 'Relative Humidity', value: `${rhPctDisplay}%` },
              { label: 'Soil pH', value: String(soilPhDisplay) },
              { label: 'Leaf Wetness', value: 'null (Unmeasured)' },
            ]}
            outputs={[
              { label: 'Evaluated Diseases', value: '17 Bangladesh Diseases' },
              { label: 'Corpus DOIs', value: '60 Peer-Reviewed Papers' },
              { label: 'Full-Text Verified', value: '48 Papers (80.0%)' },
              { label: 'Abstract / Meta', value: '5 Abstract / 7 Metadata-Only' },
            ]}
            assumptions={[
              'Environmental susceptibility indicates favorable pathogen growth windows, NOT confirmed spores or lesions.',
              'Leaf wetness sensors and spore traps are not installed; outputs require visual field scouting.',
              'Chemical fungicides require adherence to DAE action thresholds.',
            ]}
            ragTitle="Bangladesh Plant Pathology Literature Synthesis"
            ragSummary="According to BRRI and BARI literature across 60 DOI publications, high humidity (RH ≥ 80%) coupled with 25°C–30°C elevates pressure for fungal blast (Magnaporthe oryzae) and sheath blight (Rhizoctonia solani), while Ralstonia bacterial wilt tracks soil moisture VWC ≥ 0.30 and warm soil without leaf wetness."
            citations={[
              { title: 'Epidemiology and Management of Rice Blast Disease in Bangladesh', authority: 'BRRI Pathology Division', doi: '10.1007/s10658-019-01823-1' },
              { title: 'Wheat Blast in Bangladesh: Challenges and Management Strategies', authority: 'Islam et al., 2020', doi: '10.1094/PDIS-04-19-0742-FE' },
            ]}
            suggestedPrompt="Explain the environmental conditions that trigger rice blast and bacterial wilt susceptibility in Godagari Upazila."
          />
        </div>
      );
    }

    if (activeTabIdx === 1) return <DiseasePanel controlledSubTab="catalog" />;
    return <DiseasePanel controlledSubTab="papers" />;
  };

  return (
    <section className="water-shell water-shell--fullbleed agronomy-theme" aria-label="Crops and Disease Dual-Axis Agronomy Control">
      {/* 1. LEFT VERTICAL ICON SIDEBAR */}
      <aside className="water-sidebar" aria-label="Agronomy & Pathology Categories">
        <div className="water-brand-dot" title="AgriSense Crops & Disease">
          <Sprout size={18} />
        </div>

        <div className="water-sidebar-nav-wrap">
          <div className="water-sidebar-layer">
            {SIDE_CATEGORIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  ref={(el) => {
                    sideBtnRefs.current[idx] = el;
                  }}
                  onClick={() => handleSelectSide(idx)}
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={activeSideIdx === idx}
                  className="water-side-btn"
                >
                  <Icon size={19} />
                </button>
              );
            })}
          </div>

          <div
            ref={sideFillRef}
            aria-hidden="true"
            className="water-sidebar-layer water-sidebar-fill"
          >
            {SIDE_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="water-side-btn">
                  <Icon size={19} />
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* 2. MAIN BOTANICAL SHELL + TOPBAR */}
      <div className="water-main-shell">
        <header className="water-topbar">
          <div className="water-topbar-left">
            <span className="water-section-label">{currentMenu.label}</span>

            <div className="water-top-tabs-scroll">
              <div className="water-top-tabs-wrap" role="tablist" aria-label={`${currentMenu.label} Views`}>
                <div className="water-top-tabs-layer">
                  {currentMenu.tabs.map((tab, idx) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTabIdx === idx}
                      ref={(el) => {
                        topBtnRefs.current[idx] = el;
                      }}
                      onClick={() => setActiveTabIdx(idx)}
                      className="water-top-tab-btn"
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div
                  ref={topFillRef}
                  aria-hidden="true"
                  className="water-top-tabs-layer water-top-tabs-fill"
                >
                  {currentMenu.tabs.map((tab) => (
                    <div key={tab} className="water-top-tab-btn">
                      {tab}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="water-topbar-right">
            <label htmlFor="agronomy-parcel-select" className="visually-hidden">Select Field Parcel</label>
            <select
              id="agronomy-parcel-select"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="water-compact-select"
            >
              {PARCELS.map((p) => (
                <option key={p.id} value={p.id}>{p.code} ({p.crop})</option>
              ))}
              {dynamicFields
                .filter((df) => !df.is_demo && !PARCELS.some((p) => p.id === df.id))
                .map((df) => (
                  <option key={df.id} value={df.id}>{df.name} ({df.current_crop})</option>
                ))}
            </select>

            <button
              type="button"
              className="water-compact-btn"
              onClick={() => navigateToWorkspace('simulator')}
              title="Open What-If Scenario Simulator"
            >
              <Scale size={12} />
              <span>What-If</span>
            </button>

            <button
              type="button"
              className="water-compact-btn"
              onClick={() =>
                askAssistantWithPrompt(
                  'Compare BARC crop suitability (T. Aman 78.92%, Maize 73.44%, Wheat 57.41%, Boro 40.51%) and explain Bangladesh rice/wheat disease microclimate thresholds.'
                )
              }
            >
              <Bot size={12} />
              <span>AI Brief</span>
            </button>

            <div className="water-status-chip">
              <span className="water-status-dot" />
              <span>AEZ-26 • 17 Diseases / 60 DOIs</span>
            </div>
          </div>
        </header>

        <div className="water-content">{renderPanelContent()}</div>
      </div>
    </section>
  );
}
