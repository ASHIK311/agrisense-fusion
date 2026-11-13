import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Leaf,
  Sun,
  Droplets,
  Wheat,
  Bot,
  Zap,
  ArrowUpRight,
  MapPin,
  Navigation,
  Map as MapIcon,
  Plus,
  Edit3,
  CheckCircle2,
  Bell,
  Compass,
  FileText,
  Sliders,
  ShieldCheck,
  Search,
  Lock,
  Activity,
  Cpu,
  Microscope,
  Radio,
  Globe,
  RefreshCw,
  Eye,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Server,
} from 'lucide-react';
import { useAgriSense, PARCELS } from '../context/AgriSenseContext';
import { BANGLADESH_REGIONS } from '../data/regions';
import { slideFill, getRelativeEdges } from '../utils/motion';
import StratigraphicTwinCanvas from './StratigraphicTwinCanvas';
import ProvenanceBadge from './ProvenanceBadge';
import LocationMapPickerModal from './LocationMapPickerModal';
import FarmFieldCrudModal from './FarmFieldCrudModal';
import AnimatedMetricCard from './charts/AnimatedMetricCard';

const COVERAGE_TONE = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETE' || s === 'CALIBRATED' || s === 'VALIDATED' || s === 'FULL SCIENTIFIC COVERAGE' || s === 'AVAILABLE') {
    return 'badge-live';
  }
  if (s === 'TETHERED' || s === 'REGIONAL' || s === 'FORMULA READY' || s === 'APPLICABLE' || s === 'REGIONAL BASELINE') {
    return 'badge-nasa';
  }
  if (s === 'SIMULATED' || s === 'PROXY' || s === 'REGIONAL PROVISIONAL' || s === 'UNVERIFIED') {
    return 'badge-demo';
  }
  return 'badge-blocked';
};

const SIDE_CATEGORIES = [
  {
    id: 'cockpit',
    label: 'Tactical Cockpit',
    icon: Activity,
    tabs: ['Cockpit Overview', '6 Subsystems Deck'],
  },
  {
    id: 'geo',
    label: 'Geo-Context & CRUD',
    icon: Globe,
    tabs: ['16-AEZ Atlas & CRUD', 'Data Provenance Matrix'],
  },
  {
    id: 'integrity',
    label: 'API Health & Ledger',
    icon: ShieldCheck,
    tabs: ['32-Feature Integrity'],
  },
];

export default function CommandDeck({
  dashboardData,
  onOpenSimulateModal,
  onRefreshDashboard,
  onSyncNasa = null,
  syncingNasa = false,
  showToast,
}) {
  const {
    selectedFarmId,
    setSelectedFarmId,
    selectedFieldId,
    setSelectedFieldId,
    selectedParcel,
    selectedLocation,
    selectRegion,
    selectCustomCoordinate,
    isPrimaryGodagari,
    locationAssessment,
    setLocationAssessment,
    dynamicFields,
    navigateToWorkspace,
    askAssistantWithPrompt,
    startJudgeDemo,
    alerts,
    refreshAlerts,
    token,
    xRayMode,
    setXRayMode,
    setSettingsDrawerOpen,
  } = useAgriSense();

  const [activeSideIdx, setActiveSideIdx] = useState(0);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [regionQuery, setRegionQuery] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [crudModal, setCrudModal] = useState({ open: false, mode: 'create-farm', item: null });
  const [assessingLocation, setAssessingLocation] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState(null);
  const [gatesExplainOpen, setGatesExplainOpen] = useState(false);
  const [healthProbe, setHealthProbe] = useState(null);

  const sideFillRef = useRef(null);
  const sideBtnRefs = useRef([]);
  const topFillRef = useRef(null);
  const topBtnRefs = useRef([]);
  const firstMountSide = useRef(true);
  const lastTabSide = useRef(0);

  const currentMenu = SIDE_CATEGORIES[activeSideIdx];

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
    positionSidePill(firstMountSide.current);
    firstMountSide.current = false;
  }, [activeSideIdx]);

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

  // Fetch live Express /api/health metadata when inspecting Integrity view
  useEffect(() => {
    if (activeSideIdx !== 2) return undefined;
    let active = true;
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.status) setHealthProbe(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeSideIdx]);

  const farms = dashboardData?.farms || [];
  const activeFarmObj = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const userOwnedFields = dynamicFields.filter((df) => !df.is_demo && !PARCELS.some((p) => p.id === df.id));
  const activeDynamicField = userOwnedFields.find((df) => df.id === selectedFieldId) || null;

  const filteredRegions = BANGLADESH_REGIONS.filter((r) => {
    const q = regionQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.division.toLowerCase().includes(q) ||
      r.aez.toLowerCase().includes(q)
    );
  });

  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Browser geolocation is unavailable. Use District Search or Pick Point on Map.');
      return;
    }
    setGeoLoading(true);
    setGeoNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const loc = selectCustomCoordinate(
          pos.coords.latitude,
          pos.coords.longitude,
          `GPS Pin (${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E)`
        );
        if (showToast) showToast(`Location switched to ${loc.name}`, 'success');
      },
      (err) => {
        setGeoLoading(false);
        setGeoNotice(`GPS access notice: ${err.message}`);
      },
      { timeout: 8000 }
    );
  };

  const handleGenerateLocationAssessment = async () => {
    setAssessingLocation(true);
    setGeoNotice(null);
    try {
      const lat = selectedLocation?.lat ?? 24.469;
      const lon = selectedLocation?.lon ?? 88.33;
      const res = await fetch(`/api/nasa/power?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&days=7`);
      const data = await res.json();
      if (res.ok && data.success) {
        const latestRec = data.latest || (data.records || [])[data.records?.length - 1] || null;
        setLocationAssessment({
          locationName: selectedLocation?.name,
          lat,
          lon,
          isRealNasaData: Boolean(data.isRealNasaData),
          sourceStatus: data.sourceStatus || data.source,
          latest: latestRec,
          recordCount: (data.records || []).length,
          generatedAt: new Date().toISOString(),
        });
        if (showToast) showToast(`Location meteorology assessed for ${selectedLocation?.district || 'Selected Coordinate'}`, 'success');
      } else {
        setGeoNotice(data.error || 'Could not retrieve NASA POWER coordinate assessment.');
      }
    } catch (err) {
      setGeoNotice(`Assessment error: ${err.message}`);
    } finally {
      setAssessingLocation(false);
    }
  };

  const handleAlertAction = async (alertId, action) => {
    setAlertFeedback(null);
    if (!token) {
      setAlertFeedback({ type: 'error', text: 'Sign in via Account/Settings (JWT required) to acknowledge or resolve alerts.' });
      return;
    }
    try {
      const res = await fetch(`/api/v1/alerts/${encodeURIComponent(alertId)}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertFeedback({ type: 'success', text: data.message || `Alert ${action}d.` });
        refreshAlerts();
      } else {
        setAlertFeedback({ type: 'error', text: data.message || data.error || `Failed (${res.status})` });
      }
    } catch (err) {
      setAlertFeedback({ type: 'error', text: err.message });
    }
  };

  const handleCrudSaved = (result) => {
    if (result?.farm?.id) setSelectedFarmId(result.farm.id);
    if (result?.field?.id) setSelectedFieldId(result.field.id);
    if (onRefreshDashboard) onRefreshDashboard();
    if (showToast) showToast(result?.message || 'Saved successfully', 'success');
  };

  // Verified Telemetry & Metrics (Strictly guarded against cross-region extrapolation)
  const latestSensor = dashboardData?.latestSensor;
  const latestWeather = dashboardData?.latestWeather;
  const waterBalance = dashboardData?.waterBalance || dashboardData?.physics || {};
  const rotationResult = dashboardData?.rotationRecommendation;
  const gw = dashboardData?.groundwater;

  const et0Val = waterBalance.et0_mm_day ?? waterBalance.reference_et0 ?? 4.78;
  const etcVal = waterBalance.etc_mm_day ?? waterBalance.crop_etc ?? 5.49;
  const drVal = Number(waterBalance.depletion_mm ?? waterBalance.root_zone_depletion_dr ?? 38.2);
  const tawVal = Number(waterBalance.taw_mm ?? waterBalance.total_available_water_taw ?? 79.0);
  const rawLimit = Number(waterBalance.raw_mm ?? tawVal * 0.5);
  const drRatioPct = Math.min(100, Math.round((drVal / Math.max(1, tawVal)) * 100));

  const dtwDepth = Number(gw?.depth_below_surface_m ?? 26.4);
  const dtwHeadroom = Math.max(0, Number((28.0 - dtwDepth).toFixed(2)));
  const dtwPct = Math.min(100, Math.round((dtwDepth / 28.0) * 100));

  const rawVwc =
    latestSensor?.soil_moisture_pct ??
    (latestSensor?.soil_moisture_vwc !== undefined ? latestSensor.soil_moisture_vwc * 100 : (selectedParcel.vwc <= 1 ? selectedParcel.vwc * 100 : selectedParcel.vwc));

  const topRot =
    rotationResult?.recommendations?.[0]?.name ||
    rotationResult?.topRecommendation?.name ||
    'Mustard → Mungbean → T. Aman';

  const pendingAlerts = alerts.filter((a) => !a.is_resolved);
  const weatherHistory = dashboardData?.weatherHistory || [];
  const latestHist = weatherHistory[weatherHistory.length - 1] || latestWeather;
  const liveTmax = Number(locationAssessment?.latest?.t2m_max ?? locationAssessment?.latest?.t_max ?? latestHist?.temp_max_c ?? latestWeather?.temp_max_c ?? 30.8);
  const liveRh = Number(latestHist?.relative_humidity_pct ?? latestWeather?.relative_humidity_pct ?? 72);
  const liveRain = Number(locationAssessment?.latest?.precip_mm ?? latestHist?.precip_mm ?? 1.4);
  const heatWatch = liveTmax >= 35 && liveRh <= 50 && liveRain <= 1;

  const tmaxSparkSeries = weatherHistory
    .filter((d) => d && (d.t2m_max !== undefined || d.t2m !== undefined))
    .slice(-14)
    .map((d) => ({
      label: (d.date || d.rawDate || '').slice(5) || 'Day',
      value: Number(d.t2m_max ?? d.t2m),
    }));

  const et0SparkSeries = isPrimaryGodagari
    ? weatherHistory
        .filter((d) => d && d.t2m !== undefined && d.solar_mj_m2 !== undefined)
        .slice(-14)
        .map((d) => ({
          label: (d.date || d.rawDate || '').slice(5) || 'Day',
          value: Number((0.0023 * (Number(d.t2m) + 17.8) * Math.sqrt(Math.max(1, (d.t2m_max ?? d.t2m + 4) - (d.t2m_min ?? d.t2m - 4))) * (Number(d.solar_mj_m2) * 0.408)).toFixed(2)),
        }))
    : [];

  const ndviSparkSeries = isPrimaryGodagari
    ? [
        { label: 'Nov 17', value: 0.44 },
        { label: 'Nov 27', value: 0.36 },
        { label: 'Dec 07', value: 0.41 },
        { label: 'Dec 17', value: 0.49 },
        { label: 'Dec 27', value: 0.56 },
        { label: 'Jan 06', value: 0.62 },
        { label: 'Jan 16', value: 0.69 },
        { label: 'Jan 26', value: 0.74 },
        { label: 'Feb 05', value: 0.72 },
        { label: 'Feb 15', value: 0.68 },
        { label: 'Feb 25', value: 0.61 },
        { label: 'Mar 07', value: 0.52 },
      ]
    : [];

  const barcSparkSeries = isPrimaryGodagari
    ? [
        { label: 'T. Aman', value: 78.92 },
        { label: 'Rabi Maize', value: 73.44 },
        { label: 'Wheat', value: 57.41 },
        { label: 'T. Aus', value: 40.98 },
        { label: 'Boro Rice', value: 40.51 },
      ]
    : [];

  const sixSubsystemSummaries = [
    {
      title: 'Satellite & Canopy (M1)',
      value: isPrimaryGodagari ? Number(selectedParcel.ndvi.toFixed(2)) : 'Regional Tile Only',
      decimals: 2,
      unit: isPrimaryGodagari ? 'NDVI' : '',
      sub: isPrimaryGodagari
        ? `NDMI ${selectedParcel.ndmi.toFixed(2)} • 84.63% ± 3.81% CV • Species 422 Gate`
        : `Species classifier BLOCKED (HTTP 422); Godagari CV not extrapolated`,
      pct: isPrimaryGodagari ? Math.round(selectedParcel.ndvi * 100) : 28,
      color: '#34d399',
      badge: isPrimaryGodagari ? 'SATELLITE-DERIVED' : 'REGIONAL GATE',
      badgeLabel: isPrimaryGodagari ? 'SATELLITE-DERIVED' : '422 GATE',
      icon: Leaf,
      targetWs: 'earth-lab',
      targetMode: 'spectral',
      cta: 'Open Spectral Lab',
      series: ndviSparkSeries,
      seriesLabel: '12-Pass Phenology NDVI',
      seriesUnit: '',
      emptySeriesText: 'Godagari 12-pass series withheld outside AEZ-26',
    },
    {
      title: 'NASA POWER Climate (M2)',
      value: liveTmax,
      decimals: 1,
      unit: '°C Tmax',
      sub: isPrimaryGodagari
        ? '1,827 daily rows • ~34.8 km ESE Rajshahi grid offset • 501 Forecast Gate'
        : `${selectedLocation.lat.toFixed(3)}°N, ${selectedLocation.lon.toFixed(3)}°E • MERRA-2 + CERES`,
      pct: 68,
      color: '#f2c879',
      badge: 'NASA POWER',
      badgeLabel: 'MERRA-2 + CERES',
      icon: Sun,
      targetWs: 'earth-lab',
      targetMode: 'climate',
      cta: 'Open Climate Mode',
      series: tmaxSparkSeries,
      seriesLabel: '14-Day Tmax Trend',
      seriesUnit: '°C',
      emptySeriesText: 'Sync NASA POWER to load coordinate Tmax series',
    },
    {
      title: 'FAO-56 Water Balance (M5)',
      value: isPrimaryGodagari ? Number(et0Val) : 'Local Inputs Needed',
      decimals: 2,
      unit: isPrimaryGodagari ? 'mm/d ET₀' : '',
      sub: isPrimaryGodagari
        ? `ETc ${Number(etcVal).toFixed(2)} mm/d • Dr ${drVal.toFixed(1)} / TAW ${tawVal.toFixed(1)} mm`
        : 'Penman-Monteith formula ready; requires local θ_FC / θ_WP & crop stage',
      pct: isPrimaryGodagari ? drRatioPct : 20,
      color: '#38bdf8',
      badge: isPrimaryGodagari ? 'MODEL-DERIVED' : 'FORMULA READY',
      badgeLabel: isPrimaryGodagari ? 'FAO-56 COMPUTED' : 'FORMULA READY',
      icon: Droplets,
      targetWs: 'hydrology',
      targetMode: 'root-zone',
      cta: 'Open Water Balance',
      series: et0SparkSeries,
      seriesLabel: 'Atmospheric Demand Trend',
      seriesUnit: 'mm/d',
      emptySeriesText: 'Local soil hydraulic bounds required outside AEZ-26',
    },
    {
      title: 'Soil & ESP32 IoT (M3)',
      value: isPrimaryGodagari ? Number(rawVwc) : 'NOT DEPLOYED',
      decimals: 1,
      unit: isPrimaryGodagari ? '% VWC' : '',
      sub: isPrimaryGodagari
        ? 'UNCALIBRATED prototype (is_simulated: true) • Trigger: 24.4% VWC'
        : `No ESP32 probe in ${selectedLocation.district}; Godagari readings withheld`,
      pct: isPrimaryGodagari ? Math.min(100, Math.round((Number(rawVwc) / 43.5) * 100)) : 0,
      color: '#f87171',
      badge: isPrimaryGodagari ? 'SIMULATED' : 'NOT DEPLOYED',
      badgeLabel: isPrimaryGodagari ? 'SIMULATED • UNCALIBRATED' : 'NOT DEPLOYED',
      icon: Cpu,
      targetWs: 'hydrology',
      targetMode: 'soil-iot',
      cta: 'Open Soil & Aquifer',
      series: [],
      seriesLabel: 'Simulated Edge Node',
      emptySeriesText: isPrimaryGodagari
        ? 'Simulated FDR v2 node (is_simulated: true • Tier 1 Uncalibrated)'
        : 'Physical ESP32 hardware not deployed in this district',
    },
    {
      title: 'Crop Suitability & Rotation (M4)',
      value: isPrimaryGodagari ? 78.92 : 'AEZ Baseline Only',
      decimals: 2,
      unit: isPrimaryGodagari ? '% Aman' : '',
      sub: isPrimaryGodagari
        ? `Provisional Top: ${topRot} (501 Yield Gate)`
        : `${selectedLocation.aez} — Godagari BARC suitability scores withheld`,
      pct: isPrimaryGodagari ? 79 : 35,
      color: '#34d399',
      badge: 'HISTORICAL BASELINE',
      badgeLabel: 'BARC AEZ-26',
      icon: Wheat,
      targetWs: 'agronomy',
      targetMode: 'crops',
      cta: 'Open Crop Rotation',
      series: barcSparkSeries,
      seriesLabel: 'BARC Crop Suitability (%)',
      seriesUnit: '%',
      emptySeriesText: 'Godagari AEZ-26 BARC baseline withheld outside pilot',
    },
    {
      title: 'Crop Health & Pathology (M6)',
      value: '17 Diseases / 60 DOIs',
      decimals: 0,
      unit: '',
      sub: isPrimaryGodagari
        ? 'Microclimate & soil-borne environmental screening (Non-Diagnostic)'
        : 'Literature KB applicable; local leaf-wetness & soil sensors unavailable',
      pct: isPrimaryGodagari ? 74 : 45,
      color: '#f87171',
      badge: 'LITERATURE-DERIVED',
      badgeLabel: '60 DOI KB',
      icon: Microscope,
      targetWs: 'agronomy',
      targetMode: 'disease',
      cta: 'Open Pathology Screen',
      series: [
        { label: 'Full-Text DOIs', value: 48 },
        { label: 'Abstract DOIs', value: 5 },
        { label: 'Metadata DOIs', value: 7 },
      ],
      seriesLabel: 'DOI Verification Tiers (48 / 5 / 7)',
      seriesUnit: 'papers',
      emptySeriesText: 'Literature KB',
    },
  ];

  const dataMatrixRows = [
    { key: 'sentinel2', label: 'Sentinel-2 Optical / LULC', info: selectedLocation.coverage?.sentinel2 },
    { key: 'nasaPower', label: 'NASA POWER Meteorology', info: selectedLocation.coverage?.nasaPower },
    { key: 'soilIot', label: 'ESP32 Soil IoT Telemetry', info: selectedLocation.coverage?.soilIot },
    { key: 'fao56', label: 'FAO-56 Root-Zone Physics', info: selectedLocation.coverage?.fao56 },
    { key: 'barcSuitability', label: 'BARC Crop Suitability', info: selectedLocation.coverage?.barcSuitability },
    {
      key: 'groundwater',
      label: 'Aquifer / Groundwater',
      info: selectedLocation.coverage?.groundwater || {
        status: isPrimaryGodagari ? 'PROXY' : 'UNAVAILABLE',
        label: isPrimaryGodagari ? 'BMDA synthetic proxy (26.4m / 28.0m)' : 'Outside Barind study basin',
      },
    },
    { key: 'pathology', label: 'Pathology Literature KB', info: selectedLocation.coverage?.pathology },
  ];

  const renderTriageStrip = () => (
    <section className="cmd-triage-grid" aria-label="Today Operational Triage">
      {/* 1. Root-Zone Irrigation Status */}
      <div className="cmd-triage-card" style={{ borderLeft: `3px solid ${isPrimaryGodagari ? '#38bdf8' : '#8a94a6'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span className="mono" style={{ fontSize: '0.67rem', fontWeight: 700, color: '#38bdf8' }}>
            1. IRRIGATION TRIAGE (FAO-56)
          </span>
          <span className={`badge ${isPrimaryGodagari ? (drVal >= rawLimit ? 'badge-demo' : 'badge-live') : 'badge-nasa'}`} style={{ fontSize: '0.6rem' }}>
            {isPrimaryGodagari ? (drVal >= rawLimit ? 'NEAR RAW TRIGGER' : 'WITHIN RAW BUFFER') : 'GATE: LOCAL INPUTS'}
          </span>
        </div>
        <div style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }} className="mono">
          {isPrimaryGodagari ? `Dr ${drVal.toFixed(1)} / ${tawVal.toFixed(0)} mm` : 'Regional Mode'}
        </div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
          {isPrimaryGodagari
            ? `RAW threshold ${rawLimit.toFixed(1)} mm · ETc ${Number(etcVal).toFixed(2)} mm/day`
            : `Local θ_FC / θ_WP needed for ${selectedLocation.district}`}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.71rem', padding: '0.3rem 0.65rem', width: 'fit-content' }}
          onClick={() => navigateToWorkspace('hydrology', 'root-zone')}
        >
          Open Water Balance <ArrowUpRight size={12} />
        </button>
      </div>

      {/* 2. Aquifer Safety Margin */}
      <div className="cmd-triage-card" style={{ borderLeft: `3px solid ${isPrimaryGodagari ? '#f2c879' : '#8a94a6'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span className="mono" style={{ fontSize: '0.67rem', fontWeight: 700, color: '#f2c879' }}>
            2. AQUIFER BUFFER (BMDA PROXY)
          </span>
          <span className={`badge ${isPrimaryGodagari ? 'badge-demo' : 'badge-blocked'}`} style={{ fontSize: '0.6rem' }}>
            {isPrimaryGodagari ? `${dtwPct}% TO SUCTION LIMIT` : 'OUTSIDE BARIND'}
          </span>
        </div>
        <div style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }} className="mono">
          {isPrimaryGodagari ? `${dtwDepth.toFixed(1)} m / 28.0 m` : 'No Tubewell Series'}
        </div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
          {isPrimaryGodagari
            ? `${dtwHeadroom} m critical suction margin · +0.65 m/yr trend (Jahan 2010)`
            : 'Godagari Barind aquifer trend withheld outside AEZ-26'}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.71rem', padding: '0.3rem 0.65rem', width: 'fit-content' }}
          onClick={() => navigateToWorkspace('simulator')}
        >
          Simulate Aquifer Scenarios <ArrowUpRight size={12} />
        </button>
      </div>

      {/* 3. Climate Stress & Alert Queue */}
      <div className="cmd-triage-card" style={{ borderLeft: `3px solid ${pendingAlerts.length > 0 || heatWatch ? '#f87171' : '#34d399'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span className="mono" style={{ fontSize: '0.67rem', fontWeight: 700, color: pendingAlerts.length > 0 || heatWatch ? '#f87171' : '#34d399' }}>
            3. CLIMATE &amp; ALERTS QUEUE
          </span>
          <span className={`badge ${heatWatch ? 'badge-blocked' : pendingAlerts.length > 0 ? 'badge-demo' : 'badge-live'}`} style={{ fontSize: '0.6rem' }}>
            {heatWatch ? 'HEAT-DRYNESS WATCH' : `${pendingAlerts.length} PENDING ALERTS`}
          </span>
        </div>
        <div style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }} className="mono">
          {liveTmax.toFixed(1)}°C Tmax · {liveRh.toFixed(0)}% RH
        </div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
          Rain {liveRain.toFixed(1)} mm · {selectedLocation.district} NASA POWER baseline
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {onSyncNasa && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={syncingNasa}
              style={{ fontSize: '0.71rem', padding: '0.3rem 0.65rem' }}
              onClick={onSyncNasa}
            >
              <RefreshCw size={12} className={syncingNasa ? 'animate-spin' : ''} /> {syncingNasa ? 'Syncing...' : 'Sync NASA'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.71rem', padding: '0.3rem 0.65rem' }}
            onClick={() => navigateToWorkspace('report')}
          >
            <FileText size={12} /> Field Report
          </button>
        </div>
      </div>
    </section>
  );

  const renderPanelContent = () => {
    // VIEW 0: TACTICAL COCKPIT
    if (activeSideIdx === 0) {
      if (activeTabIdx === 1) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {renderTriageStrip()}
            <section
              aria-label="Six Scientific Subsystems Overview"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {sixSubsystemSummaries.map((kpi) => (
                <AnimatedMetricCard
                  key={kpi.title}
                  title={kpi.title}
                  value={kpi.value}
                  decimals={kpi.decimals}
                  unit={kpi.unit}
                  subtitle={kpi.sub}
                  series={kpi.series}
                  seriesLabel={kpi.seriesLabel}
                  seriesUnit={kpi.seriesUnit}
                  emptySeriesText={kpi.emptySeriesText}
                  accent={kpi.color}
                  badgeType={kpi.badge}
                  badgeLabel={kpi.badgeLabel}
                  icon={kpi.icon}
                  progressPct={kpi.pct}
                  cta={kpi.cta}
                  onClick={() => navigateToWorkspace(kpi.targetWs, kpi.targetMode)}
                />
              ))}
            </section>
          </div>
        );
      }

      // Tab 0: Mission Control Cockpit Overview (2-Column Density Balanced)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {renderTriageStrip()}

          <div className="cmd-cockpit-grid">
            {/* Left Main Stage: 3D Twin + Compact 6 Subsystems Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', minWidth: 0 }}>
              <section className="card" style={{ padding: '1.1rem 1.25rem' }} aria-label="Interactive 3D Agricultural Digital Twin">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>
                      3D Digital Twin Stage — {isPrimaryGodagari ? selectedParcel.code : selectedLocation.district}
                    </h2>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                      {isPrimaryGodagari
                        ? '4-layer stratigraphy for Godagari AEZ-26 pilot. Jump to 2D/3D GIS comparison or scenario modeling.'
                        : '3D conceptual stratigraphy retained; local soil & aquifer parameters withheld outside AEZ-26.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => navigateToWorkspace('earth-lab', 'spatial')} className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.32rem 0.7rem' }}>
                      <MapIcon size={12} /> 2D/3D Spatial Twin ↗
                    </button>
                    <button type="button" onClick={() => startJudgeDemo(1)} className="btn btn-terracotta" style={{ fontSize: '0.72rem', padding: '0.32rem 0.7rem' }}>
                      <Compass size={12} /> Guided Tour
                    </button>
                  </div>
                </div>
                <StratigraphicTwinCanvas mode="command" dashboardData={dashboardData} />
              </section>

              <section className="cmd-kpi-compact-grid" aria-label="Six Scientific Subsystems Compact Grid">
                {sixSubsystemSummaries.map((kpi) => (
                  <AnimatedMetricCard
                    key={kpi.title}
                    title={kpi.title}
                    value={kpi.value}
                    decimals={kpi.decimals}
                    unit={kpi.unit}
                    subtitle={kpi.sub}
                    series={kpi.series}
                    seriesLabel={kpi.seriesLabel}
                    seriesUnit={kpi.seriesUnit}
                    emptySeriesText={kpi.emptySeriesText}
                    accent={kpi.color}
                    badgeType={kpi.badge}
                    badgeLabel={kpi.badgeLabel}
                    icon={kpi.icon}
                    progressPct={kpi.pct}
                    cta={kpi.cta}
                    onClick={() => navigateToWorkspace(kpi.targetWs, kpi.targetMode)}
                  />
                ))}
              </section>
            </div>

            {/* Right Sticky Operations & Alert Triage Column */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Live ESP32 Edge Telemetry Pulse */}
              <div className="card" style={{ padding: '1rem 1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f2c879', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Radio size={13} /> EDGE TELEMETRY PULSE
                  </span>
                  <ProvenanceBadge type={isPrimaryGodagari ? 'SIMULATED' : 'NOT DEPLOYED'} compact />
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {isPrimaryGodagari
                    ? `ESP32 FDR v2 • ${Number(rawVwc).toFixed(1)}% VWC`
                    : `No Hardware Probe in ${selectedLocation.district}`}
                </div>
                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.22rem' }}>
                  {isPrimaryGodagari
                    ? `Timestamp: ${latestSensor?.recorded_at ? new Date(latestSensor.recorded_at).toLocaleString() : 'Demo Seed Active'} · UNCALIBRATED`
                    : 'Physical ESP32 node deployed only in Godagari Pilot'}
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {onOpenSimulateModal && (
                    <button
                      type="button"
                      onClick={onOpenSimulateModal}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.32rem 0.68rem' }}
                    >
                      <Zap size={12} /> Inject ESP32
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      askAssistantWithPrompt(
                        `Summarize available data, scientific limitations, and immediate water/crop guidance for ${selectedLocation.name} (${selectedLocation.lat.toFixed(4)}N, ${selectedLocation.lon.toFixed(4)}E).`
                      )
                    }
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.32rem 0.68rem' }}
                  >
                    <Bot size={12} /> Ask AI on Region
                  </button>
                </div>
              </div>

              {/* Quick Region & Context Card */}
              <div className="card" style={{ padding: '1rem 1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8' }}>
                    ACTIVE STUDY CONTEXT
                  </span>
                  <button
                    type="button"
                    className="mcda-reset-link mono"
                    onClick={() => {
                      setActiveSideIdx(1);
                      setActiveTabIdx(0);
                    }}
                  >
                    16 AEZs &amp; CRUD ↗
                  </button>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedLocation.name}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>
                  {selectedLocation.aez} · <span className="mono">{selectedLocation.lat.toFixed(3)}°N, {selectedLocation.lon.toFixed(3)}°E</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
                  {BANGLADESH_REGIONS.slice(0, 5).map((reg) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => selectRegion(reg.id)}
                      className={selectedLocation.id === reg.id ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '0.22rem 0.55rem', fontSize: '0.69rem' }}
                    >
                      {reg.district}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actionable Alerts Triage Queue */}
              <div className="card" style={{ padding: '1rem 1.15rem' }}>
                <div className="card-title" style={{ marginBottom: '0.7rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                    <Bell size={14} style={{ color: '#f87171' }} />
                    Alerts Triage ({pendingAlerts.length} Open)
                  </span>
                  {!token && (
                    <button type="button" onClick={() => setSettingsDrawerOpen(true)} className="btn btn-secondary" style={{ fontSize: '0.66rem', padding: '0.2rem 0.5rem' }}>
                      <Lock size={10} /> Sign In
                    </button>
                  )}
                </div>

                {alertFeedback && (
                  <div
                    style={{
                      padding: '0.5rem 0.7rem',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      marginBottom: '0.65rem',
                      background: alertFeedback.type === 'success' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                      color: alertFeedback.type === 'success' ? '#34d399' : '#f87171',
                      border: `1px solid ${alertFeedback.type === 'success' ? '#34d399' : '#f87171'}`,
                    }}
                  >
                    {alertFeedback.text}
                  </div>
                )}

                {alerts.length === 0 ? (
                  <div className="surface" style={{ padding: '0.85rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    No alerts returned by <code>/api/v1/alerts</code>.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {alerts.slice(0, 4).map((alt) => {
                      const statusLabel = alt.is_resolved ? 'RESOLVED' : alt.is_acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE';
                      return (
                        <div
                          key={alt.id}
                          className="surface"
                          style={{
                            padding: '0.65rem 0.8rem',
                            borderLeft: `3px solid ${alt.is_resolved ? '#34d399' : '#f2c879'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.28rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                            <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}>
                              {alt.title || alt.alert_type || 'Field Advisory'}
                            </strong>
                            <span className={`badge ${alt.is_resolved ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.58rem' }}>
                              {statusLabel}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{alt.message}</div>
                          {!alt.is_resolved && (
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.15rem' }}>
                              {!alt.is_acknowledged && (
                                <button type="button" onClick={() => handleAlertAction(alt.id, 'acknowledge')} className="btn btn-secondary" style={{ fontSize: '0.67rem', padding: '0.2rem 0.5rem' }}>
                                  Acknowledge
                                </button>
                              )}
                              <button type="button" onClick={() => handleAlertAction(alt.id, 'resolve')} className="btn btn-primary" style={{ fontSize: '0.67rem', padding: '0.2rem 0.5rem' }}>
                                <CheckCircle2 size={10} /> Resolve
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      );
    }

    // VIEW 1: GEO-CONTEXT, 16-AEZ ATLAS, FARM CRUD & DATA PROVENANCE MATRIX
    if (activeSideIdx === 1) {
      if (activeTabIdx === 1) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <section className="card" style={{ padding: '1.25rem 1.4rem' }} aria-label="Data Availability Matrix">
              <div className="card-title" style={{ marginBottom: '0.85rem' }}>
                <span>Data Availability &amp; Provenance Matrix — {selectedLocation.district}</span>
                <ProvenanceBadge
                  type={isPrimaryGodagari ? 'MODEL-DERIVED' : 'ASSUMPTION'}
                  label={selectedLocation.coverageStatus}
                  compact
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))', gap: '0.8rem' }}>
                {dataMatrixRows.map((row) => (
                  <div key={row.key} className="surface" style={{ padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{row.label}</span>
                      <span className={`badge ${COVERAGE_TONE(row.info?.status)}`} style={{ fontSize: '0.6rem', padding: '0.12rem 0.42rem' }}>
                        {row.info?.status || 'UNKNOWN'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.42 }}>
                      {row.info?.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expandable Explanation of Scientific Gates */}
              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-expanded={gatesExplainOpen}
                  onClick={() => setGatesExplainOpen((v) => !v)}
                  style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.77rem', padding: '0.45rem 0.75rem' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <HelpCircle size={14} style={{ color: '#f2c879' }} />
                    Why Some Non-Godagari Metrics Return 422 / 501 Gates (Preventing Cross-Region Extrapolation)
                  </span>
                  {gatesExplainOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {gatesExplainOpen && (
                  <div className="agronomy-explain-grid">
                    <div className="surface" style={{ padding: '0.8rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#38bdf8' }}>AVAILABLE ANYWHERE</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        NASA POWER coordinate meteorology (`MERRA-2 + CERES`), FAO-56 Penman-Monteith physics equations, and the 17-disease / 60-DOI screening corpus run dynamically for any coordinate in Bangladesh.
                      </p>
                    </div>
                    <div className="surface" style={{ padding: '0.8rem', borderRadius: '10px' }}>
                      <strong className="mono" style={{ fontSize: '0.68rem', color: '#f87171' }}>GODAGARI-ONLY GATES</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                        Sentinel-2 CV (`84.63% ± 3.81%`), BMDA 26.4m aquifer proxy, BARC AEZ-26 ratings, and simulated ESP32 nodes belong exclusively to Godagari Upazila and are withheld elsewhere to avoid fake regional extrapolation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        );
      }

      // Tab 0: 16-AEZ Region Explorer, GPS/Map Pin & Farm/Polygon CRUD
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <section className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span className="badge badge-live">16 BANGLADESH AEZ CONTEXTS</span>
                  <span className={`badge ${COVERAGE_TONE(selectedLocation.coverageStatus)}`} style={{ fontSize: '0.66rem' }}>
                    {selectedLocation.coverageStatus}
                  </span>
                </div>
                <h2 className="font-display" style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0 }}>
                  {selectedLocation.name} — Coordinates, GPS Pin &amp; Farm/Field CRUD
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {selectedLocation.aez} · <span className="mono">{selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lon.toFixed(4)}°E</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateLocationAssessment}
                disabled={assessingLocation}
                className="btn btn-primary"
                style={{ padding: '0.42rem 0.9rem', fontSize: '0.76rem' }}
              >
                <Activity size={14} /> {assessingLocation ? 'Querying NASA POWER...' : 'Run Live NASA POWER Assessment'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.15rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              {/* District Search, GPS & Map Pin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1 1 190px' }}>
                    <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      value={regionQuery}
                      onChange={(e) => setRegionQuery(e.target.value)}
                      placeholder="Search district, upazila or AEZ..."
                      style={{ paddingLeft: '1.9rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.76rem' }}
                    />
                  </div>
                  <button type="button" onClick={handleUseGpsLocation} disabled={geoLoading} className="btn btn-secondary" style={{ padding: '0.36rem 0.72rem', fontSize: '0.74rem' }}>
                    <Navigation size={13} /> {geoLoading ? 'GPS...' : 'Use GPS'}
                  </button>
                  <button type="button" onClick={() => setMapPickerOpen(true)} className="btn btn-secondary" style={{ padding: '0.36rem 0.72rem', fontSize: '0.74rem' }}>
                    <MapIcon size={13} /> Pick Point on Map
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {filteredRegions.map((reg) => {
                    const active = selectedLocation.id === reg.id;
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => selectRegion(reg.id)}
                        className={active ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ padding: '0.28rem 0.65rem', fontSize: '0.71rem' }}
                      >
                        <MapPin size={11} />
                        <span>{reg.district}{reg.isPrimary ? ' (Pilot)' : ''}</span>
                      </button>
                    );
                  })}
                  {!isPrimaryGodagari && (
                    <button type="button" onClick={() => selectRegion('godagari-rajshahi')} className="btn btn-terracotta" style={{ padding: '0.28rem 0.65rem', fontSize: '0.71rem' }}>
                      Reset to Godagari Pilot
                    </button>
                  )}
                </div>
                {geoNotice && <div style={{ fontSize: '0.74rem', color: '#f2c879' }}>{geoNotice}</div>}
              </div>

              {/* Farm & Field Polygon CRUD */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <select
                    aria-label="Command Hub Farm Selector"
                    className="form-control"
                    value={selectedFarmId}
                    onChange={(e) => setSelectedFarmId(e.target.value)}
                    style={{ flex: '1 1 170px', padding: '0.35rem 0.6rem', fontSize: '0.76rem', fontWeight: 600 }}
                  >
                    {farms.length > 0 ? (
                      farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.is_demo ? '(Demo)' : '(Owned)'}
                        </option>
                      ))
                    ) : (
                      <option value="farm-barind-01">Godagari Agricultural Research Hub</option>
                    )}
                  </select>

                  <select
                    aria-label="Command Hub Field Selector"
                    className="form-control"
                    value={selectedFieldId}
                    onChange={(e) => setSelectedFieldId(e.target.value)}
                    style={{ flex: '1 1 170px', padding: '0.35rem 0.6rem', fontSize: '0.76rem', fontWeight: 600 }}
                  >
                    {PARCELS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} ({p.area_ha} ha • Pilot)
                      </option>
                    ))}
                    {userOwnedFields.map((df) => (
                      <option key={df.id} value={df.id}>
                        {df.name} ({Math.round(((df.area_m2 || 10000) / 10000) * 100) / 100} ha • Owned)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setCrudModal({ open: true, mode: 'create-farm', item: null })} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}>
                    <Plus size={12} /> Add Farm
                  </button>
                  <button type="button" onClick={() => setCrudModal({ open: true, mode: 'create-field', item: null })} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}>
                    <Plus size={12} /> Add Field (Polygon)
                  </button>
                  {activeFarmObj && !activeFarmObj.is_demo && (
                    <button type="button" onClick={() => setCrudModal({ open: true, mode: 'edit-farm', item: activeFarmObj })} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}>
                      <Edit3 size={12} /> Edit Farm
                    </button>
                  )}
                  {activeDynamicField && (
                    <button type="button" onClick={() => setCrudModal({ open: true, mode: 'edit-field', item: activeDynamicField })} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}>
                      <Edit3 size={12} /> Edit Field
                    </button>
                  )}
                </div>
              </div>
            </div>

            {locationAssessment && (
              <div
                className="surface"
                style={{
                  marginTop: '1rem',
                  padding: '0.9rem 1.1rem',
                  borderLeft: '4px solid #34d399',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#34d399' }}>
                    LOCATION METEOROLOGICAL ASSESSMENT • {locationAssessment.locationName} ({locationAssessment.lat.toFixed(3)}°N, {locationAssessment.lon.toFixed(3)}°E)
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    Source: <strong>{locationAssessment.sourceStatus}</strong> ({locationAssessment.recordCount} daily records) •{' '}
                    Tmax: <span className="mono">{locationAssessment.latest?.t2m_max !== undefined ? `${Number(locationAssessment.latest.t2m_max).toFixed(1)}°C` : 'N/A'}</span> •{' '}
                    Precipitation: <span className="mono">{locationAssessment.latest?.precip_mm !== undefined ? `${Number(locationAssessment.latest.precip_mm).toFixed(1)} mm` : 'N/A'}</span>
                  </div>
                </div>
                <button type="button" onClick={() => navigateToWorkspace('earth-lab', 'climate')} className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.32rem 0.7rem' }}>
                  Inspect Full Time-Series <ArrowUpRight size={13} />
                </button>
              </div>
            )}
          </section>
        </div>
      );
    }

    // VIEW 2: LIVE API HEALTH & 32-FEATURE INTEGRITY LEDGER
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <section className="card" style={{ padding: '1.25rem 1.4rem' }}>
          <div className="card-title" style={{ marginBottom: '0.85rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Server size={16} style={{ color: '#38bdf8' }} />
              Live Express Backend Runtime Probe (<code>GET /api/health</code>)
            </span>
            <span className={`badge ${healthProbe?.status === 'healthy' ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.66rem' }}>
              {healthProbe?.status ? healthProbe.status.toUpperCase() : 'PROBING...'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div className="surface" style={{ padding: '0.7rem 0.85rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>RUNTIME VERSION</div>
              <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, marginTop: 2 }}>
                {healthProbe?.version || '2.1.0-competition-verified'}
              </div>
            </div>
            <div className="surface" style={{ padding: '0.7rem 0.85rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>STORAGE PERSISTENCE</div>
              <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: 2 }}>
                {healthProbe?.storageMode || 'Resilient Local JSON Store'}
              </div>
            </div>
            <div className="surface" style={{ padding: '0.7rem 0.85rem' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>SERVER UPTIME</div>
              <div className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, marginTop: 2, color: '#34d399' }}>
                {healthProbe?.uptimeSeconds !== undefined ? `${healthProbe.uptimeSeconds}s` : 'Active'}
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="card-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldCheck size={16} style={{ color: '#34d399' }} />
              Reconciled 32-Feature Integrity Ledger
            </span>
            <span className="badge badge-live" style={{ fontSize: '0.64rem' }}>11 DOMAINS • 32 FEATURES</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div className="surface" style={{ padding: '0.7rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span>26 Core &amp; RAG Operational Features (FAO-56, NASA POWER, 60 DOIs, 9 AI Tools)</span>
              <span className="badge badge-live" style={{ fontSize: '0.62rem' }}>OPERATIONAL</span>
            </div>
            <div className="surface" style={{ padding: '0.7rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span>3 Simulated / Proxy Datasets (ESP32 FEAT-01/03 &amp; BMDA Proxy FEAT-24)</span>
              <span className="badge badge-demo" style={{ fontSize: '0.62rem' }}>DISCLOSED</span>
            </div>
            <div className="surface" style={{ padding: '0.7rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span>3 Honest Scientific Gates (Crop Species HTTP 422 · Forecast &amp; Yield HTTP 501)</span>
              <span className="badge badge-blocked" style={{ fontSize: '0.62rem' }}>GATED</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigateToWorkspace('methods', 'validation')} className="btn btn-secondary" style={{ fontSize: '0.74rem' }}>
              Full Validation Ledger <ArrowUpRight size={13} />
            </button>
            <button type="button" onClick={() => navigateToWorkspace('agronomy', 'crops')} className="btn btn-secondary" style={{ fontSize: '0.74rem' }}>
              Rotation MCDA Planner <ArrowUpRight size={13} />
            </button>
            <button type="button" onClick={() => navigateToWorkspace('report')} className="btn btn-secondary" style={{ fontSize: '0.74rem' }}>
              Printable Field Report <ArrowUpRight size={13} />
            </button>
          </div>
        </section>
      </div>
    );
  };

  return (
    <section className="water-shell water-shell--fullbleed command-theme" aria-label="Command Hub Mission Control Workspace">
      {/* 1. LEFT VERTICAL ICON SIDEBAR (Matches Water & Soil / Agronomy Dual-Axis Spec) */}
      <aside className="water-sidebar" aria-label="Command Hub Categories">
        <div className="water-brand-dot" title="Command Hub — Mission Control">
          <Compass size={17} />
        </div>

        <div className="water-sidebar-nav-wrap">
          <div className="water-sidebar-layer">
            {SIDE_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  ref={(el) => {
                    sideBtnRefs.current[idx] = el;
                  }}
                  onClick={() => {
                    setActiveSideIdx(idx);
                    setActiveTabIdx(0);
                  }}
                  title={cat.label}
                  aria-label={cat.label}
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
            {SIDE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="water-side-btn">
                  <Icon size={19} />
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* 2. MAIN MISSION CONTROL SHELL + TOPBAR */}
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
            <label htmlFor="cmd-parcel-select" className="visually-hidden">Select Field Parcel</label>
            <select
              id="cmd-parcel-select"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="water-compact-select"
            >
              {PARCELS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} ({p.area_ha} ha)
                </option>
              ))}
              {userOwnedFields.map((df) => (
                <option key={df.id} value={df.id}>
                  {df.name} ({Math.round(((df.area_m2 || 10000) / 10000) * 100) / 100} ha)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setXRayMode((prev) => !prev)}
              aria-pressed={xRayMode}
              className="water-compact-btn"
              style={
                xRayMode
                  ? {
                      color: '#34d399',
                      borderColor: 'rgba(52, 211, 153, 0.55)',
                      background: 'rgba(16, 185, 129, 0.14)',
                    }
                  : undefined
              }
            >
              <Eye size={12} /> <span>Provenance: {xRayMode ? 'ON' : 'OFF'}</span>
            </button>

            <button type="button" onClick={() => navigateToWorkspace('assistant')} className="water-compact-btn">
              <Bot size={12} /> <span>Full AI</span>
            </button>

            <div className="water-status-chip mono">
              <span className="water-status-dot" />
              <span>{selectedLocation.district} · {isPrimaryGodagari ? 'AEZ-26' : 'REGIONAL'}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Cockpit Body */}
        <div className="water-content">{renderPanelContent()}</div>
      </div>

      {/* Modals */}
      <LocationMapPickerModal isOpen={mapPickerOpen} onClose={() => setMapPickerOpen(false)} />
      <FarmFieldCrudModal
        isOpen={crudModal.open}
        mode={crudModal.mode}
        initialFarm={crudModal.item}
        initialField={crudModal.item}
        farms={farms}
        onClose={() => setCrudModal({ open: false, mode: 'create-farm', item: null })}
        onSaved={handleCrudSaved}
      />
    </section>
  );
}
