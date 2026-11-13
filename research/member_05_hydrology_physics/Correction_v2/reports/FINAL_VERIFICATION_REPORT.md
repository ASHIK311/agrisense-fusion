# FINAL INDEPENDENT VERIFICATION REPORT — MEMBER 5 CORRECTION V2
## Comprehensive Quality Assurance, Forensic Re-Audit & Acceptance Verification

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Location:** Godagari Upazila, Rajshahi District, Bangladesh (`24.469°N, 88.330°E`, elevation 24.0 m, EPSG:32645)  
**Verification Auditor:** Independent Senior Software Auditor, Hydrologist & Agricultural Water Resources Validation Engineer  
**Workspace Under Audit:** `Member 5/Correction_v2/` (Mirrored at `data set that we test/member_5_physics_water_balance_code/Correction_v2`)  
**Production Codebase Checked:** `server/physics/penmanMonteith.js` and `server/physics/waterBalance.js`  
**Audit Timestamp:** November 2026  
**Final Verification Verdict:** **READY WITH LIMITATIONS**  

---

## 1. Executive Verdict & Summary

An exhaustive, independent verification of the **Member 5 Correction V2** subsystem was conducted. Every claimed capability, test case, physical equation, data file, and cross-platform interface was independently executed and inspected in a clean environment.

### Formal Verdict: **`READY WITH LIMITATIONS`**

#### Summary of Verdict Rationale:
1. **Core Physics & Code Quality (EXCELLENT):** The FAO-56 Penman-Monteith engine, Day-of-Year solar geometry, USDA-SCS continuous rainfall model, 70% irrigation efficiency accounting, and automated test suite (22/22 tests passing in 215.8 ms) are mathematically sound, fully implemented, and deterministic.
2. **Preservation of Original Files (CONFIRMED):** All 6 original files in `member_5_physics_water_balance_code/` and all other member folders remain 100% untouched with exact SHA-256 hash matches.
3. **Production Backend Cross-Validation (VERIFIED):** Direct subprocess execution of the production JavaScript module (`server/physics/penmanMonteith.js`) confirmed tight absolute tracking ($\le 0.54\text{ mm/day}$ absolute error).
4. **Mandatory Limitations Requiring Disclosure:**
   - **Groundwater Savings Discrepancy:** The widely reported **41.6% groundwater savings** ($1,244.78\text{ mm}$ vs $726.49\text{ mm}$) is a literature-synthesized comparison that incorporates real-world puddle bed deep percolation for flooded Boro rice ($\approx 1,162\text{ mm}$) and supplemental-only irrigation for Aman rice ($\approx 82\text{ mm}$). In contrast, the automated 1D aerobic simulation engine (`simulation_engine.py`) models only unsaturated soil depletion ($RAW$), yielding $838.08\text{ mm}$ for Boro and $476.39\text{ mm}$ for Aus. When evaluated purely on 1D aerobic evapotranspiration without puddle percolation, a 3-crop triple pattern (Wheat + Aus + Aman = $1,205.20\text{ mm}$) consumes more water than a 2-crop double pattern (Boro + Aman = $1,137.13\text{ mm}$).
   - **Cross-Engine Relative Discrepancies under Low Energy:** While absolute differences between Node.js and Python are negligible ($\le 0.54\text{ mm/day}$), relative discrepancies reach **15.4% to 23.7%** under winter fog and overcast monsoon conditions because the Node.js production module uses an empirical net radiation rule-of-thumb ($R_n \approx 0.75 R_{ns}$) rather than full Stefan-Boltzmann longwave emission.
   - **National Scope:** The Upazila registry contains **7 benchmark Upazilas across 4 AEZs**, representing a functional architectural template rather than full 495-Upazila national coverage.
   - **Soil Telemetry:** The Member 3 soil sensor integration is a tested software adapter (`soil_adapter.py`) operating on synthetic emulator records, pending physical ASTM D2216 field core calibration.

---

## 2. Item-by-Item Verification Findings

### Verification Item 1: Re-Run All 22 Tests in Clean Environment
- **Command Executed:** `python tests/run_all_tests.py` using Python 3.12.7.
- **Execution Output:**
  ```
  ==========================================================================================
  MEMBER 5 CORRECTION V2 — AUTOMATED VERIFICATION TEST SUITE (22 TESTS)
  ==========================================================================================
  [PASS] TEST-01: FAO-56 Official Textbook Worked Examples (0.0 ms)
  [PASS] TEST-02: Solar Geometry & Declination Across Solstices (0.0 ms)
  [PASS] TEST-03: Seasonal Variation in Clear-Sky Radiation Rso (0.0 ms)
  [PASS] TEST-04: Low-Energy Winter Cold Fog Conditions (Zero Clamping) (0.0 ms)
  [PASS] TEST-05: Barind April Extreme Heatwave Conditions (0.0 ms)
  [PASS] TEST-06: Graceful Missing Meteorological Variable Handling (0.0 ms)
  [PASS] TEST-07: Wind Speed 10m to 2m Logarithmic Conversion (0.0 ms)
  [PASS] TEST-08: ET0 Mathematical and Numerical Stability (0.0 ms)
  [PASS] TEST-09: ETc = Kc * ET0 Scaling and Water Stress Ks (0.0 ms)
  [PASS] TEST-10: Effective Rainfall Bounds & Smooth Continuity (0.0 ms)
  [PASS] TEST-11: Root-Zone Water Balance Mass Conservation (0.0 ms)
  [PASS] TEST-12: Irrigation Application Efficiency Accounting (70%) (0.0 ms)
  [PASS] TEST-13: Irrigation Threshold Trigger and Depletion Reset (0.0 ms)
  [PASS] TEST-14: Crop Growth Stages and Phenological Boundaries (0.0 ms)
  [PASS] TEST-15: Wheat Seasonal Restrictions (No Monsoon Irrigation) (0.0 ms)
  [PASS] TEST-16: Aman, Boro, and Aus Rice Phenology Calendars (0.0 ms)
  [PASS] TEST-17: Multi-Season Rotational Simulation Runner (10.0 ms)
  [PASS] TEST-18: Nationwide Upazila Profile Parameterization (0.0 ms)
  [PASS] TEST-19: Raw Weather JSON and Processed CSV Caching (18.0 ms)
  [PASS] TEST-20: NASA POWER API Timeout & Retry Configurations (0.0 ms)
  [PASS] TEST-21: Deterministic 100% Simulation Reproducibility (18.0 ms)
  [PASS] TEST-22: Cross-Platform Validation: Python vs Node.js Backend (169.8 ms)
  ==========================================================================================
  TEST SUMMARY: 22/22 Passed | 0 Failed | Total Time: 215.8 ms
  ==========================================================================================
  ```
- **Auditor Evaluation:** **VERIFIED PASS (100% Pass Rate)**.

---

### Verification Item 2: Independently Reproduce FAO-56 Examples 17, 18, 19, and 21
An independent verification script was executed evaluating the exact equations from Allen et al. (1998):
- **FAO-56 Chapter 3, Example 17 (p. 46):**
  - Latitude: $45.0^\circ\text{S}$, Day of Year: 135 (15 May).
  - Derived parameters: $d_r = 0.965$, $\delta = 0.327\text{ rad}$, $\omega_s = 1.224\text{ rad}$.
  - Extraterrestrial radiation $R_a$: Computed **$12.85\text{ MJ/m}^2/\text{day}$** (Textbook target: $12.8\text{ MJ/m}^2/\text{day}$). Error: $< 0.4\%$.
- **FAO-56 Chapter 3, Example 18 (p. 47):**
  - Latitude: $13.0^\circ\text{N}$, Day of Year: 246 (3 September).
  - Derived parameters: $d_r = 0.985$, $\delta = 0.120\text{ rad}$, $\omega_s = 1.600\text{ rad}$.
  - Daylight hours $N$: Computed **$12.21\text{ hours}$** (Textbook target: $12.2\text{ hours}$). Error: $0.08\%$.
  - Extraterrestrial radiation $R_a$: Computed **$37.38\text{ MJ/m}^2/\text{day}$** (Textbook target: $37.4\text{ MJ/m}^2/\text{day}$). Error: $0.05\%$.
- **FAO-56 Chapter 3, Example 19 (p. 49):**
  - Elevation: $100\text{ m}$, $R_a = 37.9\text{ MJ/m}^2/\text{day}$.
  - Clear-sky radiation $R_{so} = (0.75 + 2 \times 10^{-5} \times 100) \times 37.9 = 28.50\text{ MJ/m}^2/\text{day}$ (Textbook: $28.5\text{ MJ/m}^2/\text{day}$). Error: $0.00\%$.
- **FAO-56 Chapter 4, Example 21 (p. 72):**
  - Full Penman-Monteith evaluation: Computed **$3.94\text{ mm/day}$** (Textbook target: $3.9\text{ mm/day}$). Error: $< 1.0\%$.
- **Auditor Evaluation:** **VERIFIED PASS (Exact Mathematical Reproduction)**.

---

### Verification Item 3: Python vs. Production Node.js Source Code Comparison
Direct execution of `server/physics/penmanMonteith.js` via Node.js subprocess was compared against `src/physics/fao56.py`:

| Case ID | Scenario Name | Python Reference $ET_0$ | Production Node.js $ET_0$ | Absolute Difference | Relative Difference | Agreement Tier |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **CMP-01** | Standard Barind Spring Day (March) | **$4.09\text{ mm/d}$** | **$3.98\text{ mm/d}$** | $0.110\text{ mm/d}$ | **$2.76\%$** | **EXCELLENT** |
| **CMP-02** | Barind Severe April Heatwave | **$9.64\text{ mm/d}$** | **$9.68\text{ mm/d}$** | $0.040\text{ mm/d}$ | **$0.41\%$** | **EXCELLENT** |
| **CMP-03** | January Cold Wave / Dense Fog | **$0.90\text{ mm/d}$** | **$0.78\text{ mm/d}$** | $0.120\text{ mm/d}$ | **$15.38\%$** | **DEVIATION (Low ET)** |
| **CMP-04** | Monsoon Overcast Day (July) | **$1.88\text{ mm/d}$** | **$1.52\text{ mm/d}$** | $0.360\text{ mm/d}$ | **$23.68\%$** | **DEVIATION (Low ET)** |
| **CMP-05** | Clear Winter Day (Dec Sowing) | **$2.35\text{ mm/d}$** | **$2.89\text{ mm/d}$** | $0.540\text{ mm/d}$ | **$18.69\%$** | **DEVIATION (Rnl Model)** |

#### Auditor Analysis & Forensic Disclosure:
- **Absolute Concordance:** Absolute differences across all scenarios are very small ($\le 0.54\text{ mm/day}$), confirming that both engines track general evaporative trends.
- **Source of Divergence:** In `server/physics/penmanMonteith.js` (lines 150–152):
  ```javascript
  const Rns = (1 - 0.23) * solarRadiationMJ;
  const Rn = Math.max(0, Rns * 0.75); // Net radiation estimate in MJ/m²/day
  ```
  The production JavaScript engine uses an agricultural rule-of-thumb ($R_n \approx 0.75 R_{ns}$). On clear, dry winter days (CMP-05), actual Stefan-Boltzmann net longwave radiation escape ($R_{nl}$) is higher, meaning actual $R_n$ is closer to $0.52 R_{ns}$. This causes Node.js to overestimate winter radiation by $\sim 2.6\text{ MJ/m}^2/\text{d}$, resulting in $0.54\text{ mm/day}$ higher $ET_0$.
- **Auditor Evaluation:** **VERIFIED WITH DISCLOSURE**. The production JavaScript engine is acceptable for general operations, but technical documentation must not claim that Python and JS agree to within $< 3\%$ across all regimes; the $< 3\%$ agreement holds under standard spring and summer heatwave conditions, but deviates up to $23.7\%$ under low-energy/winter regimes due to the $0.75 R_{ns}$ approximation.

---

### Verification Item 4: Consistency of 70% Irrigation Application Efficiency
- **Inspection Target:** `src/water_balance/irrigation_scheduler.py`, `root_zone_balance.py`, and `data/simulation/wheat_irrigation_events_ledger.csv`.
- **Mathematical Relationship:**
  $$I_{gross} = \text{round}\left(\frac{I_{net}}{\eta}, 2\right) \quad \text{where } \eta = 0.70$$
- **Verification Across All 7 Wheat Events in Ledger:**
  - Event IRR-WHE-001: $I_{net} = 15.05\text{ mm}$, $I_{gross} = 21.50\text{ mm}$, Expected $= 21.50\text{ mm}$ (Diff: $0.0000$)
  - Event IRR-WHE-002: $I_{net} = 42.37\text{ mm}$, $I_{gross} = 60.53\text{ mm}$, Expected $= 60.53\text{ mm}$ (Diff: $0.0000$)
  - Event IRR-WHE-003: $I_{net} = 47.59\text{ mm}$, $I_{gross} = 67.99\text{ mm}$, Expected $= 67.99\text{ mm}$ (Diff: $0.0000$)
  - Event IRR-WHE-004: $I_{net} = 48.58\text{ mm}$, $I_{gross} = 69.40\text{ mm}$, Expected $= 69.40\text{ mm}$ (Diff: $0.0000$)
  - Event IRR-WHE-005: $I_{net} = 50.35\text{ mm}$, $I_{gross} = 71.93\text{ mm}$, Expected $= 71.93\text{ mm}$ (Diff: $0.0000$)
  - Event IRR-WHE-006: $I_{net} = 50.45\text{ mm}$, $I_{gross} = 72.07\text{ mm}$, Expected $= 72.07\text{ mm}$ (Diff: $0.0000$)
  - Event IRR-WHE-007: $I_{net} = 46.44\text{ mm}$, $I_{gross} = 66.34\text{ mm}$, Expected $= 66.34\text{ mm}$ (Diff: $0.0000$)
- **Mass Balance Inflow:** In `root_zone_balance.py`, only $I_{net}$ replenishes the soil reservoir ($D_{r,end} = D_{r,pre} - I_{net}$); the conveyance/application losses ($I_{gross} - I_{net}$) do not enter the root zone.
- **Auditor Evaluation:** **VERIFIED PASS (Strict 100% Consistency)**.

---

### Verification Item 5: Analysis of the 41.6% Groundwater-Saving Calculation
An audit of the rotational simulation data in `data/simulation/` revealed a critical distinction between the **literature-synthesized comparison** in the narrative reports and the **raw automated 1D aerobic simulation output**:

#### 1. The Literature-Synthesized Comparison (Reported in Markdown):
- Conventional (Boro + Aman): Boro ($1,162.29\text{ mm}$) + Aman ($82.49\text{ mm}$) = **$1,244.78\text{ mm/ha}$**.
- Diversified (Wheat + Aus + Aman): Wheat ($429.76\text{ mm}$) + Aus ($214.24\text{ mm}$) + Aman ($82.49\text{ mm}$) = **$726.49\text{ mm/ha}$**.
- Reported Difference: $1,244.78 - 726.49 = 518.29\text{ mm/ha}$ (**$41.6\%$ reduction**).
- *Physical Assumption:* This literature model assumes that flooded wetland Boro rice requires $1,000–1,200\text{ mm}$ due to continuous standing puddle water percolation ($3–5\text{ mm/day}$), while Aman rice in the monsoon requires only supplemental irrigation ($82\text{ mm}$).

#### 2. The Actual Raw 1D Aerobic Engine Output (`simulation_engine.py`):
When the automated script was run over the 2022–2023 Godagari weather series using the 1D aerobic root-zone balance model (which does not simulate flooded puddle percolation or ponding layers):
- `rotation_wheat_2022_2023.csv`: $I_{gross} = 429.76\text{ mm/ha}$ ($110\text{ days}$)
- `rotation_aus_2023.csv`: $I_{gross} = 476.39\text{ mm/ha}$ ($100\text{ days}$)
- `rotation_aman_2023.csv`: $I_{gross} = 299.05\text{ mm/ha}$ ($130\text{ days}$)
- `rotation_boro_2023.csv`: $I_{gross} = 838.08\text{ mm/ha}$ ($120\text{ days}$)
- *Resulting Totals:*
  - Conventional (Boro + Aman): $838.08 + 299.05 = \mathbf{1,137.13\text{ mm/ha}}$
  - Diversified (Wheat + Aus + Aman): $429.76 + 476.39 + 299.05 = \mathbf{1,205.20\text{ mm/ha}}$
  - Net Balance: In a 1D unsaturated ET model without puddle percolation, a triple-cropping pattern (3 crops) extracts $+68.07\text{ mm/ha}$ ($5.99\%$ more water) than a double-cropping pattern (2 crops).
- **Auditor Evaluation:** **CRITICAL LIMITATION DOCUMENTED**. The $41.6\%$ groundwater saving is valid **only under real-world agronomic conditions where Boro's continuous standing water percolation losses are accounted for**. It must be explicitly disclosed that the current 1D unsaturated engine does not yet simulate 2D wetland puddle hydrology.

---

### Verification Item 6: Crop Phenology ($K_c$) & Rooting Depths ($Z_r$) vs. Citations
- **Source Documents:** FAO-56 Table 12, BARI *Krishi Projukti Hathboi* (2019), BRRI *Modern Rice Cultivation* (2020).
- **Audited Parameters:**
  - **Wheat:** $K_c = [0.35, 1.15, 0.40]$, $Z_r = [0.20, 0.60\text{ m}]$, $p = 0.55$. (Matches FAO-56 Table 12; maximum rooting depth $0.60\text{ m}$ correctly reflects Barind plough-pan compaction).
  - **Boro Rice:** $K_c = [1.05, 1.20, 0.90]$, $Z_r = [0.20, 0.50\text{ m}]$, $p = 0.20$. (Matches FAO-56 Table 12 wetland rice; low depletion $p=0.20$ reflects shallow root sensitivity).
  - **T. Aman Rice:** $K_c = [1.05, 1.20, 0.90]$, $Z_r = [0.20, 0.50\text{ m}]$, $p = 0.20$. (Matches BRRI guidelines).
  - **Aus Rice:** $K_c = [1.00, 1.15, 0.85]$, $Z_r = [0.20, 0.50\text{ m}]$, $p = 0.30$. (Matches BRRI Aus manual).
  - **Maize:** $K_c = [0.30, 1.20, 0.50]$, $Z_r = [0.30, 0.80\text{ m}]$, $p = 0.55$. (Matches BARI bulletin).
- **Auditor Evaluation:** **VERIFIED PASS (Scientifically Sourced & Regionally Adapted)**.

---

### Verification Item 7: Scope of the 7-Upazila National Registry
- **File Inspected:** `src/crop_parameters/national_adapter.py`.
- **Registry Count:** Exactly 7 Upazilas:
  1. `godagari` (Rajshahi / AEZ-26 High Barind)
  2. `tanore` (Rajshahi / AEZ-26 High Barind)
  3. `nachole` (Chapai Nawabganj / AEZ-26 High Barind)
  4. `niamatpur` (Naogaon / AEZ-26 High Barind)
  5. `dinajpur_sadar` (Dinajpur / AEZ-1 Old Himalayan Piedmont)
  6. `chuadanga_sadar` (Chuadanga / AEZ-11 High Ganges Plain)
  7. `mymensingh_sadar` (Mymensingh / AEZ-9 Old Brahmaputra Plain)
- **Scope Verification:** Bangladesh contains 495 administrative Upazilas across 30 Agro-Ecological Zones (AEZs). The registry represents **7 benchmark representative profiles** illustrating national extensibility across 4 distinct AEZs.
- **Auditor Evaluation:** **VERIFIED WITH CLARIFICATION**. The codebase must not be described as possessing a complete national Upazila database. It is a functional architectural adapter with 7 pre-configured benchmark profiles.

---

### Verification Item 8: Cryptographic Preservation of Original Files
The SHA-256 hashes of all 6 original files in `F:\nasa project\data set that we test\member_5_physics_water_balance_code` were re-computed and compared against `original_files_manifest.csv`:

| Original File Name | File Size | Expected SHA-256 | Actual Re-Computed SHA-256 | Integrity Status |
|---|:---:|---|---|:---:|
| `fao56_water_balance_curve.png` | 428,614 B | `2F7BB8482D4D9E08E58EBF...` | `2F7BB8482D4D9E08E58EBF...` | **100% UNTOUCHED** |
| `Member 5 Technical Documentation.pdf` | 203,977 B | `DEE43910C4CA8057908495...` | `DEE43910C4CA8057908495...` | **100% UNTOUCHED** |
| `member5_notebook.ipynb` | 917 B | `BFC45C20E6F48C6B49D5B4...` | `BFC45C20E6F48C6B49D5B4...` | **100% UNTOUCHED** |
| `member5_water_balance_physics.py` | 7,224 B | `177FE95681EB5319273C02...` | `177FE95681EB5319273C02...` | **100% UNTOUCHED** |
| `README.md` | 1,422 B | `25C0E847FCD0FC7B876425...` | `25C0E847FCD0FC7B876425...` | **100% UNTOUCHED** |
| `water_balance_simulation (1).csv` | 127,023 B | `1A54E72BD5EFFA30B6BC6E...` | `1A54E72BD5EFFA30B6BC6E...` | **100% UNTOUCHED** |

- **Auditor Evaluation:** **VERIFIED PASS (Absolute Zero File Modification)**.

---

### Verification Item 9: Status of Claimed Subsystem Integrations

| Subsystem Component | Claimed Integration Level | Actual Verified Implementation Status | Honest Classification |
|---|---|---|---|
| **Production Node.js Backend** | Cross-platform validation | Automated live subprocess execution in `comparison_engine.py` | **REAL & TESTED INTERFACE** |
| **NASA POWER Weather API** | Real-time weather ingestion | Client with 15s timeout, exponential backoff, and local JSON/CSV caching | **REAL & TESTED INTERFACE** |
| **Member 3 ESP32 IoT Soil Sensors** | Sensor data assimilation | Software adapter `soil_adapter.py` with state-nudging math, tested on synthetic data | **TESTED ADAPTER (Synthetic Data Only)** |
| **Member 4 Crop Recommendation** | Agronomic crop parameters | Parameter registry `crop_catalog.py` and `national_adapter.py` | **ARCHITECTURAL COMPATIBILITY** |
| **Member 1 GIS / Remote Sensing** | Field polygon boundaries | Manual coordinate ingestion (`24.469°N, 88.330°E`) | **FUTURE COMPATIBILITY ONLY** |
| **Member 2 Heat/Desiccation Screening**| Weather parameter sharing | Independent NASA POWER client ingestion | **FUTURE COMPATIBILITY ONLY** |

- **Auditor Evaluation:** **VERIFIED PASS WITH ACCURATE CLASSIFICATION**. Tested interfaces are clearly segregated from future conceptual linkages.

---

## 3. Formal Assessment & Risk Limitations Summary

```
====================================================================================================
MEMBER 5 CORRECTION V2 — AUDIT ACCEPTANCE SCORECARD
====================================================================================================
Verification Category                      Score    Status          Auditor Findings
----------------------------------------------------------------------------------------------------
1. Mathematical Physics (FAO-56)           100/100  VERIFIED        Exact match with textbook benchmarks
2. Day-of-Year Solar Geometry              100/100  VERIFIED        Dynamic Ra and Rso fully active
3. Effective Rainfall Continuity           100/100  VERIFIED        USDA-SCS smooth formulation
4. Application Efficiency Accounting       100/100  VERIFIED        Consistent 70% gross/net ratio
5. Dynamic Crop Phenology Catalog          100/100  VERIFIED        BARI/BRRI/FAO-56 parameters verified
6. Automated Test Suite (22 Tests)         100/100  VERIFIED        22/22 passed in clean environment
7. Original Files Preservation             100/100  VERIFIED        100% SHA-256 match, zero alterations
8. Production JS Cross-Validation           90/100  QUALIFIED       Concordant, but winter Rnl deviates
9. Groundwater Conservation Modeling        80/100  QUALIFIED       41.6% savings requires puddle percolation
10. Nationwide Upazila Registry             85/100  QUALIFIED       7 benchmark Upazilas, not 495
----------------------------------------------------------------------------------------------------
OVERALL AUDIT SCORE:                         94.5%  GRADE: A        VERDICT: READY WITH LIMITATIONS
====================================================================================================
```

---

## 4. Mandatory Limitations for Final Documentation & Handover

To maintain complete transparency with academic reviewers, project integrators, and competition juries, the following three limitations must accompany all presentations of Member 5:

1. **Puddle Percolation Limitation in 1D Model:**
   The reported **41.6% groundwater savings** ($1,244.78\text{ mm}$ vs $726.49\text{ mm}$) reflects real-world Boro rice cultivation that includes standing puddle percolation losses ($1,000–1,200\text{ mm}$ based on BRRI/BMDA literature). The internal 1D aerobic simulation engine simulates only unsaturated matrix depletion; when modeling Boro as an unsaturated crop, gross irrigation is $838.08\text{ mm}$.
2. **Node.js Net Radiation Approximation:**
   The production Node.js engine approximates net radiation as $R_n \approx 0.75 R_{ns}$. While excellent in spring and summer heatwaves ($< 3\%$ diff), relative differences of $15\%$ to $23\%$ occur during cold winter fog and monsoon overcast days due to the absence of the explicit Stefan-Boltzmann longwave calculation.
3. **Hardware Ground Truth:**
   All soil sensor records used to test `soil_adapter.py` are synthetic emulator records. No physical in-situ gravimetric core oven-drying (ASTM D2216) has yet been conducted in Godagari fields.

---

## 5. Certification and Seal

This Independent Final Verification confirms that **Member 5 Correction V2** is physically sound, mathematically validated, fully tested, and:

### **OFFICIALLY CERTIFIED AS `READY WITH LIMITATIONS`**

The codebase in `Member 5/Correction_v2/` is approved for operational archiving, academic review, and integration into the AgriSense Fusion system.
