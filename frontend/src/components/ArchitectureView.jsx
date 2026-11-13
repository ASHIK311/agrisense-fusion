import React, { useCallback, useState } from 'react';
import { Network, Copy, Check, Info } from 'lucide-react';
import AnimatedDataPipeline from './methods/AnimatedDataPipeline';
import PipelineTelemetryStage from './methods/PipelineTelemetryStage';

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
    color: '#fb923c',
    samplePayload: {
      device_id: 'esp32-barind-01',
      event_id: '7d3e92a1-4b55-4f88-9e12-001122334455',
      soil_moisture_vwc: 0.238,
      soil_temp_c: 26.8,
      soil_ph: 6.4,
      is_simulated: true,
      gate_rules: ['HTTP 409 on duplicate event_id', 'HTTP 422 if VWC ∉ [0.0, 1.0]'],
    },
  },
  {
    id: 'nasa_power',
    layer: 'External Earth Observation',
    title: 'NASA POWER Daily Point API',
    subtitle: 'NASA Langley Research Center Agroclimatology',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'HTTPS REST (Public Endpoint)',
    inputs: 'Latitude (24.3636°N), Longitude (88.6241°E), Bounded Date Range',
    outputs: 'T2M, T2M_MAX, T2M_MIN, RH2M, ALLSKY_SFC_SW_DWN, WS10M, PRECTOTCORR',
    description: 'Provides satellite-derived solar radiation and meteorological observations. Includes strict missing-value handling (-999 detected as null).',
    color: '#38bdf8',
    samplePayload: {
      source: 'NASA POWER MERRA-2 + CERES',
      grid_point: { lat: 24.3636, lon: 88.6241, offset_km: 34.8 },
      T2M_MAX: 30.8,
      RH2M: 72.0,
      WS10M: 1.9,
      PRECTOTCORR: 1.4,
      sentinel_value_handling: '-999 mapped to null (no interpolation)',
      gate_rules: ['HTTP 501 Forecast Gate'],
    },
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
    color: '#34d399',
    samplePayload: {
      middleware: ['cors_origin_check', 'jwt_bearer_or_device_key', 'vwc_range_guard'],
      idempotency: 'UUID event_id deduplicated -> 409 Conflict',
      bounds_validation: 'VWC ∈ [0.0, 1.0], Temp ∈ [-10, 65] -> 422 Unprocessable',
      rate_limit: 'Auth endpoints rate-limited; immutable demo guard -> 403',
    },
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
    color: '#818cf8',
    samplePayload: {
      tables: ['farms', 'fields', 'sensor_readings', 'nasa_daily_weather', 'crop_catalog', 'model_runs', 'recommendations'],
      resilience_mode: 'Atomic JSON write (.tmp -> rename) with .bak recovery',
      fastify_pool: 'PostgreSQL Pool when DATABASE_URL is configured',
    },
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
    color: '#38bdf8',
    samplePayload: {
      equation: 'FAO-56 Penman-Monteith (ETo mm/day)',
      wind_transform: 'u2 = WS10M * 0.748',
      taw_mm: 79.0,
      root_depth_m: 0.5,
      soil_evaporation_Es: null,
      parity_residual_py_vs_js: '< 1e-6 mm/day',
    },
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
    color: '#34d399',
    samplePayload: {
      criteria: ['water_conservation', 'soil_nitrogen_legume', 'heat_resilience', 'farmer_profit'],
      barc_baseline: { aman: 78.92, maize: 73.44, wheat: 57.41, aus: 40.98, boro: 40.51 },
      gate_rules: ['HTTP 501 ML Yield Forecasting Gate (R² < 0 excluded)'],
    },
  },
  {
    id: 'frontend_dashboard',
    layer: 'Presentation & UI',
    title: 'AgriSense Fusion Dashboard',
    subtitle: 'React 18 + Vite 5 Single Page Application',
    status: 'live',
    statusLabel: 'Operational & Live',
    protocol: 'HTTP Client (Fetch API / SVG Graphics)',
    inputs: 'Aggregated telemetry from /api/dashboard and /api/v1/* endpoints',
    outputs: 'Interactive priority sliders, SVG time-series charts, explainable recommendation cards',
    description: 'Observatory-grade scientific interface with Barind emerald/cyan accents, synchronized chart-table toggles, provenance badges, and RAG copilot.',
    color: '#fbbf24',
    samplePayload: {
      bundle: 'React 18 + Vite 5 + Three.js + Leaflet + GSAP',
      accessibility: ['Dark/Light Theme', 'Pause Motion Toggle', 'EN / বাংলা Learn Quiz'],
      endpoints_consumed: ['/api/health', '/api/dashboard', '/api/v1/physics/parity-check', '/api/v1/diseases'],
    },
  },
  {
    id: 'groundwater_module',
    layer: 'Supporting Branch',
    title: 'BMDA Groundwater Aquifer Monitor',
    subtitle: 'Barind Deep Tubewell Water-Table Tracker',
    status: 'demo',
    statusLabel: 'Labelled Demonstration Data',
    protocol: 'REST Endpoint (/api/v1/groundwater)',
    inputs: 'Piezometric well depth measurements (m below ground level)',
    outputs: 'Depth gauge, critical drawdown threshold alert (28m limit), annual drawdown trend',
    description: 'Monitors deep tubewell water tables against regional suction limits. Explicitly labelled as demo data: never infers total aquifer capacity from one point.',
    color: '#fbbf24',
    samplePayload: {
      well_id: 'BMDA-GODAGARI-PROXY-01',
      depth_m: 26.4,
      critical_suction_limit_m: 28.0,
      provenance: 'SYNTHETIC PROXY (single piezometric reference only)',
    },
  },
];

export default function ArchitectureView({ embedded = false, onInspect = null }) {
  const [selectedNode, setSelectedNode] = useState(ARCHITECTURE_NODES[0]);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [inspectorTab, setInspectorTab] = useState('overview');
  const [showMermaidSource, setShowMermaidSource] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectNodeById = useCallback((id) => {
    const found = ARCHITECTURE_NODES.find((n) => n.id === id);
    if (found) setSelectedNode(found);
    if (onInspect) onInspect('architecture');
  }, [onInspect]);

  const handleStageHighlight = useCallback((nodeIds) => {
    setHighlightedNodes(Array.isArray(nodeIds) ? nodeIds : []);
  }, []);

  const mermaidText = `graph TB
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
    MCDA["<b>Crop-Rotation MCDA Decision Engine</b><br/>• Dynamic 4-Slider Weights Normalization<br/>• Water • Soil • Heat • Profit<br/>• Barind Agronomic Catalog Evaluation<br/>• Machine Reason Codes & Explanations"]:::scienceLayer
  end

  subgraph Layer6["6. PRESENTATION & FARMER ACTION LAYER (React 18 SPA)"]
    Dashboard["<b>AgriSense Fusion Interactive Dashboard</b><br/>• Real-Time Crop Rotation Explorer<br/>• Modern Geospatial SaaS Theme<br/>• Live SVG Atmospheric Trend Charts<br/>• Architecture Visual Canvas"]:::uiLayer
    AlertSystem["<b>Farmer Action & Aquifer Alert Engine</b><br/>• Root-Zone Stress Trigger (Dr > 50% TAW)<br/>• Deep Tubewell Drawdown Alert<br/>• Recommended Resilient Crop Plan"]:::uiLayer
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Title & Overview Banner (hidden when embedded under Methods & Learn Chapter 05) */}
      {!embedded && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-terracotta">
              <Network size={13} /> Subsystem Governance
            </span>
            <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              System Architecture &amp; Data Pipeline Blueprint
            </span>
          </div>
          <h1 className="font-display" style={{ fontSize: 'var(--text-h2)', fontWeight: 800, margin: 0 }}>
            End-to-End Scientific Architecture &amp; Execution Topology
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Traceable end-to-end data pipelines from spaceborne NASA Earth observation and IoT edge probes to physics water models and explainable crop-rotation decision support.
          </p>
        </div>
      )}

      {/* Animated SVG Data Flow Canvas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `2px solid ${selectedNode.color}` }}>
        <div className="methods-card-band">
          <span className="mono" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Interactive Live Data-Packet Flow (Click any node to inspect contract)
          </span>
          <span className="methods-chip">
            Selected: <strong style={{ color: selectedNode.color }}>{selectedNode.title}</strong>
          </span>
        </div>
        <div style={{ padding: '1rem 1.2rem' }}>
          <AnimatedDataPipeline
            selectedNodeId={selectedNode.id}
            highlightedNodeIds={highlightedNodes}
            onSelectNodeId={selectNodeById}
          />
        </div>
      </div>

      {/* Live Animated Sequencer, Real Latency Waterfall & Dependency Matrix */}
      <PipelineTelemetryStage
        onStageHighlight={handleStageHighlight}
        onSelectNodeId={selectNodeById}
      />

      {/* Legend & Controls */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Component Status:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
            <strong>Implemented &amp; Live</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
            <strong>Labelled Demo Data</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px dashed var(--text-dim)' }} />
            <strong>Hardware Flash Pending</strong>
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
          onClick={() => setShowMermaidSource(!showMermaidSource)}
        >
          {showMermaidSource ? 'Hide Mermaid Source' : 'View Editable Mermaid Diagram'}
        </button>
      </div>

      {/* Expandable Mermaid Source Box */}
      {showMermaidSource && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Editable Mermaid Architecture Specification (<code>documentation/architecture.mmd</code>):
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.74rem' }}
              onClick={copyMermaid}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Mermaid Code'}</span>
            </button>
          </div>
          <pre
            className="mono"
            style={{
              padding: '1rem',
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.76rem',
              color: 'var(--accent-primary)',
              overflowX: 'auto',
              lineHeight: '1.5',
              margin: 0,
            }}
          >
            {mermaidText}
          </pre>
        </div>
      )}

      {/* Main Interactive Diagram Canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        {/* Visual Pipeline Flow Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Layer 1 & 2: Data Sources */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {/* Box 1: Edge Hardware */}
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[0])}
              className="surface tilt-card"
              style={{
                border: `2px dashed ${selectedNode.id === 'esp32' ? ARCHITECTURE_NODES[0].color : 'var(--border-subtle)'}`,
                borderTop: `3px solid ${ARCHITECTURE_NODES[0].color}`,
                padding: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: ARCHITECTURE_NODES[0].color, fontWeight: 700 }}>
                  1. Edge Sensing Layer
                </span>
                <span className="badge badge-demo" style={{ fontSize: '0.64rem' }}>Contract Tested</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
                ESP32 Field Probe Node
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                Capacitive FDR soil moisture, DS18B20 soil temp, SHT31 humidity
              </p>
              <div className="mono" style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: ARCHITECTURE_NODES[0].color, fontWeight: 700 }}>
                HTTPS POST /api/sensor-readings →
              </div>
            </div>

            {/* Box 2: NASA Satellite Weather */}
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[1])}
              className="surface tilt-card"
              style={{
                border: `2px solid ${selectedNode.id === 'nasa_power' ? ARCHITECTURE_NODES[1].color : 'var(--border-subtle)'}`,
                borderTop: `3px solid ${ARCHITECTURE_NODES[1].color}`,
                padding: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: ARCHITECTURE_NODES[1].color, fontWeight: 700 }}>
                  2. Earth Observation Layer
                </span>
                <span className="badge badge-live" style={{ fontSize: '0.64rem' }}>Live Active</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
                NASA POWER Daily Point API
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                T2M, RH2M, Solar Irradiance, WS10M, PRECTOTCORR
              </p>
              <div className="mono" style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: ARCHITECTURE_NODES[1].color, fontWeight: 700 }}>
                Hourly Cache &amp; Normalization →
              </div>
            </div>
          </div>

          {/* Layer 3: Backend Ingress & Validation */}
          <div
            onClick={() => setSelectedNode(ARCHITECTURE_NODES[2])}
            className="surface tilt-card"
            style={{
              border: `2px solid ${selectedNode.id === 'backend_ingress' ? ARCHITECTURE_NODES[2].color : 'var(--border-subtle)'}`,
              borderLeft: `4px solid ${ARCHITECTURE_NODES[2].color}`,
              padding: '1rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: ARCHITECTURE_NODES[2].color, fontWeight: 700 }}>
                3. Ingress &amp; Backend Services (Express 5)
              </span>
              <span className="badge badge-live" style={{ fontSize: '0.64rem' }}>Operational</span>
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
              HTTPS Ingestion &amp; Idempotency Gateway
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Rejects duplicate event IDs (HTTP 409), enforces physical moisture limits [0.0-1.0], checks temperature bounds, preserves is_simulated audit flags.
            </p>
          </div>

          {/* Layer 4: Persistence Store & PostgreSQL */}
          <div
            onClick={() => setSelectedNode(ARCHITECTURE_NODES[3])}
            className="surface tilt-card"
            style={{
              border: `2px solid ${selectedNode.id === 'database' ? ARCHITECTURE_NODES[3].color : 'var(--border-subtle)'}`,
              borderLeft: `4px solid ${ARCHITECTURE_NODES[3].color}`,
              padding: '1rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: ARCHITECTURE_NODES[3].color, fontWeight: 700 }}>
                4. Persistence &amp; Storage Layer
              </span>
              <span className="badge badge-live" style={{ fontSize: '0.64rem' }}>Operational</span>
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
              PostgreSQL Relational Target / Persistent Local Store
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Separates measured telemetry, NASA weather records, crop cycle rules, and physics runs. Atomic file store runs in MVP; production schema provided in database/schema.sql.
            </p>
          </div>

          {/* Layer 5: Science Engines */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[4])}
              className="surface tilt-card"
              style={{
                border: `2px solid ${selectedNode.id === 'physics_engine' ? ARCHITECTURE_NODES[4].color : 'var(--border-subtle)'}`,
                borderTop: `3px solid ${ARCHITECTURE_NODES[4].color}`,
                padding: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: ARCHITECTURE_NODES[4].color, fontWeight: 700 }}>
                  5A. Physics Engine
                </span>
                <span className="badge badge-live" style={{ fontSize: '0.64rem' }}>FAO-56 PM</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
                Penman-Monteith ET₀ &amp; Root-Zone Balance
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                Atmospheric demand, logarithmic wind adjustment, TAW, root depletion Dr. Direct soil evaporation Es held null until calibrated.
              </p>
            </div>

            <div
              onClick={() => setSelectedNode(ARCHITECTURE_NODES[5])}
              className="surface tilt-card"
              style={{
                border: `2px solid ${selectedNode.id === 'mcda_engine' ? ARCHITECTURE_NODES[5].color : 'var(--border-subtle)'}`,
                borderTop: `3px solid ${ARCHITECTURE_NODES[5].color}`,
                padding: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: ARCHITECTURE_NODES[5].color, fontWeight: 700 }}>
                  5B. Decision Engine
                </span>
                <span className="badge badge-live" style={{ fontSize: '0.64rem' }}>MCDA</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
                Crop-Rotation Explorer Engine
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                Multi-criteria scoring: Water conservation, Legume soil health, Heat resilience, Farmer profit. Dynamic re-ranking with explainable reason codes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Node Specification Inspector */}
        <div style={{ position: 'sticky', top: '5.5rem', alignSelf: 'start' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `2px solid ${selectedNode.color}` }}>
            <div className="methods-card-band">
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Component Inspector</strong>
              <span className={`badge ${selectedNode.status === 'live' ? 'badge-live' : 'badge-demo'}`}>
                {selectedNode.statusLabel}
              </span>
            </div>
            <div style={{ padding: '1.15rem 1.25rem' }}>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              {selectedNode.title}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Layer: <strong>{selectedNode.layer}</strong>
            </div>

            <p style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {selectedNode.description}
            </p>

            {/* Overview vs Live Sample Contract JSON Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {[
                { id: 'overview', label: 'Interface Overview' },
                { id: 'contract', label: 'Contract JSON' },
              ].map((tab) => {
                const active = inspectorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className="mono"
                    style={{
                      padding: '0.28rem 0.68rem',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: active ? selectedNode.color : 'var(--bg-alt)',
                      color: active ? '#04130e' : 'var(--text-secondary)',
                      border: `1px solid ${active ? selectedNode.color : 'var(--border-subtle)'}`,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {inspectorTab === 'overview' ? (
              <>
                <div className="surface" style={{ padding: '0.65rem 0.85rem', marginBottom: '0.65rem' }}>
                  <div className="mono" style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                    Protocol / Interface
                  </div>
                  <code className="mono" style={{ color: selectedNode.color, fontSize: '0.76rem' }}>
                    {selectedNode.protocol}
                  </code>
                </div>

                <div className="surface" style={{ padding: '0.65rem 0.85rem', marginBottom: '0.65rem' }}>
                  <div className="mono" style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                    Key Inputs
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{selectedNode.inputs}</div>
                </div>

                <div className="surface" style={{ padding: '0.65rem 0.85rem' }}>
                  <div className="mono" style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                    Outputs / Payloads
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{selectedNode.outputs}</div>
                </div>
              </>
            ) : (
              <pre
                className="mono surface"
                style={{
                  padding: '0.85rem',
                  fontSize: '0.68rem',
                  lineHeight: 1.5,
                  color: selectedNode.color,
                  overflowX: 'auto',
                  margin: 0,
                  borderRadius: '10px',
                }}
              >
                {JSON.stringify(selectedNode.samplePayload, null, 2)}
              </pre>
            )}

            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.74rem',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Info size={13} />
              <span>Click any node on the diagram to inspect its interface contract and scientific assumptions.</span>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
