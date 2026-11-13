# Member 3: Reproducibility Protocol & Environment Report

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Root Directory:** `F:\nasa project\Member 3\`  
**Date:** November 10, 2026  

---

## 1. Software Environment & Requirements

The data processing, calibration fitting, and analytical chart pipelines require Python 3.10+ with standard scientific libraries:

```
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
seaborn>=0.12.0
pyproj>=3.6.0
```

To install dependencies:
```bash
cd "F:/nasa project/Member 3"
pip install -r requirements.txt
```

---

## 2. End-to-End Pipeline Reproduction Commands

Every analytical output, dataset, and chart can be reproduced in sequence using the following four commands:

### Step 1: Generate Calibration Models & Core Plot
```bash
python scripts/generate_calibration_data.py
```
* **Outputs Generated:**
  * `calibration/calibration_template.csv`
  * `charts/soil_moisture_calibration_curve.png`
* **Expected Result:** Quadratic fit $R^2 = 0.9959$, $\text{RMSE} = 0.0081$.

### Step 2: Compile Processed Datasets & SoilGrids Profiles
```bash
python scripts/compile_processed_datasets.py
```
* **Outputs Generated:**
  * `data/processed/soilgrids_properties.csv` (ISRIC v2.0 5-layer profile)
  * `data/processed/smap_soil_moisture.csv` (NASA SMAP L4 daily time series)
  * `data/simulated/esp32_simulated_readings.csv` (5,760 in-situ records)
  * `data/processed/soil_sensor_dataset.csv` (Standardized processed schema)

### Step 3: Generate Publication-Quality Analytical Figures & Summaries
```bash
python scripts/generate_analysis_and_charts.py
```
* **Outputs Generated:**
  * `analysis/daily_sensor_summary.csv`
  * `analysis/weekly_environmental_summary.csv`
  * `charts/soil_moisture_drying_and_irrigation.png`
  * `charts/soil_vs_air_temperature_dynamics.png`
  * `charts/soil_sensor_distributions.png`
  * `charts/soilgrids_depth_profiles.png`
  * `charts/smap_vs_insitu_scale_comparison.png`

### Step 4: Execute Automated Unit & Integration Test Suite
```bash
python -m unittest tests/test_iot_pipeline.py
```
* **Expected Result:** 7 tests executed, 0 failures, 0 errors in $< 0.1\text{ seconds}$ (`OK`).
