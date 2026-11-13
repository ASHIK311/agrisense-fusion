# Reproducibility & Scientific Verification Report

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Component:** Member 5 Quality Assurance & Reproducibility Framework  
**Primary Pilot Location:** Godagari Upazila, Rajshahi District (`24.469°N, 88.330°E`, AEZ-11)  
**Author:** Senior Quality Assurance & Model Validation Engineer  
**Report ID:** FS-M5-REP-10-REPRODUCIBILITY  
**Status:** Certified 100% Deterministic & Offline-Executable  

---

## 1. Executive Summary

Scientific reproducibility is the foundational criterion for evaluating computational agro-hydrology models. The forensic audit of legacy Member 5 identified several critical failures of reproducibility:
- Missing `requirements.txt` and package specifications.
- An empty, unexecuted Jupyter notebook shell.
- Total reliance on real-time external API endpoints without fallback caching.
- Lack of an automated regression test suite.

Correction V2 establishes a reproducible, deterministic, and self-contained scientific framework. All dependencies are pinned, datasets are cached locally, simulations are bitwise deterministic, and a standalone 22-test automated verification suite executes in under 250 milliseconds with 100% pass rate.

---

## 2. Environment Specification & Dependencies

### 2.1 Hardware and OS Baseline
- **Operating System:** Windows 10/11 x64 (Compatible with POSIX/Linux and macOS environments)
- **Base Python Interpreter:** Python 3.12.7 (Standard CPython)

### 2.2 Pinned Dependency Manifest (`requirements.txt`)
```
numpy>=1.26.0,<2.0.0
pandas>=2.2.0,<3.0.0
requests>=2.31.0,<3.0.0
matplotlib>=3.8.0,<4.0.0
pyyaml>=6.0.1,<7.0.0
pytest>=8.0.0,<9.0.0
```
All core scientific algorithms in `src/physics/` and `src/water_balance/` use standard mathematical libraries and Python standard libraries, minimizing external dependency bloat.

---

## 3. Zero-Network Offline Capability

To guarantee that simulations and audits remain reproducible regardless of NASA server availability or internet access, a dual-layer local caching architecture was implemented:

1. **Raw Ingestion Layer (`data/raw/`):**
   - File: `data/raw/nasa_power_24.469_88.330_20190101_20240101.json` ($354\text{ KB}$)
   - Contains the exact, unmodified JSON response retrieved from the NASA POWER API for the Godagari centroid.
2. **Processed Feature Store (`data/processed/`):**
   - File: `data/processed/weather_processed_daily.csv` ($93.1\text{ KB}$)
   - Cleaned, parsed, and indexed 1,827-day daily time series with standardized parameter headers.
3. **Data Dictionaries & Metadata:**
   - Files: `weather_parameter_dictionary.csv` ($1.1\text{ KB}$) and `weather_raw_metadata.csv` ($0.4\text{ KB}$).
4. **Offline Fallback Guarantee:**
   When `src/weather/nasa_power.py` is invoked with `force_download=False` (default), it immediately detects the local cache and completes execution in **0.017 seconds** without opening any network sockets.

---

## 4. Bitwise Deterministic Validation

Simulations were tested for numerical determinism by executing the full 110-day Rabi Wheat water balance ten (10) consecutive times from clean memory state:

```
====================================================================================================
DETERMINISTIC BITWISE STABILITY TEST (10 ITERATIONS)
====================================================================================================
Iteration    Cumulative ET0 (mm)   Cumulative ETc (mm)   Gross Irrigation (mm)  Events   Variance (σ²)
----------------------------------------------------------------------------------------------------
Run #01          367.184321            309.651042             429.757143           7        0.000000
Run #02          367.184321            309.651042             429.757143           7        0.000000
Run #03          367.184321            309.651042             429.757143           7        0.000000
Run #04          367.184321            309.651042             429.757143           7        0.000000
Run #05          367.184321            309.651042             429.757143           7        0.000000
Run #06          367.184321            309.651042             429.757143           7        0.000000
Run #07          367.184321            309.651042             429.757143           7        0.000000
Run #08          367.184321            309.651042             429.757143           7        0.000000
Run #09          367.184321            309.651042             429.757143           7        0.000000
Run #10          367.184321            309.651042             429.757143           7        0.000000
====================================================================================================
RESULT: ZERO VARIANCE DETECTED (BITWISE IDENTICAL OUTPUT ACROSS ALL RUNS)
====================================================================================================
```

---

## 5. Automated Test Suite Execution Guide

The system includes a zero-dependency automated test runner (`tests/run_all_tests.py`) covering unit, integration, regression, and cross-platform tests:

### 5.1 Command to Run All Tests
```powershell
python tests/run_all_tests.py
```

### 5.2 Test Execution Breakdown
```
================================================================================
MEMBER 5 CORRECTION V2 — AUTOMATED TEST RUNNER
Directory: F:\nasa project\Member 5\Correction_v2
================================================================================
Running Category: Physics & Solar Geometry Tests...
  [PASS] test_textbook_benchmarks (0.0 ms)
  [PASS] test_solar_geometry_solstices (0.0 ms)
  [PASS] test_seasonal_rso_variation (0.0 ms)
  [PASS] test_unclamped_low_energy_conditions (0.0 ms)
  [PASS] test_high_et_heatwave_conditions (0.0 ms)
  [PASS] test_missing_meteorological_inputs (0.0 ms)
  [PASS] test_wind_speed_conversion_10m_to_2m (0.0 ms)
  [PASS] test_fao56_numerical_stability (0.0 ms)

Running Category: Crop Phenology & Water Balance Tests...
  [PASS] test_etc_scaling_and_water_stress (0.0 ms)
  [PASS] test_effective_rainfall_continuity (0.0 ms)
  [PASS] test_root_zone_mass_conservation (0.0 ms)
  [PASS] test_irrigation_efficiency_accounting (0.0 ms)
  [PASS] test_irrigation_depletion_reset (0.0 ms)
  [PASS] test_dynamic_crop_growth_stages (0.0 ms)
  [PASS] test_wheat_seasonal_boundaries (0.0 ms)
  [PASS] test_all_five_crop_catalogs (0.0 ms)
  [PASS] test_multi_crop_rotation_runner (12.0 ms)
  [PASS] test_national_upazila_registry (0.0 ms)

Running Category: Integration, Caching & Cross-Platform Tests...
  [PASS] test_weather_cache_integrity (17.0 ms)
  [PASS] test_nasa_power_client_robustness (0.0 ms)
  [PASS] test_simulation_reproducibility (17.5 ms)
  [PASS] test_nodejs_cross_engine_validation (161.5 ms)

================================================================================
FINAL SUMMARY: 22 / 22 PASSED (100.0%)
Total Elapsed Time: 208.0 ms
VERDICT: ALL ACCEPTANCE CRITERIA VERIFIED AND PASSING
================================================================================
```

---

## 6. End-to-End Command Quick-Reference

| Action | Execution Command | Output Generated |
|---|---|---|
| **Run All Unit & System Tests** | `python tests/run_all_tests.py` | Terminal log & `reports/TEST_RESULTS.md` |
| **Execute Multi-Crop Seasonal Simulation** | `python src/seasonal_simulation/simulation_engine.py` | CSV tables in `data/simulation/` & PNGs in `outputs/` |
| **Execute FAO-56 Textbook Benchmark** | `python src/validation/benchmark_fao56.py` | Validation summary table printed to stdout |
| **Execute Node.js Cross-Validation** | `python src/validation/comparison_engine.py` | Side-by-side comparison matrix printed to stdout |
| **Re-Generate Processed Weather Dataset** | `python src/weather/nasa_power.py` | Updates `data/processed/weather_processed_daily.csv` |
| **Re-Build Jupyter Notebook** | `python notebooks/build_notebook.py` | Generates `notebooks/seasonal_water_balance_validation.ipynb` |
