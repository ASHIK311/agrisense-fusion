import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  ArrowLeftRight,
  Droplets,
  Leaf,
  Thermometer,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  BarChart3,
  Table as TableIcon,
  HelpCircle,
} from 'lucide-react';
import RulerSlider from './whatif/RulerSlider';
import ProvenanceBadge from './ProvenanceBadge';
import { slideFill, getRelativeEdges } from '../utils/motion';

const OBJECTIVE_CHIPS = [
  { id: 'water', label: 'Save Groundwater', insight: 'Prioritizes minimal deep tubewell extraction to slow Barind DTW drawdown.', boost: { waterConservation: 45, soilHealth: 10, heatResilience: 5, economicPreference: 0 } },
  { id: 'soil', label: 'Boost Soil N₂', insight: 'Rewards biological nitrogen fixation (Mungbean / Lentil) & hardpan relief.', boost: { waterConservation: 10, soilHealth: 45, heatResilience: 5, economicPreference: 0 } },
  { id: 'profit', label: 'Maximize Profit', insight: 'Weights farmer gross margin higher (elevates Maize, Potato & Oilseeds).', boost: { waterConservation: 0, soilHealth: 5, heatResilience: 5, economicPreference: 50 } },
  { id: 'heat', label: 'Heat Hardy (>34°C)', insight: 'Favors heat-resilient C4 Maize & drought-hardy pulses over thermal-sensitive crops.', boost: { waterConservation: 10, soilHealth: 5, heatResilience: 45, economicPreference: 0 } },
  { id: 'zero_boro', label: 'Zero Boro Draw', insight: 'Heavily penalizes 1,100+ mm Boro monoculture irrigation footprints.', boost: { waterConservation: 50, soilHealth: 15, heatResilience: 10, economicPreference: 5 } },
  { id: 'pulse', label: 'Legume / Oilseed', insight: 'Targets triple-crop relay diversification with Mustard & Pulse biomass.', boost: { waterConservation: 20, soilHealth: 40, heatResilience: 10, economicPreference: 10 } },
];

const SOIL_TEXTURES = [
  { id: 'clay_loam', label: 'Clay Loam (Barind)', bn: 'ভারী এঁটেল দোআঁশ' },
  { id: 'silt_loam', label: 'Silt Loam (Alluvial)', bn: 'পলি দোআঁশ' },
  { id: 'sandy_loam', label: 'Sandy Loam', bn: 'বেলে দোআঁশ' },
];

const PREV_CROPS = [
  { id: 'T_AMAN_RICE', label: 'T. Aman Rice' },
  { id: 'BORO_RICE', label: 'Boro Rice' },
  { id: 'FALLOW', label: 'Seasonal Fallow' },
];

function getRotationThumbStyle(rot) {
  const codes = rot.crops?.map((c) => c.code) || [];
  if (codes.includes('BORO_RICE')) {
    return {
      bg: 'linear-gradient(125deg, #1e3a8a 0%, #0284c7 45%, #dc2626 100%)',
      overlay: 'overdraft',
    };
  }
  if (codes.includes('LENTIL')) {
    return {
      bg: 'linear-gradient(135deg, #065f46 0%, #10b981 55%, #34d399 100%)',
      overlay: 'nodules',
    };
  }
  if (codes.includes('MUSTARD')) {
    return {
      bg: 'linear-gradient(135deg, #ca8a04 0%, #eab308 42%, #059669 100%)',
      overlay: 'nodules',
    };
  }
  if (codes.includes('MAIZE')) {
    return {
      bg: 'linear-gradient(135deg, #b45309 0%, #16a34a 52%, #0d9488 100%)',
      overlay: 'c4',
    };
  }
  if (codes.includes('POTATO')) {
    return {
      bg: 'linear-gradient(135deg, #78350f 0%, #d97706 48%, #10b981 100%)',
      overlay: 'tuber',
    };
  }
  return {
    bg: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    overlay: 'nodules',
  };
}

function getSeasonBucket(rot) {
  const codes = rot.crops?.map((c) => c.code) || [];
  if (codes.includes('BORO_RICE') || codes.includes('MAIZE') || codes.includes('POTATO') || codes.includes('LENTIL')) {
    return 'Rabi';
  }
  return 'Kharif';
}

function ComparisonRadarSvg({ slotA, slotB }) {
  if (!slotA || !slotB) return null;

  const axes = [
    { key: 'water', label: 'Water Saver' },
    { key: 'soil', label: 'Soil N₂' },
    { key: 'heat', label: 'Heat Tol.' },
    { key: 'economic', label: 'Gross Margin' },
  ];

  const cx = 135;
  const cy = 115;
  const maxR = 76;

  const toPoints = (scores) =>
    axes
      .map((ax, idx) => {
        const angle = -Math.PI / 2 + idx * (Math.PI / 2);
        const val = Math.max(0.1, Math.min(1, (scores[ax.key] || 0) / 100));
        return `${(cx + Math.cos(angle) * maxR * val).toFixed(1)},${(cy + Math.sin(angle) * maxR * val).toFixed(1)}`;
      })
      .join(' ');

  return (
    <svg viewBox="0 0 270 232" style={{ width: '100%', maxWidth: '280px', height: 'auto', overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={axes
            .map((_, idx) => {
              const a = -Math.PI / 2 + idx * (Math.PI / 2);
              return `${(cx + Math.cos(a) * maxR * ring).toFixed(1)},${(cy + Math.sin(a) * maxR * ring).toFixed(1)}`;
            })
            .join(' ')}
          fill="none"
          stroke="rgba(148, 163, 184, 0.18)"
          strokeDasharray={ring < 1 ? '3 3' : undefined}
        />
      ))}

      {axes.map((ax, idx) => {
        const a = -Math.PI / 2 + idx * (Math.PI / 2);
        const x2 = cx + Math.cos(a) * maxR;
        const y2 = cy + Math.sin(a) * maxR;
        const lx = cx + Math.cos(a) * (maxR + 20);
        const ly = cy + Math.sin(a) * (maxR + 18);
        return (
          <g key={ax.key}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(148, 163, 184, 0.22)" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-secondary)"
              fontSize="10"
              fontWeight="700"
            >
              {ax.label}
            </text>
          </g>
        );
      })}

      {/* Slot B Polygon (Cyan/Amber Baseline) */}
      <polygon
        points={toPoints(slotB.scores)}
        fill="rgba(245, 158, 11, 0.16)"
        stroke="#f59e0b"
        strokeWidth="2"
      />
      {/* Slot A Polygon (Emerald Winner/Primary) */}
      <polygon
        points={toPoints(slotA.scores)}
        fill="rgba(16, 185, 129, 0.24)"
        stroke="#10b981"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export default function CropRotationExplorer({ field, weather }) {
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('All'); // 'Kharif' | 'All' | 'Rabi'
  const [selectedChips, setSelectedChips] = useState(['water', 'soil']);
  const [fineTuneOpen, setFineTuneOpen] = useState(false);

  const [weights, setWeights] = useState({
    waterConservation: 35,
    soilHealth: 25,
    heatResilience: 20,
    economicPreference: 20,
  });

  const [soilType, setSoilType] = useState(field?.soil_type || 'clay_loam');
  const [soilPh, setSoilPh] = useState(6.4);
  const [previousCrop, setPreviousCrop] = useState('T_AMAN_RICE');

  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotAId, setSlotAId] = useState(null);
  const [slotBId, setSlotBId] = useState('rot-boro-fallow-aman');
  const [showDetails, setShowDetails] = useState(true);
  const [pillarView, setPillarView] = useState('chart');
  const [explainOpen, setExplainOpen] = useState(false);

  const segFillRef = useRef(null);
  const segBtnRefs = useRef([]);
  const listRef = useRef(null);
  const firstSegMountRef = useRef(true);

  const SEASON_TABS = [
    { id: 'Kharif', label: 'Monsoon', dot: '#10b981' },
    { id: 'All', label: 'All Cycles', dot: null },
    { id: 'Rabi', label: 'Dry Rabi', dot: '#f59e0b' },
  ];
  const activeSeasonIdx = SEASON_TABS.findIndex((s) => s.id === seasonFilter);

  useLayoutEffect(() => {
    if (drawerCollapsed) return;
    const fill = segFillRef.current;
    const btn = segBtnRefs.current[activeSeasonIdx];
    if (!fill || !btn) return;
    slideFill(fill, getRelativeEdges(fill, btn), firstSegMountRef.current, {
      axis: 'horizontal',
      radius: '10px',
    });
    firstSegMountRef.current = false;
  }, [activeSeasonIdx, drawerCollapsed]);

  useEffect(() => {
    const onResize = () => {
      const fill = segFillRef.current;
      const btn = segBtnRefs.current[activeSeasonIdx];
      if (fill && btn && !drawerCollapsed) {
        slideFill(fill, getRelativeEdges(fill, btn), true, { axis: 'horizontal', radius: '10px' });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeSeasonIdx, drawerCollapsed]);

  // Sync priority chips cleanly into deterministic MCDA weights
  const toggleChip = (chipId) => {
    setSelectedChips((prev) => {
      const next = prev.includes(chipId) ? prev.filter((c) => c !== chipId) : [...prev, chipId];
      if (next.length === 0) {
        setWeights({ waterConservation: 35, soilHealth: 25, heatResilience: 20, economicPreference: 20 });
      } else {
        const totals = { waterConservation: 10, soilHealth: 10, heatResilience: 10, economicPreference: 10 };
        next.forEach((id) => {
          const chip = OBJECTIVE_CHIPS.find((c) => c.id === id);
          if (chip) {
            totals.waterConservation += chip.boost.waterConservation;
            totals.soilHealth += chip.boost.soilHealth;
            totals.heatResilience += chip.boost.heatResilience;
            totals.economicPreference += chip.boost.economicPreference;
          }
        });
        setWeights(totals);
      }
      return next;
    });
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
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
              recentRainfallMm: weather?.latest?.precip_mm || 5.0,
            },
          }),
        });
        const data = await res.json();
        if (active && data.success) {
          setEvaluation(data);
          setSlotAId((prev) => prev || data.rankedRotations[0]?.id || null);
        }
      } catch (err) {
        console.error('Error evaluating crop rotations:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [weights, soilType, soilPh, previousCrop, weather?.latest?.t2m, weather?.latest?.precip_mm]);

  const ranked = evaluation?.rankedRotations || [];

  const visiblePatterns = useMemo(() => {
    if (seasonFilter === 'All') return ranked;
    return ranked.filter((rot) => {
      if (seasonFilter === 'Kharif') return getSeasonBucket(rot) === 'Kharif' || rot.crops?.some((c) => c.code === 'MUNGBEAN');
      return getSeasonBucket(rot) === 'Rabi';
    });
  }, [ranked, seasonFilter]);

  useEffect(() => {
    if (drawerCollapsed || !listRef.current || document.body.classList.contains('pause-motion')) return;
    const cards = listRef.current.querySelectorAll('.mcda-layer-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0.45, y: 6 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    }
  }, [seasonFilter, selectedChips, drawerCollapsed, visiblePatterns.length]);

  const slotA = ranked.find((r) => r.id === slotAId) || ranked[0] || null;
  const slotB = ranked.find((r) => r.id === slotBId) || ranked[ranked.length - 1] || ranked[1] || null;

  const pinCard = (id, targetSlot = null) => {
    if (targetSlot === 'A') {
      if (id === slotBId && slotAId) setSlotBId(slotAId);
      setSlotAId(id);
      return;
    }
    if (targetSlot === 'B') {
      if (id === slotAId && slotBId) setSlotAId(slotBId);
      setSlotBId(id);
      return;
    }
    // Single click on card switches Slot A unless already Slot A, then updates Slot B
    if (id !== slotAId && id !== slotBId) {
      setSlotAId(id);
    }
  };

  const swapSlots = () => {
    if (!slotA || !slotB) return;
    setSlotAId(slotB.id);
    setSlotBId(slotA.id);
  };

  const waterDelta = slotA && slotB ? slotB.estimatedWaterUseMm - slotA.estimatedWaterUseMm : 0;
  const scoreDelta = slotA && slotB ? Number((slotA.scores.composite - slotB.scores.composite).toFixed(1)) : 0;

  return (
    <div className="mcda-shell">
      {/* Left Collapsible Geospatial / Agronomic Control Drawer */}
      <div className={`ag-drawer-slot ${drawerCollapsed ? 'is-collapsed' : ''}`}>
        {drawerCollapsed ? (
          <button
            type="button"
            className="mcda-expand-pill"
            onClick={() => setDrawerCollapsed(false)}
            aria-label="Expand Rotation Control Drawer"
          >
            <ChevronRight size={16} />
            <span>Controls &amp; Patterns</span>
          </button>
        ) : (
          <aside className="mcda-drawer ag-drawer-animated">
            <div className="mcda-drawer-scroll">
              {/* 1. Segmented Season Target + Collapse Button */}
              <div>
                <div className="mcda-drawer-head">
                  <span className="mcda-sec-label">TARGET CROPPING WINDOW</span>
                  <button
                    type="button"
                    className="mcda-collapse-btn"
                    onClick={() => setDrawerCollapsed(true)}
                    aria-label="Collapse drawer"
                    title="Collapse panel for full-width comparison"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
                <div className="mcda-segmented" role="tablist" aria-label="Target Cropping Window">
                  <span ref={segFillRef} className="mcda-seg-fill" aria-hidden="true" />
                  {SEASON_TABS.map((seg, idx) => (
                    <button
                      key={seg.id}
                      ref={(el) => { segBtnRefs.current[idx] = el; }}
                      type="button"
                      role="tab"
                      aria-selected={seasonFilter === seg.id}
                      className={`mcda-seg-btn ${seasonFilter === seg.id ? 'active' : ''}`}
                      onClick={() => setSeasonFilter(seg.id)}
                    >
                      {seg.dot && <span className="mcda-seg-dot" style={{ background: seg.dot }} />}
                      <span>{seg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            {/* 2. Multi-Select Priority Chips */}
            <div>
              <div className="mcda-drawer-head">
                <span className="mcda-sec-label">FARMER OBJECTIVES</span>
                <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--accent-primary)' }}>
                  MULTI-SELECT
                </span>
              </div>
              <div className="mcda-chips-wrap">
                {OBJECTIVE_CHIPS.map((chip) => {
                  const active = selectedChips.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={active}
                      className={`mcda-chip ${active ? 'active' : ''}`}
                      onClick={() => toggleChip(chip.id)}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {selectedChips.length > 0 && (
                <div className="agronomy-insight-box">
                  <strong>Active Objective Focus:</strong>{' '}
                  {OBJECTIVE_CHIPS.find((c) => c.id === selectedChips[selectedChips.length - 1])?.insight}
                </div>
              )}

              {/* Optional Collapsible Fine-Tune Sliders + Dark Soil Context Selectors */}
              <button
                type="button"
                className="mcda-accordion-btn"
                onClick={() => setFineTuneOpen((v) => !v)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={12} /> Fine-Tune Weights &amp; Soil ({soilPh} pH)
                </span>
                {fineTuneOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {fineTuneOpen && (
                <div className="mcda-finetune-box">
                  <RulerSlider
                    label="Water Conservation"
                    value={weights.waterConservation}
                    min={0}
                    max={100}
                    onChange={(v) => setWeights((p) => ({ ...p, waterConservation: v }))}
                    displayValue={`${weights.waterConservation}%`}
                    fillColor="#38bdf8"
                  />
                  <RulerSlider
                    label="Soil Health & N₂"
                    value={weights.soilHealth}
                    min={0}
                    max={100}
                    onChange={(v) => setWeights((p) => ({ ...p, soilHealth: v }))}
                    displayValue={`${weights.soilHealth}%`}
                    fillColor="#10b981"
                  />
                  <RulerSlider
                    label="Heat Resilience"
                    value={weights.heatResilience}
                    min={0}
                    max={100}
                    onChange={(v) => setWeights((p) => ({ ...p, heatResilience: v }))}
                    displayValue={`${weights.heatResilience}%`}
                    fillColor="#f59e0b"
                  />
                  <RulerSlider
                    label="Profit & Margin"
                    value={weights.economicPreference}
                    min={0}
                    max={100}
                    onChange={(v) => setWeights((p) => ({ ...p, economicPreference: v }))}
                    displayValue={`${weights.economicPreference}%`}
                    fillColor="#f97316"
                  />
                  <RulerSlider
                    label="Soil pH Scale"
                    value={soilPh}
                    min={4.5}
                    max={8.5}
                    step={0.1}
                    onChange={(v) => setSoilPh(v)}
                    displayValue={`pH ${soilPh}`}
                    fillColor="#34d399"
                  />

                  <div style={{ marginTop: '0.45rem' }}>
                    <span className="mcda-mini-label">Target Soil Texture</span>
                    <div className="mcda-pill-group">
                      {SOIL_TEXTURES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`mcda-mini-pill ${soilType === s.id ? 'active' : ''}`}
                          onClick={() => setSoilType(s.id)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '0.45rem' }}>
                    <span className="mcda-mini-label">Previous Crop Season</span>
                    <div className="mcda-pill-group">
                      {PREV_CROPS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`mcda-mini-pill ${previousCrop === c.id ? 'active' : ''}`}
                          onClick={() => setPreviousCrop(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Visual Rotation Pattern Cards (modeled after Earth Map Layers) */}
            <div>
              <div className="mcda-drawer-head">
                <span className="mcda-sec-label">ROTATION PATTERNS ({visiblePatterns.length})</span>
                <span className="mono" style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>
                  CLICK TO COMPARE
                </span>
              </div>

              <div ref={listRef} className="mcda-layers-list">
                {visiblePatterns.map((rot) => {
                  const thumb = getRotationThumbStyle(rot);
                  const isA = slotA?.id === rot.id;
                  const isB = slotB?.id === rot.id;
                  const shortTitle = rot.name.split('(')[0].trim();

                  return (
                    <div
                      key={rot.id}
                      role="button"
                      tabIndex={0}
                      className={`mcda-layer-card ${isA ? 'is-slot-a' : isB ? 'is-slot-b' : ''}`}
                      onClick={() => pinCard(rot.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          pinCard(rot.id);
                        }
                      }}
                    >
                      <div className="mcda-layer-thumb" style={{ background: thumb.bg }}>
                        {thumb.overlay === 'nodules' && <div className="mcda-thumb-dots" />}
                        {thumb.overlay === 'overdraft' && <div className="mcda-thumb-alert" />}
                      </div>

                      <div className="mcda-layer-info">
                        <div className="mcda-layer-top">
                          <span className="mcda-layer-title">
                            #{rot.rank} {shortTitle}
                          </span>
                          <span className="mcda-layer-res">{rot.estimatedWaterUseMm} mm</span>
                        </div>
                        <div className="mcda-layer-bottom">
                          <span className="mcda-layer-sub">
                            Score {rot.scores.composite}/100 · {rot.crops.map((c) => c.code.split('_')[0]).join('+')}
                          </span>
                          <div className="mcda-slot-btns" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              aria-pressed={isA}
                              className={`mcda-slot-pill ${isA ? 'active-a' : ''}`}
                              onClick={() => pinCard(rot.id, 'A')}
                              title="Pin to Compare Slot A"
                            >
                              Slot A
                            </button>
                            <button
                              type="button"
                              aria-pressed={isB}
                              className={`mcda-slot-pill ${isB ? 'active-b' : ''}`}
                              onClick={() => pinCard(rot.id, 'B')}
                              title="Pin to Compare Slot B"
                            >
                              Slot B
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
        )}
      </div>

      {/* Right Main Easy Side-by-Side Comparison Workspace */}
      <div className="mcda-compare-main">
        {/* Top Comparison Delta Header */}
        <div className="card mcda-header-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span className="badge badge-live">
                <Layers size={11} /> MCDA SIDE-BY-SIDE COMPARE
              </span>
              <ProvenanceBadge type="MODEL-DERIVED" label="SIMULATED SCENARIO — NOT FIELD-VALIDATED SAVINGS" compact />
              {loading && (
                <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
                  RE-RANKING...
                </span>
              )}
            </div>
            <h2 className="font-display" style={{ fontSize: '1.22rem', fontWeight: 800, margin: 0 }}>
              Easy Rotation Trade-Off Comparator (Godagari AEZ-26)
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {slotA && slotB && (
              <div className="mcda-delta-pill mono">
                <Droplets size={13} style={{ color: '#60a5fa' }} />
                <span>
                  {waterDelta >= 0 ? `Slot A lowers est. demand by ${waterDelta} mm` : `Slot A raises est. demand by ${Math.abs(waterDelta)} mm`}
                </span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span style={{ color: scoreDelta >= 0 ? '#7cc8a0' : '#f2c879' }}>
                  {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} MCDA pts
                </span>
              </div>
            )}
            <button type="button" className="btn btn-secondary" onClick={swapSlots} style={{ fontSize: '0.74rem', padding: '0.38rem 0.72rem' }}>
              <ArrowLeftRight size={13} /> Swap A ↔ B
            </button>
          </div>
        </div>

        {/* Side-by-Side Slot A vs Slot B Hero Cards */}
        {slotA && slotB ? (
          <>
            <div className="mcda-ab-grid">
              {[
                { label: 'SLOT A · PRIMARY', slot: slotA, accent: '#7cc8a0', tagClass: 'slot-a' },
                { label: 'SLOT B · BENCHMARK', slot: slotB, accent: '#f2c879', tagClass: 'slot-b' },
              ].map(({ label, slot, accent, tagClass }) => {
                const boroBaseline = ranked.find((r) => r.id === 'rot-boro-fallow-aman')?.estimatedWaterUseMm ?? 1350;
                const saves = boroBaseline - slot.estimatedWaterUseMm;
                return (
                  <div key={tagClass} className={`card mcda-ab-card ${tagClass}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 800, color: accent }}>
                          {label} · RANK #{slot.rank}
                        </span>
                        <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '0.2rem 0 0', color: 'var(--text-main)' }}>
                          {slot.name}
                        </h3>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: '1.55rem', fontWeight: 800, color: accent, lineHeight: 1 }}>
                          {slot.scores.composite}
                        </div>
                        <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                          / 100
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.45rem 0 0.7rem' }}>
                      {slot.description}
                    </p>

                    {/* Crop Sequence Badges */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {slot.crops.map((crop, idx) => (
                        <span
                          key={idx}
                          className="surface"
                          style={{
                            padding: '0.22rem 0.55rem',
                            borderRadius: '7px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderLeft: crop.nitrogenFixing ? '3px solid #7cc8a0' : `3px solid ${accent}`,
                          }}
                        >
                          {crop.name.split('(')[0].trim()}
                          {crop.nitrogenFixing && ' · N₂ Fixer'}
                        </span>
                      ))}
                    </div>

                    {/* Water Footprint Row */}
                    <div className="surface" style={{ padding: '0.5rem 0.7rem', borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Modeled Irrigation Demand</span>
                      <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 800, color: saves > 200 ? '#60a5fa' : '#e47a63' }}>
                        {slot.estimatedWaterUseMm} mm {saves > 0 ? `(-${saves} vs Baseline)` : '(Baseline Overdraft)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4-Pillar Side-by-Side Visual Comparator (Chart / Exact Table Toggle) */}
            <div className="card mcda-radar-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minWidth: '250px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800 }}>
                    4-Pillar Performance Comparison (Slot A vs Slot B)
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="mono" style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
                      <span style={{ color: '#7cc8a0' }}>■ Slot A (#{slotA.rank})</span>
                      <span style={{ color: '#f2c879' }}>■ Slot B (#{slotB.rank})</span>
                    </div>
                    <div className="ag-view-toggle" role="group" aria-label="MCDA Pillar View Mode">
                      <button
                        type="button"
                        className={`ag-view-btn ${pillarView === 'chart' ? 'active' : ''}`}
                        aria-pressed={pillarView === 'chart'}
                        onClick={() => setPillarView('chart')}
                      >
                        <BarChart3 size={12} /> Chart
                      </button>
                      <button
                        type="button"
                        className={`ag-view-btn ${pillarView === 'table' ? 'active' : ''}`}
                        aria-pressed={pillarView === 'table'}
                        onClick={() => setPillarView('table')}
                      >
                        <TableIcon size={12} /> Exact Table
                      </button>
                    </div>
                  </div>
                </div>

                {pillarView === 'chart' ? (
                  [
                    { key: 'water', label: 'Water Conservation', icon: Droplets, color: '#60a5fa' },
                    { key: 'soil', label: 'Soil Health & N₂', icon: Leaf, color: '#7cc8a0' },
                    { key: 'heat', label: 'Heat Resilience', icon: Thermometer, color: '#f2c879' },
                    { key: 'economic', label: 'Gross Profit Margin', icon: DollarSign, color: '#e47a63' },
                  ].map(({ key, label, icon: Icon, color }) => {
                    const aVal = slotA.scores[key] || 0;
                    const bVal = slotB.scores[key] || 0;
                    const diff = aVal - bVal;
                    return (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                            <Icon size={13} style={{ color }} /> {label}
                          </span>
                          <span className="mono" style={{ fontSize: '0.74rem' }}>
                            <strong style={{ color: '#7cc8a0' }}>{aVal}</strong>
                            <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>vs</span>
                            <strong style={{ color: '#f2c879' }}>{bVal}</strong>
                            <span style={{ marginLeft: 8, color: diff >= 0 ? '#7cc8a0' : '#e47a63' }}>
                              ({diff >= 0 ? `+${diff}` : diff})
                            </span>
                          </span>
                        </div>
                        <div className="mcda-dual-track">
                          <div className="mcda-bar-a" style={{ width: `${aVal}%` }} />
                          <div className="mcda-bar-b" style={{ width: `${bVal}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="surface table-container" style={{ padding: '0.35rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Criterion</th>
                          <th>Norm. Weight</th>
                          <th>Slot A Score</th>
                          <th>Slot B Score</th>
                          <th>Delta (A − B)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'water', wKey: 'water', label: 'Water Conservation' },
                          { key: 'soil', wKey: 'soil', label: 'Soil Health & N₂' },
                          { key: 'heat', wKey: 'heat', label: 'Heat Resilience' },
                          { key: 'economic', wKey: 'econ', label: 'Gross Profit Margin' },
                        ].map((row) => {
                          const nw = evaluation?.normalizedWeights?.[row.wKey] ?? 0.25;
                          const av = slotA.scores[row.key] || 0;
                          const bv = slotB.scores[row.key] || 0;
                          const d = av - bv;
                          return (
                            <tr key={row.key}>
                              <td><strong>{row.label}</strong></td>
                              <td className="mono">{(nw * 100).toFixed(1)}%</td>
                              <td className="mono" style={{ color: '#7cc8a0', fontWeight: 700 }}>{av}</td>
                              <td className="mono" style={{ color: '#f2c879', fontWeight: 700 }}>{bv}</td>
                              <td className="mono" style={{ color: d >= 0 ? '#7cc8a0' : '#e47a63', fontWeight: 700 }}>
                                {d >= 0 ? `+${d}` : d} pts
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td><strong>Weighted Composite</strong></td>
                          <td className="mono">100.0%</td>
                          <td className="mono" style={{ color: '#7cc8a0', fontWeight: 800 }}>{slotA.scores.composite}</td>
                          <td className="mono" style={{ color: '#f2c879', fontWeight: 800 }}>{slotB.scores.composite}</td>
                          <td className="mono" style={{ color: scoreDelta >= 0 ? '#7cc8a0' : '#e47a63', fontWeight: 800 }}>
                            {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {pillarView === 'chart' && (
                <div className="mcda-radar-wrap">
                  <ComparisonRadarSvg slotA={slotA} slotB={slotB} />
                </div>
              )}
            </div>

            {/* Expandable "Explain This Result" Panel */}
            <div className="card" style={{ padding: '0.9rem 1.15rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                aria-expanded={explainOpen}
                onClick={() => setExplainOpen((v) => !v)}
                style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <HelpCircle size={14} style={{ color: '#f2c879' }} />
                  Explain This Result (Weights, Equations, Dataset &amp; Reliability)
                </span>
                {explainOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {explainOpen && (() => {
                const nw = evaluation?.normalizedWeights || { water: 0.35, soil: 0.25, heat: 0.2, econ: 0.2 };
                const entries = [
                  { k: 'Water Conservation', w: nw.water, diff: (slotA.scores.water || 0) - (slotB.scores.water || 0) },
                  { k: 'Soil Health & N₂', w: nw.soil, diff: (slotA.scores.soil || 0) - (slotB.scores.soil || 0) },
                  { k: 'Heat Resilience', w: nw.heat, diff: (slotA.scores.heat || 0) - (slotB.scores.heat || 0) },
                  { k: 'Gross Profit Margin', w: nw.econ, diff: (slotA.scores.economic || 0) - (slotB.scores.economic || 0) },
                ].sort((a, b) => Math.abs(b.w * b.diff) - Math.abs(a.w * a.diff));
                const topDriver = entries[0];
                return (
                  <div className="agronomy-explain-grid">
                    <div className="surface" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#f2c879' }}>1. DRIVING FACTOR &amp; SENSITIVITY</strong>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        Largest weighted gap came from <strong>{topDriver.k}</strong> ({(topDriver.w * 100).toFixed(1)}% weight, raw diff {topDriver.diff >= 0 ? `+${topDriver.diff}` : topDriver.diff} pts), shifting Slot A vs Slot B by{' '}
                        <strong>{scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} composite pts</strong>.
                      </p>
                    </div>
                    <div className="surface" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#60a5fa' }}>2. ACTIVE INPUTS &amp; FORMULA</strong>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        <code>Composite = Σ(NormWeight × PillarScore)</code> via <code>cropRotationEngine v1.0</code>. Context: soil <code>{soilType}</code>, pH <code>{soilPh}</code>, prev crop <code>{previousCrop}</code>, mean temp <code>{Number(weather?.latest?.t2m || 28.5).toFixed(1)}°C</code>.
                      </p>
                    </div>
                    <div className="surface" style={{ padding: '0.75rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#e47a63' }}>3. DATASET, ASSUMPTIONS &amp; LIMITS</strong>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        Literature-parameterized crop coefficients (<code>cropCatalog.js</code>). <strong>SIMULATED SCENARIO — NOT FIELD-VALIDATED SAVINGS</strong>; local market gross margins &amp; seasonal rainfall affect realized farm profit.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Expandable Side-by-Side Pros / Caveats */}
            <div className="card" style={{ padding: '0.95rem 1.15rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDetails((v) => !v)}
                style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
              >
                <span>Agronomic Advantages &amp; Field Caveats (Slot A vs Slot B)</span>
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDetails && (
                <div className="mcda-ab-grid" style={{ marginTop: '0.85rem' }}>
                  {[slotA, slotB].map((slot, idx) => (
                    <div key={`${slot.id}-${idx}`} className="surface" style={{ padding: '0.85rem', borderRadius: '11px' }}>
                      <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 800, color: idx === 0 ? '#10b981' : '#f59e0b', marginBottom: '0.4rem' }}>
                        {idx === 0 ? 'SLOT A' : 'SLOT B'} • {slot.name.split('(')[0].trim()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.76rem' }}>
                        <div>
                          <strong style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Key Advantages
                          </strong>
                          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                            {slot.pros.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                        <div>
                          <strong style={{ color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={12} /> Operational Caveats
                          </strong>
                          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                            {slot.cons.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Computing deterministic MCDA rankings...
          </div>
        )}
      </div>
    </div>
  );
}
