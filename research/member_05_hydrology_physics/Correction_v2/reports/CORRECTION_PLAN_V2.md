# FIELD SHIFT — MEMBER 5 CORRECTION PLAN V2
## Architectural Blueprint for Independent Physics Validation & Seasonal Crop Water Balance

**Subsystem:** Member 5 — Independent Scientific Reference & Validation Framework  
**Author:** Senior Agricultural Water Resources Engineer & Model Validation Specialist  
**Target Area:** Godagari Upazila, Rajshahi District, Bangladesh (Centroid: 24.469°N, 88.330°E | CRS: EPSG:32645)  
**Creation Date:** November 10, 2026  
**Status:** APPROVED FOR EXECUTION  

---

## 1. Executive Mandate & Forensic Findings Resolution

The independent forensic audit (`Member 5/Independent_Audit/`) identified 20 concrete scientific, technical, and documentation defects in the original Member 5 submission. This correction plan defines the architectural implementation strategy to systematically eliminate each defect:

| Audit Finding | Forensic Problem Identified | Correction Strategy in V2 |
|:---:|---|---|
| **#1 & #2** | Unverified assignment & backend duplication | Build an **independent Python scientific reference and validation harness** that validates the main Node.js backend rather than duplicating production web services. |
| **#3 & #4** | 32 km coordinate offset to Rajshahi Sadar (`24.3636, 88.6241`) | Permanently align all weather ingestion, solar geometry, and elevation to the official **Godagari study centroid (`24.469°N, 88.330°E`, elevation 20m)**. |
| **#5 & #6** | Hardcoded clear-sky solar radiation ($R_{so} = 22.5\text{ MJ/m}^2/\text{d}$) | Implement **full FAO-56 solar geometry** (Allen et al. 1998, Chapter 3): solar declination ($\delta$), sunset hour angle ($\omega_s$), relative Earth-Sun distance ($d_r$), and Day-of-Year ($J$) extraterrestrial radiation ($R_a$). |
| **#7** | Artificial $ET_0$ clamping at $0.5\text{ mm/day}$ | **Remove arbitrary clamping.** Preserve scientifically justified low-energy winter $ET_0$ outputs while ensuring numerical stability against division by zero. |
| **#8, #9, #10**| Continuous 5-year Wheat simulation ($K_c=1.15$ all 1,827 days) causing monsoon irrigation | Replace with **season-aware crop simulation** (Wheat, Aman Rice, Boro Rice, Aus Rice, Maize) with 4-stage dynamic crop coefficients $K_c(t)$ and root depths $Z_r(t)$. Enforce strict crop schedule boundaries: **zero irrigation outside growing season**. |
| **#11** | Step-function effective rainfall discontinuity at 2.0 mm | Implement the continuous **USDA Soil Conservation Service (SCS) method** with physical conservation constraints ($P_{eff} \le P$). |
| **#12** | 100% irrigation efficiency & instant reset to $D_r = 0$ | Model **irrigation application efficiency ($\eta \approx 70\%$)**, net vs. gross water requirement, and realistic post-irrigation depletion. |
| **#13 & #14**| Missing network timeouts and unpersisted weather data | Build a robust NASA POWER client with **explicit timeouts (15s)**, retry with exponential backoff, raw JSON caching, and processed CSV persistence. |
| **#15** | Missing `requirements.txt` and packaging | Provide standard **`requirements.txt`**, `config.yaml`, and modular Python package layout using `pathlib`. |
| **#16** | Unexecuted Jupyter notebook | Deliver a **fully executed Jupyter notebook** (`notebooks/seasonal_water_balance_validation.ipynb`) containing live execution traces, inline plots, and markdown interpretation. |
| **#17 & #18**| False Member 2/4 claims & phantom ZIP/API deliverables | **Retract all unverified claims.** Disclose data sources truthfully (NASA POWER reanalysis + FAO/BARI agronomic parameters). |
| **#19** | Unassimilated Member 3 soil sensors | Implement a **dual-mode soil adapter**: *Physics-Only Mode* (default, uncalibrated) vs. *Sensor-Assisted Mode* (telemetry-assimilated). |
| **#20** | Unvalidated simulation records | Implement **cross-validation against official FAO-56 worked examples** and the **main Node.js JavaScript production engine**, logging absolute and relative errors. |

---

## 2. Directory & Module Architecture

```
Member 5/Correction_v2/
├── config/
│   ├── config.example.yaml                    # Parameterized study area, crops, and paths
│   └── original_files_manifest.csv            # Cryptographic audit record of preserved original files
├── data/
│   ├── raw/                                   # Cached upstream NASA POWER JSON responses
│   ├── processed/                             # Quality-checked daily meteorological CSVs
│   ├── reference/                             # FAO-56 worked benchmark cases & BARI crop constants
│   └── simulation/                            # Seasonal simulation time-series & irrigation ledgers
├── notebooks/
│   └── seasonal_water_balance_validation.ipynb# Executed notebook with complete outputs and plots
├── outputs/                                   # High-resolution publication figures (300 DPI)
├── reports/                                   # 14 formal validation and handover reports
├── src/
│   ├── crop_parameters/
│   │   ├── crop_catalog.py                    # 5-crop stage calendars, Kc(t), Zr(t), p-depletion
│   │   └── national_adapter.py                # Parameterized interface for nationwide Bangladesh upazilas
│   ├── physics/
│   │   ├── solar_geometry.py                  # Analytical Day-of-Year solar geometry & Ra/Rso
│   │   └── fao56.py                           # Penman-Monteith reference ET0 engine
│   ├── seasonal_simulation/
│   │   └── simulation_engine.py               # Multi-crop, multi-season rotational water balance runner
│   ├── validation/
│   │   ├── benchmark_fao56.py                 # FAO-56 Chapter 3 & 4 textbook case validator
│   │   └── comparison_engine.py               # Python reference vs. main Node.js JavaScript engine
│   ├── water_balance/
│   │   ├── effective_rainfall.py              # USDA-SCS continuous non-linear formulation
│   │   ├── irrigation_scheduler.py            # Readily available water, efficiency, and trigger logic
│   │   ├── root_zone_balance.py               # Conservation of mass daily soil reservoir accounting
│   │   └── soil_adapter.py                    # Member 3 IoT soil moisture ingestion adapter
│   └── weather/
│       └── nasa_power.py                      # Robust, cached, validated NASA POWER client
├── tests/
│   ├── test_fao56_physics.py                  # Mathematical and solar geometry test suite
│   ├── test_effective_rainfall.py             # Rain boundary and continuity tests
│   ├── test_seasonal_water_balance.py         # Multi-crop seasonal schedule & conservation tests
│   └── test_cross_validation_js.py            # Subprocess test comparing Python against server/physics/
├── README.md                                  # Architectural guide and CLI quickstart
└── requirements.txt                           # Pinned dependencies (numpy, pandas, requests, matplotlib, pyyaml)
```

---

## 3. Scientific Formulations & Engineering Standards

### 3.1 Solar Geometry & Clear-Sky Radiation (Allen et al. 1998, Eq. 21–37)
For latitude $\phi$ (radians) and day of year $J \in [1, 365]$:
1. Inverse relative distance Earth-Sun:
   $$d_r = 1 + 0.033 \cos\left(\frac{2\pi}{365} J\right)$$
2. Solar declination:
   $$\delta = 0.409 \sin\left(\frac{2\pi}{365} J - 1.39\right)$$
3. Sunset hour angle:
   $$\omega_s = \arccos\left(-\tan(\phi) \tan(\delta)\right)$$
4. Extraterrestrial radiation ($R_a$ in $\text{MJ/m}^2/\text{day}$):
   $$R_a = \frac{24(60)}{\pi} G_{sc} d_r \left[\omega_s \sin(\phi) \sin(\delta) + \cos(\phi) \cos(\delta) \sin(\omega_s)\right]$$
   where solar constant $G_{sc} = 0.0820\text{ MJ m}^{-2} \text{min}^{-1}$.
5. Clear-sky radiation ($R_{so}$):
   $$R_{so} = (0.75 + 2 \times 10^{-5} z) R_a$$
   where $z = 20\text{ m}$ for Godagari.

### 3.2 Continuous USDA-SCS Effective Rainfall ($P_{eff}$)
To eradicate the artificial 2 mm jump:
$$P_{eff} = \begin{cases} \frac{P \times (125 - 0.2 \times P)}{125} & \text{for } P \le 250\text{ mm} \\ 125 + 0.1 \times P & \text{for } P > 250\text{ mm} \end{cases}$$
subject to strict physical bounds: $0 \le P_{eff} \le P$.

### 3.3 Dynamic 4-Stage Crop Coefficient $K_c(t)$ and Root Depth $Z_r(t)$
For crop growth stages ($L_{ini}, L_{dev}, L_{mid}, L_{late}$):
- During $L_{ini}$: $K_c = K_{c,ini}$, $Z_r = Z_{r,ini}$.
- During $L_{dev}$: Linear interpolation between $K_{c,ini} \to K_{c,mid}$ and $Z_{r,ini} \to Z_{r,max}$.
- During $L_{mid}$: $K_c = K_{c,mid}$, $Z_r = Z_{r,max}$.
- During $L_{late}$: Linear interpolation between $K_{c,mid} \to K_{c,end}$, $Z_r = Z_{r,max}$.
- Outside season: $K_c = 0$, $Z_r = 0$ (crop absent; zero transpiration).

### 3.4 Root-Zone Water Depletion with Stress Coefficient $K_s$
$$TAW = 1000 (\theta_{FC} - \theta_{WP}) Z_r(t)$$
$$RAW = p \times TAW$$
When $D_r > RAW$:
$$K_s = \frac{TAW - D_r}{(1 - p) TAW}, \quad 0 \le K_s \le 1$$
Crop evapotranspiration under stress:
$$ET_{c,adj} = K_s \times K_c(t) \times ET_0$$

### 3.5 Irrigation Scheduling with Application Efficiency
When $D_r > RAW$:
$$I_{net} = D_r - D_{target}, \quad I_{gross} = \frac{I_{net}}{\eta}$$
where field furrow application efficiency $\eta = 0.70$ (BARI standard for Barind clay loams).

---

## 4. Execution Roadmap by Phase

- **Phase 1 & 2:** Workspace creation, original manifest generation, and correction plan (Completed).
- **Phase 3:** Authoring `src/physics/solar_geometry.py` and `src/physics/fao56.py`.
- **Phase 4:** Authoring `src/weather/nasa_power.py` with Godagari coordinates, timeouts, and JSON/CSV caching.
- **Phase 5:** Authoring `src/crop_parameters/crop_catalog.py` and `src/seasonal_simulation/simulation_engine.py`.
- **Phase 6:** Authoring `src/water_balance/effective_rainfall.py`, `root_zone_balance.py`, and `irrigation_scheduler.py`.
- **Phase 7 & 8:** Authoring Member 3 soil adapter and Member 4 national upazila adapter.
- **Phase 9:** Validation against FAO-56 textbook cases and main JavaScript production engine (`server/physics/`).
- **Phase 10:** Comprehensive test execution, notebook execution, and 14 formal reporting deliverables.
