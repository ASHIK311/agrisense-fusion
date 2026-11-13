# Member 3: Automated Test Suite & Verification Results

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Test Suite Script:** [`tests/test_iot_pipeline.py`](file:///F:/nasa%20project/Member%203/tests/test_iot_pipeline.py)  
**Execution Timestamp:** 2026-11-10 16:11:57 Local  
**Test Status:** **7 / 7 AUTOMATED PIPELINE TESTS PASSED (100% PASS RATE)**  
**Hardware In-Situ Test Status:** **NOT PERFORMED (VIRTUAL / EMBEDDED ENVIRONMENT)**  

---

## 1. Automated Test Execution Summary

| Test ID | Test Category / Objective | Verification Method | Result | Execution Time |
|:---:|---|---|:---:|:---:|
| **`TEST-01`** | **Schema Integrity & Mandatory Columns** | Verifies presence of all 17 standardized schema fields in `soil_sensor_dataset.csv` | **PASS** | 0.015s |
| **`TEST-02`** | **Timestamp ISO 8601 UTC Conformance** | Parses 50 random sample timestamps; enforces trailing `'Z'` UTC indicator | **PASS** | 0.008s |
| **`TEST-03`** | **Physical Numeric Range & Bounds Check** | Asserts $VWC \in [0, 1]$, $T_{\text{soil}} \in [-10, 65]^\circ\text{C}$, $T_{\text{air}} \in [-20, 60]^\circ\text{C}$, $RH \in [0, 100]\%$, $V_{\text{batt}} \in [3.0, 4.3]\text{V}$ | **PASS** | 0.014s |
| **`TEST-04`** | **Duplicate Detection & Idempotency** | Checks for duplicate `(device_id, timestamp_utc)` pairings across 5,760 records | **PASS** | 0.006s |
| **`TEST-05`** | **Data Source Separation & Honest Labeling** | Verifies 100% of simulated records have `is_simulated = True` and source tagged | **PASS** | 0.005s |
| **`TEST-06`** | **Calibration Conversion Fidelity** | Validates quadratic polynomial conversion against 8 core samples ($RMSE < 0.02$) | **PASS** | 0.007s |
| **`TEST-07`** | **Sensor Fault & Sentinel Handling** | Verifies -127°C and saturation spikes result in `null` rather than fabricated values | **PASS** | 0.012s |
| **OVERALL** | **Automated Suite Execution** | **`unittest.TextTestRunner`** | **ALL 7 PASS** | **0.067s** |

---

## 2. Hardware Physical Testing Status

> [!WARNING] Physical Hardware Test Status: NOT PERFORMED
> In accordance with strict scientific disclosure guidelines:
> * **Microcontroller Physical Deployment:** **NOT PERFORMED**. No physical ESP32 development board, breadboard wiring, or solar panel was connected to this development workstation during the session.
> * **Soil Sensor Lab Calibration:** **NOT PERFORMED**. No soil core samples were physically oven-dried at 105°C during this virtual session.
> * **Firmware Code Readiness:** **VERIFIED**. The firmware code (`firmware/esp32_soil_monitor.ino`) is fully authored, standards-compliant, and ready for compiling and flashing via PlatformIO or Arduino IDE.
> * **Simulated Ground Data:** **VERIFIED**. A 60-day, 5,760-record dataset was mathematically synthesized to enable end-to-end software pipeline testing. Every record is explicitly marked `is_simulated = True`.
