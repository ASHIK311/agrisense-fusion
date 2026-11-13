<p align="center">
  <a href="https://github.com/ASHIK311/agrisense-fusion">
    <img src="documentation/readme/banner.svg" alt="AgriSense Fusion — Understand the Field. Protect the Water. Plan the Future." width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://www.spaceappschallenge.org/"><img alt="NASA Space Apps 2026" src="https://img.shields.io/badge/NASA%20SPACE%20APPS-2026%20%C2%B7%20FIELD%20SHIFT-0B3D91?style=for-the-badge&logo=nasa&logoColor=white"></a>
  <a href="https://huggingface.co/datasets/ashik1236/nasatest"><img alt="Open Dataset on Hugging Face" src="https://img.shields.io/badge/OPEN%20DATA-Hugging%20Face%20(2.8%20GB)-F59E0B?style=for-the-badge&logo=huggingface&logoColor=white"></a>
  <a href="https://github.com/ASHIK311/agrisense-fusion/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ASHIK311/agrisense-fusion/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI"></a>
  <a href="documentation/TESTING.md"><img alt="Automated Tests" src="https://img.shields.io/badge/Tests-88%2F88%20Passed-10B981?style=for-the-badge&logo=node.js&logoColor=white"></a>
  <a href="documentation/SECURITY.md"><img alt="Security" src="https://img.shields.io/badge/Security-Timing--Safe%20%26%20Isolated-6366F1?style=for-the-badge&logo=shield&logoColor=white"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-38BDF8?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v26-10B981?style=flat-square&logo=node.js&logoColor=white">
  <img alt="Express 5" src="https://img.shields.io/badge/Express-5.3-0F172A?style=flat-square&logo=express&logoColor=white">
  <img alt="React 18" src="https://img.shields.io/badge/React-18.3-38BDF8?style=flat-square&logo=react&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-WebGL%203D%20Twin-0F172A?style=flat-square&logo=threedotjs&logoColor=white">
  <img alt="Vite 5" src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="FAO-56 Physics" src="https://img.shields.io/badge/Science-FAO--56%20Parity%20Verified-10B981?style=flat-square">
</p>

<p align="center">
  <b>Can spaceborne NASA data save Northern Bangladesh's shrinking groundwater aquifers?</b><br/>
  AgriSense Fusion unifies Sentinel-2 spectral imagery, NASA POWER agroclimatology, simulated ESP32 soil telemetry,<br/>
  and deterministic FAO-56 Penman-Monteith physics into an explainable 3D Digital Twin for <b>Godagari, High Barind Tract (AEZ-26)</b>.
</p>

<p align="center">
  <a href="#-executive-summary--problem-statement"><b>Overview</b></a> ·
  <a href="#-visual-product-tour--verified-ui"><b>Visual Tour</b></a> ·
  <a href="#-10-minute-local-quickstart-windows-powershell"><b>Quickstart</b></a> ·
  <a href="#-testing--verification-summary"><b>Tests (88/88)</b></a> ·
  <a href="#-technical-architecture--system-engineering"><b>Architecture</b></a> ·
  <a href="#-complete-documentation-index"><b>Documentation</b></a> ·
  <a href="#-team-agrisense-fusion"><b>Team</b></a>
</p>

---

## 🌍 Executive Summary & Problem Statement

In the drought-stressed **High Barind Tract of Northern Bangladesh** (*Godagari Upazila, Rajshahi · `24.4690°N, 88.3300°E` · AEZ-26*), smallholder farming faces an acute hydrological crisis:

* Dry-season **Boro rice monoculture** demands intensive deep-tubewell irrigation across a semi-arid pre-monsoon window.
* Regional piezometric literature documents groundwater tables declining at **~0.65 m/year** (*Jahan et al., 2010*), pushing monitoring proxies (`26.4 m` / `27.8 m`) dangerously close to the **28.0 m critical suction limit** of surface-mounted centrifugal pumps.
* Generic agricultural chatbots hallucinate irrigation advice and crop numbers without hydrological grounding or provenance.

**AgriSense Fusion** transforms multi-agency Earth observations into **honest, physics-grounded crop decisions**:
1. **Satellite LULC Classification (`RandomForest_21Feat_Deep`):** Multi-temporal Sentinel-2 L2A scenes (`12` acquisitions, `2022–2025`, NDVI/NDWI/NDMI/EVI) classifying 4 broad land-cover classes with explicit scientific gates (`HTTP 422` against unvalidated species overclaims).
2. **FAO-56 Penman-Monteith Physics Engine:** Cross-language parity verified (`Node.js` ↔ `Python` across 4 seasonal Barind vectors) with canonical Silty Clay Loam root-zone defaults (`79.0 mm` TAW, `39.5 mm` RAW).
3. **Crop-Rotation MCDA Decision Explorer:** Dynamic 4-slider Multi-Criteria Decision Analysis (*Water Conservation, Soil Health, Heat Resilience, Farmer Profit*) comparing alternative sequences (e.g., *Lentil → Aus Rice → T. Aman*, *Mustard → Mungbean → T. Aman*) against conventional baselines.
4. **3D Stratigraphic & Dual-Canopy WebGL Digital Twin:** Interactive Three.js terrain strata synchronized pixel-for-pixel with Leaflet Sentinel-2 parcel polygons.
5. **Bilingual RAG Copilot (English & বাংলা):** Offline-capable hybrid BM25 + 3-gram RRF retrieval over `87` audited chunks (`100%` tool & disclosure pass) backed by `17` Bangladesh crop diseases and `60` DOI-verified papers.

---

## 📊 Verified Platform Metrics (In Numbers)

| Metric | Measured Value | Provenance / Verification |
|---|---|---|
| **Automated Test Suite** | **`88 / 88` passed (`0` failed)** | `npm test` across 7 suites (`~3.9s`) |
| **Live E2E Workflow Audit** | **`11 / 11` workflows + `3` gates** | `node server/tests/live_workflow_audit.js` |
| **LULC Classifier Holdout** | **`85.77%` Block C overall (`N=6,000`)** | `84.02%` bal. acc · `0.8257` Macro-F1 · `90.64%` interior |
| **Spatial 5-Fold CV** | **`84.63% ± 3.81%` (`N=20,000`)** | `RandomForest_21Feat_Deep` (`4` broad LULC classes) |
| **NASA POWER Daily Series** | **`1,827` rows (`2019–2024`) + Live API** | `-999` null guard + `Tmax >= 35°C` compound risk rule |
| **Node–Python Physics Parity** | **`4 / 4` Godagari seasonal profiles** | Exact `ET₀` parity (`7.49`, `2.41`, `2.94`, `3.80 mm/day`) |
| **Bilingual RAG Benchmark** | **`30/30` tool & disclosure (`81.82%` Hit@4)** | `87` curated chunks (`v2.1.2`), `12.99 ms` mean latency |
| **Pathology Literature Base** | **`17` diseases · `60` DOI papers** | `48` full-text, `5` abstract, `7` metadata confirmed |
| **Open Satellite Dataset** | **`~2.80 GB` GeoTIFFs & Climate CSV** | Hosted openly on Hugging Face ([`ashik1236/nasatest`](https://huggingface.co/datasets/ashik1236/nasatest)) |

---

## 📸 Visual Product Tour & Verified UI

Every screenshot below captures the compiled React + Vite + Three.js application executing against the live Node.js backend:

<p align="center">
  <img src="documentation/readme/01_hero_digital_twin.png" alt="AgriSense Fusion 3D Digital Twin Hero" width="100%" />
</p>

<table>
  <tr>
    <td width="50%"><img src="documentation/readme/02_command_hub_cockpit.png" alt="Command Hub Tactical Cockpit"/><br/><sub><b>Tactical Command Hub.</b> Live FAO-56 depletion triage (<code>49.5 / 79 mm</code>), BMDA aquifer suction proxy (<code>26.4 / 28.0 m</code>), and explicit <code>SIMULATED</code> ESP32 badge.</sub></td>
    <td width="50%"><img src="documentation/readme/03_spatial_twin_earth_lab.png" alt="Earth Lab 2D GIS & 3D WebGL Split"/><br/><sub><b>Synchronized 2D / 3D Earth Lab.</b> Esri/Sentinel-2 parcel cartography paired side-by-side with the 4-layer WebGL Barind stratigraphic twin.</sub></td>
  </tr>
  <tr>
    <td><img src="documentation/readme/04_fao56_water_budget.png" alt="NASA POWER & FAO-56 Water Budget"/><br/><sub><b>FAO-56 Water Budget & NASA POWER.</b> Daily rainfall vs. atmospheric <code>ET₀</code> and crop demand <code>ETc</code> trajectories for Godagari (<code>24.469°N, 88.330°E</code>).</sub></td>
    <td><img src="documentation/readme/05_dual_3d_crop_compare.png" alt="Side-by-Side 3D Crop Canopies"/><br/><sub><b>Dual-3D Crop Canopy Compare.</b> Lockstep WebGL comparison of root depth, seasonal water demand, and BARC suitability (e.g., <i>T. Aman</i> vs. <i>Boro Monoculture</i>).</sub></td>
  </tr>
  <tr>
    <td><img src="documentation/readme/06_methods_validation.png" alt="Methods Validation & Provenance"/><br/><sub><b>Scientific Provenance & Methods.</b> Open governance view surfacing spatial CV splits, soil thresholds, and explicit <code>HTTP 422 / 501</code> validation gates.</sub></td>
    <td><img src="documentation/readme/07_ai_copilot_rag.png" alt="Bilingual RAG AI Copilot"/><br/><sub><b>Bilingual AI Copilot (English &amp; বাংলা).</b> Deterministic tool execution paired with grounded DOI citations and honest model scope disclosures.</sub></td>
  </tr>
</table>

---

## ⚡ 10-Minute Local Quickstart (Windows PowerShell)

### Option A: 1-Click Windows Launcher
```powershell
git clone https://github.com/ASHIK311/agrisense-fusion.git
cd "agrisense-fusion"
.\start.bat
```
*Automatically installs dependencies if missing, launches the Express API (`:5000`) and Vite SPA (`:5173`), and opens `http://localhost:5173`.*

### Option B: Manual PowerShell Step-by-Step
```powershell
# 1. Install backend & frontend dependencies
npm.cmd install
npm.cmd --prefix frontend install

# 2. Configure local environment
Copy-Item .env.example .env

# 3. Run the 88-test verification suite
npm.cmd test

# 4. Start backend API (Terminal 1) and Vite frontend (Terminal 2)
node server/index.js
npm.cmd --prefix frontend run dev
```

<details>
<summary>
<h3>
  <img src="https://img.shields.io/badge/%F0%9F%93%96_Linux_%2F_macOS_%26_Hugging_Face-Setup_%26_Dataset_Download-0ea5e9?style=for-the-badge" alt="Setup Guide" />
  &nbsp;👉 <b>CLICK TO EXPAND: Cross-Platform Setup, Open Dataset Download & Troubleshooting</b>
</h3>
</summary>

### Linux / macOS Setup
```bash
git clone https://github.com/ASHIK311/agrisense-fusion.git
cd agrisense-fusion
npm ci
npm --prefix frontend ci
cp .env.example .env
npm test
npm --prefix frontend run build
node server/index.js &
npm --prefix frontend run dev
```

### Pull Heavy Satellite GeoTIFFs from Hugging Face (`~2.80 GB`)
```bash
pip install huggingface_hub
python scripts/download_dataset.py
# Or using HF CLI directly:
hf download ashik1236/nasatest --repo-type dataset --local-dir ./research/hf_datasets
```

### Troubleshooting
* **PowerShell Blocks `npm`:** Use `npm.cmd test` or run via Command Prompt (`cmd /c npm test`).
* **Port `5000` Already in Use:** Set `$env:PORT=5001; node server/index.js` or terminate orphaned Node processes before testing.
* **Preserving Clean Demo Store (`server/data/store.json`):** Point `AGRISENSE_STORE_FILE` to a temp path during ad-hoc write scripts (`npm test` isolates automatically).

</details>

---

## 🧪 Testing & Verification Summary

Every critical workflow, security boundary, and physics formula is verified across **7 top-level automated suites (`88 / 88` passed in `~3.9s`)**, an isolated live E2E harness, and an offline RAG evaluation benchmark:

| Test Suite / Harness | Command | Result | What It Verifies |
|---|---|:---:|---|
| **Core API Integration** | `server/tests/api_integration.test.js` | **20 / 20 PASS** | Health, auth, farms/fields, NASA POWER history, compound weather risk, ESP32 POST, satellite classify/meta, BARC suitability, FAO-56 water balance, 17 diseases, 60 DOIs, alerts, groundwater, reports, dashboard. |
| **RAG & AI Assistant** | `server/tests/assistant.test.js` | **13 / 13 PASS** | 9 deterministic tools, EN & বাংলা chat, disease disclaimer, 0.65 m/yr Jahan citation, uncalibrated ESP32 disclosure, SSE stream, `P0-01` metric guard, `P0-02` input guard, `P1-03` multi-tenant auth. |
| **Option 1 Patch Regression** | `server/tests/patch_regression.test.js` | **10 / 10 PASS** | Signup `'farmer'` role lock, security headers, `/favicon.ico != 500`, cross-tenant `404` isolation, canonical `79.0 mm` TAW / `39.5 mm` RAW parity, `RandomForest_21Feat_Deep`, `4000`-char limit + `429`, `1,827`-row Member 2 parity, soil provenance. |
| **Security & Multi-Tenant** | `server/tests/security_regression.test.js` | **12 / 12 PASS** | Production `JWT_SECRET >= 32` check, forged JWT `403`, auth barriers `401`, immutable demo farms `403`, rate limit `429`, honest `422` / `501` model gates, zero-denominator spectral protection. |
| **Physics, IoT & MCDA Units** | `server/tests/unit.test.js` | **13 / 13 PASS** | Penman-Monteith $ET_0$, $ET_c$, TAW, $D_r$ water balance, ESP32 physical bounds (`422`) & duplicate `event_id` (`409`), dynamic MCDA water vs. profit re-ranking. |
| **Persistence & Recovery** | `server/tests/persistence_safety.test.js` | **7 / 7 PASS** | Atomic writes, automatic `.bak` snapshot recovery, lock-safe rename without non-atomic corruption, clean seed recovery. |
| **ESP32 Hardware Auth** | `server/tests/device_auth.test.js` | **4 / 4 PASS** | Missing auth `401`, forged `x-device-key` rejection with valid `device_id`, timing-safe system key `201`, Bearer token `201`. |
| **Node–Python FAO-56 Parity** | `server/tests/fao56_parity.test.js` | **4 / 4 PASS** | Cross-language verification against Member 5 Python across 4 seasonal Godagari benchmarks (`7.49`, `2.41`, `2.94`, `3.80 mm/day`). |
| **Hydrology Terrain API** | `server/tests/hydrologyApi.test.js` | **2 / 2 PASS** | Terrarium RGB PNG elevation decoding and West➔East slope transect binning. |
| **Live E2E + RAG Harness** | `live_workflow_audit.js`, `run_rag_benchmark.js` | **11/11 + 30/30** | End-to-end live server workflows, 3 scientific gates (`422`/`501`), and `81.82%` RAG Hit@4 (`12.99 ms` mean). |

*(Full test case trace & reproduction steps: [`documentation/TESTING.md`](documentation/TESTING.md))*

---

## 🔒 Security Posture & Honest Engineering Disclosures

* **Zero Privilege Escalation (`P1-01` Closed):** Public registration (`POST /api/v1/auth/register`) strictly enforces `role: "farmer"`, discarding any client-supplied privilege escalation fields.
* **Timing-Safe Hardware Auth:** ESP32 edge telemetry enforces `crypto.timingSafeEqual` on `x-device-key` headers (`HTTP 401` on forged keys even when paired with registered `device_id`s).
* **Strict Tenant Isolation:** Cross-tenant farm, field, report, sensor export, and assistant conversation requests fail closed (`HTTP 404` / `401` / `403`).
* **Crash-Safe Atomic Storage:** `storageService.js` executes temp-file atomic replacement with exponential backoff and verified `.bak` snapshot recovery.

<details>
<summary>
<h3>
  <img src="https://img.shields.io/badge/%E2%9A%A0%EF%B8%8F_Disclosures-Honest_Engineering_Limits-f59e0b?style=for-the-badge" alt="Disclosures" />
  &nbsp;👉 <b>CLICK TO EXPAND: Honest Engineering Disclosures & Scientific Scope Boundaries</b>
</h3>
</summary>

1. **Simulated Edge IoT Hardware:** Physical ESP32 sensors are pending field calibration. Baseline telemetry (`esp32-node-raj-01`, `5,760`-row offline dataset) carries `is_simulated: true` and `calibration_status: "UNCALIBRATED"`.
2. **Synthetic Groundwater Proxy:** Regional piezometer rows (`26.4 m` / `27.8 m` depths) serve `SYNTHETIC_REGIONAL_PROXY` data (`has_physical_piezometers: false`) anchored on Jahan et al. (2010) rather than live BMDA SCADA feeds.
3. **LULC Holdout vs. Species Gates:** `RandomForest_21Feat_Deep` (`85.77%` Block C holdout) was validated across contiguous latitudinal blocks for 4 broad LULC classes; fine crop-species classification (`HTTP 422`), multi-season yield prediction (`HTTP 501`), and NWP forecasting (`HTTP 501`) remain gated rather than fabricated.
4. **Provisional Soil & Rotation Modeling:** Barind Silty Clay Loam defaults (`79.0 mm` TAW, `39.5 mm` RAW) use Saxton & Rawls (2006) pedotransfer defaults, and crop-rotation comparisons represent modeled MCDA scenarios rather than multi-season field guarantees.
5. **PostgreSQL & Cloud LLMs:** `database/schema.sql` provides full PostgreSQL 16 + PostGIS DDL (`P2-02` deferred for local-first edge portability on `store.json`). Live Gemini/OpenAI modes remain `NOT_EVALUATED_NO_API_KEY_IN_ENV` in offline CI; offline deterministic synthesis runs cleanly with zero keys.

*(Full scientific disclosure matrix: [`documentation/KNOWN_LIMITATIONS.md`](documentation/KNOWN_LIMITATIONS.md))*

</details>

---

## 🏛️ Technical Architecture & System Engineering

### 1. High-Level 6-Layer System Architecture Topology

```mermaid
graph TB
  classDef edgeLayer fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef satLayer fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
  classDef ingressLayer fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef storeLayer fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f8fafc;
  classDef scienceLayer fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef uiLayer fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#f8fafc;

  subgraph L1["1. EDGE HARDWARE & IOT LAYER"]
    ESP32["<b>ESP32 Agro-Sensor Node</b><br/>• Capacitive FDR v2 VWC &amp; Soil Temp<br/>• <i>[is_simulated: true / UNCALIBRATED]</i>"]:::edgeLayer
  end

  subgraph L2["2. EARTH OBSERVATION & CLIMATE LAYER"]
    NASA["<b>NASA POWER &amp; Sentinel-2 L2A</b><br/>• T2M, RH2M, SW_DWN, WS10M, Rain<br/>• 12 Multi-Year GeoTIFF Scenes (HF)"]:::satLayer
  end

  subgraph L3["3. EXPRESS 5 API & SECURITY GATEWAY"]
    GW["<b>Auth, Rate Limiter &amp; Routes</b><br/>• Public Signup Role Lock ('farmer')<br/>• Timing-Safe x-device-key Check<br/>• -999 Missing Value Sentinel Guard"]:::ingressLayer
  end

  subgraph L4["4. ATOMIC PERSISTENCE & SEED LAYER"]
    DB[("<b>Atomic JSON Store + .bak</b><br/>• Multi-Tenant Scoped Reads/Writes<br/>• <i>PostgreSQL 16 + PostGIS DDL Ready</i>")]:::storeLayer
  end

  subgraph L5["5. PHYSICS, MCDA & BILINGUAL RAG ENGINES"]
    FAO["<b>FAO-56 Penman-Monteith</b><br/>• Node-Python Verified Parity<br/>• TAW 79.0mm / RAW 39.5mm"]:::scienceLayer
    MCDA["<b>Crop-Rotation MCDA &amp; RAG</b><br/>• 4-Slider Weights + 87 Chunks<br/>• 60 DOI Pathology Registry"]:::scienceLayer
  end

  subgraph L6["6. REACT 18 + THREE.JS 3D DIGITAL TWIN"]
    UI["<b>Command Hub, Earth Lab &amp; Copilot</b><br/>• 3D Stratigraphic Terrain &amp; Canopies<br/>• Synchronized Leaflet GIS &amp; বাংলা HUD"]:::uiLayer
  end

  ESP32 -- "HTTPS POST (x-device-key)" --> GW
  NASA -- "Point Series + LULC Metadata" --> GW
  GW --> DB
  DB --> FAO
  DB --> MCDA
  FAO --> UI
  MCDA --> UI
```

### 2. FAO-56 Penman-Monteith Physics & Soil Water Balance Flow

```mermaid
flowchart LR
  classDef inp fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#fff;
  classDef calc fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#fff;
  classDef soil fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff;
  classDef out fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fff;

  W["NASA POWER Weather<br/>Tmax, Tmin, RH, Rs, u₁₀"]:::inp --> GUARD{"Null / -999<br/>Check"}:::calc
  GUARD -->|Valid| WIND["Log Wind Conversion<br/>u₂ = u₁₀ · 4.87 / ln(67.8z - 5.42)"]:::calc
  GUARD -->|Missing| FAIL["Reject Silently-Defaulted<br/>Calculation (P0-02)"]:::out
  WIND --> ET0["Penman-Monteith ET₀<br/>Full Stefan-Boltzmann Rnl"]:::calc
  ET0 --> ETC["Crop Demand<br/>ETc = Kc × ET₀ (Es = null)"]:::calc
  ETC --> BAL["Root-Zone Balance (Silty Clay Loam)<br/>TAW = 79.0mm | RAW = 39.5mm"]:::soil
  BAL --> TRIG{"Dr > RAW<br/>(VWC < 0.244)?"}:::soil
  TRIG -->|Yes| ALERT["Trigger Irrigation Alert<br/>&amp; Stress Coefficient Ks < 1"]:::out
  TRIG -->|No| OK["Optimal Root-Zone Status"]:::soil
```

### 3. Crop-Rotation Multi-Criteria Decision Analysis (MCDA) Pipeline

```mermaid
flowchart TD
  classDef sliders fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff;
  classDef data fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff;
  classDef rank fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#fff;

  S["Farmer / Agronomist 4-Slider Preferences<br/>💧 Water | 🌱 Soil | ☀️ Heat | 💰 Profit"]:::sliders --> NORM["Normalize Weights (Σ w'ᵢ = 1.0)"]:::rank
  CAT["6 Provisional Barind Rotations<br/>+ BARC AEZ-26 Suitability Matrix"]:::data --> EVAL["Weighted Composite Scoring<br/>Score = Σ (w'ᵢ × Sᵢ)"]:::rank
  NORM --> EVAL
  EVAL --> OUT["Dynamic Live Re-Ranking<br/>• Rank #1 Sequence (e.g., Lentil → Aus → T. Aman)<br/>• Machine Reason Codes &amp; Provisional Caveats"]:::data
```

### 4. ESP32 Edge Telemetry Security & Idempotency Pipeline

```mermaid
sequenceDiagram
  autonumber
  participant Node as ESP32 FDR v2 Node
  participant Auth as timingSafeEqual Auth
  participant Svc as Sensor Service
  participant Store as Atomic Store (.json)

  Node->>Auth: POST /api/v1/sensor-readings (x-device-key, event_id, VWC)
  Auth->>Auth: Constant-time key verification
  alt Invalid or Missing Key
    Auth-->>Node: HTTP 401 Unauthorized
  else Authorized Key / Bearer JWT
    Auth->>Svc: Forward telemetry payload
    Svc->>Svc: Physical bounds check (VWC ∈ [0,1], Temp <= 65°C)
    alt Out of Physical Bounds
      Svc-->>Node: HTTP 422 Unprocessable Entity
    else Duplicate event_id
      Svc-->>Node: HTTP 409 Conflict (Idempotency enforced)
    else Valid New Reading
      Svc->>Store: Atomic write (is_simulated: true, UNCALIBRATED)
      Store-->>Node: HTTP 201 Created
    end
  end
```

### 5. Bilingual Hybrid RAG Decision & Scientific Guardrail Pipeline

```mermaid
flowchart LR
  classDef q fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#fff;
  classDef ret fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff;
  classDef tool fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#fff;
  classDef resp fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fff;

  U["Query (EN / বাংলা)<br/>Bound <= 4000 chars + Rate Limit"]:::q --> PARSE["Intent & Language Classifier<br/>+ Prompt-Injection Neutralizer"]:::ret
  PARSE --> HYBRID["Hybrid Retrieval (87 Chunks v2.1.2)<br/>BM25 + 3-Gram RRF (12.99ms mean)"]:::ret
  PARSE --> TOOLS["9 Deterministic Backend Tools<br/>(ET₀, Water Balance, LULC, Diseases)"]:::tool
  HYBRID --> SYNTH["Grounded Synthesizer<br/>Mandatory Disclaimers + 60 DOIs"]:::resp
  TOOLS --> SYNTH
```

---

## 📂 Repository Directory Architecture

```text
agrisense-fusion/                                  # Clean GitHub repository root (~39 MB)
├── README.md                                      # Executive overview, visual tour, quickstart & architecture
├── LICENSE                                        # MIT Open Source License
├── .gitattributes                                 # Linguist language classification & cross-OS EOL normalization
├── .gitignore                                     # Excludes node_modules, .venv, .env*, .bak & heavy GeoTIFFs
├── .env.example                                   # Environment variable template (JWT, NASA, optional LLM keys)
├── .github/workflows/ci.yml                       # Automated CI: 88 Node tests, RAG benchmark, Python & Vite build
├── start.bat                                      # 1-Click Windows launcher (Express :5000 + Vite :5173)
├── package.json                                   # Backend dependencies (Express 5, bcryptjs, jwt, pg) & test runner
├── audit_phase0.py                                # Forensic cross-member verification generator
├── generate_fao56_benchmark.py                    # Cross-language Node-Python FAO-56 benchmark generator
├── test_endpoints.js                              # Rapid endpoint health & contract smoke script
│
├── database/
│   └── schema.sql                                 # PostgreSQL 16 + PostGIS DDL (aligned Barind soil defaults)
│
├── documentation/                                 # Complete engineering, audit, review & submission documentation
│   ├── ENGINEERING.md                             # Improvement matrix, benchmarks, parity & repo hygiene report
│   ├── ARCHITECTURE.md                            # System topology & multiscale fusion architecture
│   ├── HANDOFF.md                                 # Developer onboarding, operational rules & gotchas
│   ├── PROJECT_PLAN.md                            # Field Shift alignment, metrics & post-hackathon roadmap
│   ├── SUBMISSION.md                              # Space Apps submission text, 5-min pitch & 10-step demo script
│   ├── TESTING.md                                 # Canonical breakdown of all 88 tests & E2E harnesses
│   ├── SECURITY.md                                # Auth hardening, timing-safe keys, multi-tenant isolation
│   ├── API_REFERENCE.md                           # Exhaustive REST API specification + 422/501 gates
│   ├── KNOWN_LIMITATIONS.md                       # Honest engineering disclosures & scientific boundaries
│   ├── SRS.md                                     # Full Software Requirements Specification
│   ├── readme/                                    # Custom SVG banner + 7 high-res verified UI screenshots
│   ├── review/                                    # External BARC/BMDA expert review kit & CSV scorecard
│   └── ui-ux/                                     # Interface design notes & accessibility guidelines
│
├── frontend/                                      # React 18 + Vite 5 + Three.js + Leaflet SPA
│   ├── public/team/                               # Official 6-member squad portraits
│   ├── public/models/                             # 3D GPM satellite GLB model & Draco decoders
│   └── src/                                       # Workspaces: Command Hub, Earth Lab, Water, Crops, What-If, Methods
│
├── server/                                        # Express 5 Backend & Scientific Engines
│   ├── index.js                                   # Security headers, CORS allowlist, v1 route mounting
│   ├── adapters/ingest_all.py                     # Harmonizes research/member_01..06 into master seed JSON
│   ├── assistant/                                 # Bilingual RAG service, 9 deterministic tools & system prompts
│   ├── data/                                      # master_database_seed.json, rag_knowledge_base.json, clean store.json
│   ├── decision/                                  # Crop-Rotation MCDA engine & Barind crop catalog
│   ├── middleware/                                # JWT auth, timing-safe device key, rate limiter, error handler
│   ├── physics/                                   # FAO-56 Penman-Monteith ET₀ & root-zone water balance
│   ├── routes/                                    # 13 modular API v1 route controllers
│   ├── services/                                  # Auth, NASA POWER fetcher, hydrology PNG decoder, sensor service
│   ├── storage/                                   # Crash-safe atomic JSON + .bak engine & Postgres pool
│   └── tests/                                     # 88 automated Node tests + live workflow + RAG benchmarks
│
├── research/                                      # Consolidated 6-Member Scientific Modules & Forensic Audits
│   ├── README.md                                  # Guide across Member 01–06 deliverables
│   ├── dataset_card.md                            # Hugging Face open dataset metadata card (ashik1236/nasatest)
│   ├── member_01_satellite_gis/                   # Sentinel-2 preprocessing scripts, schemas, spatial holdout audits
│   ├── member_02_weather_risk/                    # 1,827-day NASA POWER Godagari risk model & charts
│   ├── member_03_iot_hardware/                    # ESP32 C++ firmware, schematics, BOM, 5,760-row calibration audits
│   ├── member_04_agronomy_mcda/                   # BARC AEZ-26 crop suitability, calendars & rotation datasets
│   ├── member_05_hydrology_physics/               # Python FAO-56 water balance reference implementation
│   └── member_06_crop_pathology/                  # 17 Bangladesh crop diseases & 60 DOI-verified papers
│
└── scripts/
    └── download_dataset.py                        # Pulls ~2.80 GB GeoTIFF rasters from Hugging Face (ashik1236/nasatest)
```

---

## 📚 Complete Documentation Index

| Documentation Book | Purpose & Contents |
| :--- | :--- |
| 🛠️ [`documentation/ENGINEERING.md`](documentation/ENGINEERING.md) | 25-item Improvement Matrix (`P0–P3`), performance benchmarks, parity & repo audit |
| 🏗️ [`documentation/ARCHITECTURE.md`](documentation/ARCHITECTURE.md) | Multi-layer system topology, data pipelines, and storage architecture |
| 🤝 [`documentation/HANDOFF.md`](documentation/HANDOFF.md) | Developer onboarding guide, operational rules, and clean-store isolation tips |
| 🗺️ [`documentation/PROJECT_PLAN.md`](documentation/PROJECT_PLAN.md) | Challenge requirements, quantitative baselines, and post-hackathon roadmap |
| 🏆 [`documentation/SUBMISSION.md`](documentation/SUBMISSION.md) | Ready-to-paste Space Apps submission text, 5-min speaker pitch, 10-step demo |
| 🧪 [`documentation/TESTING.md`](documentation/TESTING.md) | Canonical breakdown of all `88` Node tests, E2E audits & RAG benchmarks |
| 🛡️ [`documentation/SECURITY.md`](documentation/SECURITY.md) | Role locks, `timingSafeEqual` ESP32 auth, tenant isolation, and headers |
| 🔌 [`documentation/API_REFERENCE.md`](documentation/API_REFERENCE.md) | Exhaustive REST API catalog across all routes plus `HTTP 422 / 501` gates |
| ⚠️ [`documentation/KNOWN_LIMITATIONS.md`](documentation/KNOWN_LIMITATIONS.md) | Honest disclosures of simulated IoT, groundwater proxies & model boundaries |
| 🌾 [`documentation/review/EXPERT_REVIEW_KIT.md`](documentation/review/EXPERT_REVIEW_KIT.md) | External BARC / BMDA agronomic validation rubric and [`review_sheet.csv`](documentation/review/review_sheet.csv) |
| 🛰️ [`research/dataset_card.md`](research/dataset_card.md) | Hugging Face open dataset specification for [`ashik1236/nasatest`](https://huggingface.co/datasets/ashik1236/nasatest) |
| 📜 [`documentation/SRS.md`](documentation/SRS.md) | Complete Software Requirements Specification & cross-subsystem traceability |

---

## 👩‍🚀 Team AgriSense Fusion

<table>
  <tr>
    <td align="center" width="16.6%"><img src="frontend/public/team/nakib-md-ashik.png" width="105" alt="Nakib Md Ashik"/><br/><b>Nakib Md Ashik</b><br/><sub>Team Lead &amp; System Architect</sub></td>
    <td align="center" width="16.6%"><img src="frontend/public/team/shah-ismat-mahmud-tanim.png" width="105" alt="Shah Ismat Mahmud Tanim"/><br/><b>Shah Ismat Mahmud Tanim</b><br/><sub>Research &amp; Pathology Ops</sub></td>
    <td align="center" width="16.6%"><img src="frontend/public/team/md-riazul-islam-tusar.png" width="105" alt="Md. Riazul Islam Tusar"/><br/><b>Md. Riazul Islam Tusar</b><br/><sub>Backend &amp; API Integration</sub></td>
    <td align="center" width="16.6%"><img src="frontend/public/team/mynuddin-ahmed.png" width="105" alt="Mynuddin Ahmed"/><br/><b>Mynuddin Ahmed</b><br/><sub>Frontend &amp; 3D Spatial UX</sub></td>
    <td align="center" width="16.6%"><img src="frontend/public/team/tanvir-kabir.png" width="105" alt="Tanvir Kabir"/><br/><b>Tanvir Kabir</b><br/><sub>IoT &amp; ESP32 Hardware</sub></td>
    <td align="center" width="16.6%"><img src="frontend/public/team/md-mizanur-rahman.png" width="105" alt="Md Mizanur Rahman"/><br/><b>Md Mizanur Rahman</b><br/><sub>Vadose Hydrology &amp; Physics</sub></td>
  </tr>
</table>

<p align="center"><sub>Engineered in Dhaka, Bangladesh 🇧🇩 for the 2026 NASA International Space Apps Challenge (*Field Shift* Track).</sub></p>

---

## 📜 Scientific Attribution & License

* **Earth Observation & Weather Data:** NASA POWER Project (Langley Research Center), Copernicus Sentinel-2 L2A (ESA), ESA WorldCover 10m, ISRIC SoilGrids.
* **Agronomic & Hydrological Standards:** FAO Irrigation & Drainage Paper No. 56 (Allen et al., 1998), Saxton & Rawls (2006) Soil Water Characteristics, Bangladesh Agricultural Research Council (BARC AEZ-26), Jahan et al. (2010) Barind Aquifer Drawdown Studies.
* **Disclaimer:** NASA does not endorse this project. Regional groundwater monitoring records and ESP32 sensor feeds operate as explicitly labeled simulation/proxy baselines until physical field deployment and gravimetric calibration occur.

Released under the **[MIT License](LICENSE)**.
