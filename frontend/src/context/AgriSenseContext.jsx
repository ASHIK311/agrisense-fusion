import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BANGLADESH_REGIONS, buildCustomLocation } from '../data/regions';

const AgriSenseContext = createContext(null);

export const WORKSPACES = [
  { id: 'command', path: '/app/command', label: 'Command Hub', shortLabel: 'Command Hub', group: 'Operations', iconName: 'Compass', title: 'Command Hub · AgriSense' },
  { id: 'earth-lab', path: '/app/earth-lab', label: 'Earth Lab', shortLabel: 'Earth Lab', group: 'Operations', iconName: 'Layers', title: 'Earth & Spatial Lab · AgriSense' },
  { id: 'hydrology', path: '/app/hydrology', label: 'Water & Soil', shortLabel: 'Water & Soil', group: 'Operations', iconName: 'Droplets', title: 'Water & Soil Hydrology · AgriSense' },
  { id: 'agronomy', path: '/app/agronomy', label: 'Crops & Disease', shortLabel: 'Crops & Disease', group: 'Operations', iconName: 'Sprout', title: 'Crops & Disease · AgriSense' },
  { id: 'simulator', path: '/app/simulator', label: 'What-If Lab', shortLabel: 'What-If Lab', group: 'Simulation & Science', iconName: 'Sliders', title: 'What-If Simulator · AgriSense' },
  { id: 'methods', path: '/app/methods', label: 'Methods & Learn', shortLabel: 'Methods & Learn', group: 'Simulation & Science', iconName: 'BookOpen', title: 'Methods & Learn · AgriSense' },
  { id: 'report', path: '/app/report', label: 'Field Report', shortLabel: 'Report', group: 'Outputs & AI', iconName: 'FileText', title: 'Agronomic Decision Report · AgriSense' },
  { id: 'assistant', path: '/app/assistant', label: 'AgriSense AI', shortLabel: 'AgriSense AI', group: 'Outputs & AI', iconName: 'Bot', title: 'AgriSense AI Copilot · AgriSense' },
];

export const DEFAULT_WORKSPACE_MODES = {
  'earth-lab': 'spatial',
  hydrology: 'root-zone',
  agronomy: 'crops',
  methods: 'validation',
};

export const LEGACY_ROUTE_MAP = {
  overview: { workspaceId: 'command' },
  'spatial-twin': { workspaceId: 'earth-lab', subMode: 'spatial' },
  'spectral-lab': { workspaceId: 'earth-lab', subMode: 'spectral' },
  climate: { workspaceId: 'earth-lab', subMode: 'climate' },
  'root-zone': { workspaceId: 'hydrology', subMode: 'root-zone' },
  'soil-iot': { workspaceId: 'hydrology', subMode: 'soil-iot' },
  'crop-intelligence': { workspaceId: 'agronomy', subMode: 'crops' },
  'crop-health': { workspaceId: 'agronomy', subMode: 'disease' },
  reports: { workspaceId: 'report' },
  architecture: { workspaceId: 'methods', subMode: 'architecture' },
  settings: { workspaceId: 'command', openDrawer: 'settings' },
  admin: { workspaceId: 'command', openDrawer: 'settings' },
};

export function resolveWorkspaceTarget(rawId, searchStr = '') {
  const slug = String(rawId || 'command').trim();
  const params = new URLSearchParams(searchStr || '');
  const queryMode = params.get('mode');
  if (LEGACY_ROUTE_MAP[slug]) {
    const mapped = LEGACY_ROUTE_MAP[slug];
    return {
      workspaceId: mapped.workspaceId,
      subMode: queryMode || mapped.subMode || null,
      openDrawer: mapped.openDrawer || null,
      wasRedirected: true,
    };
  }
  const found = WORKSPACES.find((w) => w.id === slug);
  if (found) {
    return {
      workspaceId: found.id,
      subMode: queryMode || null,
      openDrawer: null,
      wasRedirected: false,
    };
  }
  return { workspaceId: 'command', subMode: null, openDrawer: null, wasRedirected: slug !== 'command' };
}

export const FIELD_SUBTABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'weather', label: 'Weather' },
  { id: 'soil', label: 'Soil & IoT' },
  { id: 'water', label: 'Water Balance' },
  { id: 'crops', label: 'Crop Rotation' },
  { id: 'disease', label: 'Disease Risk' },
  { id: 'assistant', label: 'AI Assistant' },
  { id: 'history', label: 'Report History' },
];

export const PARCELS = [
  {
    id: 'field-godagari-a',
    code: 'PARCEL A-01',
    name: 'Godagari Terraced Plot A-1 (High Barind)',
    area_ha: 2.4,
    crop: 'Boro Rice → Mustard-Mungbean Transition',
    stage: 'Mid-Season (Kc = 1.15)',
    centroid: { lat: 24.4690, lon: 88.3300 },
    coords: [
      [24.4712, 88.3272],
      [24.4715, 88.3324],
      [24.4672, 88.3321],
      [24.4669, 88.3270],
    ],
    elevation_m: 37.5,
    soil_class: 'Barind Grey Terrace Clay Loam (Low OM ~1.1%)',
    lulc_class: 'Cropland (Pure Interior Centroid)',
    vwc: 0.242,
    ndvi: 0.68,
    ndwi: -0.18,
    ndmi: 0.24,
  },
  {
    id: 'field-godagari-b',
    code: 'PARCEL B-02',
    name: 'Godagari North Terrace Plot B-2',
    area_ha: 1.85,
    crop: 'T. Aman → Chickpea / Lentil Relay',
    stage: 'Development (Kc = 0.85)',
    centroid: { lat: 24.4742, lon: 88.3348 },
    coords: [
      [24.4762, 88.3328],
      [24.4765, 88.3375],
      [24.4724, 88.3371],
      [24.4721, 88.3326],
    ],
    elevation_m: 39.2,
    soil_class: 'High Barind Compacted Silt-Clay Loam',
    lulc_class: 'Cropland (Water-Smart Pulse Rotation)',
    vwc: 0.278,
    ndvi: 0.72,
    ndwi: -0.14,
    ndmi: 0.29,
  },
  {
    id: 'field-godagari-c',
    code: 'PARCEL C-03',
    name: 'Godagari Canal-Adjacent Plot C-3',
    area_ha: 1.30,
    crop: 'Rabi Maize / Wheat Strip',
    stage: 'Late Season (Kc = 0.70)',
    centroid: { lat: 24.4638, lon: 88.3255 },
    coords: [
      [24.4662, 88.3235],
      [24.4665, 88.3282],
      [24.4622, 88.3279],
      [24.4620, 88.3232],
    ],
    elevation_m: 34.8,
    soil_class: 'Terrace Margin Clay Loam',
    lulc_class: 'Boundary Mixed Pixel Zone',
    vwc: 0.218,
    ndvi: 0.54,
    ndwi: -0.26,
    ndmi: 0.16,
  }
];

export const JUDGE_DEMO_STEPS = [
  {
    step: 1,
    durationSec: 30,
    title: '1. The High Barind Challenge & 4-Layer Digital Twin',
    targetMode: 'home',
    targetWorkspace: 'overview',
    summary: 'Inspect the interactive 3D agricultural landscape of Godagari Upazila (24.469°N, 88.330°E): Atmosphere, Spectral Canopy, Agricultural Surface, and Subsurface Root Zone & Aquifer.',
    highlightMetric: '26.4 m DTW depth vs 28.0 m suction limit (+0.65 m/yr drawdown)',
  },
  {
    step: 2,
    durationSec: 30,
    title: '2. Synchronized 2D Satellite GIS & 3D Terrain Twin',
    targetMode: 'app',
    targetWorkspace: 'spatial-twin',
    summary: 'Explore synchronized Esri satellite imagery and 3D WebGL terrain with linked cursor and the explicit 34.8 km spatial tether between Godagari (24.469°N, 88.330°E) and NASA POWER (24.3636°N, 88.6241°E).',
    highlightMetric: 'EPSG:4326 / EPSG:32645 + 34.8 km ESE NASA POWER Tether',
  },
  {
    step: 3,
    durationSec: 30,
    title: '3. Sentinel-2 Canopy & Spectral Curtain Wipe',
    targetMode: 'app',
    targetWorkspace: 'spectral-lab',
    summary: 'Swipe across NDVI, NDMI, EVI, and McFeeters NDWI over 12 valid Sentinel-2 passes. Inspect 10m vs 20m Band 11 resolution and 84.63% ± 3.81% 5-fold spatial CV accuracy.',
    highlightMetric: '84.63% ± 3.81% spatial CV · 85.77% Block C · 422 Crop Species Gate',
  },
  {
    step: 4,
    durationSec: 30,
    title: '4. FAO-56 Root-Zone Cutaway & Physics vs. RAG Dual-Inspector',
    targetMode: 'app',
    targetWorkspace: 'root-zone',
    summary: 'Examine the 2D profile and 3D soil column (Saturation 43.5%, FC 32.3%, Trigger 24.4%, PWP 16.5%), full FAO-56 equation trace, and 70% vs 85% irrigation efficiency.',
    highlightMetric: 'FAO-56 Penman-Monteith < 1e-6 parity · Provisional VWC thresholds',
  },
  {
    step: 5,
    durationSec: 30,
    title: '5. Split-Screen What-If Scenario Simulator',
    targetMode: 'app',
    targetWorkspace: 'simulator',
    summary: 'Compare Scenario A (Boro-heavy baseline at 70% efficiency) vs Scenario B (Mustard-Mungbean-Aman water-smart rotation at 85% efficiency) powered by deterministic backend engines.',
    highlightMetric: 'Deterministic MCDA + FAO-56 scenario delta (Simulated Scenario)',
  },
  {
    step: 6,
    durationSec: 30,
    title: '6. Grounded Bilingual (EN / বাংলা) RAG Assistant',
    targetMode: 'app',
    targetWorkspace: 'assistant',
    summary: 'Query the 83-chunk scientific knowledge base and 9 deterministic tools in English or Bangla with DOI-backed citations and strict non-override of physics calculations.',
    highlightMetric: '83 RAG chunks · 9 deterministic tools · 60 DOI papers (48 full-text)',
  }
];

function parseInitialRoute() {
  if (typeof window === 'undefined') {
    return { viewMode: 'home', activeWorkspace: 'command', subMode: null, openDrawer: null, wasRedirected: false };
  }
  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  if (pathname === '/' || pathname === '/home') {
    return { viewMode: 'home', activeWorkspace: 'command', subMode: null, openDrawer: null, wasRedirected: false };
  }
  if (pathname.startsWith('/app/')) {
    const slug = pathname.replace('/app/', '').split('/')[0];
    const resolved = resolveWorkspaceTarget(slug, search);
    return {
      viewMode: 'app',
      activeWorkspace: resolved.workspaceId,
      subMode: resolved.subMode,
      openDrawer: resolved.openDrawer,
      wasRedirected: resolved.wasRedirected,
    };
  }
  if (pathname === '/architecture') {
    return { viewMode: 'app', activeWorkspace: 'methods', subMode: 'architecture', openDrawer: null, wasRedirected: true };
  }
  if (pathname === '/report') {
    return { viewMode: 'app', activeWorkspace: 'report', subMode: null, openDrawer: null, wasRedirected: true };
  }
  return { viewMode: 'home', activeWorkspace: 'command', subMode: null, openDrawer: null, wasRedirected: false };
}

export function AgriSenseProvider({ children }) {
  const initialRoute = parseInitialRoute();
  const [viewMode, setViewMode] = useState(initialRoute.viewMode);
  const [activeWorkspace, setActiveWorkspace] = useState(initialRoute.activeWorkspace);
  const [workspaceModes, setWorkspaceModes] = useState(() => ({
    ...DEFAULT_WORKSPACE_MODES,
    ...(initialRoute.subMode && initialRoute.activeWorkspace in DEFAULT_WORKSPACE_MODES
      ? { [initialRoute.activeWorkspace]: initialRoute.subMode }
      : {}),
  }));
  const [activeFieldSubTab, setActiveFieldSubTab] = useState('overview');
  const [routeTransitionKey, setRouteTransitionKey] = useState(0);

  // Global Persistent Overlays
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(initialRoute.openDrawer === 'settings');
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  // Shared Alerts Cache for Header Bell Badge & Alerts Drawer
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agrisense-theme');
      if (saved === 'glassy' || saved === 'dark' || saved === 'light') return saved;
      try {
        localStorage.setItem('agrisense-theme', 'glassy');
      } catch (_) {}
      return 'glassy';
    }
    return 'glassy';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [selectedFarmId, setSelectedFarmId] = useState('farm-barind-01');
  const [selectedFieldId, setSelectedFieldId] = useState('field-godagari-a');
  const [selectedLocation, setSelectedLocation] = useState(BANGLADESH_REGIONS[0]);
  const [locationAssessment, setLocationAssessment] = useState(null);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [dateRange, setDateRange] = useState('2026-03-01 to 2026-03-14');
  const [xRayMode, setXRayMode] = useState(false);
  const [density, setDensity] = useState('spacious');

  const [pauseMotion, setPauseMotion] = useState(false);

  const [preloaderOpen, setPreloaderOpen] = useState(true);
  const [preloaderReplayNonce, setPreloaderReplayNonce] = useState(0);

  const completePreloader = useCallback(() => {
    setPreloaderOpen(false);
  }, []);

  const replayPreloader = useCallback(() => {
    setPreloaderReplayNonce((n) => n + 1);
    setPreloaderOpen(true);
  }, []);

  const [judgeDemoActive, setJudgeDemoActive] = useState(false);
  const [judgeDemoStep, setJudgeDemoStep] = useState(1);
  const [pendingAiPrompt, setPendingAiPrompt] = useState(null);

  // Global Dynamic Island Notification State (hidden when idle; pops up at bottom for 3s on Welcome/notices)
  const [islandToast, setIslandToast] = useState(() => ({
    id: Date.now(),
    kicker: 'WELCOME · AGRISENSE FUSION',
    title: 'Welcome to AgriSense Fusion',
    text: `${BANGLADESH_REGIONS[0].district} AEZ-26 · Satellite, Weather & Soil Telemetry Ready`,
    type: 'success',
    showActions: true,
    durationMs: 3000,
  }));
  const [islandHoldOpen, setIslandHoldOpen] = useState(false);
  const islandToastTimerRef = useRef(null);

  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('agrisense_token') || null;
    }
    return null;
  });
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('agrisense_user');
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }
    return null;
  });

  const dynamicField = dynamicFields.find((f) => f.id === selectedFieldId);
  const baseParcel = PARCELS.find((p) => p.id === selectedFieldId);
  const selectedParcel = baseParcel || (dynamicField ? {
    id: dynamicField.id,
    code: dynamicField.name,
    name: dynamicField.name,
    area_ha: Math.round(((dynamicField.area_m2 || 10000) / 10000) * 100) / 100,
    crop: dynamicField.current_crop || 'Mustard',
    stage: 'Active Field Plot',
    centroid: { lat: selectedLocation.lat, lon: selectedLocation.lon },
    elevation_m: 28.0,
    soil_class: dynamicField.soil_type_label || dynamicField.soil_type || 'User Field Soil',
    lulc_class: 'User Defined Field Polygon',
    vwc: 0.24,
    ndvi: 0.65,
    ndwi: -0.18,
    ndmi: 0.22,
  } : PARCELS[0]);

  const isPrimaryGodagari = Boolean(selectedLocation?.isPrimary);

  const selectRegion = useCallback((regionId) => {
    const found = BANGLADESH_REGIONS.find((r) => r.id === regionId) || BANGLADESH_REGIONS[0];
    setSelectedLocation(found);
    setLocationAssessment(null);
  }, []);

  const selectCustomCoordinate = useCallback((lat, lon, label = null) => {
    const loc = buildCustomLocation({ lat, lon, label });
    setSelectedLocation(loc);
    setLocationAssessment(null);
    return loc;
  }, []);

  // Sync theme attribute on <html> and <meta name="color-scheme">
  useEffect(() => {
    try {
      localStorage.setItem('agrisense-theme', theme);
    } catch (_) {}
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) {
        meta.content = theme;
      }
    }
  }, [theme]);

  // Sync active workspace attribute on <html> for adaptive per-tab canvas & header palette
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.workspace = viewMode === 'home' ? 'home' : activeWorkspace;
    }
  }, [viewMode, activeWorkspace]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'glassy' || prev === 'dark' ? 'light' : 'glassy'));
  }, []);

  // Sync body classes for pause-motion and x-ray mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('pause-motion', pauseMotion);
      document.body.classList.toggle('xray-active', xRayMode);
    }
  }, [pauseMotion, xRayMode]);

  // Global Mouse Spotlight & 3D Tilt Effect across all .card, .surface, .glass-card, and .interactive-glow-card elements
  useEffect(() => {
    if (typeof document === 'undefined' || pauseMotion) return;
    let raf = 0;
    const onPointerMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const cardEl = e.target?.closest?.('.card, .surface, .glass-card, .interactive-glow-card, .tilt-card, [data-glow]');
      if (!cardEl) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = cardEl.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        cardEl.style.setProperty('--mx', `${x}px`);
        cardEl.style.setProperty('--my', `${y}px`);
        cardEl.style.setProperty('--mouse-x', `${x}px`);
        cardEl.style.setProperty('--mouse-y', `${y}px`);

        if (cardEl.classList.contains('interactive-glow-card') || cardEl.classList.contains('tilt-card')) {
          const nx = (x - r.width / 2) / (r.width / 2);
          const ny = (y - r.height / 2) / (r.height / 2);
          cardEl.style.setProperty('--rx', `${(-ny * 3.2).toFixed(2)}deg`);
          cardEl.style.setProperty('--ry', `${(nx * 3.2).toFixed(2)}deg`);
          cardEl.style.setProperty('--ty', `-3px`);
        }
      });
    };
    const onPointerOut = (e) => {
      const cardEl = e.target?.closest?.('.card, .surface, .glass-card, .interactive-glow-card, .tilt-card, [data-glow]');
      if (cardEl && !cardEl.contains(e.relatedTarget)) {
        cardEl.style.setProperty('--rx', '0deg');
        cardEl.style.setProperty('--ry', '0deg');
        cardEl.style.setProperty('--ty', '0px');
        cardEl.style.setProperty('--mx', '-999px');
        cardEl.style.setProperty('--my', '-999px');
        cardEl.style.setProperty('--mouse-x', '-999px');
        cardEl.style.setProperty('--mouse-y', '-999px');
      }
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerout', onPointerOut);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pauseMotion]);

  const refreshAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/v1/alerts', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch (_) {
    } finally {
      setAlertsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const activeAlertCount = alerts.filter((a) => !a.is_resolved && !a.is_acknowledged).length;

  // Normalize any initial legacy URL (e.g. /app/spectral-lab -> /app/earth-lab?mode=spectral)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialRoute.wasRedirected) {
      const ws = WORKSPACES.find((w) => w.id === initialRoute.activeWorkspace) || WORKSPACES[0];
      const nextUrl = initialRoute.subMode ? `${ws.path}?mode=${encodeURIComponent(initialRoute.subMode)}` : ws.path;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts: Ctrl+K / Cmd+K or / -> Command Palette, Escape -> close drawers
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (e.key === '/' && !isTyping) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setAiDrawerOpen(false);
        setAlertsDrawerOpen(false);
        setSettingsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Update document.title dynamically for accessibility (WCAG 2.4.2)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (viewMode === 'home') {
      document.title = 'AgriSense · The Living Landscape Intelligence Platform';
    } else {
      const ws = WORKSPACES.find((w) => w.id === activeWorkspace);
      document.title = ws ? ws.title : 'Command Hub · AgriSense';
    }
  }, [viewMode, activeWorkspace]);

  // Sync browser history popstate
  useEffect(() => {
    const onPopState = () => {
      const parsed = parseInitialRoute();
      setViewMode(parsed.viewMode);
      setActiveWorkspace(parsed.activeWorkspace);
      if (parsed.subMode && parsed.activeWorkspace in DEFAULT_WORKSPACE_MODES) {
        setWorkspaceModes((prev) => ({ ...prev, [parsed.activeWorkspace]: parsed.subMode }));
      }
      if (parsed.openDrawer === 'settings') {
        setSettingsDrawerOpen(true);
      }
      setRouteTransitionKey((k) => k + 1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToHome = useCallback((sectionId = null) => {
    setViewMode('home');
    setRouteTransitionKey((k) => k + 1);
    if (typeof window !== 'undefined') {
      const hash = sectionId ? `#${sectionId}` : '';
      window.history.pushState({}, '', `/${hash}`);
      if (sectionId) {
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: pauseMotion ? 'auto' : 'smooth', block: 'start' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: pauseMotion ? 'auto' : 'smooth' });
      }
    }
  }, [pauseMotion]);

  const setWorkspaceSubMode = useCallback((wsId, mode) => {
    setWorkspaceModes((prev) => ({ ...prev, [wsId]: mode }));
    if (typeof window !== 'undefined' && viewMode === 'app' && activeWorkspace === wsId) {
      const ws = WORKSPACES.find((w) => w.id === wsId);
      if (ws) {
        window.history.replaceState({}, '', `${ws.path}?mode=${encodeURIComponent(mode)}`);
      }
    }
  }, [viewMode, activeWorkspace]);

  const navigateToWorkspace = useCallback((workspaceId, subTabOrMode = null) => {
    const resolved = resolveWorkspaceTarget(workspaceId);
    const target = WORKSPACES.find((w) => w.id === resolved.workspaceId) || WORKSPACES[0];
    const effectiveMode = (target.id in DEFAULT_WORKSPACE_MODES && (subTabOrMode || resolved.subMode))
      ? (subTabOrMode || resolved.subMode)
      : null;

    setViewMode('app');
    setActiveWorkspace(target.id);
    setRouteTransitionKey((k) => k + 1);
    if (effectiveMode) {
      setWorkspaceModes((prev) => ({ ...prev, [target.id]: effectiveMode }));
    } else if (target.id === 'command' && subTabOrMode) {
      setActiveFieldSubTab(subTabOrMode);
    }
    if (resolved.openDrawer === 'settings') {
      setSettingsDrawerOpen(true);
    }
    if (typeof window !== 'undefined') {
      const nextUrl = effectiveMode ? `${target.path}?mode=${encodeURIComponent(effectiveMode)}` : target.path;
      window.history.pushState({}, '', nextUrl);
      window.scrollTo({ top: 0, behavior: pauseMotion ? 'auto' : 'smooth' });
    }
  }, [pauseMotion]);

  const askAssistantWithPrompt = useCallback((promptText, options = {}) => {
    setPendingAiPrompt(promptText);
    if (options.fullPage || activeWorkspace === 'assistant') {
      setAiDrawerOpen(false);
      navigateToWorkspace('assistant');
    } else {
      setAiDrawerOpen(true);
    }
  }, [activeWorkspace, navigateToWorkspace]);

  const startJudgeDemo = useCallback((initialStep = 1) => {
    const stepObj = JUDGE_DEMO_STEPS.find((s) => s.step === initialStep) || JUDGE_DEMO_STEPS[0];
    setJudgeDemoActive(true);
    setJudgeDemoStep(stepObj.step);
    if (stepObj.targetMode === 'home') {
      navigateToHome();
    } else {
      navigateToWorkspace(stepObj.targetWorkspace);
    }
  }, [navigateToHome, navigateToWorkspace]);

  const goToJudgeStep = useCallback((stepNumber) => {
    const stepObj = JUDGE_DEMO_STEPS.find((s) => s.step === stepNumber);
    if (!stepObj) return;
    setJudgeDemoStep(stepObj.step);
    if (stepObj.targetMode === 'home') {
      navigateToHome();
    } else {
      navigateToWorkspace(stepObj.targetWorkspace);
    }
  }, [navigateToHome, navigateToWorkspace]);

  const stopJudgeDemo = useCallback(() => {
    setJudgeDemoActive(false);
  }, []);

  const dismissIslandToast = useCallback(() => {
    if (islandToastTimerRef.current) {
      clearTimeout(islandToastTimerRef.current);
      islandToastTimerRef.current = null;
    }
    setIslandToast(null);
  }, []);

  const notifyIsland = useCallback((text, type = 'info', options = {}) => {
    if (!text) return;
    if (islandToastTimerRef.current) {
      clearTimeout(islandToastTimerRef.current);
      islandToastTimerRef.current = null;
    }
    setIslandToast({
      id: Date.now(),
      kicker: options.kicker || null,
      title: options.title || null,
      text: String(text),
      type,
      showActions: Boolean(options.showActions),
      durationMs: options.durationMs ?? 3000,
    });
  }, []);

  // Auto-dismiss transient Dynamic Island toast after 3s unless user is hovering/focusing inside it
  useEffect(() => {
    if (!islandToast || islandHoldOpen) return undefined;
    islandToastTimerRef.current = setTimeout(() => {
      dismissIslandToast();
    }, islandToast.durationMs || 3000);
    return () => {
      if (islandToastTimerRef.current) {
        clearTimeout(islandToastTimerRef.current);
        islandToastTimerRef.current = null;
      }
    };
  }, [islandToast, islandHoldOpen, dismissIslandToast]);

  const saveAuthSession = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      if (newToken) localStorage.setItem('agrisense_token', newToken);
      else localStorage.removeItem('agrisense_token');
      if (newUser) localStorage.setItem('agrisense_user', JSON.stringify(newUser));
      else localStorage.removeItem('agrisense_user');
    }
  }, []);

  const logout = useCallback(() => {
    saveAuthSession(null, null);
  }, [saveAuthSession]);

  return (
    <AgriSenseContext.Provider
      value={{
        viewMode,
        setViewMode,
        activeWorkspace,
        setActiveWorkspace,
        workspaceModes,
        setWorkspaceSubMode,
        activeFieldSubTab,
        setActiveFieldSubTab,
        routeTransitionKey,
        theme,
        setTheme,
        toggleTheme,
        sidebarCollapsed,
        setSidebarCollapsed,
        navigateToHome,
        navigateToWorkspace,
        selectedFarmId,
        setSelectedFarmId,
        selectedFieldId,
        setSelectedFieldId,
        selectedParcel,
        selectedLocation,
        setSelectedLocation,
        selectRegion,
        selectCustomCoordinate,
        isPrimaryGodagari,
        locationAssessment,
        setLocationAssessment,
        dynamicFields,
        setDynamicFields,
        dateRange,
        setDateRange,
        xRayMode,
        setXRayMode,
        density,
        setDensity,
        pauseMotion,
        setPauseMotion,
        preloaderOpen,
        preloaderReplayNonce,
        completePreloader,
        replayPreloader,
        judgeDemoActive,
        judgeDemoStep,
        startJudgeDemo,
        goToJudgeStep,
        stopJudgeDemo,
        islandToast,
        setIslandHoldOpen,
        notifyIsland,
        dismissIslandToast,
        pendingAiPrompt,
        setPendingAiPrompt,
        askAssistantWithPrompt,
        aiDrawerOpen,
        setAiDrawerOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        alertsDrawerOpen,
        setAlertsDrawerOpen,
        settingsDrawerOpen,
        setSettingsDrawerOpen,
        teamModalOpen,
        setTeamModalOpen,
        alerts,
        alertsLoading,
        activeAlertCount,
        refreshAlerts,
        token,
        user,
        saveAuthSession,
        logout,
      }}
    >
      {children}
    </AgriSenseContext.Provider>
  );
}

export function useAgriSense() {
  const ctx = useContext(AgriSenseContext);
  if (!ctx) {
    throw new Error('useAgriSense must be used inside AgriSenseProvider');
  }
  return ctx;
}
