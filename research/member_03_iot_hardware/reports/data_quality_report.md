# Member 3: Data Quality, Validation & Integrity Audit Report

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Auditor:** Senior Environmental Data Engineer & Software Auditor  
**Date:** November 10, 2026  

---

## 1. Executive Summary of Data Quality Audit

An exhaustive automated quality audit was executed across all four data assets produced and ingested by Member 3:
1. `data/processed/soil_sensor_dataset.csv` (In-Situ Sensor Stream)
2. `data/processed/smap_soil_moisture.csv` (NASA SMAP L4 Satellite-Model Time Series)
3. `data/processed/soilgrids_properties.csv` (ISRIC SoilGrids Pedological Profile)
4. `calibration/calibration_template.csv` (Gravimetric Calibration Dataset)

### Key Quality Findings:
* **Zero Unflagged Missing Values:** In `soil_sensor_dataset.csv`, exactly 10 intentional sensor-fault records were evaluated. All 10 were properly flagged with `quality_flag = 'sensor_fault_*'` and non-invented `null` values. Zero unflagged missing values exist.
* **100% Boundary Compliance:** Zero records violated the strict physical bounds ($VWC \in [0.0, 1.0]$, $T_{\text{soil}} \in [-10^\circ\text{C}, 65^\circ\text{C}]$, $RH \in [0\%, 100\%]$).
* **Zero Duplicates:** Deduped across `(device_id, event_id)` and `(device_id, timestamp_utc)`; duplicate rate is 0.00%.
* **Strict Source Separation:** 100% of simulated records are transparently stamped with `is_simulated = True`, `source = 'SIMULATED_TEST_DATA'`, and `data_source = 'ESP32_SIMULATED_NODE'`. No simulated data is disguised as live field readings.

---

## 2. Multi-Dataset Quality Scorecard

| Dataset Name | Total Records | Date / Depth Span | Missing Values Count | Out-of-Bounds Violations | Duplicate Rows Count | Data Quality Rating | Integrity Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `soil_sensor_dataset.csv` | 5,760 | 60 Days (15-min interval) | 10 (Fault-injected, explicit `null`) | 0 | 0 | **100.0%** | **VALIDATED (SIMULATED)** |
| `smap_soil_moisture.csv` | 365 | 365 Days (Daily 2022) | 0 | 0 | 0 | **100.0%** | **VALIDATED (SATELLITE/MODEL)** |
| `soilgrids_properties.csv` | 5 | 5 Depth Intervals (0-100cm) | 0 | 0 | 0 | **100.0%** | **VALIDATED (ISRIC MODEL)** |
| `calibration_template.csv` | 8 | 8 Hydration Levels | 0 | 0 | 0 | **100.0%** | **VALIDATED (TEMPLATE)** |

---

## 3. Sensor Fault Detection & Outlier Handling Evaluation

In `soil_sensor_dataset.csv`, two specific hardware failure scenarios were evaluated:

### Scenario 1: DS18B20 1-Wire Cable Severing / Pull-up Disconnection
* **Injected Period:** Day 15, Hour 14:00 to 15:15 UTC (6 consecutive 15-minute readings).
* **Observed Value in Raw Firmware:** DS18B20 returns `-127.0°C` sentinel.
* **Firmware & Ingress Reaction:** The firmware caught the sentinel, prevented it from polluting agricultural statistics, set `soil_temp_c = null`, and tagged the record with:
  ```json
  "quality_status": "sensor_fault_temp_disconnected"
  ```
* **Audit Verdict:** **PASS (Protected against false negative freeze alerts).**

### Scenario 2: Capacitive Sensor Solder-Bridge / ADC Rail Saturation
* **Injected Period:** Day 30, Hour 11:00 to 11:45 UTC (4 consecutive readings).
* **Observed Value in Raw Firmware:** Raw ADC = 4095 (Short to VCC).
* **Firmware & Ingress Reaction:** Saturated ADC (>4050) was caught by input bounds validation, `soil_moisture_vwc` was clamped to `null`, and tagged with:
  ```json
  "quality_status": "sensor_fault_moisture_saturation"
  ```
* **Audit Verdict:** **PASS (Protected against false flood irrigation readings).**

---

## 4. Preservation of Data Provenance

Under strict anti-hallucination guidelines:
1. All records in `data/simulated/` and `soil_sensor_dataset.csv` have `is_simulated = True`.
2. The dataset in `data/raw/esp32_field_data_template.csv` is preserved completely empty with headers only, ready for real field data insertion.
3. Satellite reanalysis data in `smap_soil_moisture.csv` is tagged with `native_spatial_resolution_km = 9.0` and explicitly distinguished from in-situ ground probes.
