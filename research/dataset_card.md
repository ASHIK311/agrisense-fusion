---
language:
- en
- bn
license: mit
task_categories:
- image-segmentation
- tabular-classification
- time-series-forecasting
tags:
- nasa-space-apps-2026
- earth-observation
- sentinel-2
- nasa-power
- hydrology
- fao-56
- bangladesh
- barind-tract
- agriculture
pretty_name: AgriSense Fusion — High Barind Tract Sentinel-2 & NASA POWER Dataset
size_categories:
- 1G<n<10G
---

# AgriSense Fusion: High Barind Tract Earth Observation & Agroclimatology Dataset

**NASA Space Apps Challenge 2026 — Challenge: *Field Shift: Adapting Farms with NASA Data***  
**Primary Study Site:** Godagari Upazila, Rajshahi (`AEZ-26 High Barind Tract · 24.4690°N, 88.3300°E`)  
**Source Code Repository:** [ASHIK311/agrisense-fusion](https://github.com/ASHIK311/agrisense-fusion)  

---

## 📦 Dataset Contents (~2.80 GB)

This repository hosts the large multi-temporal geospatial GeoTIFF rasters, trained Random Forest binary classifiers, and multi-decade NASA POWER agroclimatology tables that accompany the lightweight codebase on GitHub.

### 1. `satellite_gis_barind/` (Sentinel-2 L2A & Spectral Indices, ~2.78 GB)
* **`data/raw/`**: 12 multi-year Sentinel-2 Level-2A acquisition scenes (`2022-10-21` to `2025-04-05`), bands `B02`, `B03`, `B04`, `B08`, `B11`, `B12`.
* **`data/processed/`**: 12 clipped and cloud-masked composite rasters (`*_godagari_preprocessed.tif`).
* **`data/labels/`**: ESA WorldCover baseline masks (`esa_worldcover_godagari.tif`, `esa_worldcover_godagari_polygon_utm.tif`).
* **`indices/` & `exports/geotiff/`**: Precomputed spectral indices (**NDVI**, **NDWI** McFeeters, **NDMI** Gao, **EVI**) across all 12 dates.
* **`maps/classification/`**: Land Use / Land Cover (LULC) classified rasters, prediction confidence maps, and spatial holdout error maps.
* **`models/`**: Trained scikit-learn / Random Forest `.pkl` model artifacts (`RandomForest_21Feat_Deep` and baseline checkpoints).
* **`reports/`**: High-resolution spatial figures and the compiled 34.8 MB PDF scientific report (`final_member1_report.pdf`).

### 2. `agronomy_national_climate/` (~15 MB)
* **`nasa_power_monthly_all_upazilas_1981_2024.csv`**: Long-term monthly NASA POWER agroclimatological time-series across Bangladesh upazilas (1981–2024).

---

## 📊 Verified Performance & Honest Scientific Limits

* **Model:** `RandomForest_21Feat_Deep` (`21` temporal/spectral features, `4` broad LULC classes: *Cropland, Tree Cover, Shrub/Grass/Bare, Water/Built*).
* **Block C Spatial Holdout ($N = 6,000$ synthetic holdout samples):**
  * Overall Accuracy: **`85.77%`** (`5,146 / 6,000`)
  * Balanced Accuracy: **`84.02%`**
  * Macro-F1: **`0.8257`** | Weighted-F1: **`0.8589`**
  * Pure Interior Centroid Accuracy: **`90.64%`** (`3,639 / 4,015`)
  * Mixed Boundary Accuracy: **`75.92%`** (`1,507 / 1,985`)
* **Spatial 5-Fold CV ($N = 20,000$ across Blocks A & B):** `84.63% ± 3.81%` (`0.8342 ± 0.0194` Macro-F1).
* **Important Scientific Disclosures:**
  * Block C is a southern latitudinal development holdout partition without an inter-block spatial buffer zone—not an untouched external field survey.
  * Fine-grained **crop species classification** (e.g., Boro rice vs. Wheat vs. Mustard at parcel scale) remains **explicitly gated/blocked (`HTTP 422`)** pending field-surveyed DAE cadastral crop polygons.

---

## ⬇️ Quick Download into GitHub Repo

If you cloned [ASHIK311/agrisense-fusion](https://github.com/ASHIK311/agrisense-fusion) and want to pull these heavy rasters locally:

```bash
pip install huggingface_hub
python scripts/download_dataset.py
```

Or directly via the Hugging Face CLI:

```bash
hf download ashik1236/nasatest --repo-type dataset --local-dir ./research/member_01_satellite_gis/hf_data
```

---

## 📜 Attribution & License

* **Earth Observation Data:** Copernicus Sentinel-2 L2A (ESA), ESA WorldCover 10m, NASA POWER (LaRC).
* **Code & Dataset Packaging:** Team AgriSense Fusion (Dhaka, Bangladesh) — Released under the [MIT License](https://github.com/ASHIK311/agrisense-fusion/blob/main/LICENSE).
