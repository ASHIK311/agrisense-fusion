import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Compass,
  MapPin,
  ShieldAlert,
  Sparkles,
  Sun,
  Moon,
  Eye,
  Bell,
  Settings,
  X,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import { BANGLADESH_REGIONS } from '../data/regions';

const PALETTE_DESTINATIONS = [
  { id: 'home', label: 'Home Story & Digital Twin Hero', sub: 'Overview narrative (Sections 01–09)', keywords: 'home hero story landing', runType: 'home' },
  { id: 'ws-command', label: 'Command Hub', sub: 'Field Overview, KPIs, 3D Stratigraphic Twin', keywords: 'command deck hub overview dashboard', ws: 'command' },
  { id: 'ws-earth-spatial', label: 'Earth Lab · 2D/3D Spatial Twin', sub: 'Synchronized Esri + Three.js terrain + 34.8 km tether', keywords: 'earth spatial map 2d 3d tether leaflet', ws: 'earth-lab', mode: 'spatial' },
  { id: 'ws-earth-spectral', label: 'Earth Lab · Sentinel-2 Spectral Lab', sub: 'NDVI / NDMI / EVI wipe · 84.63% spatial CV · 422 gate', keywords: 'sentinel spectral ndvi ndmi evi ndwi lulc', ws: 'earth-lab', mode: 'spectral' },
  { id: 'ws-earth-climate', label: 'Earth Lab · NASA POWER Climate', sub: '1,827 daily rows · Heat-dry screening · 501 forecast gate', keywords: 'weather climate nasa power vpd heat temperature rain', ws: 'earth-lab', mode: 'climate' },
  { id: 'ws-hydro-root', label: 'Water & Soil · FAO-56 Root-Zone Physics', sub: 'Penman-Monteith ET0, TAW 79mm, Dr depletion, 70% vs 85%', keywords: 'water fao56 et0 etc root zone depletion irrigation', ws: 'hydrology', mode: 'root-zone' },
  { id: 'ws-hydro-iot', label: 'Water & Soil · ESP32 IoT & BMDA Aquifer Proxy', sub: 'Simulated UNCALIBRATED FDR v2 + 26.4m/28m synthetic proxy', keywords: 'iot esp32 soil moisture vwc groundwater bmda aquifer', ws: 'hydrology', mode: 'soil-iot' },
  { id: 'ws-agro-crops', label: 'Crops & Disease · Suitability & Rotation MCDA', sub: 'BARC AEZ-26 (Aman 78.92%) + 4-slider provisional rotations', keywords: 'crops suitability rotation aman boro maize wheat calendar', ws: 'agronomy', mode: 'crops' },
  { id: 'ws-agro-disease', label: 'Crops & Disease · Pathology & 60 DOIs', sub: '17 Bangladesh diseases · Environmental risk screening', keywords: 'disease pathology blast blight wilt doi papers', ws: 'agronomy', mode: 'disease' },
  { id: 'ws-simulator', label: 'What-If Lab · Scenario A vs B', sub: 'Boro flood (70%) vs Water-Smart Rotation (85%) delta', keywords: 'simulator what if scenario comparison', ws: 'simulator' },
  { id: 'ws-methods', label: 'Methods & Learn · Validation & Architecture', sub: 'M1–M6 parity ledger & system pipeline diagram', keywords: 'methods validation parity architecture calibration learn', ws: 'methods', mode: 'validation' },
  { id: 'ws-arch', label: 'Methods & Learn · System Architecture', sub: '6-layer data provenance flow', keywords: 'architecture pipeline diagram', ws: 'methods', mode: 'architecture' },
  { id: 'ws-report', label: 'Field Report · Printable Dossier & CSV', sub: 'Print-ready synthesis report + weather/sensor CSV export', keywords: 'report pdf print csv export dossier', ws: 'report' },
  { id: 'ws-assistant', label: 'AgriSense AI · Full-Screen Copilot', sub: 'Bilingual EN / বাংলা RAG over 87 chunks & 9 tools', keywords: 'ai assistant chat rag bangla', ws: 'assistant' },
];

const HOME_SECTION_HITS = [
  { id: 'hero', label: 'Section 01 · Living Landscape Hero', sub: 'Interactive 4-layer 3D terrain canvas' },
  { id: 'journey', label: 'Section 02 · Earth Observation Journey', sub: 'Orbit-to-root-zone zoom narrative' },
  { id: 'digital-twin', label: 'Section 03 · 4-Layer Digital Twin Strata', sub: 'Atmosphere, Canopy, Surface, Subsurface' },
  { id: 'challenge', label: 'Section 04 · Barind Hydrological Challenge', sub: '26.4m DTW proxy vs 28m suction limit' },
  { id: 'science', label: 'Section 05 · Six Scientific Subsystems', sub: 'Live Sentinel-2 scan stage (M1–M6)' },
  { id: 'impact', label: 'Section 06 · Grounded Rigor & Impact', sub: 'Telemetry observatory & BARC suitability' },
  { id: 'preview', label: 'Section 07 · Spatial Twin Preview HUD', sub: 'Interactive parcel markings & VRA' },
  { id: 'explorer', label: 'Section 08 · Bangladesh Location Explorer', sub: 'Godagari vs regional coverage matrix' },
];

let cachedDiseases = null;

/** Global Ctrl+K / / search modal across destinations, parcels, regions, diseases, and actions. */
export default function CommandPaletteModal() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    navigateToHome,
    navigateToWorkspace,
    setSelectedFieldId,
    selectRegion,
    setAiDrawerOpen,
    setAlertsDrawerOpen,
    setSettingsDrawerOpen,
    theme,
    toggleTheme,
    xRayMode,
    setXRayMode,
    pauseMotion,
    setPauseMotion,
    startJudgeDemo,
    activeAlertCount,
  } = useAgriSense();

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [diseases, setDiseases] = useState(() => cachedDiseases || []);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    setQuery('');
    setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 20);

    if (!cachedDiseases) {
      fetch('/api/v1/diseases')
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data.diseases) ? data.diseases : [];
          cachedDiseases = list;
          setDiseases(list);
        })
        .catch(() => {});
    }
  }, [commandPaletteOpen]);

  const allItems = useMemo(() => {
    const items = [];

    PALETTE_DESTINATIONS.forEach((d) => {
      items.push({
        id: d.id,
        group: 'Destinations & Labs',
        label: d.label,
        sub: d.sub,
        keywords: `${d.label} ${d.sub} ${d.keywords}`,
        icon: Compass,
        run: () => {
          if (d.runType === 'home') navigateToHome();
          else navigateToWorkspace(d.ws, d.mode || null);
        },
      });
    });

    PARCELS.forEach((p) => {
      items.push({
        id: `parcel-${p.id}`,
        group: 'Godagari Field Parcels (AEZ-26)',
        label: `${p.code} — ${p.name}`,
        sub: `${p.crop} • ${p.area_ha} ha • NDVI ${p.ndvi.toFixed(2)} • VWC ${(p.vwc * 100).toFixed(1)}%`,
        keywords: `${p.code} ${p.name} ${p.crop} parcel godagari`,
        icon: Layers,
        badge: 'AEZ-26 PILOT',
        badgeTone: 'live',
        run: () => {
          setSelectedFieldId(p.id);
          navigateToWorkspace('command');
        },
      });
    });

    BANGLADESH_REGIONS.forEach((reg) => {
      const isFull = reg.coverageStatus === 'FULL SCIENTIFIC COVERAGE';
      items.push({
        id: `region-${reg.id}`,
        group: 'Bangladesh Coverage Explorer',
        label: `${reg.name} (${reg.district})`,
        sub: `${reg.aez} • IoT: ${reg.coverage.soilIot.status}`,
        keywords: `${reg.name} ${reg.district} ${reg.division} ${reg.aez} ${reg.coverageStatus} bangladesh`,
        icon: MapPin,
        badge: reg.coverageStatus,
        badgeTone: isFull ? 'live' : 'demo',
        run: () => {
          selectRegion(reg.id);
          navigateToWorkspace('command');
        },
      });
    });

    diseases.forEach((dis) => {
      const title = dis.disease_name || dis.name || dis.id;
      const crop = dis.crop_name || dis.crop || 'Crop';
      items.push({
        id: `dis-${dis.id || title}`,
        group: 'Plant Pathology (17 Diseases)',
        label: `${title} (${crop})`,
        sub: dis.scientific_name || dis.pathogen || 'Environmental risk screening (non-diagnostic)',
        keywords: `${title} ${crop} ${dis.scientific_name || ''} ${dis.pathogen || ''} disease pathology`,
        icon: ShieldAlert,
        run: () => navigateToWorkspace('agronomy', 'disease'),
      });
    });

    HOME_SECTION_HITS.forEach((s) => {
      items.push({
        id: `sec-${s.id}`,
        group: 'Home Story Sections',
        label: s.label,
        sub: s.sub,
        keywords: `${s.label} ${s.sub} section`,
        icon: Compass,
        run: () => navigateToHome(s.id),
      });
    });

    items.push(
      {
        id: 'act-ai',
        group: 'Quick Actions',
        label: 'Open Ask AgriSense AI Copilot Drawer',
        sub: 'Contextual EN / বাংলা assistant on current page',
        keywords: 'ai copilot chat ask rag',
        icon: Sparkles,
        run: () => setAiDrawerOpen(true),
      },
      {
        id: 'act-alerts',
        group: 'Quick Actions',
        label: `Open Alerts Inbox (${activeAlertCount} Active)`,
        sub: 'Acknowledge or resolve hydrological & crop advisories',
        keywords: 'alerts notifications warnings acknowledge',
        icon: Bell,
        run: () => setAlertsDrawerOpen(true),
      },
      {
        id: 'act-settings',
        group: 'Quick Actions',
        label: 'Open Account, JWT Session & Display Settings',
        sub: 'Sign in, density, theme, pause motion, X-Ray mode',
        keywords: 'settings login auth jwt theme density',
        icon: Settings,
        run: () => setSettingsDrawerOpen(true),
      },
      {
        id: 'act-theme',
        group: 'Quick Actions',
        label: `Switch Theme (Current: ${theme === 'light' ? 'Daylight' : 'Glassy Dark'})`,
        sub: 'Toggle Glassy Dark vs Daylight UI theme',
        keywords: 'theme dark light daylight glassy',
        icon: theme === 'light' ? Moon : Sun,
        run: () => toggleTheme(),
      },
      {
        id: 'act-xray',
        group: 'Quick Actions',
        label: `Toggle Provenance X-Ray (${xRayMode ? 'Currently ON' : 'Currently OFF'})`,
        sub: 'Show equation & data source tags inline',
        keywords: 'xray provenance disclosures audit',
        icon: Eye,
        run: () => setXRayMode((p) => !p),
      },
      {
        id: 'act-motion',
        group: 'Quick Actions',
        label: `${pauseMotion ? 'Resume' : 'Pause'} Canvas & 3D Animations`,
        sub: 'Accessibility reduced-motion toggle',
        keywords: 'motion pause reduce animation accessibility',
        icon: Compass,
        run: () => setPauseMotion((p) => !p),
      },
      {
        id: 'act-tour',
        group: 'Quick Actions',
        label: 'Start 3-Minute Guided Judge Tour',
        sub: 'Step-by-step walkthrough across AgriSense modules',
        keywords: 'guided tour demo judge walkthrough',
        icon: Compass,
        run: () => startJudgeDemo(1),
      }
    );

    return items;
  }, [
    diseases,
    activeAlertCount,
    theme,
    xRayMode,
    pauseMotion,
    navigateToHome,
    navigateToWorkspace,
    setSelectedFieldId,
    selectRegion,
    setAiDrawerOpen,
    setAlertsDrawerOpen,
    setSettingsDrawerOpen,
    toggleTheme,
    setXRayMode,
    setPauseMotion,
    startJudgeDemo,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 22);
    return allItems.filter((it) => it.keywords.toLowerCase().includes(q)).slice(0, 24);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  const executeItem = (item) => {
    if (!item) return;
    setCommandPaletteOpen(false);
    item.run();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      executeItem(filtered[selectedIdx]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AgriSense Command Palette"
      className="no-print"
      onClick={() => setCommandPaletteOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        background: 'rgba(6, 10, 9, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'min(10vh, 5.5rem) 1rem 1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(96vw, 680px)',
          maxHeight: 'min(78vh, 620px)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '18px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Search Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.1rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={17} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, parcels (A-01), Bangladesh districts, diseases, actions..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '0.92rem',
              outline: 'none',
            }}
          />
          <kbd
            className="mono"
            style={{
              fontSize: '0.68rem',
              padding: '0.18rem 0.45rem',
              borderRadius: '6px',
              background: 'var(--bg-alt)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Close Search Palette"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', padding: '0.5rem', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              No matches for "{query}". Try "NDVI", "Godagari", "Blast", or "FAO-56".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon || Compass;
              const isSelected = idx === selectedIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => executeItem(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    textAlign: 'left',
                    padding: '0.62rem 0.85rem',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--accent-primary-soft)' : 'transparent',
                    border: '1px solid transparent',
                    borderColor: isSelected ? 'rgba(52, 211, 153, 0.35)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                    <span
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'var(--bg-alt)',
                        color: 'var(--accent-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={`badge ${item.badgeTone === 'live' ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.group} • {item.sub}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
