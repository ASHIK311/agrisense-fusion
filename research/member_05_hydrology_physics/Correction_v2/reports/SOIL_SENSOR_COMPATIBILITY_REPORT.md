# Soil Sensor Compatibility & Member 3 IoT Telemetry Adapter Report

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Component:** Member 3 / Member 5 Integration Interface (`soil_adapter.py`)  
**Target Centroid:** Godagari Upazila, Rajshahi District, Bangladesh (`24.469°N, 88.330°E`, elevation 24 m)  
**Author:** Senior IoT Systems Architect & Hydrologist  
**Report ID:** FS-M5-REP-07-SOIL-SENSOR  
**Status:** Tested Interface Architecture & Scientific Disclosure  

---

## 1. Executive Summary

This report establishes the technical specification, algorithmic data fusion, and scientific disclosure for the integration of Member 3's ESP32 IoT ground sensor telemetry into Member 5's root-zone water balance model.

The forensic audit revealed that the legacy Member 5 documentation made repeated unsubstantiated claims regarding "real-time IoT soil sensor assimilation" when no interface, data contract, or ingestion code existed in reality.

Correction V2 resolves this gap by designing a clean, fault-tolerant dual-mode adapter (`src/water_balance/soil_adapter.py`) that operates seamlessly in either:
1. `PHYSICS_ONLY` mode (pure meteorological water balance driven by NASA POWER), or
2. `SENSOR_ASSISTED` mode (assimilating volumetric water content telemetry via state-nudging).

Furthermore, this report provides a mandatory scientific disclosure regarding the synthetic nature of current testbed sensor records.

---

## 2. Dual-Mode Architecture Specification

```
                         +-----------------------------------+
                         |      NASA POWER METEOROLOGY       |
                         | (Tmax, Tmin, RH, Wind, Srad, Rain)|
                         +-----------------+-----------------+
                                           |
                                           v
                         +-----------------------------------+
                         |    FAO-56 PM & SOLAR GEOMETRY     |
                         |   Reference ET0 & Potential ETc   |
                         +-----------------+-----------------+
                                           |
                                           v
       +-----------------------------------+-----------------------------------+
       |                                                                       |
       v [Mode: PHYSICS_ONLY]                                                  v [Mode: SENSOR_ASSISTED]
+-------------------------------+                             +-----------------------------------+
|     Daily Soil Hydrology      |                             |   Member 3 ESP32 Telemetry Node   |
|   Mass Conservation Step      |                             | (node_id, vwc_percent, soil_temp) |
| (Rain, ETc, Infiltration, DP) |                             +-----------------+-----------------+
+---------------+---------------+                                               |
                |                                                               v
                |                                             +-----------------------------------+
                |                                             | Sensor Validation & Sanitization  |
                |                                             |   (0.05 <= VWC <= 0.55 check)     |
                |                                             +-----------------+-----------------+
                |                                                               |
                |      Prior Dr_physics                                         v Equivalent Dr_sensor
                +------------------------------> (+) <--------------------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  |   Data Fusion State Nudge    |
                                  | Dr = (1-w)*Dr_phys + w*Dr_sen|
                                  +--------------+---------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  |     Irrigation Scheduler     |
                                  |    (Net/Gross/Pump Hours)    |
                                  +------------------------------+
```

### 2.1 Mode 1: `PHYSICS_ONLY` (Default Baseline)
- **Operational Trigger:** When no ESP32 telemetry is available (hardware offline, network failure, packet loss, or unmonitored field).
- **Algorithm:** Standard FAO-56 daily water balance equation:
  $$D_{r,t} = D_{r,t-1} + ET_{c,act} - P_{eff} - I_{net} + DP_t$$
- **Characteristics:** 100% deterministic, mathematically mass-conserving, zero dependency on external hardware.

### 2.2 Mode 2: `SENSOR_ASSISTED` (Telemetry Assimilation)
- **Operational Trigger:** When a valid JSON telemetry payload is delivered from a Member 3 ground station.
- **Payload Schema:**
  ```json
  {
    "node_id": "ESP32_BARIND_01",
    "timestamp": "2023-01-15T08:00:00Z",
    "vwc_percent": 21.4,
    "soil_temp_c": 16.8,
    "battery_v": 3.92
  }
  ```
- **Validation Rules:**
  - $0.05 \le \theta_{obs} \le 0.55$ (checks physical volumetric bounds; flags air exposure $<5\%$ or standing flood $>55\%$).
  - Negative values or sensor dropouts trigger automatic fallback to `PHYSICS_ONLY`.

---

## 3. Mathematical State Nudging & Observation Fusion

When an in-situ volumetric soil water content reading $\theta_{obs}$ ($\text{m}^3/\text{m}^3$) is received:

1. **Observed Equivalent Depletion ($D_{r,sensor}$):**
   $$D_{r,sensor} = 1000 \times (\theta_{FC} - \theta_{obs}) \times Z_r(t)$$
   Where $\theta_{FC} = 0.28$ for Barind silt loam, and $Z_r(t)$ is the current dynamic rooting depth.
2. **State Nudging / Convex Combination:**
   The model state is updated using a confidence-weighted filter (default $w = 0.50$):
   $$D_{r,fused} = (1 - w) D_{r,physics} + w D_{r,sensor}$$
   Where:
   - $w = 0.0$: Ignores sensor (pure physics).
   - $w = 1.0$: Hard reset to sensor (pure empirical).
   - $w = 0.5$: Balanced state estimator, smoothing high-frequency capacitive sensor noise while correcting long-term model drift.

---

## 4. Mandatory Scientific Disclosure on Sensor Ground Truth

> [!CAUTION]
> **MANDATORY ACADEMIC AND ENGINEERING DISCLOSURE**
>
> 1. **Synthetic Nature of Available Data:** All Member 3 soil sensor datasets and telemetry packets currently present in the project workspace represent **synthetic / simulated testbed records** generated by ESP32 emulator scripts or laboratory breadboards.
> 2. **Absence of Field Calibration:** No in-situ gravimetric oven-drying core sampling (ASTM D2216 standard) has been executed on the heavy Barind silty clay loam soils of Godagari Upazila.
> 3. **Dielectric Sensitivity:** Low-cost capacitive soil sensors (e.g., Capacitive v1.2 / RS485 soil moisture probes) exhibit extreme non-linear sensitivity to soil salinity ($EC$), bulk density, and clay mineralogy in high-clay Barind soils ($>35\%$ illite/kaolinite clay content). Uncalibrated readings can easily have errors exceeding $\pm 12\%\text{ VWC}$.
> 4. **Ethical Communication Rule:** Under no circumstances should project presentations, reports, or frontend dashboards claim that the current application is "calibrated against live farmer field sensors". It must be accurately described as an **"Integrated Telemetry-Ready Simulation Harness"**.

---

## 5. Verification and Test Results

The adapter was tested in `tests/test_crop_and_water_balance.py`:
- **Fallback Verification:** Passing corrupted or out-of-range sensor payloads correctly defaulted to `PHYSICS_ONLY` with zero software crashes.
- **Nudging Verification:** Introducing a valid synthetic reading of $20.0\%\text{ VWC}$ correctly nudged a $45.0\text{ mm}$ prior depletion to $38.5\text{ mm}$ ($w = 0.50$), verifying the algebraic filter.
- **Passing Status:** All assertions confirmed passing.
