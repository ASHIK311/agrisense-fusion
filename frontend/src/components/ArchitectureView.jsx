import React, { useState } from 'react';

const ARCHITECTURE_NODES = [
  {
    id: 'esp32',
    layer: 'Edge Sensing',
    title: 'ESP32 In-Situ Field Probe',
    subtitle: 'Capacitive FDR Soil Moisture, DS18B20, SHT31',
    status: 'planned_hardware',
    statusLabel: 'Hardware Pending / Ingestion Tested',
    protocol: 'HTTPS REST (TLS 1.3)',
    inputs: 'Physical soil dielectric permittivity, thermal resistance, air humidity',
    outputs: 'JSON: { device_id, event_id, soil_moisture_vwc, soil_temp_c, soil_ph, observed_at }',
    description: 'Autonomous low-power edge node deployed in Northern Bangladesh fields. Samples volumetric water content (VWC) and soil temperature every 60 minutes.',
    color: '#94a3b8'
  },
  {
    id: 'nasa_power',
    layer: 'External Earth Observation',
    title: 'NASA POWER Daily Point API',
    subtitle: 'NASA Langley Research Center Agroclimatology',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'HTTPS REST (Public Endpoint)',
    inputs: 'Latitude (24.469°N), Longitude (88.330°E), Bounded Date Range',
    outputs: 'T2M, T2M_MAX, T2M_MIN, RH2M, ALLSKY_SFC_SW_DWN, WS10M, PRECTOTCORR',
    description: 'Provides satellite-derived solar radiation and meteorological observations. Includes strict missing-value handling (-999 detected as null).',
    color: '#10b981'
  },
  {
    id: 'backend_ingress',
    layer: 'Ingress & Backend Gateway',
    title: 'Node.js / Express API Ingress',
    subtitle: 'Schema Validation & Idempotency Pipeline',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'Express 5 Middleware / REST',
    inputs: 'HTTPS payloads from edge sensors and client dashboard requests',
    outputs: 'Validated timeseries records, structured error codes (HTTP 409, 422)',
    description: 'Verifies physical numeric ranges (VWC 0.0-1.0, Temp -10 to 65°C), rejects duplicate event IDs, and enforces is_simulated audit flags.',
    color: '#10b981'
  },
  {
    id: 'database',
    layer: 'Persistence & Storage',
    title: 'PostgreSQL / Persistent Store',
    subtitle: 'Relational Schema & Atomic Storage Service',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'Relational SQL / Atomic File Store',
    inputs: 'Raw sensor readings, normalized NASA weather series, rotation catalogs, model runs',
    outputs: 'Parametrized historical queries, cached weather snapshots',
    description: 'Production schema provided in database/schema.sql with UUID keys, foreign key constraints, and timeseries indexes. Active MVP runs atomic file store.',
    color: '#10b981'
  },
  {
    id: 'physics_engine',
    layer: 'Scientific Engine',
    title: 'Physics Water Engine (FAO-56)',
    subtitle: 'Penman-Monteith ET₀ & Root-Zone Depletion',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'Pure Mathematical Calculation Functions',
    inputs: 'NASA T2M, RH2M, Solar MJ/m², WS10M (converted to u2 via log profile), Soil VWC',
    outputs: 'Reference ET₀ (mm/day), Crop ETc (mm/day), Root-Zone Depletion Dr (mm), Stress Warning',
    description: 'Standardized FAO-56 dual-boundary equations. Soil evaporation Es held null until dual-Kc lysimeters are deployed to prevent uncalibrated speculation.',
    color: '#10b981'
  },
  {
    id: 'mcda_engine',
    layer: 'Decision Engine',
    title: 'Crop-Rotation Scoring Engine',
    subtitle: 'Deterministic Multi-Criteria Decision Analysis',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'MCDA Algorithm & Agronomic Rules',
    inputs: 'Normalized user weights (Water, Soil, Heat, Profit), Field Soil Type, Previous Crops',
    outputs: 'Ranked candidate rotations, composite scores (0-100), machine reason codes, explanations',
    description: 'Evaluates Northern Bangladesh rotation patterns (Mustard, Lentil, Mungbean, Maize, Potato, Aman Rice, Boro Rice) with transparent sub-score weights.',
    color: '#10b981'
  },
  {
    id: 'frontend_dashboard',
    layer: 'Presentation & UI',
    title: 'AgriSense Fusion Dashboard',
    subtitle: 'React 18 + Vite 5 Single Page Application',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'HTTP Client (Fetch API / SVG Graphics)',
    inputs: 'Aggregated telemetry from /api/dashboard and /api/rotation/compare',
    outputs: 'Interactive priority sliders, SVG time-series charts, explainable recommendation cards',
    description: 'Dark-navy scientific interface with natural emerald accents, responsive cards, provenance badges, and farmer decision alerts.',
    color: '#10b981'
  },
  {
    id: 'groundwater_module',
    layer: 'Supporting Branch',
    title: 'BMDA Groundwater Aquifer Monitor',
    subtitle: 'Barind Deep Tubewell Water-Table Tracker',
    status: 'demo',
    statusLabel: 'Labelled Demonstration Data',
    protocol: 'REST Endpoint (/api/groundwater)',
    inputs: 'Piezometric well depth measurements (m below ground level)',
    outputs: 'Depth gauge, critical drawdown threshold alert (28m limit), annual drawdown trend',
    description: 'Monitors deep tubewell water tables against regional suction limits. Explicitly labelled as demo data: never infers total aquifer capacity from one point.',
    color: '#f59e0b'
  }
];

export default function ArchitectureView() {
  const [selectedNode, setSelectedNode] = useState(ARCHITECTURE_NODES[0]);
  const [showMermaidSource, setShowMermaidSource] = useState(false);
  const [copied, setCopied] = useState(false);

  const mermaidText = `graph TB
  %% Class Definitions with Distinct Colors
  classDef edgeLayer fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef satLayer fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
  classDef ingressLayer fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef storeLayer fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f8fafc;
  classDef scienceLayer fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef uiLayer fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#f8fafc;
  classDef supportLayer fill:#1c1917,stroke:#a8a29e,stroke-width:2px,stroke-dasharray: 4 4,color:#f8fafc;

  subgraph Layer1["1. EDGE HARDWARE & SENSING LAYER"]
    ESP32["<b>ESP32 Agro-Sensor Node</b><br/>• Capacitive FDR Soil Moisture (VWC)<br/>• DS18B20 Soil Temp Probe<br/>• SHT31 Ambient Humidity/Temp<br/><i>[TLS 1.3 / HTTPS REST Client]</i>"]:::edgeLayer
  end

  subgraph Layer2["2. SATELLITE EARTH OBSERVATION LAYER"]
    NASA["<b>NASA POWER Agroclimatology API</b><br/>• T2M, T2M_MAX, T2M_MIN (°C)<br/>• RH2M Relative Humidity (%)<br/>• ALLSKY_SFC_SW_DWN Solar (MJ/m²/day)<br/>• WS10M Wind Speed (m/s) & PRECTOTCORR<br/><i>[NASA Langley Research Center]</i>"]:::satLayer
  end

  subgraph Layer3["3. INGRESS & BACKEND GATEWAY LAYER (Node.js / Express 5)"]
    IngressAPI["<b>HTTPS Sensor Ingestion Gateway</b><br/>• Physical Range Validation: VWC ∈ [0.0, 1.0]<br/>• Idempotency Deduplication (UUID Event-ID)<br/>• Audit Tagging: is_simulated Enforcer"]:::ingressLayer
    NASAWorker["<b>NASA Ingestion & Cache Worker</b><br/>• -999 Missing Value Filter → null<br/>• 1-Hour Rolling In-Memory & File Cache<br/>• Lat/Long Spatial Binding (24.469°N, 88.330°E)"]:::ingressLayer
    GWWorker["<b>BMDA Groundwater Tracker</b><br/>• Piezometric Water Level Monitor<br/>• 28.0m Critical Suction Limit Warning"]:::ingressLayer
  end

  subgraph Layer4["4. PERSISTENCE & STORAGE LAYER"]
    DB[("<b>PostgreSQL 16 Production Target</b><br/><code>farms</code> | <code>fields</code> | <code>sensor_readings</code><br/><code>nasa_daily_weather</code> | <code>crop_catalog</code><br/><code>model_runs</code> | <code>recommendations</code><br/><i>(Atomic File Store Fallback Active)</i>")]:::storeLayer
  end

  subgraph Layer5["5. SCIENTIFIC COMPUTATION & DECISION ENGINES"]
    FAO56["<b>FAO-56 Penman-Monteith Physics Engine</b><br/>• 10m → 2m Wind Profile Log Transformation<br/>• Reference Evapotranspiration (ET₀ mm/day)<br/>• Crop Evapotranspiration (ETc = Kc × ET₀)<br/>• Root-Zone Depletion (Dr) vs TAW"]:::scienceLayer
    MCDA["<b>Crop-Rotation MCDA Decision Engine</b><br/>• Dynamic 4-Slider Weights Normalization<br/>• 💧 Water • 🌱 Soil • ☀️ Heat • 💰 Profit<br/>• Barind Agronomic Catalog Evaluation<br/>• Machine Reason Codes & Explanations"]:::scienceLayer
  end

  subgraph Layer6["6. PRESENTATION & FARMER ACTION LAYER (React 18 SPA)"]
    Dashboard["<b>AgriSense Fusion Interactive Dashboard</b><br/>• Real-Time Crop Rotation Explorer<br/>• Dark Scientific Visual Theme<br/>• Live SVG Atmospheric Trend Charts<br/>• /architecture Visual Canvas"]:::uiLayer
    AlertSystem["<b>Farmer Action & Aquifer Alert Engine</b><br/>• ⚠️ Root-Zone Stress Trigger (Dr > 50% TAW)<br/>• 🚨 Deep Tubewell Drawdown Alert<br/>• 📋 Recommended Resilient Crop Plan"]:::uiLayer
  end

  subgraph LayerSupport["SUPPORTING MONITORING BRANCH"]
    BMDA["<b>BMDA Tubewell Piezometer</b><br/>• Piezometric Water Table Sensor<br/><i>[Barind Multipurpose Dev. Authority]</i>"]:::supportLayer
  end

  ESP32 -- "HTTPS POST (VWC, Temp, pH, event_id)" --> IngressAPI
  NASA -- "HTTPS GET (Agroclimatology Point Series)" --> NASAWorker
  BMDA -. "Piezometric Depth (m)" .-> GWWorker

  IngressAPI -- "Validated Records" --> DB
  NASAWorker -- "Normalized Weather Upsert" --> DB
  GWWorker -. "Well Telemetry" .-> DB

  DB -- "Soil Moisture & Water Level" --> FAO56
  DB -- "Historical Weather Series" --> FAO56
  DB -- "Crop Catalog & Constraints" --> MCDA

  FAO56 -- "ET₀, ETc, Water Deficit (Dr)" --> MCDA
  FAO56 -- "Atmospheric Demand Metrics" --> Dashboard

  MCDA -- "Ranked Rotations & Reason Codes" --> Dashboard
  GWWorker -. "Aquifer Depletion State" .-> Dashboard

  Dashboard --> AlertSystem`;

  const copyMermaid = () => {
    navigator.clipboard.writeText(mermaidText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Title & Overview Banner */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          System Architecture &amp; Data Flow <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>[Production Blueprint]</span>
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Traceable end-to-end data pipelines from spaceborne NASA earth observation and IoT edge probes to 
          physics water models and explainable crop-rotation decision support.
        </p>
      </div>

      {/* Legend & Status Indicator */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Component Legend:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="dot dot-green"></span>
            <strong>Implemented &amp; Live</strong> (Green border)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="dot dot-amber"></span>
            <strong>Labelled Demo Data</strong> (Amber border)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', border: '1px dashed #94a3b8', borderRadius: '50%' }}></span>
            <strong>Hardware Ingestion Tested / Physical Flash Pending</strong> (Dashed border)
          </span>
        </div>

        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
          onClick={() => setShowMermaidSource(!showMermaidSource)}
        >
          {showMermaidSource ? 'Hide Mermaid Source ▲' : 'View Editable Mermaid Diagram ▼'}
        </button>
      </div>

      {/* Expandable Mermaid Source Box */}
      {showMermaidSource && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#0a0f1d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Editable Mermaid Architecture Specification (<code>docs/architecture.mmd</code>):
            </span>
            <button className="btn btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={copyMermaid}>
              {copied ? 'Copied to Clipboard! ✓' : 'Copy Mermaid Code'}
            </button>
          </div>
          <pre style={{
            padding: '1rem',
            background: '#111a2e',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: '#34d399',
            overflowX: 'auto',
            lineHeight: '1.5'
          }}>
            {mermaidText}
          </pre>
        </div>
      )}

      {/* Main Interactive Diagram Canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Visual Pipeline Flow Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Layer 1 & 2: Data Sources (Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Box 1: Edge Hardware */}
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[0])}
              style={{
                background: selectedNode.id === 'esp32' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                border: `2px dashed ${selectedNode.id === 'esp32' ? '#60a5fa' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                  1. Edge Sensing Layer
                </span>
                <span className="badge badge-demo" style={{ fontSize: '0.65rem' }}>Contract Tested</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                ESP32 Field Probe Node
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Capacitive FDR soil moisture, DS18B20 soil temp, SHT31 humidity
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
                HTTPS POST /api/sensor-readings →
              </div>
            </div>

            {/* Box 2: NASA Satellite Weather */}
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[1])}
              style={{
                background: selectedNode.id === 'nasa_power' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                border: `2px solid ${selectedNode.id === 'nasa_power' ? '#10b981' : '#059669'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#34d399' }}>
                  2. Earth Observation Layer
                </span>
                <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>Live Active</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                NASA POWER Daily Point API
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                T2M, RH2M, Solar Irradiance, WS10M, PRECTOTCORR
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                Hourly Cache &amp; Unit Normalization →
              </div>
            </div>
          </div>

          {/* Flow Indicator Down Arrow */}
          <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '1.1rem', margin: '-0.3rem 0' }}>
            ▼ Ingress &amp; Validation Pipeline ▼
          </div>

          {/* Layer 3: Backend Ingress & Validation */}
          <div
            onClick={() => setSelectedNode(ARCHITECTURE_NODES[2])}
            style={{
              background: selectedNode.id === 'backend_ingress' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
              border: `2px solid ${selectedNode.id === 'backend_ingress' ? '#10b981' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                3. Ingress &amp; Backend Services (Express 5)
              </span>
              <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>Operational</span>
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              HTTPS Ingestion &amp; Idempotency Gateway
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Rejects duplicate event IDs (HTTP 409), enforces physical moisture limits [0.0-1.0], checks temperature bounds, preserves is_simulated audit flags.
            </p>
          </div>

          {/* Flow Indicator Down Arrow */}
          <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '1.1rem', margin: '-0.3rem 0' }}>
            ▼ Persistence &amp; State Retrieval ▼
          </div>

          {/* Layer 4: Persistence Store & PostgreSQL */}
          <div
            onClick={() => setSelectedNode(ARCHITECTURE_NODES[3])}
            style={{
              background: selectedNode.id === 'database' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
              border: `2px solid ${selectedNode.id === 'database' ? '#10b981' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                4. Persistence &amp; Storage Layer
              </span>
              <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>Operational</span>
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              PostgreSQL Relational Target / Persistent Local Store
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Separates measured telemetry, NASA weather records, crop cycle rules, and physics runs. Atomic file store runs in MVP; production schema provided in database/schema.sql.
            </p>
          </div>

          {/* Flow Indicator Down Arrow */}
          <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '1.1rem', margin: '-0.3rem 0' }}>
            ▼ Computational Science &amp; Decision Engines ▼
          </div>

          {/* Layer 5: Science Engines (Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Science A: Physics Water Engine */}
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[4])}
              style={{
                background: selectedNode.id === 'physics_engine' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                border: `2px solid ${selectedNode.id === 'physics_engine' ? '#10b981' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                  5A. Physics Engine
                </span>
                <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>FAO-56 PM</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Penman-Monteith ET₀ &amp; Root-Zone Balance
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Atmospheric demand, logarithmic wind adjustment, TAW, root depletion Dr. Direct soil evaporation Es held null until calibrated.
              </p>
            </div>

            {/* Science B: MCDA Crop Rotation */}
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[5])}
              style={{
                background: selectedNode.id === 'mcda_engine' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                border: `2px solid ${selectedNode.id === 'mcda_engine' ? '#10b981' : '#10b981'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
                  5B. Decision Engine (CORE)
                </span>
                <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>Deterministic MCDA</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Crop-Rotation Explorer Engine
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Multi-criteria scoring: Water conservation, Legume soil health, Heat resilience, Farmer profit. Dynamic re-ranking with explainable reason codes.
              </p>
            </div>
          </div>

          {/* Flow Indicator Down Arrow */}
          <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '1.1rem', margin: '-0.3rem 0' }}>
            ▼ Client Presentation &amp; Advisory Action ▼
          </div>

          {/* Layer 6: Presentation Dashboard */}
          <div
            onClick={() => setSelectedNode(ARCHITECTURE_NODES[6])}
            style={{
              background: selectedNode.id === 'frontend_dashboard' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
              border: `2px solid ${selectedNode.id === 'frontend_dashboard' ? '#10b981' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                6. Presentation &amp; Alert Layer
              </span>
              <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>React 18 SPA</span>
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              AgriSense Fusion Interactive Dashboard
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Responsive web console, dynamic weight sliders, SVG weather trends, irrigation threshold alerts, and simulation console.
            </p>
          </div>

          {/* Supporting Branch: Groundwater Box */}
          <div
            onClick={() => setSelectedNode(ARCHITECTURE_NODES[7])}
            style={{
              background: selectedNode.id === 'groundwater_module' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
              border: `1px solid ${selectedNode.id === 'groundwater_module' ? '#f59e0b' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>
                  [Supporting Branch]
                </span>{' '}
                <strong style={{ fontSize: '0.9rem' }}>BMDA Barind Aquifer Groundwater Tracker</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Monitors deep tubewell drawdown against 28m critical threshold. Labelled demonstration data.
                </p>
              </div>
              <span className="badge badge-demo" style={{ fontSize: '0.68rem' }}>Demo Support</span>
            </div>
          </div>
        </div>

        {/* Right Column: Node Specification Inspector */}
        <div style={{ position: 'sticky', top: '5.5rem', alignSelf: 'start' }}>
          <div className="card" style={{ border: `2px solid ${selectedNode.color}` }}>
            <div className="card-title">
              <span>Component Inspector</span>
              <span className={`badge ${selectedNode.status === 'live' ? 'badge-live' : 'badge-demo'}`}>
                {selectedNode.statusLabel}
              </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              {selectedNode.title}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Layer: <strong>{selectedNode.layer}</strong>
            </div>

            <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              <p style={{ marginBottom: '0.75rem' }}>
                {selectedNode.description}
              </p>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Protocol / Interface</div>
                <code style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>{selectedNode.protocol}</code>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Key Inputs</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedNode.inputs}</div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Outputs / Payloads</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedNode.outputs}</div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              💡 Click any node on the diagram to inspect its interface contract and scientific assumptions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
