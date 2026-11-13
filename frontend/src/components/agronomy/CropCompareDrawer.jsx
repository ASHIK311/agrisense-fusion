import React, { useState, useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { CROP_3D_SPECS } from './cropSpecs';
import { slideFill, getRelativeEdges } from '../../utils/motion';

const CROP_CATALOG_ITEMS = [
  {
    key: 'rice_aman',
    season: 'Kharif',
    waterMm: 420,
    barc: 78.92,
    rootM: 0.45,
    nFixer: false,
    overdraft: false,
    thumb: 'linear-gradient(135deg, #065f46 0%, #7cc8a0 55%, #a3e635 100%)',
    pattern: 'canopy',
  },
  {
    key: 'rice_boro',
    season: 'Rabi',
    waterMm: 1150,
    barc: 40.51,
    rootM: 0.38,
    nFixer: false,
    overdraft: true,
    thumb: 'linear-gradient(135deg, #1e3a8a 0%, #60a5fa 48%, #e47a63 100%)',
    pattern: 'overdraft',
  },
  {
    key: 'maize_rabi',
    season: 'Rabi',
    waterMm: 480,
    barc: 73.44,
    rootM: 0.88,
    nFixer: false,
    overdraft: false,
    thumb: 'linear-gradient(135deg, #14532d 0%, #7cc8a0 52%, #f2c879 100%)',
    pattern: 'canopy',
  },
  {
    key: 'wheat',
    season: 'Rabi',
    waterMm: 310,
    barc: 57.41,
    rootM: 0.70,
    nFixer: false,
    overdraft: false,
    thumb: 'linear-gradient(135deg, #713f12 0%, #f2c879 55%, #7cc8a0 100%)',
    pattern: 'canopy',
  },
  {
    key: 'mustard',
    season: 'Rabi',
    waterMm: 210,
    barc: null,
    classTag: 'Oilseed Relay',
    rootM: 0.58,
    nFixer: false,
    overdraft: false,
    thumb: 'linear-gradient(135deg, #a16207 0%, #f2c879 55%, #7cc8a0 100%)',
    pattern: 'nodules',
  },
  {
    key: 'pulse',
    season: 'Kharif',
    waterMm: 140,
    barc: null,
    classTag: 'N₂ Legume',
    rootM: 0.64,
    nFixer: true,
    overdraft: false,
    thumb: 'linear-gradient(135deg, #064e3b 0%, #7cc8a0 55%, #60a5fa 100%)',
    pattern: 'nodules',
  },
];

const TRAIT_CHIPS = [
  { id: 'low_water', label: 'Low Water (<450mm)', insight: 'Filters crops with seasonal FAO-56 demand below 450 mm to limit Barind aquifer drawdown.' },
  { id: 'high_barc', label: 'BARC ≥70%', insight: 'Highlights crops with ≥70% historical BARC AEZ-26 land suitability (T. Aman, Rabi Maize).' },
  { id: 'deep_root', label: 'Deep Root (≥0.6m)', insight: 'Compares deeper rooting depth capable of tapping residual sub-soil moisture.' },
  { id: 'n_fixer', label: 'N₂-Fixing Legume', insight: 'Isolates Rhizobium-nodulating pulses that replenish topsoil organic nitrogen.' },
  { id: 'overdraft', label: 'Overdraft Stress', insight: 'Highlights intensive dry-season Boro extraction (~1,150 mm) for baseline contrast.' },
];

const SEASON_OPTS = [
  { id: 'Kharif', label: 'Monsoon', dot: '#7cc8a0' },
  { id: 'All', label: 'All Crops', dot: null },
  { id: 'Rabi', label: 'Dry Rabi', dot: '#f2c879' },
];

export default function CropCompareDrawer({
  leftCropKey,
  rightCropKey,
  onSelectLeft,
  onSelectRight,
  onSwap,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState('All');
  const [selectedTraits, setSelectedTraits] = useState([]);

  const segFillRef = useRef(null);
  const segBtnRefs = useRef([]);
  const listRef = useRef(null);
  const firstMountRef = useRef(true);

  const activeSeasonIdx = SEASON_OPTS.findIndex((s) => s.id === seasonFilter);

  useLayoutEffect(() => {
    if (collapsed) return;
    const fill = segFillRef.current;
    const btn = segBtnRefs.current[activeSeasonIdx];
    if (!fill || !btn) return;
    slideFill(fill, getRelativeEdges(fill, btn), firstMountRef.current, {
      axis: 'horizontal',
      radius: '10px',
    });
    firstMountRef.current = false;
  }, [activeSeasonIdx, collapsed]);

  useEffect(() => {
    const onResize = () => {
      const fill = segFillRef.current;
      const btn = segBtnRefs.current[activeSeasonIdx];
      if (fill && btn && !collapsed) {
        slideFill(fill, getRelativeEdges(fill, btn), true, { axis: 'horizontal', radius: '10px' });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeSeasonIdx, collapsed]);

  const toggleTrait = (id) => {
    setSelectedTraits((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const filteredCrops = useMemo(() => {
    return CROP_CATALOG_ITEMS.filter((item) => {
      if (seasonFilter !== 'All' && item.season !== seasonFilter) return false;
      if (selectedTraits.length === 0) return true;
      return selectedTraits.every((tr) => {
        if (tr === 'low_water') return item.waterMm < 450;
        if (tr === 'high_barc') return item.barc !== null && item.barc >= 70;
        if (tr === 'deep_root') return item.rootM >= 0.6;
        if (tr === 'n_fixer') return item.nFixer;
        if (tr === 'overdraft') return item.overdraft;
        return true;
      });
    });
  }, [seasonFilter, selectedTraits]);

  useEffect(() => {
    if (collapsed || !listRef.current || document.body.classList.contains('pause-motion')) return;
    const cards = listRef.current.querySelectorAll('.mcda-layer-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0.45, y: 6 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    }
  }, [seasonFilter, selectedTraits, collapsed]);

  const handleCardAssign = (key) => {
    if (key === leftCropKey || key === rightCropKey) return;
    onSelectRight(key);
  };

  return (
    <div className={`ag-drawer-slot ${collapsed ? 'is-collapsed' : ''}`}>
      {collapsed ? (
        <button
          type="button"
          className="mcda-expand-pill"
          onClick={() => setCollapsed(false)}
          aria-label="Expand 3D Crop Control Drawer"
        >
          <ChevronRight size={15} />
          <span>Crop Layers &amp; Filters</span>
        </button>
      ) : (
        <aside className="mcda-drawer ag-drawer-animated">
          <div className="mcda-drawer-scroll">
            {/* 1. Segmented Season Target + Collapse Toggle */}
            <div>
              <div className="mcda-drawer-head">
                <span className="mcda-sec-label">TARGET CROP SEASON</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="mcda-collapse-btn"
                    onClick={onSwap}
                    title="Swap Left & Right 3D Viewports"
                    aria-label="Swap Left and Right 3D Viewports"
                  >
                    <ArrowLeftRight size={13} />
                  </button>
                  <button
                    type="button"
                    className="mcda-collapse-btn"
                    onClick={() => setCollapsed(true)}
                    aria-label="Collapse drawer"
                    title="Collapse sidebar for wide 3D view"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>

              <div className="mcda-segmented" role="tablist" aria-label="Target Crop Season">
                <span ref={segFillRef} className="mcda-seg-fill" aria-hidden="true" />
                {SEASON_OPTS.map((seg, idx) => (
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

            {/* 2. Multi-Select Agronomic Trait Chips */}
            <div>
              <div className="mcda-drawer-head">
                <span className="mcda-sec-label">CROP TRAIT FILTERS</span>
                {selectedTraits.length > 0 && (
                  <button
                    type="button"
                    className="mcda-reset-link mono"
                    onClick={() => setSelectedTraits([])}
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div className="mcda-chips-wrap">
                {TRAIT_CHIPS.map((chip) => {
                  const active = selectedTraits.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={active}
                      className={`mcda-chip ${active ? 'active' : ''}`}
                      onClick={() => toggleTrait(chip.id)}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {selectedTraits.length > 0 && (
                <div className="agronomy-insight-box">
                  <strong>Active Filter Insight ({filteredCrops.length} crops shown):</strong>{' '}
                  {TRAIT_CHIPS.find((c) => c.id === selectedTraits[selectedTraits.length - 1])?.insight}
                </div>
              )}
            </div>

            {/* 3. Visual 3D Crop Layer Cards */}
            <div>
              <div className="mcda-drawer-head">
                <span className="mcda-sec-label">3D CROP LAYERS ({filteredCrops.length})</span>
                <span className="mono" style={{ fontSize: '0.64rem', color: '#8fb4ea' }}>
                  ASSIGN TO 3D VIEW
                </span>
              </div>

              <div ref={listRef} className="mcda-layers-list">
                {filteredCrops.length === 0 ? (
                  <div className="surface" style={{ padding: '0.85rem', textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    No crops match all selected filters.
                  </div>
                ) : (
                  filteredCrops.map((item) => {
                    const spec = CROP_3D_SPECS[item.key];
                    const isLeft = leftCropKey === item.key;
                    const isRight = rightCropKey === item.key;

                    return (
                      <div
                        key={item.key}
                        role="button"
                        tabIndex={0}
                        className={`mcda-layer-card ${isLeft ? 'is-slot-a' : isRight ? 'is-slot-cyan' : ''}`}
                        onClick={() => handleCardAssign(item.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardAssign(item.key);
                          }
                        }}
                      >
                        <div className="mcda-layer-thumb" style={{ background: item.thumb }}>
                          {item.pattern === 'nodules' && <div className="mcda-thumb-dots" />}
                          {item.pattern === 'overdraft' && <div className="mcda-thumb-alert" />}
                        </div>

                        <div className="mcda-layer-info">
                          <div className="mcda-layer-top">
                            <span className="mcda-layer-title">{spec?.label || item.key}</span>
                            <span className="mcda-layer-res">{item.waterMm} mm</span>
                          </div>
                          <div className="mcda-layer-bottom">
                            <span className="mcda-layer-sub">
                              {item.barc !== null ? `${item.barc.toFixed(1)}% BARC` : item.classTag} · {item.rootM}m root
                            </span>
                            <div className="mcda-slot-btns" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                aria-pressed={isLeft}
                                className={`mcda-slot-pill ${isLeft ? 'active-a' : ''}`}
                                onClick={() => onSelectLeft(item.key)}
                                title="Load into Left 3D Plot"
                              >
                                Left
                              </button>
                              <button
                                type="button"
                                aria-pressed={isRight}
                                className={`mcda-slot-pill ${isRight ? 'active-cyan' : ''}`}
                                onClick={() => onSelectRight(item.key)}
                                title="Load into Right 3D Plot"
                              >
                                Right
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
