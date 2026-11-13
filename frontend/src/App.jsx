import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, Zap, Bot, MapPin, FileText } from 'lucide-react';
import { AgriSenseProvider, useAgriSense, PARCELS } from './context/AgriSenseContext';
import Header from './components/Header';
import HomeStoryPage from './components/HomeStoryPage';
import CommandDeck from './components/CommandDeck';
import EarthLabWorkspace from './components/EarthLabWorkspace';
import WaterSoilWorkspace from './components/WaterSoilWorkspace';
import AgronomyCropsShellWorkspace from './components/agronomy/AgronomyCropsShellWorkspace';
import WhatIfSimulatorWorkspace from './components/WhatIfSimulatorWorkspace';
import AssistantPanel from './components/AssistantPanel';
import AgronomicReportPanel from './components/AgronomicReportPanel';
import MethodsValidationWorkspace from './components/MethodsValidationWorkspace';
import ArchitectureView from './components/ArchitectureView';
import SimulateReadingModal from './components/SimulateReadingModal';
import JudgeDemoBar from './components/JudgeDemoBar';
import HomeSectionRail from './components/HomeSectionRail';
import FloatingAssistantDrawer from './components/FloatingAssistantDrawer';
import CommandPaletteModal from './components/CommandPaletteModal';
import GlobalDrawers from './components/GlobalDrawers';
import DynamicIsland from './components/DynamicIsland';
import AgriSenseRadialMenu from './components/AgriSenseRadialMenu';
import TeamRosterModal from './components/TeamRosterModal';
import AgriSenseParticlePreloader from './components/AgriSenseParticlePreloader';

function AgriSenseShell() {
  const {
    viewMode,
    activeWorkspace,
    workspaceModes,
    navigateToWorkspace,
    selectedFarmId,
    setSelectedFarmId,
    selectedFieldId,
    setSelectedFieldId,
    selectedLocation,
    setDynamicFields,
    dynamicFields,
    token,
    xRayMode,
    setXRayMode,
    density,
    routeTransitionKey,
    notifyIsland,
    teamModalOpen,
    setTeamModalOpen,
    preloaderOpen,
    preloaderReplayNonce,
    completePreloader,
  } = useAgriSense();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingNasa, setSyncingNasa] = useState(false);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);

  const showToast = useCallback(
    (msg, type = 'info') => {
      notifyIsland(msg, type, { durationMs: 3000 });
    },
    [notifyIsland]
  );

  const fetchDashboard = useCallback(async (farmId) => {
    try {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [dashRes, rotRes, farmsRes, fieldsRes] = await Promise.all([
        fetch(`/api/dashboard?farm_id=${encodeURIComponent(farmId)}`, { headers: authHeaders }),
        fetch('/api/rotation/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weights: { waterConservation: 35, soilHealth: 25, heatResilience: 20, economicPreference: 20 },
          }),
        }),
        fetch('/api/v1/farms', { headers: authHeaders }),
        fetch('/api/v1/fields', { headers: authHeaders }),
      ]);

      const dashJson = await dashRes.json();
      const rotJson = await rotRes.json();
      const farmsJson = await farmsRes.json();
      const fieldsJson = await fieldsRes.json();

      if (fieldsJson.success && Array.isArray(fieldsJson.fields)) {
        setDynamicFields(fieldsJson.fields);
      }

      if (dashJson.success) {
        const raw = dashJson.data || dashJson;
        setDashboardData({
          ...raw,
          farms: farmsJson.farms || raw.farms || [],
          fields: fieldsJson.fields || [],
          farm: raw.farm,
          field: raw.field,
          latestSensor: raw.latestSensor || raw.sensor?.latestReading || null,
          latestWeather: raw.latestWeather || raw.weather?.latest || null,
          weatherHistory: raw.weatherHistory || raw.weather?.history || [],
          nasaAttribution: raw.nasaAttribution || raw.weather?.attribution || null,
          waterBalance: raw.waterBalance || raw.physics || null,
          groundwater: raw.groundwater || null,
          rotationRecommendation: raw.rotationRecommendation || rotJson || null,
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token, setDynamicFields]);

  useEffect(() => {
    fetchDashboard(selectedFarmId);
  }, [selectedFarmId, token, fetchDashboard]);

  // Prevent chart tooltip and card spotlight flicker while scrolling
  useEffect(() => {
    const root = document.documentElement;
    let timerId = 0;
    let lastX = -1;
    let lastY = -1;
    const clearFlag = () => {
      window.clearTimeout(timerId);
      root.classList.remove('is-scrolling');
    };
    const onScroll = () => {
      if (!root.classList.contains('is-scrolling')) root.classList.add('is-scrolling');
      window.clearTimeout(timerId);
      timerId = window.setTimeout(clearFlag, 150);
    };
    const onPointerMove = (e) => {
      if (Math.abs(e.screenX - lastX) + Math.abs(e.screenY - lastY) > 2 && root.classList.contains('is-scrolling')) {
        clearFlag();
      }
      lastX = e.screenX;
      lastY = e.screenY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      clearFlag();
    };
  }, []);

  const handleSyncNasa = async () => {
    setSyncingNasa(true);
    try {
      const lat = selectedLocation?.lat ?? 24.469;
      const lon = selectedLocation?.lon ?? 88.33;
      const res = await fetch(`/api/nasa/power?lat=${lat}&lon=${lon}&days=14`);
      const json = await res.json();
      if (json.success) {
        showToast(
          `NASA POWER Sync Complete (${json.isRealNasaData ? 'Live NASA Langley API' : 'Verified Cached Reanalysis'})`,
          'success'
        );
        await fetchDashboard(selectedFarmId);
      } else {
        showToast(json.error || 'NASA sync warning', 'warning');
      }
    } catch (err) {
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingNasa(false);
    }
  };

  const handleUpdateWeights = async (weights) => {
    try {
      const res = await fetch('/api/rotation/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights }),
      });
      const json = await res.json();
      if (json.success) {
        setDashboardData((prev) =>
          prev
            ? {
                ...prev,
                rotationRecommendation: json.rotationRecommendation || json,
              }
            : prev
        );
      }
    } catch (err) {
      console.error('Failed to update rotation weights:', err);
    }
  };

  const handleReadingCreated = async () => {
    showToast('Simulated ESP32 reading persisted (is_simulated: true)', 'success');
    await fetchDashboard(selectedFarmId);
  };

  return (
    <div
      data-density={density}
      data-view={viewMode}
      style={{
        '--density': density,
        minHeight: '100dvh',
        background: 'var(--bg-canvas)',
        color: 'var(--text-main)',
      }}
    >
      {/* Animated Top Route Beam Sweep */}
      <div key={routeTransitionKey} className="route-beam" aria-hidden="true" />
      <AgriSenseParticlePreloader
        isOpen={preloaderOpen}
        replayNonce={preloaderReplayNonce}
        onComplete={completePreloader}
      />

      {/* Skip Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to main content
      </a>

      {/* Unified Floating Single-Row Glass Header (Identical UI across Home & all Tabs) */}
      <Header />

      {/* Bottom Notice Dynamic Island (3s Welcome + Weather/Alert/NASA/ESP32 notices) */}
      <DynamicIsland
        onSyncNasa={handleSyncNasa}
        syncingNasa={syncingNasa}
        dashboardData={dashboardData}
        isModalBlocked={simulateModalOpen}
      />

      {viewMode === 'home' ? (
        <div key={`home-${routeTransitionKey}`} className="page-fade">
          <HomeStoryPage dashboardData={dashboardData} />
        </div>
      ) : (
        <div className="app-cosmic-canvas">
          <main
            id="main-content"
            tabIndex="-1"
            key={`ws-${activeWorkspace}-${routeTransitionKey}`}
            className={`app-unified-main page-fade${activeWorkspace === 'hydrology' || activeWorkspace === 'agronomy' || activeWorkspace === 'command' ? ' app-unified-main--fullbleed' : ''}`}
          >
            {/* Compact 1-Line Telemetry Context Ribbon (kept only on auxiliary report/assistant routes) */}
            {activeWorkspace !== 'command' && activeWorkspace !== 'earth-lab' && activeWorkspace !== 'hydrology' && activeWorkspace !== 'agronomy' && activeWorkspace !== 'simulator' && activeWorkspace !== 'methods' && (
              <div
                className="card no-print"
                style={{
                  padding: '0.38rem 0.78rem',
                  marginBottom: '1rem',
                  borderRadius: '9999px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <MapPin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <label htmlFor="ctx-farm-select" className="visually-hidden">Select Farm</label>
                <select
                  id="ctx-farm-select"
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  style={{ background: 'var(--bg-alt)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '9999px', padding: '0.22rem 0.58rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {(dashboardData?.farms || []).length > 0 ? (
                    (dashboardData?.farms || []).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))
                  ) : (
                    <option value="farm-barind-01">Godagari Barind Research Farm #1</option>
                  )}
                </select>

                <label htmlFor="ctx-field-select" className="visually-hidden">Select Field Parcel</label>
                <select
                  id="ctx-field-select"
                  value={selectedFieldId}
                  onChange={(e) => setSelectedFieldId(e.target.value)}
                  style={{ background: 'var(--bg-alt)', color: 'var(--accent-primary)', border: '1px solid var(--border-subtle)', borderRadius: '9999px', padding: '0.22rem 0.58rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {PARCELS.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} ({p.area_ha} ha • {p.crop})</option>
                  ))}
                  {dynamicFields
                    .filter((df) => !df.is_demo && !PARCELS.some((p) => p.id === df.id))
                    .map((df) => (
                      <option key={df.id} value={df.id}>
                        {df.name} ({Math.round(((df.area_m2 || 10000) / 10000) * 100) / 100} ha • {df.current_crop})
                      </option>
                    ))}
                </select>

                <span
                  className={`badge ${selectedLocation?.isPrimary ? 'badge-live' : 'badge-demo'}`}
                  style={{ fontSize: '0.64rem', padding: '0.16rem 0.5rem' }}
                  title={selectedLocation?.aez}
                >
                  {selectedLocation?.district || 'Rajshahi'} · {selectedLocation?.isPrimary ? 'AEZ-26 PILOT' : 'PROVISIONAL'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setXRayMode((prev) => !prev)}
                  aria-pressed={xRayMode}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.24rem 0.58rem',
                    fontSize: '0.7rem',
                    borderRadius: '9999px',
                    background: xRayMode ? 'rgba(52, 211, 153, 0.16)' : undefined,
                    borderColor: xRayMode ? 'var(--accent-primary)' : undefined,
                    color: xRayMode ? 'var(--accent-primary)' : undefined,
                  }}
                >
                  <Eye size={12} /> Provenance: {xRayMode ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={handleSyncNasa}
                  disabled={syncingNasa}
                  className="btn btn-secondary"
                  style={{ padding: '0.24rem 0.58rem', fontSize: '0.7rem', borderRadius: '9999px' }}
                >
                  <RefreshCw size={12} className={syncingNasa ? 'animate-spin' : ''} /> {syncingNasa ? 'Syncing...' : 'Sync NASA'}
                </button>
                <button
                  type="button"
                  onClick={() => setSimulateModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ padding: '0.24rem 0.58rem', fontSize: '0.7rem', borderRadius: '9999px' }}
                >
                  <Zap size={12} /> Simulate ESP32
                </button>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('assistant')}
                  className={activeWorkspace === 'assistant' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.24rem 0.58rem', fontSize: '0.7rem', borderRadius: '9999px' }}
                >
                  <Bot size={12} /> Full AI
                </button>
                <button
                  type="button"
                  onClick={() => navigateToWorkspace('report')}
                  className={activeWorkspace === 'report' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.24rem 0.6rem', fontSize: '0.7rem', borderRadius: '9999px' }}
                  title="Open Printable PDF Synthesis Report"
                >
                  <FileText size={12} /> Field Report ↗
                </button>
              </div>
            </div>
            )}

            {loading && !dashboardData ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading AgriSense Living Landscape Intelligence Platform...
              </div>
            ) : (
              <>
                {activeWorkspace === 'command' && (
                  <CommandDeck
                    dashboardData={dashboardData}
                    onUpdateWeights={handleUpdateWeights}
                    onOpenSimulateModal={() => setSimulateModalOpen(true)}
                    onRefreshDashboard={() => fetchDashboard(selectedFarmId)}
                    onSyncNasa={handleSyncNasa}
                    syncingNasa={syncingNasa}
                    showToast={showToast}
                  />
                )}

                {activeWorkspace === 'earth-lab' && (
                  <EarthLabWorkspace
                    dashboardData={dashboardData}
                    onSyncNasa={handleSyncNasa}
                    syncingNasa={syncingNasa}
                  />
                )}

                {activeWorkspace === 'hydrology' && (
                  <WaterSoilWorkspace
                    dashboardData={dashboardData}
                    onOpenSimulateModal={() => setSimulateModalOpen(true)}
                    onSyncNasa={handleSyncNasa}
                    syncingNasa={syncingNasa}
                  />
                )}

                {activeWorkspace === 'agronomy' && (
                  <AgronomyCropsShellWorkspace dashboardData={dashboardData} />
                )}

                {activeWorkspace === 'simulator' && <WhatIfSimulatorWorkspace dashboardData={dashboardData} />}

                {activeWorkspace === 'assistant' && <AssistantPanel selectedFarmId={selectedFarmId} />}

                {activeWorkspace === 'report' && (
                  <AgronomicReportPanel farmId={selectedFarmId} fieldId={selectedFieldId} />
                )}

                {activeWorkspace === 'methods' && (
                  <MethodsValidationWorkspace
                    dashboardData={dashboardData}
                    initialFocusSection={workspaceModes?.methods}
                  />
                )}
              </>
            )}
          </main>
        </div>
      )}

      {/* Subtle Vertical Section Rail on Home (/) */}
      <HomeSectionRail />

      {/* Persistent Global Floating AI Copilot, Ctrl+K Search, & Slide-Over Drawers */}
      <FloatingAssistantDrawer />
      <AgriSenseRadialMenu onOpenTeamModal={() => setTeamModalOpen(true)} />
      <CommandPaletteModal />
      <GlobalDrawers />

      {/* Global NASA Space Apps 2026 Team Roster Directory Modal */}
      <TeamRosterModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
      />

      {/* Global Simulate ESP32 Modal */}
      <SimulateReadingModal
        isOpen={simulateModalOpen}
        onClose={() => setSimulateModalOpen(false)}
        onReadingCreated={handleReadingCreated}
      />

      {/* Global Guided 3-Minute Judge Presentation Controller */}
      <JudgeDemoBar />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('AgriSense ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2.5rem',
            margin: '2rem auto',
            maxWidth: '620px',
            background: 'var(--bg-surface)',
            border: '1px solid rgba(200, 121, 82, 0.3)',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-terracotta)', marginBottom: '0.5rem' }}>
            Workspace Display Notice
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            {this.state.error?.message || 'A transient rendering event was detected. Click below to refresh.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AgriSenseProvider>
      <ErrorBoundary>
        <AgriSenseShell />
      </ErrorBoundary>
    </AgriSenseProvider>
  );
}
