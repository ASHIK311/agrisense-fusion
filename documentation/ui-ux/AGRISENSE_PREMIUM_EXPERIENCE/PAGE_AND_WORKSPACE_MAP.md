# AGRISENSE FUSION — PAGE & WORKSPACE ARCHITECTURE MAP

**Architecture:** Two-Tier Product Structure (Public Story Home `/` + Operational Command Deck `/app/*`)  
**Router & Context Controller:** [`frontend/src/context/AgriSenseContext.jsx`](file:///F:/nasa%20project/frontend/src/context/AgriSenseContext.jsx) & [`frontend/src/App.jsx`](file:///F:/nasa%20project/frontend/src/App.jsx)

---

## 1. Tier 1 — Public Home Page (`/`)

Implemented in [`HomeStoryPage.jsx`](file:///F:/nasa%20project/frontend/src/components/HomeStoryPage.jsx):
- **Hero Section:** `"Understand the Field. Protect the Water. Plan the Future."` + Interactive **4-Layer Stratigraphic Digital Twin** (`StratigraphicTwinCanvas.jsx`) + Primary CTA (`Launch Command Deck` → `/app/overview`) + Secondary CTA (`Explore Scientific Methodology` → `/app/methods`) + `3-Minute Judge Walkthrough` trigger.
- **14 Narrative & Interactive Preview Sections:**
  1. High Barind Hydrological Challenge (`26.4 m` DTW proxy vs `28.0 m` suction limit, `+0.65 m/yr` drawdown).
  2. Why Physics-Guided Water-Aware Decision Support Matters.
  3. 4-Layer Digital Twin Breakdown.
  4. 6-Subsystem Scientific Pipeline (`M1` through `M6`).
  5. Synchronized 2D/3D Field Exploration Preview.
  6. Sentinel-2 Spectral Comparison Preview.
  7. FAO-56 Root-Zone Water Cutaway Preview.
  8. Crop Rotation & What-If Scenario Comparison Preview.
  9. Bilingual AgriSense AI Assistant Preview.
  10. Data Provenance & Validation Ledger (`"Transparent Data. Honest Science. Explainable Decisions."`).
  11. Stakeholder Value Matrix (Farmers, Researchers, BMDA Officers).
  12. Guided 3-Minute Judge Demo Launcher.
  13. Scientific Data Acknowledgements (NASA POWER, Copernicus Sentinel-2, BARC, FAO-56).
  14. Final Command Deck Launch CTA.

---

## 2. Tier 2 — Operational Command Deck (`/app/*`, 14 Workspaces)

| # | Route | Workspace Name | Component | Primary Scientific Subsystem |
|---|---|---|---|---|
| 1 | `/app/overview` | **Command Deck (3D-First Center)** | `CommandDeck.jsx` | 3D/2.5D Terrain Centerpiece + 9 KPI Strip + **9 Field Detail Sub-Tabs** (`Overview`, `Satellite`, `Weather`, `Soil & IoT`, `Crop & Suitability`, `Water Balance`, `Disease Intelligence`, `Recommendations`, `Reports`) |
| 2 | `/app/spatial-twin` | **Spatial Twin (2D/3D)** | `SpatialTwinWorkspace.jsx` | Synchronized split-screen 2D GIS + 2.5D/3D terrain, linked crosshair cursor, and **34.8 km NASA POWER Spatial Offset Tether** |
| 3 | `/app/spectral-lab` | **Canopy & Spectral Lab** | `CanopySpectralLab.jsx` + `SatellitePanel.jsx` | Sentinel-2 Mode A (Same-date index wipe) & Mode B (12-scene temporal wipe), 10m vs 20m Band 11 provenance, HTTP 422 gate |
| 4 | `/app/climate` | **Climate Intelligence** | `ClimateIntelligenceWorkspace.jsx` + `WeatherChart.jsx` | NASA POWER MERRA-2 ($0.5^\circ\times0.625^\circ$) & CERES ($1.0^\circ\times1.0^\circ$), VPD, heat-dryness screening, HTTP 501 forecast gate |
| 5 | `/app/root-zone` | **Root-Zone Physics** | `RootZonePhysicsWorkspace.jsx` + `WaterBudgetPanel.jsx` | 2D + 3D soil column cutaway, provisional VWC thresholds (`43.5%`, `32.3%`, `24.4%`, `16.5%`), `70%` vs `85%` efficiency, Dual-Inspector |
| 6 | `/app/soil-iot` | **Soil & IoT Telemetry** | `SoilIotWorkspace.jsx` + `Esp32ApiDoc.jsx` + `GroundwaterPanel.jsx` | 4 subsections: Soil Profile, Sensor Telemetry (`5,760` source / `500` fast-cache), Soil Moisture, Hardware Contract (`UNCALIBRATED`) |
| 7 | `/app/crop-intelligence` | **Crop Intelligence** | `CropIntelligenceWorkspace.jsx` + `CropRotationExplorer.jsx` | BARC historical suitability (`Aman 78.92%`, `Maize 73.44%`, `Wheat 57.41%`, `Aus 40.98%`, `Boro 40.51%`) + 4-slider MCDA |
| 8 | `/app/crop-health` | **Crop Health & Pathology** | `CropHealthWorkspace.jsx` + `DiseasePanel.jsx` | 17 diseases, 60 DOI papers (`48` FT / `5` Abs / `7` Meta), 5-stage rule tree, `leaf_wetness_hours = null`, Dual-Inspector |
| 9 | `/app/simulator` | **What-If Simulator** | `WhatIfSimulatorWorkspace.jsx` | Split-screen Scenario A vs Scenario B deterministic comparison (`SIMULATED SCENARIO — NOT FIELD-VALIDATED SAVINGS`) |
| 10 | `/app/assistant` | **AgriSense AI (RAG)** | `AssistantPanel.jsx` | Bilingual (EN/বাংলা) grounded RAG chat, 83 knowledge chunks, 9 deterministic tools, DOI citations |
| 11 | `/app/reports` | **Reports & Export** | `AgronomicReportPanel.jsx` | Synthesis handover dossier, print/PDF view, and weather/telemetry CSV exports |
| 12 | `/app/methods` | **Methods & Validation** | `MethodsValidationWorkspace.jsx` | Reconciled M1–M6 validation ledger, Python/JS `< 1e-6` parity, 5-tier calibration roadmap |
| 13 | `/app/architecture` | **System Architecture** | `ArchitectureView.jsx` | Interactive 6-layer data flow pipeline and Mermaid specification |
| 14 | `/app/settings` | **Admin & Settings** | `AdminSettingsWorkspace.jsx` | Multi-tenant JWT login/register, alert acknowledgement, X-Ray/motion/density settings |
