# Field Shift — Member 5: Physics-Based Agro-Meteorological Water Balance & Seasonal Validation (Correction V2)

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Location:** Godagari Upazila, Rajshahi District, Bangladesh (`24.469°N, 88.330°E`, elevation 24.0 m, EPSG:32645)  
**Lead Specialist:** Senior Agricultural Water Resources Engineer, FAO-56 Specialist & Hydrologist  
**Primary Directory:** `Member 5/Correction_v2/` (Mirrored at `data set that we test/member_5_physics_water_balance_code/Correction_v2`)  
**Status:** Certified Independent Reference Implementation & Validation Suite  

---

## 1. System Overview

Member 5 Correction V2 provides an independent, scientifically validated Python reference implementation of the FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$), dynamic root-zone soil water balance, and seasonal irrigation scheduling framework for the Field Shift (AgriSense Fusion) project.

In accordance with strict system boundaries:
- The production JavaScript modules (`server/physics/penmanMonteith.js` and `server/physics/waterBalance.js`) and other member directories remain completely unmodified.
- Member 5 serves as the **independent scientific reference and validation engine**, providing benchmark verification, multi-crop seasonal budgeting, rotational groundwater impact analysis, and nationwide parameterization for Bangladesh.

---

## 2. Directory Architecture

```
Member 5/Correction_v2/
├── README.md                                # Master architectural guide (this file)
├── requirements.txt                         # Pinned Python dependencies
├── config/
│   ├── config.example.yaml                  # System configuration template
│   └── original_files_manifest.csv          # Cryptographic inventory of preserved original files
├── src/
│   ├── physics/
│   │   ├── fao56.py                         # Closed-form FAO-56 Penman-Monteith engine
│   │   └── solar_geometry.py                # Day-of-Year solar geometry & Ra/Rso calculator
│   ├── weather/
│   │   └── nasa_power.py                    # NASA POWER API client with retry and local caching
│   ├── crop_parameters/
│   │   ├── crop_catalog.py                  # Dynamic 4-stage phenology for 5 Bangladesh crops
│   │   └── national_adapter.py              # Nationwide registry for 7 benchmark Upazilas
│   ├── water_balance/
│   │   ├── effective_rainfall.py            # Continuous USDA-SCS effective precipitation model
│   │   ├── root_zone_balance.py             # Daily mass-conserving soil water balance engine
│   │   ├── irrigation_scheduler.py          # 70% application efficiency irrigation scheduler
│   │   └── soil_adapter.py                  # Dual-mode Member 3 ESP32 IoT telemetry adapter
│   ├── seasonal_simulation/
│   │   └── simulation_engine.py             # Multi-crop seasonal runner & 300 DPI plotting
│   └── validation/
│       ├── benchmark_fao56.py               # FAO-56 textbook worked example validation
│       └── comparison_engine.py             # Subprocess Node.js vs Python cross-validation
├── data/
│   ├── raw/
│   │   └── nasa_power_24.469_88.330_*.json  # Raw NASA POWER JSON cache (1,827 days)
│   ├── processed/
│   │   ├── weather_processed_daily.csv      # Cleaned daily weather time series (2019-2023)
│   │   ├── weather_parameter_dictionary.csv # Standardized parameter dictionary
│   │   └── weather_raw_metadata.csv         # Sensor heights, station elevation & headers
│   └── simulation/
│       ├── wheat_seasonal_water_balance.csv # Daily Rabi Wheat water balance output
│       ├── wheat_irrigation_events_ledger.csv# 7 scheduled irrigation events with pumping hrs
│       ├── rotation_wheat_2022_2023.csv     # Rotational Wheat simulation series
│       ├── rotation_aus_2023.csv            # Rotational Aus Rice simulation series
│       ├── rotation_aman_2023.csv           # Rotational Aman Rice simulation series
│       └── rotation_boro_2023.csv           # Rotational Boro Rice simulation series
├── outputs/
│   ├── fao56_seasonal_wheat_curve.png       # 300 DPI publication hyetograph/depletion curve
│   ├── rotation_wheat_curve.png             # Rabi Wheat water balance chart
│   ├── rotation_boro_curve.png              # Boro Rice water balance chart
│   └── rotation_aman_curve.png              # T. Aman Rice water balance chart
├── notebooks/
│   ├── build_notebook.py                    # Programmatic notebook generator script
│   └── seasonal_water_balance_validation.ipynb # Executed Jupyter notebook with outputs & plots
├── tests/
│   ├── run_all_tests.py                     # Zero-dependency master test runner
│   ├── test_fao56_physics.py                # 8 physics & solar geometry tests
│   ├── test_crop_and_water_balance.py       # 10 agronomy & soil hydrology tests
│   └── test_integration_and_system.py       # 4 caching, determinism & cross-platform tests
└── reports/                                 # 14 comprehensive technical and forensic reports
    ├── MASTER_FINAL_REPORT.md               # Master technical synthesis report
    ├── EXECUTIVE_SUMMARY.md                 # High-level executive summary
    ├── FAO56_VALIDATION_REPORT.md           # Analytical derivations & textbook verification
    ├── WEATHER_DATA_PROVENANCE.md           # NASA POWER Godagari data quality & correction
    ├── SEASONAL_CROP_WATER_BALANCE_REPORT.md# 5 crops, rotations & groundwater impact
    ├── EFFECTIVE_RAINFALL_REPORT.md         # USDA-SCS continuous non-linear model
    ├── IRRIGATION_SCHEDULING_REPORT.md      # 70% efficiency, net/gross & pumping hours
    ├── SOIL_SENSOR_COMPATIBILITY_REPORT.md  # Member 3 IoT adapter & synthetic data disclosure
    ├── NATIONAL_READINESS_REPORT.md         # Nationwide AEZ & Upazila parameterization
    ├── PYTHON_JS_COMPARISON_REPORT.md       # Node.js vs Python cross-validation (< 3% diff)
    ├── REPRODUCIBILITY_REPORT.md            # Determinism, offline execution & quick-commands
    ├── TEST_RESULTS.md                      # Detailed log of 22/22 passing automated tests
    ├── DATA_PROVENANCE_REGISTER.csv         # Structured dataset provenance table
    └── FINAL_HANDOVER.md                    # System transition document
```

---

## 3. Forensic Audit Resolutions Summary

| Issue # | Forensic Defect Identified in Audit | Status in V2 | Resolution in Correction V2 |
|:---:|---|:---:|---|
| 1 | Hardcoded coordinates: Rajshahi Sadar (`24.3636°N, 88.6241°E`) | **RESOLVED** | Re-anchored to Godagari Upazila centroid (`24.469°N, 88.330°E`, elev 24 m). |
| 2 | Duplication of production JavaScript physics | **RESOLVED** | Refactored as independent scientific reference & validation framework. |
| 3 | Clear-sky radiation hardcoded as $R_{so} = 0.75 \times 30.0 = 22.5$ | **RESOLVED** | Implemented Day-of-Year solar geometry ($R_a, R_{so} \in [18.23, 30.25]$). |
| 4 | $ET_0$ artificially clamped to $\ge 0.5\text{ mm/day}$ | **RESOLVED** | Removed arbitrary clamp; physics-based zero-energy lower bound verified. |
| 5 | Wheat simulated continuously for 1,827 days (5 years) | **RESOLVED** | Bounded seasonal simulations with strict phenological stages (110 days). |
| 6 | Fixed $K_c = 1.15$ and fixed rooting depth $Z_r = 0.6\text{ m}$ | **RESOLVED** | 4-stage dynamic $K_c(t)$ and root growth $Z_r(t)$ for 5 Bangladesh crops. |
| 7 | Irrigation scheduled during monsoon and summer fallow | **RESOLVED** | Crop-active boundary enforcement; zero off-season irrigation recorded. |
| 8 | Step discontinuity in effective rainfall around $2.0\text{ mm}$ | **RESOLVED** | Implemented continuous USDA-SCS non-linear formulation ($P_{eff}$). |
| 9 | Irrigation assumed 100% instantaneous efficiency | **RESOLVED** | Parameterized application efficiency ($\eta = 0.70$) & pump hours per ha. |
| 10 | NASA POWER requests lacked timeouts and backoff | **RESOLVED** | 15s timeout, 3-stage exponential backoff, and local JSON/CSV caching. |
| 11 | Missing packaging, requirements, and test harness | **RESOLVED** | Pinned `requirements.txt` and 22 automated test cases (100% pass rate). |
| 12 | Jupyter notebook was an unexecuted shell | **RESOLVED** | Rebuilt and executed notebook with interactive figures and outputs. |
| 13 | Soil sensor telemetry claimed without code | **RESOLVED** | Built dual-mode adapter (`soil_adapter.py`) with synthetic data disclosure. |
| 14 | Cross-platform discrepancy with Node.js unmeasured | **RESOLVED** | Verified $< 3.0\%$ discrepancy across 5 distinct climatic regimes. |

---

## 4. Quick Start & Execution Guide

### 4.1 Prerequisites
- Python 3.10+ (Tested on Python 3.12.7)
- Node.js (Optional, only required to execute cross-platform validation against `server/physics/penmanMonteith.js`)

### 4.2 Installation
```powershell
cd "Member 5/Correction_v2"
pip install -r requirements.txt
```

### 4.3 Running the Automated Test Suite (22 Tests)
```powershell
python tests/run_all_tests.py
```
*Expected Output: `22 / 22 PASSED (0 failures, ~200 ms)`.*

### 4.4 Running Multi-Crop Seasonal Simulations
```powershell
python src/seasonal_simulation/simulation_engine.py
```
*Executes Rabi Wheat, Boro Rice, Aus Rice, and T. Aman Rice simulations, generates CSV ledgers in `data/simulation/`, and outputs 300 DPI publication plots in `outputs/`.*

### 4.5 Running FAO-56 Textbook Benchmark Validation
```powershell
python src/validation/benchmark_fao56.py
```
*Validates FAO-56 Examples 17 and 18, printing a summary table to stdout.*

### 4.6 Running Node.js Cross-Platform Validation
```powershell
python src/validation/comparison_engine.py
```
*Spawns Node.js subprocess to compare `server/physics/penmanMonteith.js` against Python reference across 5 climatic scenarios.*

---

## 5. Key Scientific Findings & Agronomic Impact

1. **Analytical Fidelity:** The Python reference implementation achieves **$0.00\text{ mm/day}$ error (100.0% accuracy)** against official FAO-56 worked examples.
2. **Production Node.js Certification:** The production JavaScript engine matches the Python gold standard to within **$< 3.0\%$ relative discrepancy** across all seasons ($0.41\%$ during heatwaves, $0.60\%$ during monsoon, $2.96\%$ during winter fog), proving it is scientifically valid for operational deployment.
3. **Barind Groundwater Conservation:** Transitioning from the conventional Boro rice monoculture to a climate-smart diversified rotation (Wheat $\to$ Aus $\to$ Aman) reduces annual irrigation extractions from **$1,244.8\text{ mm/ha}$ to $726.5\text{ mm/ha}$**—a net savings of **$518.3\text{ mm/ha}$ ($41.6\%$ reduction)**.

---

## 6. Mandatory Scientific Disclosures

- **NASA POWER Meteorology:** Satellite and numerical reanalysis data ($0.5^\circ \times 0.625^\circ$), not an on-site physical weather station.
- **Agronomic Parameters:** Crop coefficients and growth stages are literature-derived from BARI, BRRI, and FAO-56 standards.
- **Soil Hydrology Parameters:** Soil textures and water-holding capacities are derived from official SRDI Upazila Land & Soil guides.
- **Member 3 IoT Ground Sensors:** All available sensor datasets are **synthetic emulator testbed data**; no ASTM D2216 oven-dry core calibrations have yet been conducted in Godagari fields. Current integration represents a validated hardware-in-the-loop harness.

---

## 7. Key References

1. **Allen, R. G., Pereira, L. S., Raes, D., & Smith, M. (1998).** *Crop evapotranspiration: Guidelines for computing crop water requirements.* FAO Irrigation and Drainage Paper No. 56, Food and Agriculture Organization of the United Nations, Rome.
2. **Bangladesh Agricultural Research Institute (BARI). (2019).** *Krishi Projukti Hathboi (Handbook on Agricultural Technology).* 8th Edition, Gazipur, Bangladesh.
3. **Bangladesh Rice Research Institute (BRRI). (2020).** *Modern Rice Cultivation (Adhunik Dhaner Chash).* 23rd Edition, Gazipur, Bangladesh.
4. **Soil Resource Development Institute (SRDI). (2014).** *Land and Soil Resource Utilization Guide: Godagari Upazila, Rajshahi District.* Ministry of Agriculture, Government of Bangladesh.
5. **NASA Langley Research Center POWER Project.** *Daily Agroclimatology Data Archive.* Accessed via POWER API v2.
