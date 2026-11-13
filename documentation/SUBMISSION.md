# NASA Space Apps Challenge 2026 — Submission Kit (`AgriSense Fusion`)

_Updated November 13, 2026 (`v2.1.0-competition-verified`). All numbers and capabilities below are reconciled against post-patch automated verification._

---

## 1. Space Apps Portal Submission Form (Ready to Paste)

### Project Name
**AgriSense Fusion — Multiscale Earth Observation & FAO-56 Crop-Rotation Operating System for Drought-Stressed Farms**

### High-Level Summary (Tagline)
> Fusing Sentinel-2 imagery, NASA POWER agroclimatology, and deterministic FAO-56 physics to help Barind Tract farmers transition away from aquifer-depleting Boro monoculture.

### Full Project Description
> **AgriSense Fusion** addresses the **Field Shift** challenge in Northern Bangladesh's drought-stressed **High Barind Tract (Godagari Upazila, AEZ-26 · `24.4690°N, 88.3300°E`)**, where intensive dry-season Boro rice extraction drives regional groundwater table decline (`0.65 m/year`, Jahan et al. 2010) toward the critical `28.0 m` suction limit of conventional surface centrifugal pumps.
>
> Instead of black-box guesses, AgriSense Fusion fuses six independently audited scientific layers into a synchronized 2D GIS and 3D WebGL Digital Twin:
> 1. **Satellite Land Cover (`RandomForest_21Feat_Deep`):** Multi-year Copernicus Sentinel-2 L2A spectral time-series (`12` scenes, `2022–2025`, NDVI/NDWI/NDMI/EVI) achieving `85.77%` Block C synthetic holdout accuracy (`84.02%` balanced accuracy, `0.8257` Macro-F1; `N = 6,000`) across 4 broad LULC classes, with an explicit `HTTP 422` gate preventing unvalidated crop-species claims.
> 2. **NASA POWER Agroclimatology:** Live Langley Point API integration plus a `1,827`-day Godagari baseline (`2019-01-01` to `2024-01-01`), guarding `-999` missing flags and flagging compound heat-dryness days (`Tmax >= 35°C`).
> 3. **FAO-56 Penman-Monteith Physics Engine:** Cross-language verified (`Node.js` ↔ `Python` parity across 4 Godagari seasons) evapotranspiration (`ET₀`) and Barind Silty Clay Loam root-zone depletion (`79.0 mm` TAW, `39.5 mm` RAW).
> 4. **Crop-Rotation MCDA Explorer:** Interactive 4-slider Multi-Criteria Decision Analysis (*Water Conservation, Soil Health, Heat Resilience, Farmer Profit*) dynamically ranking modeled provisional crop sequences (e.g., *Lentil → Aus Rice → T. Aman*, *Mustard → Mungbean → T. Aman*) alongside BARC AEZ-26 suitability matrices.
> 5. **ESP32 Edge IoT Pipeline:** Capacitive FDR v2 soil moisture firmware and timing-safe (`x-device-key`) REST ingestion with `HTTP 409` idempotency and explicit `is_simulated: true` / `UNCALIBRATED` hardware disclosures.
> 6. **Bilingual RAG Copilot (English + বাংলা):** Offline-capable hybrid BM25 + 3-gram RRF retrieval over `87` curated agronomic chunks (`100%` tool selection & disclosure pass across `30` queries) and `17` Bangladesh crop diseases grounded in `60` DOI-verified papers.
>
> Open data (`~2.80 GB` Sentinel-2 rasters and 1981–2024 national climate archive) is published on Hugging Face (`ashik1236/nasatest`), backed by `88/88` passing automated tests.

### Space Agency Data & Resources Used
- **NASA POWER Project** (Langley Research Center — `T2M`, `T2M_MAX`, `T2M_MIN`, `RH2M`, `ALLSKY_SFC_SW_DWN`, `WS10M`, `PRECTOTCORR`)
- **Copernicus Sentinel-2 L2A & ESA WorldCover 10m** (Multi-temporal spectral indices `B02/B03/B04/B08/B11/B12`)
- **ISRIC SoilGrids & Saxton-Rawls (2006) Pedotransfer Functions**
- **FAO Irrigation & Drainage Paper No. 56** (Allen et al. 1998)
- **BARC AEZ-26 Guidelines & BMDA Regional Drawdown Literature** (Jahan et al. 2010)

---

## 2. Timed 5-Minute Speaker Script (`presentation_script`)

- **[0:00–0:45] The Hook (Barind Groundwater Crisis):**
  *"In Godagari, Rajshahi—the heart of Bangladesh's High Barind Tract—farmers pump deep groundwater up to 45 times per hectare to grow dry-season Boro rice. Water tables are dropping by 0.65 meters per year, nearing the 28-meter physical suction limit of centrifugal tubewells. Yet farmers lack hyper-local water demand tools—and generic AI chatbots hallucinate farm advice."*
- **[0:45–1:45] Live Walkthrough — Command Hub & 3D Digital Twin:**
  *"Meet **AgriSense Fusion**. Right on the Command Hub, judges can see three real-time indicators: FAO-56 root-zone depletion (`49.5 / 79 mm`), the BMDA regional aquifer proxy (`26.4 / 28.0 m` — 1.6 meters from critical suction limit), and live NASA POWER agroclimatology. Beneath it sits our 4-layer Three.js stratigraphic twin synchronized pixel-for-pixel with Leaflet Sentinel-2 polygons."*
- **[1:45–2:45] Crop-Rotation Explorer & Dual 3D Canopy Compare:**
  *"Our centerpiece is the explainable Crop-Rotation Explorer. Watch as we adjust the 4-slider MCDA weights from Profit to Water Conservation—modeled low-water sequences like Lentil → Aus Rice → T. Aman instantly move to Rank #1 with transparent BARC AEZ-26 suitability scores and Dual-3D canopy water demand comparisons."*
- **[2:45–3:35] Scientific Integrity & Bilingual AI Copilot:**
  *"What sets AgriSense Fusion apart is **engineering honesty**. Notice every simulated IoT card is clearly labeled `SIMULATED · UNCALIBRATED`, groundwater carries `SYNTHETIC_REGIONAL_PROXY`, and unverified crop-species or yield endpoints return explicit HTTP 422/501 gates instead of fake numbers. Ask our AI Copilot in English or **বাংলা**—it runs deterministic FAO-56 tools over 87 audited chunks and cites 60 DOI-verified pathology papers."*
- **[3:35–4:30] Reproducibility & Verification:**
  *"Behind the UI: 88 out of 88 automated Node.js tests pass in under 4 seconds, verifying Node–Python FAO-56 parity, constant-time ESP32 device authentication, and multi-tenant isolation. Plus, 2.8 GB of Sentinel-2 GeoTIFF rasters are openly hosted on Hugging Face (`ashik1236/nasatest`)."*
- **[4:30–5:00] Closing:**
  *"AgriSense Fusion turns spaceborne NASA data into honest, physics-grounded crop decisions—built in Dhaka to protect Barind's aquifers."*

---

## 3. 10-Step Live Judge Demo Walkthrough (`demo_script`)

1. Launch locally with one click via **`start.bat`** (starts Express API on `:5000` and Vite React SPA on `:5173`).
2. **Home Hero (`/`):** Rotate the interactive 3D stratigraphic terrain cube and toggle spectral index layers (`NDVI`, `NDRE`, `MSAVI`, `EVI`).
3. **Command Hub (`/command`):** Highlight the three top triage cards (`Dr 49.5 / 79 mm`, `26.4 / 28.0 m` aquifer buffer, `NASA POWER` status) and point out the `SIMULATED` badge on the ESP32 pulse card.
4. **Earth Lab (`/earth-lab`):** Show synchronized 2D Esri/Sentinel-2 parcel polygons alongside the 3D WebGL Barind terrain cross-section (`PARCEL A-01 · 2.4 ha`).
5. **Water & Soil (`/water-soil`):** Inspect the NASA POWER rainfall vs. $ET_0$ / $ET_c$ chart and trigger **Equation Trace** to verify live Node–Python FAO-56 parity.
6. **Crops & Disease (`/crops-disease`):** Open **Side-by-Side 3D Canopies** comparing *T. Aman* (`420 mm`) vs *Boro Rice Monoculture* (`1,150 mm`) with lockstep orbit controls.
7. **What-If Lab (`/what-if`):** Slide **Water Conservation** up to `80%` and watch *Lentil → Aus Rice → T. Aman* (`Score: 81.4`) rank above water-heavy baselines.
8. **AI Copilot (`Ctrl + K` or Floating Orb):** Ask `"বোরো ধানের বিকল্প শস্য পর্যায় কি?"` or `"What is today's ET0?"` to showcase deterministic tool execution and DOI citations.
9. **Methods & Learn (`/methods`):** Show the honest provenance matrix—point out `85.77%` Block C LULC metrics, `60` DOIs, and explicit `HTTP 422 / 501` scientific boundaries.
10. **Automated Proof:** Run `npm test` in a terminal window live to show **`88 / 88` passed in ~3.9s**.

---

## 4. YouTube Pitch Description & Tags

```text
AgriSense Fusion — NASA Space Apps Challenge 2026 (Field Shift Track)

Can NASA satellite data help save Northern Bangladesh's shrinking groundwater aquifers?
In Godagari Upazila (High Barind Tract, AEZ-26), intensive Boro rice irrigation is driving water tables down by 0.65 m/year toward the 28-meter tubewell suction limit.

AgriSense Fusion combines:
• Copernicus Sentinel-2 L2A LULC Classification (85.77% Block C holdout)
• NASA POWER Agroclimatology (1,827-day baseline + live API)
• Deterministic FAO-56 Penman-Monteith Physics (Node-Python parity verified)
• Interactive 3D Stratigraphic Digital Twin & Dual-3D Crop Canopy Compare
• Bilingual (English & বাংলা) Grounded RAG Copilot with 60 DOI citations

GitHub Repository: https://github.com/ASHIK311/agrisense-fusion
Open Satellite Dataset (Hugging Face): https://huggingface.co/datasets/ashik1236/nasatest

#NASASpaceApps #SpaceApps2026 #FieldShift #AgriSenseFusion #BarindTract #Bangladesh #OpenScience #FAO56 #Sentinel2 #NASAPOWER
```
