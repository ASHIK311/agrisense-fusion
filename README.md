# AgriSense Fusion 🛰️🌾
### *NASA Space Apps Challenge 2026 — Challenge: Field Shift (Adapting Farms with NASA Data)*
**Target Region:** Northern Bangladesh (*Barind Tract: Rajshahi, Rangpur, Bogura, Chapai Nawabganj*)

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Field%20Shift-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v26-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express-v5.3-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL Schema](https://img.shields.io/badge/PostgreSQL-16%20Ready-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![FAO-56 Water Model](https://img.shields.io/badge/Science-FAO--56%20Penman--Monteith-10B981?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://www.fao.org/land-water/databases-and-software/cropwat/en/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

---

## 📖 Table of Contents
1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [High-Level System Architecture (Color-Coded Topology)](#-high-level-system-architecture)
3. [End-to-End Data Pipeline Flow](#-end-to-end-data-pipeline-flow)
4. [Scientific Physics & Mathematical Engine (FAO-56 Penman-Monteith)](#-scientific-physics--mathematical-engine)
5. [Crop-Rotation Multi-Criteria Decision Engine (MCDA)](#-crop-rotation-multi-criteria-decision-engine-mcda)
6. [Edge Hardware & IoT Sensor Circuit Architecture](#-edge-hardware--iot-sensor-circuit-architecture)
7. [Database Relational Architecture (ER Diagram)](#-database-relational-architecture)
8. [Security, Ingress & Idempotency Pipeline](#-security-ingress--idempotency-pipeline)
9. [Key Features & Capabilities](#-key-features--capabilities)
10. [Repository Structure](#-repository-structure)
11. [Quick Start & Local Deployment](#-quick-start--local-deployment)
12. [Verification & Automated Test Suite](#-verification--automated-test-suite)
13. [Scientific Transparency & Ethical Principles](#-scientific-transparency--ethical-principles)

---

## 🌍 Executive Summary & Problem Statement

In the drought-prone **Barind Tract of Northern Bangladesh**, agricultural survival faces a compounding crisis:
* Over **80% of boro dry-season rice** relies exclusively on deep-aquifer groundwater extraction.
* Regional tubewell water tables are dropping by up to **0.65 meters every year**, approaching the critical **28-meter suction lift limit** of conventional surface-mounted centrifugal irrigation pumps.
* Smallholder farmers lack hyper-local atmospheric evaporative demand metrics, causing either catastrophic crop water stress or severe over-irrigation.

**AgriSense Fusion** solves this systemic challenge by fusing **spaceborne NASA Earth Observations (NASA POWER)** with **in-situ ESP32 edge telemetry** and the rigorous, physics-grounded **FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$) equation**. 

Its centerpiece is the **Crop-Rotation Explorer** — an explainable, deterministic Multi-Criteria Decision Analysis (MCDA) engine that allows farmers, agronomists, and policymakers to model climate-smart crop rotations (Mustard, Lentils, Mungbeans, Maize, Sesame, Potatoes) that reduce aquifer depletion while maximizing farmer livelihood and soil health.

---

## 🏛️ High-Level System Architecture

The AgriSense Fusion platform is engineered across **6 decoupled, resilient layers**. Satellite feeds, physical sensor streams, scientific modeling engines, and client interfaces communicate through strict typed schemas with comprehensive failover isolation:

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

  subgraph Layer1["1. EDGE HARDWARE & FIELD SENSING LAYER"]
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

  %% Data Pipelines
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

### 🎨 Layer Color Mapping & Roles
| Color | Layer Name | Technology | Core Mission |
|:---:|:---|:---|:---|
| 🟣 **Indigo** (`#818cf8`) | **1. Edge Hardware** | ESP32, Capacitive FDR, DS18B20, SHT31 | High-precision in-situ soil & micro-climate sensing |
| 🔵 **Sky Blue** (`#38bdf8`) | **2. Earth Observation** | NASA POWER Daily Point API | Spaceborne solar irradiance, temperature, humidity, wind |
| 🟢 **Emerald** (`#34d399`) | **3. Ingress & Backend** | Node.js, Express 5, TLS 1.3 | Strict range validation, idempotency, missing-value filters |
| 🟪 **Purple** (`#c084fc`) | **4. Persistence** | PostgreSQL 16 DDL & Atomic JSON Store | Relational time-series and agronomic rule persistence |
| 🌸 **Rose** (`#f472b6`) | **5. Science & Decision** | FAO-56 Penman-Monteith, MCDA Engine | Deterministic water balance & 4-factor rotation ranking |
| 🟡 **Amber** (`#fbbf24`) | **6. Presentation** | React 18, Vite 5, SVG Charts | Dynamic sliders, explainable cards, farmer alerts |

---

## 🔄 End-to-End Data Pipeline Flow

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

## 🔬 Scientific Physics & Mathematical Engine

The core evaporative engine implements the international standard **FAO-56 Penman-Monteith equation** (Allen et al., 1998) to calculate daily Reference Evapotranspiration ($ET_0$) without empirical shortcuts:

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

### 📐 Mathematical Formulation Breakdown
1. **10m to 2m Logarithmic Wind Conversion:**
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

## 🌾 Crop-Rotation Multi-Criteria Decision Engine (MCDA)

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

### 📊 Barind Crop Sequence Matrix
| Sequence | Crop Pattern | Water Demand | N-Fixation | Profit Potential | Best Used When |
|:---|:---|:---:|:---:|:---:|:---|
| **Lentil → Sesame → T. Aman** | Legume + Oilseed + Rainfed Rice | 🟢 Very Low (<400 mm) | 🟢 +35 kg N/ha | 🟡 Medium | Extreme water crisis; severe tubewell drawdown |
| **Mustard → Boro Rice → T. Aman** | Oilseed + Irrigated Rice + Rainfed Rice | 🟡 Moderate (~900 mm) | ⚪ Neutral | 🟢 High | Farmer transitioning off pure Boro monoculture |
| **Potato → Mungbean → T. Aman** | Tuber + Legume + Rainfed Rice | 🟢 Low-Mod (~550 mm) | 🟢 +25 kg N/ha | 🟢 Very High | Well-drained sandy loam; high capital available |
| **Maize → Mungbean → T. Aman** | Grain + Legume + Rainfed Rice | 🟡 Moderate (~600 mm) | 🟢 +20 kg N/ha | 🟢 High | High summer heat tolerance required |
| **Boro Rice Monoculture (Baseline)** | Flooded Rice Monoculture | 🔴 Extreme (>1,200 mm) | 🔴 Depleting | 🟡 Moderate | **Unsustainable**: Triggers critical aquifer alarm |

---

## ⚡ Edge Hardware & IoT Sensor Circuit Architecture

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

### 📡 Telemetry Packet Specification (HTTPS JSON)
```json
{
  "device_id": "esp32-barind-alpha-01",
  "event_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "observed_at": "2026-10-10T12:00:00.000Z",
  "soil_moisture_vwc": 0.225,
  "air_temp_c": 31.4,
  "relative_humidity_pct": 58.2,
  "soil_ph": 6.8,
  "soil_temp_c": 26.5,
  "is_simulated": false
}
```

---

## 🗄️ Database Relational Architecture

The system features a **PostgreSQL 16 relational production schema** ([`database/schema.sql`](database/schema.sql)) with strict type constraints, foreign-key cascade hierarchies, check constraints, and B-Tree indexes:

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

## 🛡️ Security, Ingress & Idempotency Pipeline

Every edge packet undergoes strict multi-stage verification before database commit to prevent denial-of-service, duplicate counting, or corrupted model calculations:

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

## 🌟 Key Features & Capabilities

1. **Crop-Rotation Explorer (Explainable Decision Support)**
   - Real-time Multi-Criteria Decision Analysis with instant client-side weight rebalancing.
   - Transparent sub-score explanations: Water Conservation, Soil Health, Heat Resilience, Farmer Profit.
   - Machine reason codes (e.g., `LEGUME_BIOLOGICAL_N_FIXATION`, `LOW_WATER_AQUIFER_FRIENDLY`).

2. **Live NASA POWER Satellite Ingestion**
   - Direct integration with NASA Langley Research Center Agroclimatology point API.
   - Automated conversion from 10m to 2m wind speeds using standard logarithmic wind equations.
   - Missing-value filtering (`-999` strictly converted to `null`, never substituted with zero).

3. **FAO-56 Penman-Monteith Physics Water Engine**
   - Pure physical equations for reference evapotranspiration ($ET_0$) and crop water requirement ($ET_c$).
   - Calculates Total Available Water ($TAW$) and Root-Zone Depletion ($D_r$).
   - Automated irrigation stress warnings when soil moisture drops below 50% $TAW$.

4. **Interactive Architecture Canvas (`/architecture`)**
   - Live visual diagram in the web application displaying all 6 system layers.
   - Interactive Node Inspector: Click any component to inspect protocols, inputs, outputs, and verification status.

5. **Edge IoT Telemetry Ingress with Idempotency**
   - High-throughput REST API with physical range bounds checks and duplicate `event_id` rejection (HTTP 409).
   - Labelled simulation console allowing judges to test telemetry without physical hardware.

6. **Barind Groundwater Aquifer Monitor**
   - Monitors deep tubewell water tables against the critical 28m suction threshold.
   - Alerts users when unsustainable monoculture irrigation threatens regional water tables.

---

## 📁 Repository Structure

```
agrisense-fusion/
├── database/
│   └── schema.sql                  # PostgreSQL 16 production schema (DDL & Indexes)
├── docs/
│   ├── ARCHITECTURE.md             # In-depth architectural blueprint & specifications
│   ├── architecture.mmd            # Exportable, editable Mermaid architecture diagram
│   ├── DEMO_SCRIPT.md              # 3-minute hackathon judge walkthrough
│   └── IMPLEMENTATION_STATUS.md    # Component audit & verification report
├── frontend/                       # React 18 + Vite 5 single-page application
│   ├── src/
│   │   ├── components/             # Explorer, ArchitectureView, MetricCards, Charts, Modals
│   │   ├── App.jsx                 # Dashboard state, navigation, and API synchronization
│   │   └── index.css               # Scientific dark navy & emerald design tokens
│   ├── public/                     # Static media assets & video backgrounds
│   └── dist/                       # Compiled production bundle
├── server/                         # Node.js + Express 5 backend
│   ├── data/                       # Local persistent store (store.json)
│   ├── decision/                   # Deterministic MCDA Crop-Rotation Scoring Engine
│   ├── physics/                    # Standardized FAO-56 Penman-Monteith & Water Balance
│   ├── services/                   # NASA POWER fetcher & ESP32 telemetry ingestion
│   ├── tests/                      # Automated unit test suite (unit.test.js)
│   └── index.js                    # Core Express server & API routes
├── video/                          # Demonstration & challenge video assets
├── .env.example                    # Non-secret environment configuration
├── .gitignore                      # Clean ignore rules (node_modules, logs, secrets)
├── package.json                    # Scripts, metadata, and dependencies
├── test_endpoints.js               # End-to-end API verification script
└── README.md                       # Comprehensive documentation & architecture guide
```

---

## 🚀 Quick Start & Local Deployment

### Prerequisites
* **Node.js** (v18.0.0 or higher; tested on Node.js v20 & v26)
* **npm** (v9.0.0 or higher)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/ASHIK311/agrisense-fusion.git
cd agrisense-fusion

# Install backend dependencies
npm install

# (Optional) Build frontend from source if modifying React code
npm run build:frontend
```

### 2. Launch Application
```bash
npm start
```

Open your browser to:
* 🌾 **Main Dashboard & Crop-Rotation Explorer:** [`http://localhost:5000`](http://localhost:5000)
* 🏛️ **Interactive Architecture Canvas:** [`http://localhost:5000/architecture`](http://localhost:5000/architecture)
* 🩺 **Backend Health & Feature Endpoint:** [`http://localhost:5000/api/health`](http://localhost:5000/api/health)

---

## 🧪 Verification & Automated Test Suite

### 1. Run Unit Tests (FAO-56, Water Balance, Validation, MCDA)
```bash
npm test
```
*Executes 13 automated unit tests covering:*
* `saturationVapourPressure` calculation against thermodynamic tables
* FAO-56 Penman-Monteith reference $ET_0$ across realistic Barind Tract temperatures
* Missing weather input handling (graceful null fallbacks)
* Total Available Water ($TAW$) and Root-Zone Depletion ($D_r$)
* ESP32 sensor payload boundary checks ($0.0 \le \theta \le 1.0$)
* Duplicate event rejection (HTTP 409 idempotency)
* Dynamic MCDA weight rebalancing and reason code generation

### 2. Run End-to-End API Integration Verification
```bash
node test_endpoints.js
```
*Validates `/api/health`, `/api/farms`, `/api/weather/nasa`, `/api/water-balance`, `/api/rotation/compare`, and `/api/sensor-readings`.*

---

## 🔬 Scientific Transparency & Ethical Principles

* **No Synthetic Radar Claims:** We explicitly state what comes from NASA POWER (surface irradiance, 2m temperature, 10m wind, relative humidity) and do not fabricate hypothetical continuous SAR radar feeds.
* **Physics Over Guesswork:** We employ the internationally validated FAO-56 Penman-Monteith equation. Where parameters cannot be calibrated without physical lysimeters (such as direct soil evaporation $E_s$), we leave them as `null` rather than generating speculative figures.
* **Provisional Agronomic Guidance:** Crop rotation sequences reflect proven agronomic practices in Northern Bangladesh (Bangladesh Agricultural Research Institute - BARI guidelines) and are explicitly flagged as *provisional decision support* pending field validation by Department of Agricultural Extension (DAE) officers.

---

## 📜 License
This project is open-source and distributed under the **[MIT License](LICENSE)**.
Developed for the **NASA Space Apps Challenge 2026: Field Shift**.
