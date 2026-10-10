import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import WeatherChart from './components/WeatherChart';
import CropRotationExplorer from './components/CropRotationExplorer';
import WaterBudgetPanel from './components/WaterBudgetPanel';
import GroundwaterPanel from './components/GroundwaterPanel';
import SimulateReadingModal from './components/SimulateReadingModal';
import Esp32ApiDoc from './components/Esp32ApiDoc';
import ArchitectureView from './components/ArchitectureView';

export default function App() {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('farm-barind-01');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videoMode, setVideoMode] = useState('earth'); // 'earth' | 'satellite' | 'none'
  
  // Check URL path on load (/architecture support)
  const initialTab = typeof window !== 'undefined' && window.location.pathname.includes('/architecture')
    ? 'architecture'
    : 'rotation';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  // 1. Fetch Farm List
  useEffect(() => {
    fetch('/api/farms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.farms?.length > 0) {
          setFarms(data.farms);
        }
      })
      .catch((err) => console.error('Failed to load farms:', err));
  }, []);

  // 2. Fetch Dashboard Data
  const loadDashboard = async (farmId, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/dashboard?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedFarmId);
  }, [selectedFarmId]);

  const handleSelectFarm = (id) => {
    setSelectedFarmId(id);
  };

  const handleRefreshNasa = () => {
    loadDashboard(selectedFarmId, true);
  };

  const handleReadingCreated = () => {
    loadDashboard(selectedFarmId);
  };

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const newPath = tabName === 'architecture' ? '/architecture' : '/';
      window.history.pushState(null, '', newPath);
    }
  };

  const toggleVideoMode = () => {
    setVideoMode((prev) => {
      if (prev === 'earth') return 'satellite';
      if (prev === 'satellite') return 'none';
      return 'earth';
    });
  };

  const getVideoSrc = () => {
    if (videoMode === 'earth') return '/earth-bg.mp4';
    if (videoMode === 'satellite') return '/nasa-satellite.mp4';
    return null;
  };

  return (
    <div className="app-container">
      {/* Real NASA / Earth Looping Video Background */}
      {videoMode !== 'none' && (
        <div className="video-bg-container">
          <video
            key={videoMode}
            autoPlay
            loop
            muted
            playsInline
            className="video-bg"
          >
            <source src={getVideoSrc()} type="video/mp4" />
          </video>
        </div>
      )}
      <div className="video-overlay-gradient"></div>

      {/* Futuristic Command Header */}
      <Header
        farms={farms}
        selectedFarmId={selectedFarmId}
        onSelectFarm={handleSelectFarm}
        weatherStatus={{
          isRealNasaData: dashboardData?.weather?.isRealNasaData,
          sourceStatus: dashboardData?.weather?.sourceStatus
        }}
        isSimulatedReading={dashboardData?.sensor?.isSimulated}
        onRefreshNasa={handleRefreshNasa}
        onOpenSimulateModal={() => setIsSimModalOpen(true)}
        isRefreshing={refreshing}
        videoMode={videoMode}
        onToggleVideoMode={toggleVideoMode}
      />

      <main className="main-content">
        {/* Navigation Tabs */}
        <div className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'rotation' ? 'active' : ''}`}
            onClick={() => switchTab('rotation')}
          >
            🌾 Crop-Rotation Explorer (Core)
          </button>
          <button
            className={`tab-btn ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => switchTab('architecture')}
          >
            🏗️ System Architecture &amp; Data Flow
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => switchTab('dashboard')}
          >
            📊 Agro-Meteorological HUD
          </button>
          <button
            className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
            onClick={() => switchTab('physics')}
          >
            💧 FAO-56 Water Engine
          </button>
          <button
            className={`tab-btn ${activeTab === 'groundwater' ? 'active' : ''}`}
            onClick={() => switchTab('groundwater')}
          >
            📉 Barind Aquifer Groundwater
          </button>
          <button
            className={`tab-btn ${activeTab === 'esp32' ? 'active' : ''}`}
            onClick={() => switchTab('esp32')}
          >
            📡 ESP32 Ingestion Specs
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              INITIALIZING TELEMETRY STREAMS...
            </div>
            <p style={{ fontSize: '0.88rem' }}>Querying NASA POWER daily point observations &amp; edge registers</p>
          </div>
        ) : (
          <>
            {activeTab === 'rotation' && (
              <CropRotationExplorer
                farm={dashboardData?.farm}
                field={dashboardData?.field}
                weather={dashboardData?.weather}
              />
            )}

            {activeTab === 'architecture' && <ArchitectureView />}

            {activeTab === 'dashboard' && (
              <div>
                <MetricCards
                  farm={dashboardData?.farm}
                  field={dashboardData?.field}
                  weather={dashboardData?.weather}
                  sensor={dashboardData?.sensor}
                  physics={dashboardData?.physics}
                />
                <WeatherChart
                  weatherHistory={dashboardData?.weather?.history}
                  attribution={dashboardData?.weather?.attribution}
                />
              </div>
            )}

            {activeTab === 'physics' && (
              <WaterBudgetPanel
                physics={dashboardData?.physics}
                weather={dashboardData?.weather}
                field={dashboardData?.field}
              />
            )}

            {activeTab === 'groundwater' && (
              <GroundwaterPanel
                groundwater={dashboardData?.groundwater}
                farm={dashboardData?.farm}
              />
            )}

            {activeTab === 'esp32' && <Esp32ApiDoc />}
          </>
        )}
      </main>

      {/* Futuristic Command Footer */}
      <footer style={{
        borderTop: '1px solid rgba(56, 189, 248, 0.16)',
        padding: '1.25rem 2rem',
        backgroundColor: 'rgba(7, 13, 30, 0.85)',
        backdropFilter: 'blur(16px)',
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ color: '#ffffff' }}>AgriSense Fusion</strong> — NASA Space Apps Challenge 2026 (Field Shift: Adapting Farms with NASA Data).
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Earth Data: <strong style={{ color: 'var(--neon-cyan)' }}>NASA POWER Project</strong></span>
            <span>Physics Standard: <strong style={{ color: 'var(--neon-green)' }}>FAO-56 Penman-Monteith</strong></span>
            <span>Target: <strong style={{ color: '#e2e8f0' }}>Northern Bangladesh (Barind Tract)</strong></span>
          </div>
        </div>
      </footer>

      {/* Modal for Simulating ESP32 Sensor Readings */}
      <SimulateReadingModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onReadingCreated={handleReadingCreated}
      />
    </div>
  );
}
