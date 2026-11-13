# AgriSense Fusion: Project Plan & Scientific Roadmap

_Updated November 13, 2026 (`v2.1.0-competition-verified`). Tracks NASA Space Apps Field Shift challenge objectives, verified scientific baselines, and post-hackathon production milestones._

---

## 1. Challenge Alignment (*Field Shift: Adapting Farms with NASA Data*)

The **Field Shift** challenge asks teams to combine NASA Earth Observations and agro-meteorological tools to help farmers adapt cropping patterns to shifting water, heat, and climate constraints.

AgriSense Fusion anchors directly on **Godagari Upazila (`AEZ-26 High Barind Tract`)**, where dry-season Boro rice monoculture extracts deep groundwater faster than monsoon recharge (`0.65 m/year` decline toward the `28.0 m` pump suction threshold).

---

## 2. Verified Quantitative Baselines

| Domain | Verified Metric / Artifact | Provenance |
|---|---|---|
| **Satellite LULC Classification** | `85.77%` Block C overall accuracy (`84.02%` balanced acc, `0.8257` Macro-F1; `N = 6,000`) · `84.63% ± 3.81%` 5-Fold Spatial CV (`N = 20,000`) | `RandomForest_21Feat_Deep` (Copernicus Sentinel-2 L2A + ESA WorldCover) |
| **Weather & Climate Risk** | `1,827` daily Godagari observations (`2019-01-01` to `2024-01-01`) + live NASA POWER point API + `-999` null safety | NASA Langley Research Center (`MERRA-2` & `CERES`) |
| **FAO-56 Physics Parity** | Exact cross-language parity across 4 Godagari seasonal profiles (`April Extreme 7.49 mm/d`, `Jan Cool 2.41 mm/d`, `Jul Monsoon 2.94 mm/d`, `Oct 3.80 mm/d`) | Node.js `penmanMonteith.js` vs Member 5 Python `fao56.py` |
| **Root-Zone Soil Profile** | Canonical Barind Silty Clay Loam (`θsat 0.435`, `θFC 0.323`, `trigger 0.244`, `θWP 0.165`, `Zr 0.50m` ➔ `79.0 mm` TAW, `39.5 mm` RAW) | Saxton & Rawls (2006) PTF + SoilGrids alignment |
| **Pathology Knowledge Base** | `17` Bangladesh crop diseases + `60` DOI-verified papers (`48` full-text, `5` abstract, `7` metadata confirmed) | Member 6 Literature Registry |
| **Bilingual RAG Copilot** | `87` indexed chunks (`v2.1.2`), `30/30` tool selection (`100%`), `30/30` disclosure pass, `81.82%` Hit@4, `12.99 ms` mean latency | Offline Hybrid BM25 + 3-gram RRF |
| **Automated Test Coverage** | `88 / 88` Node.js tests (`0` failures) + `11` E2E live workflows + `3` scientific gates | `npm test` & `live_workflow_audit.js` |

---

## 3. Roadmap & Milestone Status

### Completed (Competition-Verified `v2.1.0`)
- [x] Multi-temporal Sentinel-2 L2A pipeline (12 scenes `2022–2025`, NDVI/NDWI/NDMI/EVI) and `RandomForest_21Feat_Deep` evaluation
- [x] Live NASA POWER API integration with `-999` missing-value handling and 1-hour rolling cache
- [x] Node–Python FAO-56 Penman-Monteith physics parity across full Stefan-Boltzmann `Rnl` and `10m -> 2m` wind profile
- [x] 4-Slider MCDA Crop-Rotation Explorer (Water Conservation, Soil Health, Heat Resilience, Farmer Profit)
- [x] 3D Stratigraphic WebGL Soil Twin, Dual 3D Canopy Comparison, and synchronized 2D Leaflet GIS parcel inspector
- [x] ESP32 capacitive FDR v2 hardware schema, firmware (`esp32_soil_monitor.ino`), timing-safe `x-device-key` auth, and `HTTP 409` idempotency
- [x] Bilingual (English & বাংলা) RAG Copilot with grounded citations and strict input/rate-limit bounds
- [x] Full Option 1 security remediation (`P1-01` signup role lock, `P2-01` favicon fix, multi-tenant scoping) and scientific reconciliation
- [x] Open dataset packaging on Hugging Face (`ashik1236/nasatest`, `~2.80 GB`) and light GitHub restructuring

### Next Milestones (Post-Hackathon Production)
- [ ] **PostgreSQL + PostGIS Runtime Cutover (`P2-02`):** Switch `storageService.js` to execute against `database/schema.sql` pool for horizontal scaling
- [ ] **Physical ESP32 Field Calibration:** Deploy weatherproof FDR v2 nodes in Godagari test plots and perform gravimetric oven-dry site calibration
- [ ] **DAE Cadastral Crop Polygons:** Partner with Bangladesh Department of Agricultural Extension (DAE) for parcel-level ground truth to lift the `HTTP 422` species classifier gate
- [ ] **Live BMDA Telemetry & Expert Validation:** Collect independent agronomic reviews via `documentation/review/EXPERT_REVIEW_KIT.md` and integrate live piezometer feeds
