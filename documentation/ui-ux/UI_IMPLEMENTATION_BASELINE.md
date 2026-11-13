# AGRISENSE FUSION — UI/UX & DIGITAL TWIN IMPLEMENTATION BASELINE

**Document ID:** `UI_IMPLEMENTATION_BASELINE.md`  
**Phase:** Phase Zero — Read-Only Audit & Baseline  
**Project:** Field Shift — AgriSense Fusion (NASA Space Apps Challenge 2026)  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (`AEZ 26 — High Barind Tract`, Primary Centroid: `24.469°N, 88.330°E`; NASA POWER Point: `24.3636°N, 88.6241°E`, ~`34.8 km` ESE)  
**Audit Date:** 2026-11-11

---

## 1. Current Frontend Architecture & Build Status

- **Framework & Bundler:** React `18.3.1` + Vite `5.4.14` (`frontend/package.json`)
- **Production Build Status:** `PASS` (`251.96 kB` JS bundle, `10.97 kB` CSS bundle, `534 ms` build time)
- **Automated Test Suite:** `76/76` tests passing (`npm test`)
- **Live End-to-End Workflows:** `11/11` live HTTP workflows + `3/3` scientific gates (`422` & `501`) passing

---

## 2. Current Routes & Navigation Structure

Prior to this upgrade, `frontend/src/App.jsx` operates as a single flat 9-tab view without URL routing or separation between the Public Home Page (`/`) and the Operational Command Deck (`/app/*`):

| Legacy Tab ID | Label | Current Component Rendered |
|---|---|---|
| `dashboard` | Live Field Dashboard | `MetricCards`, `WeatherChart`, `CropRotationExplorer` |
| `satellite` | Satellite & GIS (M1) | `SatellitePanel` |
| `water` | FAO-56 Water Balance | `WaterBudgetPanel` |
| `disease` | Disease Intelligence (M6) | `DiseasePanel` |
| `groundwater` | BMDA Aquifer (AEZ-26) | `GroundwaterPanel` |
| `assistant` | AgriSense AI (RAG) | `AssistantPanel` |
| `reports` | Agronomic Report | `AgronomicReportPanel` |
| `architecture` | System Architecture | `ArchitectureView` |
| `iot-api` | ESP32 API Contract | `Esp32ApiDoc` |

---

## 3. Existing Frontend Components Inventory (`frontend/src/components/`)

1. `Header.jsx` — Top banner with farm selector, NASA Sync button, Simulate ESP32 button, and 9 tab buttons.
2. `MetricCards.jsx` — 4 summary metric cards (Soil Moisture VWC, Ambient Air Temp, Solar Irradiance, Reference ET0) + FAO-56 irrigation banner.
3. `WeatherChart.jsx` — SVG bar/line chart of NASA POWER precipitation and mean temperature with 34.8 km coordinate disclosure.
4. `CropRotationExplorer.jsx` — 4-slider MCDA Crop Rotation Explorer (Water, Soil, Heat, Profit) calling `POST /api/rotation/compare`.
5. `WaterBudgetPanel.jsx` — FAO-56 daily water balance panel (`ET0`, `ETc`, `Dr`, `TAW`, `RAW`, `Ks`, missing-variable disclosure).
6. `GroundwaterPanel.jsx` — BMDA deep tubewell synthetic proxy depth monitor (`26.4 m` vs `28.0 m` suction limit, `0.65 m/yr` drawdown).
7. `SatellitePanel.jsx` — Member 1 Sentinel-2 spectral indices (`NDVI`, `NDWI`, `NDMI`, `EVI`), 12 valid temporal pass dates, and reconciled Random Forest accuracy (`84.63% ± 3.81%` spatial CV; `85.77%` Block C holdout).
8. `DiseasePanel.jsx` — Member 6 environmental disease susceptibility screening (17 diseases, 60 DOI papers, interactive environmental stress slider).
9. `AgronomicReportPanel.jsx` — Synthesis handover report (`GET /api/v1/reports/summary`) and CSV export links (`/api/v1/reports/export/csv`).
10. `AssistantPanel.jsx` — Bilingual (English + বাংলা) RAG AI Assistant (`POST /api/v1/assistant/chat`, `POST /api/v1/assistant/feedback`).
11. `SimulateReadingModal.jsx` — Modal to submit simulated ESP32 readings (`POST /api/sensor-readings` with `is_simulated: true`).
12. `Esp32ApiDoc.jsx` — REST contract documentation for `POST /api/sensor-readings`.
13. `ArchitectureView.jsx` — Interactive 6-layer system architecture pipeline and Mermaid source viewer.

---

## 4. Backend Endpoints Currently Consumed

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/dashboard?farmId=...` | `GET` | Aggregated farm, field, weather, sensor, FAO-56 water balance, rotation, and BMDA groundwater state |
| `/api/weather/sync` | `POST` | Live/fallback NASA POWER daily agroclimatology sync |
| `/api/rotation/compare` | `POST` | Legacy 4-slider MCDA crop rotation comparison |
| `/api/v1/decision/crop-rotations` | `POST` | Canonical v1 MCDA & BARC suitability engine |
| `/api/v1/physics/water-balance` | `POST` | Canonical v1 FAO-56 Penman-Monteith & root-zone depletion calculation |
| `/api/v1/satellite/classify` | `GET` | Sentinel-2 LULC classification & spectral signatures |
| `/api/v1/satellite/crop-species` | `GET` | Scientific gate returning `422 BLOCKED_INSUFFICIENT_LABELS` |
| `/api/v1/weather/forecast` | `GET` | Scientific gate returning `501 NOT_IMPLEMENTED` |
| `/api/v1/disease/evaluate` | `POST` | Epidemiological susceptibility rule evaluation across 17 diseases |
| `/api/v1/assistant/chat` | `POST` | Grounded RAG AI chat with deterministic tool execution |
| `/api/v1/assistant/feedback` | `POST` | User feedback on AI responses |
| `/api/v1/reports/summary` | `GET` | Consolidated multi-subsystem field report |
| `/api/v1/reports/export/csv` | `GET` | Weather and telemetry CSV export |
| `/api/sensor-readings` | `POST` | Simulated/edge IoT sensor telemetry ingestion |
| `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me` | `POST`/`GET` | JWT user authentication |
| `/api/v1/farms`, `/api/v1/fields`, `/api/v1/alerts` | `GET`/`POST`/`PATCH` | Multi-tenant farm, field, and alert management |

---

## 5. Identified Visual, UX & Architectural Gaps Addressed in This Upgrade

1. **Theme & Visual Direction:** Currently uses generic cyber-neon blue/purple (`#030712`, `--neon-cyan: #00f0ff`, heavy `backdrop-filter: blur(16px)` on cards, background looping MP4 video) instead of the **Barind Stratigraphic Lab (`Barind Terracotta & Botanical Obsidian`)** palette (`#080D0A`, `#101713`, `#111A15`, `#18251D`, `#F1F1E8`, `#A6B2A7`, `#D97742`, `#10B981`, `#06B6D4`, `#F59E0B`, `#E36F67`, `#29352D`).
2. **Two-Tier Product Separation:** Lacks a dedicated Public Home Page (`/`) vs Operational Command Deck (`/app/*`).
3. **4-Layer Stratigraphic Digital Twin Hero:** Lacks the interactive exploded 4-layer digital twin (Layer 1: Atmosphere, Layer 2: Spectral Canopy, Layer 3: Agricultural Surface, Layer 4: Subsurface Root Zone) with exploded/assembled toggle and layer inspection.
4. **3D-First Agricultural Command Center (`/app/overview`):** Needs the interactive 3D/2.5D Godagari Agricultural Terrain centerpiece (~70% visual priority) surrounded by compact floating HUD panels, KPI Bento Grid, and the 9 Field Detail Sub-Tabs.
5. **Global `X-RAY PROVENANCE` Toggle:** Lacks a persistent global provenance overlay exposing source, resolution, coordinate offset, calibration state, and missing inputs on every metric and chart.
6. **Synchronized 2D/3D Spatial Twin (`/app/spatial-twin`):** Lacks the split-screen 2D GIS map + 2.5D/3D terrain view with linked cursor, camera sync, and the **34.8 km Spatial Offset Tether** (`24.469°N, 88.330°E` $\leftrightarrow$ `24.3636°N, 88.6241°E`).
7. **Canopy & Spectral Lab (`/app/spectral-lab`):** Needs Mode A (Same-date index comparison) and Mode B (Temporal comparison across 12 dates) with an interactive **Synchronized Curtain Wipe Slider + Linked Cursor** and native 10m vs 20m Band 11 disclosure.
8. **Root-Zone Physics Cutaway & Dual-Inspector (`/app/root-zone`):** Needs the interactive 2D + isometric 3D root-zone cutaway, provisional soil moisture threshold disclosure (`43.5%`, `32.3%`, `24.4%`, `16.5%`), irrigation efficiency scenario toggle (`70%` vs `85%`), and the **Physics Engine vs RAG AI Dual-Inspector**.
9. **Split-Screen What-If Simulator (`/app/simulator`):** Needs Scenario A vs Scenario B comparison wired to deterministic backend endpoints.
10. **Guided 3-Minute Judge Presentation Mode:** Needs the 6-step interactive walkthrough guiding judges across the 4-layer twin, 2D/3D spatial sync, spectral curtain wipe, FAO-56 root zone, What-If simulator, and bilingual RAG assistant.
