# Field Shift: Satellite Image Processing, Remote Sensing & GIS Analysis
### *NASA Space Apps Challenge 2026 — Challenge: Field Shift (Adapting Farms with NASA Data)*
**Role:** Member 1 — Senior Remote Sensing Scientist, GIS Specialist & Geospatial ML Engineer  
**Study Area:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Centroid:** `24.469°N, 88.330°E` | **Area:** `445.69 km²` | **Projected CRS:** `EPSG:32645 (UTM Zone 45N)`  
**Production Model:** `RandomForest_21Feat_Deep` ([`models/optimized_model.pkl`](file:///F:/nasa%20project/data%20set%20that%20we%20test/Member_1_Satellite_GIS/models/optimized_model.pkl))  

---

## 1. Executive Summary & Mission Scope

In the drought-vulnerable **Barind Tract of Northern Bangladesh**, agricultural sustainability is severely challenged by excessive groundwater extraction for dry-season Boro rice cultivation. Groundwater tables are declining at **>0.5 m/year**, approaching the critical **28-meter suction lift limit** of centrifugal tubewell pumps.

As **Member 1**, this subsystem independently discovers, downloads, preprocesses, and analyzes multi-year **Copernicus Sentinel-2 Level-2A** and **USGS Landsat 8/9** satellite data across 2022–2025. The subsystem generates 56 vegetation and moisture index GeoTIFFs, models seasonal crop phenology, trains and spatial-block-validates a 21-feature machine learning land-cover classifier, and exposes all analytics through a hardened **FastAPI REST service** for integration with the main Field Shift platform.

---

## 2. Multi-Year Satellite Stack & Data Architecture

- **Study Area Extent:** 445.69 km² ($2,629 \times 2,522$ pixels at 10m ground sampling distance in EPSG:32645).
- **Satellite Data Cataloged:**
  - **Sentinel-2 MSI Level-2A:** 407 scenes cataloged; 12 cloud-screened canonical multi-temporal scenes processed across 2022–2025.
  - **Landsat 8/9 OLI-2:** 209 scenes cataloged (Path 138, Row 043).
  - **Processed GeoTIFFs:** 12 stacked 6-band rasters (`Blue_B02, Green_B03, Red_B04, NIR_B08, SWIR1_B11, Valid_Mask`) in `data/processed/`.
  - **Vegetation Indices:** 56 single-band GeoTIFFs (`NDVI, NDWI_McFeeters, NDMI_Gao, EVI`) organized in `indices/`.
- **Spatial Resolution & Sensor Integrity Disclosure:**
  - Bands B02, B03, B04, and B08 have native 10m spatial resolution.
  - Band B11 (SWIR1, 1610 nm) has a native 20m resolution and was resampled to 10m via bilinear interpolation to match the raster grid. In strict compliance with scientific integrity guidelines: **resampling B11 does NOT create genuine 10m spatial information**.
  - Cloud and shadow masking is strictly enforced using the Scene Classification Layer (SCL classes 3, 8, 9, 10 excluded).

---

## 3. Verified 21-Feature Machine Learning Schema

The production classifier operates on 21 physically grounded remote sensing features, strictly separated by derivation rules:

### A. Surface Reflectance Bands (5 Features)
- `Blue_B02` (490 nm), `Green_B03` (560 nm), `Red_B04` (665 nm), `NIR_B08` (842 nm), `SWIR1_B11` (1610 nm).

### B. Concurrent Spectral Indices (7 Features — Safely Derivable from Single Acquisition)
1. **NDVI (Normalized Difference Vegetation Index):** $\frac{\text{B08} - \text{B04}}{\text{B08} + \text{B04} + 10^{-7}}$
2. **NDWI (McFeeters Water Index):** $\frac{\text{B03} - \text{B08}}{\text{B03} + \text{B08} + 10^{-7}}$
3. **NDMI (Gao Moisture Index):** $\frac{\text{B08} - \text{B11}}{\text{B08} + \text{B11} + 10^{-7}}$
4. **EVI (Enhanced Vegetation Index):** $2.5 \times \frac{\text{B08} - \text{B04}}{\text{B08} + 6\text{B04} - 7.5\text{B02} + 1}$
5. **NDBI (Normalized Difference Built-Up Index):** $\frac{\text{B11} - \text{B08}}{\text{B11} + \text{B08} + 10^{-7}}$
6. **BSI (Bare Soil Index):** $\frac{(\text{B11} + \text{B04}) - (\text{B08} + \text{B02})}{(\text{B11} + \text{B04}) + (\text{B08} + \text{B02}) + 10^{-7}}$
7. **MNDWI (Modified Water Index):** $\frac{\text{B03} - \text{B11}}{\text{B03} + \text{B11} + 10^{-7}}$

### C. Multi-Temporal Phenological Features (9 Features — Strictly Forbidden to Synthesize)
- `Delta_NDVI_Kharif_Rabi` (Monsoon Kharif-2 to Winter Rabi vegetative swing).
- `NDVI_Seasonal_Min` (Annual minimum biomass trough).
- `NDVI_Seasonal_Max` (Annual peak photosynthetic biomass).
- `NDVI_Seasonal_Amplitude` ($\text{Max} - \text{Min}$ annual biomass swing).
- `NDVI_Seasonal_Std` (Phenological volatility across crop cycles — **#1 MDI Feature**).
- `NDMI_Seasonal_Mean` (Baseline canopy moisture level).
- `NDMI_Seasonal_Min` (Peak dry-season moisture deficit trough).
- `NDWI_Seasonal_Max` (Maximum surface ponding / standing floodwater).
- `EVI_Temporal_Change` (Structural biomass difference between seasons).

> [!CAUTION]
> **Anti-Hallucination Guardrail:** The API strictly rejects any single-date payload lacking multi-temporal features with **HTTP 400 Bad Request**. Multi-temporal dynamics are **never fabricated from single-date images**.

---

## 4. Machine Learning Benchmarks & Validation Results

### A. 5-Fold Spatial Block Cross-Validation (Contiguous Spatial Block Partitioning across Godagari Upazila)
The study area was partitioned into 5 geographically contiguous latitudinal blocks ($N = 20,000$ balanced points, 4,000 per fold). Models were trained and validated across folds:

| Model Architecture | Features | Spatial CV Accuracy | Balanced Accuracy | Macro-F1 | Calibrated Log-Loss |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Optimized Random Forest (`RandomForest_21Feat_Deep`)** | **21** | **84.63% ± 3.81%** | **84.37% ± 1.16%** | **0.8342 ± 0.0194** | **0.4208** |
| Candidate Extra Trees (`ExtraTrees_21Feat_Deep`) | 21 | 84.64% ± 3.86% | 84.42% ± 1.16% | 0.8338 ± 0.0195 | 0.4065 |
| Candidate LightGBM (`LightGBM_21Feat_Tuned`) | 21 | 84.52% ± 3.60% | 84.05% ± 0.88% | 0.8335 ± 0.0143 | 0.4768 |
| Candidate XGBoost (`XGBoost_21Feat_Tuned`) | 21 | 84.42% ± 3.77% | 84.01% ± 1.05% | 0.8324 ± 0.0159 | 0.4167 |
| Baseline Random Forest (`RandomForest_15Feat`) | 15 | 84.36% ± 3.83% | 84.14% ± 1.09% | 0.8315 ± 0.0183 | 0.4208 |

*Spatial Separation Method & Limitation:* Contiguous latitudinal block partition without inter-block buffer zones. Samples exist within 100m of fold boundary seams; residual spatial autocorrelation across boundary lines remains an inherent methodological limitation.

### B. Block C Development Holdout ($N = 6,000$)
Evaluated on the frozen southern latitudinal holdout ($N = 6,000$ points: 4,015 pure centroids, 1,985 mixed boundaries):
- **Class-Balanced Holdout Accuracy:** **85.77%** [95% Wilson CI: 84.86% – 86.63%] ($5,146 / 6,000$ correct).
- **Pure Interior Centroid Accuracy:** **90.64%** [95% Wilson CI: 89.69% – 91.50%] ($N = 4,015$). Demonstrates $>90\%$ discriminative power when sub-pixel boundary mixing is removed.
- **Mixed Boundary Pixel Accuracy:** **75.92%** [95% Wilson CI: 73.99% – 77.75%] ($N = 1,985$).
- **Per-Class Breakdown:**
  - **Cropland:** Precision = 77.17% | Recall = 86.21% | F1 = 0.8144
  - **Tree Cover:** Precision = 80.04% | Recall = 68.12% | F1 = 0.7360
  - **Permanent Water:** Precision = 98.67% | Recall = 92.10% | F1 = 0.9527
  - **Built-Up:** Precision = 72.16% | Recall = 89.67% | F1 = 0.7997
- **Target Accuracy Assessment:** **95% accuracy was not achieved under the current data, reference-label quality, spatial validation design, and 10m Sentinel-2 workflow.** Sub-pixel spectral mixing across 18.39% of boundary pixels remains the primary empirical constraint.

### C. Scientific Status of Area-Weighted Accuracy
- **Status:** **Not Yet Independently Established**.
- **Audit Finding:** Post-hoc synthetic weighting was audited and rejected because the southern Block C holdout (where Water is 45.77% of samples) violates design-based full-landscape sampling representativeness ($\pi_k = 0$ for northern and central Godagari). True area-weighted landscape accuracy requires a dedicated probability sample across the entire 445.69 km² polygon conforming to Olofsson et al. (2014).

---

## 5. Scientific Integrity & Ground-Truth Policy

1. **Agricultural Cropland Delineation is VALIDATED:** The model reliably distinguishes active Cropland from Tree Cover, Water, and Built-Up settlements.
2. **Field-Level Crop Species Separation (Rice vs. Wheat vs. Maize) is BLOCKED:**
   ESA WorldCover 2021 provides generic Cropland boundaries (Class 40). It contains zero crop-species labels. In strict accordance with scientific truthfulness, crop species are **NOT fabricated without official DAE (Department of Agricultural Extension) cadastral field parcel survey polygons**.
3. **No Fabrication of Seasonal Trends:** Empty JSON payloads (`{}`) and single-date payloads are rejected with HTTP 400.

---

## 6. FastAPI REST Service & Integration Guide

### Starting the Server
```powershell
& "F:\nasa project\data set that we test\Member_1_Satellite_GIS\.venv\Scripts\python.exe" -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### Implemented Endpoints:
1. `GET /health` — Service health, timestamp, and target study region.
2. `GET /satellite/metadata` — Cataloged scenes, available observation dates, and geographic bounds.
3. `GET /vegetation/indices?date=YYYY-MM-DD` — Statistical metrics for NDVI, NDWI, NDMI, and EVI.
4. `GET /vegetation/timeseries` — Multi-temporal seasonal observations with peak biomass and moisture stress summary.
5. `POST /vegetation/analyze` — Point-based crop canopy diagnosis, moisture stress level, and aquifer depletion alert.
6. `POST /crop/classify` — Production land-cover classification. Requires full feature vector. Rejects empty payloads (HTTP 400).
7. `GET /crop/classify/demo` — Dedicated endpoint returning classification for a documented representative Rabi agricultural parcel (`24.469°N, 88.330°E`).
8. `GET /maps/available` — Catalog of high-resolution maps, GeoTIFFs, and GeoJSON vectors.

---

## 7. Automated Test Suite & Verification

Run all test suites locally:
```powershell
# 1. Expanded FastAPI Test Suite (25 Tests)
& "F:\nasa project\data set that we test\Member_1_Satellite_GIS\.venv\Scripts\python.exe" api/test_api.py

# 2. Automated Pipeline Integrity Suite (7 Checks)
& "F:\nasa project\data set that we test\Member_1_Satellite_GIS\.venv\Scripts\python.exe" scripts/verify_pipeline.py
```
- **FastAPI Test Suite:** **25 / 25 tests passed (100% pass rate)**.
- **Pipeline Integrity Suite:** **7 / 7 checks passed (100% pass rate)**.
- **Audit Deliverables:** Stored in `reports/final_audit/`.
