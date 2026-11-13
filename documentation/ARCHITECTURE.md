# AgriSense Fusion — System Architecture & Data Flow Specification
### *NASA Space Apps Challenge 2026: Field Shift (Adapting Farms with NASA Data)*
**Document Version:** 2.0 (Production Blueprint Aligned & Color-Coded Architecture Edition)  
**Target Region:** Northern Bangladesh (*Barind Tract: Rajshahi, Rangpur, Bogura, Chapai Nawabganj*)

---

## 1. System Overview & Architectural Tenets

AgriSense Fusion is structured around a strict separation of concerns across **six decoupled, fault-tolerant layers**. The core architectural mandate states that **in-situ sensor observations, upstream satellite weather data, physics model outputs, and agronomic rotation decisions must be stored, validated, and processed independently**. 

This foundational principle ensures:
1. **Cascade Isolation:** Failure or latency in upstream satellite APIs cannot degrade edge sensor ingress or offline local decision models.
2. **Reproducible Scientific Audits:** Upstream raw observations are immutably archived before entering physical transformations, allowing researchers to rerun and audit calculations.
3. **Idempotency & Data Hygiene:** Edge telemetry streams enforce UUID deduplication and physics-based boundary checks before database commit.
4. **Explainable AI/MCDA:** Farmer recommendations always expose sub-score weights, machine reason codes, and provisional agronomic cautions.

```mermaid
graph TB
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

  Dashboard --> AlertSystem
```

---

## 2. Layer Responsibilities & Technical Contracts

### Layer 1: Edge Sensing & Field Hardware
* **Microcontroller:** ESP32-WROOM-32 (Xtensa 32-bit dual-core, 240MHz, 520KB SRAM).
* **Sensors:**
  * Capacitive FDR (Frequency-Domain Reflectometry) Soil Moisture Probe v1.2 (analog output to ADC1_CH6, GPIO 34).
  * Waterproof DS18B20 digital temperature probe (Dallas 1-Wire protocol on GPIO 4 with 4.7kΩ pull-up).
  * Sensirion SHT31 precision ambient temperature and humidity sensor (I2C on GPIO 21 SDA / GPIO 22 SCL).
* **Power Management:** 18650 3.2V LiFePO4 battery (2,500mAh) paired with a 5V 2W monocrystalline solar panel and TP4056 lithium charge controller. 55-minute deep sleep / 5-minute active burst cycle ($I_{\text{sleep}} \approx 15\,\mu\text{A}$).
* **Groundwater Branch:** Tracks BMDA deep tubewell water tables against the 28.0m centrifugal suction limit.

### Layer 2: Satellite Earth Observation (NASA POWER)
* **Source Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point` (Agroclimatology Community).
* **Geographical Bounding Box:** Centered on Northern Bangladesh (Rajshahi / Barind: Lat `24.469°N`, Long `88.330°E`).
* **Ingested Parameters:**
  * `T2M` / `T2M_MAX` / `T2M_MIN`: Air temperature at 2m (°C).
  * `RH2M`: Relative humidity at 2m (%).
  * `ALLSKY_SFC_SW_DWN`: All-sky shortwave solar irradiance ($\text{MJ/m}^2/\text{day}$).
  * `WS10M`: Wind speed at 10m height ($\text{m/s}$).
  * `PRECTOTCORR`: Corrected daily precipitation ($\text{mm/day}$).
* **Normalization Engine:** Automatically maps NASA missing flag `-999` to `null` to prevent numeric calculation corruption.

### Layer 3: Ingress & Backend Gateway (Node.js / Express 5)
* **API Ingress Gateway (`server/services/sensorService.js`):**
  * Strict schema validation: Enforces required `device_id`, `event_id`, and `observed_at`.
  * Physics bounds checking: Volumetric Water Content (VWC) $\in [0.0, 1.0]$, temperature $\in [-10^\circ\text{C}, 65^\circ\text{C}]$, pH $\in [0, 14]$. Out-of-bounds requests are rejected with `HTTP 422 Unprocessable Entity`.
  * Idempotency protection: Rejects duplicate UUIDs with `HTTP 409 Conflict`.
  * Audit enforcement: Enforces `is_simulated: true` on all synthetic testing payloads.
* **NASA Worker Service (`server/services/nasaService.js`):**
  * Implements 1-hour rolling cache with file persistence to adhere to public API rate limits.
  * Fallback mechanism: Reverts to cached observations with `source_status: 'partial'` if the remote API experiences timeout (>10s).

### Layer 4: Storage & Persistence Layer
* **Production PostgreSQL Target (`database/schema.sql`):** Relational schema with UUID primary keys, check constraints, cascade deletes, and B-Tree indexes for `farms`, `fields`, `sensor_devices`, `sensor_readings`, `nasa_daily_weather`, `crop_catalog`, `crop_coefficients`, `model_runs`, and `recommendations`.
* **Development Atomic Store (`server/storage/storageService.js`):** File-backed atomic JSON store (`server/data/store.json`) utilizing temp-file swap patterns to eliminate write-race corruptions.

### Layer 5: Scientific Computation & Decision Engines
* **Physics Water Engine (`server/physics/penmanMonteith.js` & `waterBalance.js`):**
  * Computes reference evapotranspiration ($ET_0$) via standardized FAO-56 Penman-Monteith.
  * Adjusts 10m wind to 2m via logarithmic profile: $u_2 = 0.748 \times u_{10}$.
  * Calculates crop water requirement ($ET_c = K_c \times ET_0$) and root-zone depletion ($D_r$).
  * Triggers irrigation warnings when $D_r > 0.50 \times TAW$.
  * Strictly discloses that direct soil evaporation ($E_s$) is held as `null` pending physical lysimeter calibration.
* **Crop-Rotation MCDA Engine (`server/decision/cropRotationEngine.js`):**
  * Multi-Criteria Decision Analysis evaluating candidate sequences across Northern Bangladesh.
  * Dynamically balances 4 normalized weights: Water Conservation, Soil Health, Heat Resilience, Farmer Profit.
  * Yields machine reason codes (e.g. `LEGUME_BIOLOGICAL_N_FIXATION`, `LOW_WATER_AQUIFER_FRIENDLY`) and provisional agronomic cautions.

### Layer 6: Presentation & Farmer Action (React 18 / Vite 5)
* Scientific dark navy and emerald visual theme (`#0a0f1d`, `#10b981`).
* Dynamic client-side sliders with real-time recalculation and SVG trend charts.
* Interactive architecture visual canvas (`/architecture`).
* Clear provenance badges (`NASA POWER Live` vs `ESP32 Demo Sim`).

---

## 3. End-to-End Data Pipeline Flow

```mermaid
sequenceDiagram
  autonumber
  actor Farmer as 👨‍🌾 Farmer / Agronomist
  participant WebUI as 🖥️ React SPA (Vite)
  participant API as 🚀 Express 5 Backend
  participant NASA as 🛰️ NASA POWER API
  participant Store as 🗄️ PostgreSQL / Store
  participant Physics as 🔬 FAO-56 Water Engine
  participant MCDA as 🧠 Crop Rotation MCDA

  Note over NASA,API: Satellite Synchronization Cycle
  API->>NASA: Query Agroclimatology (24.469°N, 88.330°E)
  NASA-->>API: Solar Irradiance, T2M, RH2M, WS10M, Precip
  API->>API: Filter -999 missing values & convert units
  API->>Store: Upsert cached daily weather series

  Note over WebUI,API: Farmer Priority Adjustment
  Farmer->>WebUI: Adjusts Sliders: [Water: 80%, Soil: 70%, Heat: 60%, Profit: 50%]
  WebUI->>API: GET /api/rotation/compare?water=0.8&soil=0.7&heat=0.6&profit=0.5
  API->>Store: Retrieve latest soil VWC & weather snapshot
  Store-->>API: Soil moisture θ=0.18, T2M=32.4°C, Solar=21.2 MJ/m²

  Note over API,Physics: Physics Evapotranspiration Step
  API->>Physics: Compute ET₀ & Soil Water Deficit
  Physics->>Physics: Transform wind: u₂ = 0.748 × u₁₀
  Physics->>Physics: Solve Penman-Monteith equation (ET₀ = 4.82 mm/day)
  Physics->>Physics: Calculate Root-Zone Depletion (Dr) vs TAW
  Physics-->>API: Returns ET₀, ETc, Water Deficit & Irrigation Stress Status

  Note over API,MCDA: Multi-Criteria Agronomic Ranking
  API->>MCDA: Evaluate Candidate Rotations with Farmer Weights
  MCDA->>MCDA: Normalize slider weights to sum = 1.0
  MCDA->>MCDA: Score Water, Soil, Heat, Profit per rotation sequence
  MCDA->>MCDA: Generate agronomic reason codes & cautions
  MCDA-->>API: Ranked Rotations: #1 Lentil-Sesame-Aman (Score: 88.4/100)

  API-->>WebUI: JSON { success: true, rankedRotations, physicsSummary }
  WebUI-->>Farmer: Visual Card Reranking + SVG Water Balance Trend + Irrigation Alert
```

---

## 4. Scientific Physics & Mathematical Engine (FAO-56)

```mermaid
graph LR
  classDef inputNode fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
  classDef stepNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef mathNode fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef outNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;

  subgraph Inputs["1. Upstream Observations"]
    SW["NASA Solar Radiation<br/><code>ALLSKY_SFC_SW_DWN</code><br/><i>(MJ/m²/day)</i>"]:::inputNode
    TEMP["NASA Air Temperature<br/><code>T2M, T2M_MAX, T2M_MIN</code><br/><i>(°C)</i>"]:::inputNode
    HUMID["NASA Relative Humidity<br/><code>RH2M</code><br/><i>(%)</i>"]:::inputNode
    WIND["NASA 10m Wind Velocity<br/><code>WS10M</code><br/><i>(m/s)</i>"]:::inputNode
    SOIL["In-Situ Soil Moisture<br/><code>VWC θ (m³/m³)</code><br/><i>(ESP32 FDR Probe)</i>"]:::inputNode
  end

  subgraph Transformations["2. Atmospheric Transformations"]
    U2["Logarithmic Wind Conversion<br/><b>u₂ = 0.748 × u₁₀</b>"]:::stepNode
    RN["Net Radiation Estimator<br/><b>Rn ≈ 0.75 × (1 - 0.23) × Rs</b><br/><i>G ≈ 0 (Daily step)</i>"]:::stepNode
    VAPOR["Vapor Pressure Deficit<br/><b>es(T) = 0.6108 exp(17.27T / [T+237.3])</b><br/><b>ea = es × (RH / 100)</b><br/><b>VPD = es - ea</b>"]:::stepNode
    DELTA["Vapor Pressure Slope & Psychrometric<br/><b>Δ = 4098 es / (T+237.3)²</b><br/><b>γ ≈ 0.0673 kPa/°C</b>"]:::stepNode
  end

  subgraph Engine["3. FAO-56 Penman-Monteith Solver"]
    ET0["<b>Standard Reference ET₀</b><br/><code>ET₀ = [0.408Δ(Rn - G) + γ(900/[T+273])u₂(es - ea)] / [Δ + γ(1 + 0.34u₂)]</code>"]:::mathNode
  end

  subgraph WaterBalance["4. Soil Moisture & Root Depletion"]
    ETC["Crop ET Requirement<br/><b>ETc = Kc × ET₀</b>"]:::outNode
    TAW["Total Available Water<br/><b>TAW = 1000 × (θ_FC - θ_WP) × Zr</b>"]:::outNode
    DR["Root-Zone Depletion<br/><b>Dr = 1000 × (θ_FC - θ) × Zr</b>"]:::outNode
    STRESS["Irrigation Stress Trigger<br/><b>Dr > 0.50 × TAW</b>"]:::outNode
  end

  SW --> RN
  TEMP --> VAPOR
  HUMID --> VAPOR
  TEMP --> DELTA
  WIND --> U2
  RN & VAPOR & DELTA & U2 --> ET0
  ET0 --> ETC
  SOIL --> DR
  TAW & DR --> STRESS
```

### Detailed Physical Formulations
1. **Logarithmic Wind Profile Transformation:**
   $$u_2 = u_{10} \times \frac{4.87}{\ln(67.8 \times 10 - 5.42)} \approx 0.748 \times u_{10}$$
2. **Net Solar Radiation Calculation ($R_n$):**
   $$R_{ns} = (1 - \alpha) \times R_s \quad (\alpha = 0.23\text{ for green reference crop})$$
   $$R_n \approx 0.75 \times R_{ns} \quad (G \approx 0\text{ for 24-hour daily balance})$$
3. **Reference Evapotranspiration ($ET_0$):**
   $$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$
4. **Soil Water Balance & Root-Zone Depletion:**
   $$TAW = 1000 \times (\theta_{FC} - \theta_{WP}) \times Z_r \quad (\text{mm})$$
   $$D_r = 1000 \times (\theta_{FC} - \theta) \times Z_r \quad (\text{mm})$$
   $$\text{Irrigation Alert Triggered if } D_r > 0.50 \times TAW$$

---

## 5. Crop-Rotation Multi-Criteria Decision Engine (MCDA)

```mermaid
graph TD
  classDef sliderNode fill:#0f172a,stroke:#fbbf24,stroke-width:2px,color:#f8fafc;
  classDef evalNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef sequenceNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef cautionNode fill:#451a03,stroke:#ef4444,stroke-width:2px,color:#f8fafc;

  subgraph Weights["1. User-Adjustable Priority Weights"]
    W1["💧 Water Conservation Weight (w_water)<br/><i>Mitigates deep-aquifer depletion</i>"]:::sliderNode
    W2["🌱 Soil Health & Legumes (w_soil)<br/><i>Biological N-fixation & SOM</i>"]:::sliderNode
    W3["☀️ Heat & Drought Resilience (w_heat)<br/><i>Tolerance to dry Barind pre-monsoon</i>"]:::sliderNode
    W4["💰 Farmer Economic Profit (w_profit)<br/><i>High-value commercial cash yield</i>"]:::sliderNode
  end

  subgraph Normalizer["2. MCDA Scoring Algorithm"]
    NORM["<b>Deterministic MCDA Formula</b><br/>Score = (w_w·S_w + w_s·S_s + w_h·S_h + w_p·S_p) / ∑w<br/><i>Scores normalized on scale 0 to 100</i>"]:::evalNode
  end

  subgraph Rotations["3. Evaluated Barind Rotation Patterns"]
    R1["<b>Seq A: Lentil → Sesame → T. Aman</b><br/>• Water Score: 95/100 | Soil: 90/100<br/>• Reason: <code>LEGUME_N_FIXATION</code>, <code>LOW_WATER_AQUIFER_FRIENDLY</code>"]:::sequenceNode
    R2["<b>Seq B: Mustard → Boro Rice → T. Aman</b><br/>• Water Score: 60/100 | Profit: 85/100<br/>• Reason: <code>COMMERCIAL_CASH_CROP</code>, <code>STANDARD_ROTATION</code>"]:::sequenceNode
    R3["<b>Seq C: Potato → Mungbean → T. Aman</b><br/>• Water Score: 78/100 | Profit: 92/100<br/>• Reason: <code>HIGH_VALUE_CASH_CROP</code>, <code>SOIL_ORGANIC_MATTER</code>"]:::sequenceNode
    R4["<b>Seq D: Maize → Mungbean → T. Aman</b><br/>• Water Score: 72/100 | Heat: 88/100<br/>• Reason: <code>BALANCED_GRAIN_LEGUME</code>, <code>DROUGHT_TOLERANT</code>"]:::sequenceNode
    R5["<b>Seq E: Boro Rice Monoculture (Baseline)</b><br/>• Water Score: 20/100 | Aquifer Impact: Severe<br/>• Status: Depletes 1,200mm groundwater/season"]:::cautionNode
  end

  W1 & W2 & W3 & W4 --> NORM
  NORM --> R1 & R2 & R3 & R4 & R5
```

---

## 6. Edge Hardware & IoT Sensor Circuit Architecture

```mermaid
graph TB
  classDef mcuNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef sensorNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef powerNode fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;
  classDef commNode fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;

  subgraph PowerSubsystem["1. Renewable Power & Energy Harvesting"]
    Solar["<b>5V 2W Solar Panel</b><br/>Monocrystalline Photovoltaic"]:::powerNode
    TP4056["<b>TP4056 Solar Charger</b><br/>Lithium Charge Controller + Protection"]:::powerNode
    Battery["<b>18650 LiFePO4 Cell</b><br/>3.2V 2500mAh (~2,000 cycles)"]:::powerNode
    LDO["<b>ME6211 Ultra-Low LDO</b><br/>3.3V Output, 15µA Quiescent Current"]:::powerNode
  end

  subgraph MCU["2. Microcontroller Unit (Core Processing)"]
    ESP32Core["<b>ESP32-WROOM-32 MCU</b><br/>• Xtensa Dual-Core 32-bit @ 240MHz<br/>• 520 KB SRAM / 4 MB SPI Flash<br/>• Hardware Cryptographic Accelerator (AES/SHA)<br/>• RTC Sleep Timer (55-min sleep / 5-min duty)"]:::mcuNode
  end

  subgraph SensorBus["3. In-Situ Precision Probes"]
    FDR["<b>Capacitive FDR V1.2 Probe</b><br/>• Analog Soil Moisture (VWC)<br/>• Corrosion-resistant dielectric sensing<br/>• <i>Connected to GPIO 34 (ADC1_CH6)</i>"]:::sensorNode
    DS18B20["<b>DS18B20 Temp Probe</b><br/>• Waterproof Stainless Steel Probe<br/>• -55°C to +125°C range (±0.5°C)<br/>• <i>GPIO 4 via 1-Wire Bus (4.7kΩ pull-up)</i>"]:::sensorNode
    SHT31["<b>SHT31 Ambient Sensor</b><br/>• Air Temp & Relative Humidity<br/>• ±2% RH, ±0.2°C accuracy<br/>• <i>GPIO 21 (SDA) & GPIO 22 (SCL) via I2C</i>"]:::sensorNode
  end

  subgraph TelemetryComm["4. Field Gateway Transmission"]
    WiFi["<b>802.11 b/g/n or NB-IoT</b><br/>TLS 1.3 HTTPS POST<br/>JSON payload with unique UUID event_id"]:::commNode
    Endpoint["<b>AgriSense Express Ingress</b><br/><code>POST /api/sensor-readings</code>"]:::commNode
  end

  Solar --> TP4056 --> Battery --> LDO --> ESP32Core
  ESP32Core -->|ADC Read| FDR
  ESP32Core -->|1-Wire Protocol| DS18B20
  ESP32Core -->|I2C Protocol| SHT31
  ESP32Core -->|Burst Radio Packet| WiFi --> Endpoint
```

---

## 7. PostgreSQL Relational Entity-Relationship Model (ERD)

```mermaid
erDiagram
  FARMS ||--o{ FIELDS : contains
  FARMS ||--o{ NASA_DAILY_WEATHER : caches
  FIELDS ||--o{ SENSOR_DEVICES : deploys
  FIELDS ||--o{ MODEL_RUNS : executes
  SENSOR_DEVICES ||--o{ SENSOR_READINGS : ingests
  CROP_CATALOG ||--o{ CROP_COEFFICIENTS : specifies
  MODEL_RUNS ||--o{ RECOMMENDATIONS : produces
  CROP_CATALOG ||--o{ RECOMMENDATIONS : references

  FARMS {
    uuid id PK
    text name
    text district
    text division
    double_precision latitude
    double_precision longitude
    double_precision elevation_m
    text timezone
    timestamptz created_at
  }

  FIELDS {
    uuid id PK
    uuid farm_id FK
    text name
    numeric area_m2
    text soil_type
    numeric theta_fc
    numeric theta_wp
    numeric root_depth_m
    timestamptz created_at
  }

  SENSOR_DEVICES {
    uuid id PK
    uuid field_id FK
    text device_key_hash
    text name
    text firmware_version
    boolean is_active
    timestamptz last_seen_at
    timestamptz created_at
  }

  SENSOR_READINGS {
    bigint id PK
    uuid device_id FK
    uuid event_id "UNIQUE per device"
    timestamptz observed_at
    timestamptz received_at
    numeric soil_moisture_vwc "CHECK [0, 1]"
    numeric air_temp_c
    numeric relative_humidity_pct "CHECK [0, 100]"
    numeric soil_ph "CHECK [0, 14]"
    numeric soil_temp_c
    text quality_status
    boolean is_simulated
    jsonb raw_payload
  }

  NASA_DAILY_WEATHER {
    bigint id PK
    uuid farm_id FK
    text source
    date source_date
    text time_standard
    numeric t2m_c
    numeric t2m_max_c
    numeric t2m_min_c
    numeric rh2m_pct
    numeric solar_mj_m2_day
    numeric precipitation_mm
    numeric wind_speed_m_s
    jsonb source_units
    timestamptz fetched_at
  }

  CROP_CATALOG {
    uuid id PK
    text crop_code UK
    text crop_name
    text scientific_name
    text season
    integer typical_duration_days
    numeric water_demand_category
    boolean is_legume
    boolean drought_tolerant
  }

  CROP_COEFFICIENTS {
    uuid id PK
    uuid crop_id FK
    text stage_name
    numeric kc_value
    integer stage_duration_days
  }

  MODEL_RUNS {
    uuid id PK
    uuid field_id FK
    timestamptz run_at
    text model_name
    jsonb input_parameters
    jsonb outputs_summary
    text status
  }

  RECOMMENDATIONS {
    uuid id PK
    uuid model_run_id FK
    uuid crop_id FK
    integer rank_order
    numeric composite_score
    text reason_code
    text agronomic_caution
    jsonb sub_scores
  }
```

---

## 8. Ingress Security, Validation & Idempotency Pipeline

```mermaid
flowchart TD
  classDef startNode fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
  classDef checkNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef rejectNode fill:#451a03,stroke:#ef4444,stroke-width:2px,color:#f8fafc;
  classDef acceptNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;

  Packet["Incoming HTTPS Request<br/><code>POST /api/sensor-readings</code>"]:::startNode
  TLS["TLS 1.3 Decryption & JSON Deserialization"]:::checkNode

  SchemaCheck{"Valid Schema?<br/>(device_id, event_id, observed_at)"}:::checkNode
  Err400["HTTP 400 Bad Request<br/><i>Missing mandatory attributes</i>"]:::rejectNode

  RangeCheck{"Physical Numeric Bounds?<br/>• VWC ∈ [0.0, 1.0]<br/>• Soil Temp ∈ [-10°C, 65°C]<br/>• pH ∈ [0, 14]"}:::checkNode
  Err422["HTTP 422 Unprocessable Entity<br/><i>Physics boundary violation</i>"]:::rejectNode

  DupeCheck{"Deduplication Hash Check<br/>(device_id + event_id in store?)"}:::checkNode
  Err409["HTTP 409 Conflict<br/><i>Duplicate event_id rejected (Idempotent)</i>"]:::rejectNode

  AuditTag["Synthetic Audit Enforcement<br/><code>is_simulated: true | false</code>"]:::checkNode
  CommitStore["Atomic Persistent Store Commit<br/><code>sensor_readings</code> table / JSON store"]:::acceptNode
  Success201["HTTP 201 Created<br/><i>Acknowledged & Broadcast to Engines</i>"]:::acceptNode

  Packet --> TLS --> SchemaCheck
  SchemaCheck -- "No" --> Err400
  SchemaCheck -- "Yes" --> RangeCheck
  RangeCheck -- "Out of Bounds" --> Err422
  RangeCheck -- "Valid" --> DupeCheck
  DupeCheck -- "Duplicate Exists" --> Err409
  DupeCheck -- "Unique Event" --> AuditTag --> CommitStore --> Success201
```

---

## 9. Failure Modes & Graceful Degradation Matrix

| Component | Failure Scenario | Impact | System Fallback & Recovery Behavior |
|:---|:---|:---:|:---|
| **NASA POWER API** | Remote HTTP 500 / Network Timeout (>10s) | Weather updates pause | In-memory + file cache serves latest valid observation; flags `source_status: 'partial'`. |
| **NASA POWER -999** | Missing satellite parameter | Corrupted calculation | Parser strictly assigns `null` (never zero); equations use thermodynamic approximations for Barind. |
| **ESP32 Edge Sensor** | Battery depletion or radio drop | Stale field moisture | Storage retains latest valid timestamp; UI displays age badge; physics engine uses simulated conservative depletion. |
| **Ingress Spoofing** | Synthetic payload without simulation flag | Tainted database | Ingress forces `is_simulated: true` on unauthenticated dev endpoints. |
| **Database Failure** | PostgreSQL connection refusal | Commit failure | Node.js backend seamlessly runs atomic file-backed JSON store (`server/data/store.json`). |

---

## 10. Verification & Test Execution

```bash
# 1. Execute automated unit test suite (13 tests)
npm test

# 2. Execute end-to-end API integration verification
node test_endpoints.js
```
The test suite ensures 100% adherence to Penman-Monteith thermodynamics, boundary validation, and MCDA scoring rules.
