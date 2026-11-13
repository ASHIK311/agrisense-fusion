# Field Shift — Member 1 Satellite GIS: Executive Summary
**NASA Space Apps Challenge 2026**  
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Area:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Coordinates:** 24.469°N, 88.330°E | **Area:** 445.69 km² | **CRS:** EPSG:32645 (UTM Zone 45N)  
**Final Audit Status:** **PARTIALLY COMPLETED** (Land Cover Operational; Crop Species Blocked on Ground Truth)  

---

## 1. Project Background & Member 1 Scope
Member 1 is responsible for the complete satellite image processing, remote sensing analytics, GIS pipeline, and machine learning land cover classification for **Field Shift**, a decision-support platform designed to help smallholder farmers adapt to severe groundwater depletion in the Barind Tract of northwestern Bangladesh.

## 2. Key Audit Accomplishments & Technical Deliverables
1. **Critical GIS Discrepancy Resolved:** Investigated and permanently corrected the mathematical impossibility where earlier unmasked bounding-box calculations reported 626.12 km² of cropland in a 445.69 km² Upazila. By reprojecting the authoritative boundary to EPSG:32645 and applying strict polygon masking, the true cropland area is validated as **353.87 km² (79.40%)**.
2. **Satellite Provenance & Multi-Temporal Pipeline:** Discovered and cataloged **407 Sentinel-2 L2A scenes** and **209 Landsat 8/9 scenes** via Microsoft Planetary Computer STAC. Processed 4 canonical cloud-free Sentinel-2 L2A scenes across distinct phenological seasons (Early Boro, Peak Rabi, Pre-Monsoon Kharif-I, Monsoon Kharif-II) at 10m spatial resolution.
3. **Spectral Indices & Hydrological Metrics:** Computed 16 GeoTIFF rasters and 16 cartographic visualization maps covering NDVI (Canopy Greenness), NDWI (McFeeters Surface Water), NDMI (Gao Canopy Moisture), and EVI (High-Biomass Dynamics). Independently validated 10/10 test pixel calculations with $<10^{-5}$ error.
4. **Spatial-Block Multi-Model ML Benchmarking:** Audited training protocols and eliminated spatial autocorrelation leakage by enforcing a geographical block split (North Train vs. South Test). Benchmarked Random Forest, Extra Trees, LightGBM, and XGBoost across 20,000 samples. **Extra Trees** achieved top performance: **79.77% Overall Accuracy**, **0.799 Weighted F1**, and **0.729 Cropland F1**.
5. **Hardened Production FastAPI Service:** Built, tested, and validated an 8-endpoint REST API with 18 automated test suites passing (100% pass rate). Enforces coordinate bounding boxes, temporal validations, and model schemas.
6. **Scientific Honesty & Crop Species Status:** In strict compliance with NASA Space Apps integrity rules, general Land Cover (Cropland/Tree/Water/Built) is operational and validated. Differentiating Rice vs. Wheat vs. Maize is transparently marked **BLOCKED** pending cadastral parcel field surveys, with the complete survey schema established in `data/labels/ground_truth_schema.md`.
