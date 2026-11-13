# NASA POWER Weather Data Provenance & Meteorological Quality Report

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Component:** Member 5 Weather Ingestion & Validation Framework  
**Primary Centroid:** Godagari Upazila, Rajshahi District, Bangladesh (`24.469°N, 88.330°E`, elevation 24.0 m, EPSG:32645)  
**Author:** Senior Agro-Meteorologist & Validation Specialist  
**Report ID:** FS-M5-REP-03-WEATHER  
**Status:** Ingested, Cleaned, Cached, and Verified  

---

## 1. Executive Summary

This report establishes the source data provenance, physical validation, and spatial correction of meteorological forcing data used in the Member 5 Agro-Meteorological Water Balance subsystem. 

The forensic audit revealed that legacy Member 5 code hardcoded its coordinates to `24.3636°N, 88.6241°E` (Rajshahi Sadar), introducing a **32.2 km geographical error** away from the Godagari Upazila pilot site. Furthermore, legacy network requests lacked timeouts and local caching.

Correction V2 has re-anchored all queries to the true Godagari centroid (`24.469°N, 88.330°E`), implemented an enterprise-grade ingestion client with exponential backoff and persistent caching, and verified 1,827 days (2019–2023) of continuous daily agro-climatology data without a single missing observation.

---

## 2. Spatial Dislocation & Coordinate Correction

### 2.1 The 32.2 km Displacement Error

In the legacy codebase, coordinates were hardcoded as:
```python
# Legacy Member 5 hardcoded location
LAT = 24.3636
LON = 88.6241
```
These coordinates correspond to Rajshahi Sadar Upazila, directly adjacent to the Padma River in an urban/alluvial floodplain. 

The actual study area specified by the Field Shift project charter is **Godagari Upazila** (`24.469°N, 88.330°E`), located in the High Barind Tract (AEZ-11).

```
Geographical Separation (Haversine Formula):
  Δlat = 24.469 - 24.3636 = +0.1054° (~11.7 km North)
  Δlon = 88.330 - 88.6241 = -0.2941° (~29.9 km West)
  Total Great-Circle Distance = 32.2 km
```

```
                                  [Godagari Upazila Centroid]
                                   24.469°N, 88.330°E
                                   (Elevation 24 m, High Barind Tract)
                                           \
                                            \  32.2 km Displacement
                                             \ (North-West)
                                              \
                                               [Legacy Hardcoded Point: Rajshahi Sadar]
                                                24.3636°N, 88.6241°E
                                                (Padma River Floodplain)
```

### 2.2 Physical and Hydrological Significance
This 32.2 km displacement is agronomic and pedologically significant:
- **Pedology:** Rajshahi Sadar consists of young active Ganges floodplain silt and alluvium with shallow groundwater. Godagari Upazila is situated in the Pleistocene dissected Barind Tract, dominated by heavy acidic silty clay loams, low infiltration, and severe groundwater depletion.
- **Topography & Microclimate:** Godagari exhibits higher surface thermal amplitude, lower winter nocturnal temperatures, and faster soil surface drying.
- **Correction:** All ingestion in Correction V2 strictly targets `24.469°N, 88.330°E`, elevation `24.0 m`, aligned with EPSG:32645.

---

## 3. NASA POWER Dataset Provenance & Ingestion Parameters

### 3.1 Data Provider Specification
- **Provider:** NASA Langley Research Center POWER Project (Prediction Of Worldwide Energy Resources).
- **Assimilation System:** GMAO (Global Modeling and Assimilation Office) MERRA-2 (Modern-Era Retrospective analysis for Research and Applications, Version 2) and GEOS-5.12.4 FP-IT.
- **Solar Insolation Source:** NASA CERES (Clouds and the Earth's Radiant Energy System) satellite observations.
- **Spatial Grid:** $0.5^\circ \times 0.625^\circ$ latitude-longitude global grid.
- **Temporal Resolution:** Daily totals / daily means.
- **Observation Period:** 2019-01-01 to 2024-01-01 (1,827 continuous days).

### 3.2 Ingested Parameter Dictionary

| Parameter Key | Descriptive Name | Source Units | Internal Conversion | Scientific Role |
|---|---|:---:|:---:|---|
| `T2M_MAX` | Maximum Temperature at 2m | $^\circ\text{C}$ | None ($^\circ\text{C}$) | Vapor pressure curve $e^\circ(T_{max})$, longwave radiation $T_{max,K}^4$ |
| `T2M_MIN` | Minimum Temperature at 2m | $^\circ\text{C}$ | None ($^\circ\text{C}$) | Dewpoint proxy, vapor pressure curve $e^\circ(T_{min})$ |
| `RH2M` | Relative Humidity at 2m | $\%$ | None ($\%$) | Actual vapor pressure ($e_a$) derivation |
| `WS2M` | Wind Speed at 2m | $\text{m/s}$ | None ($\text{m/s}$) | Aerodynamic bulk transport term in FAO-56 |
| `ALLSKY_SFC_SW_DWN` | All-Sky Solar Insolation | $\text{MJ/m}^2/\text{day}$ | None ($\text{MJ/m}^2/\text{d}$) | Net shortwave radiation ($R_{ns}$) and cloudiness index ($R_s/R_{so}$) |
| `PRECTOTCORR` | Corrected Total Precipitation | $\text{mm/day}$ | None ($\text{mm/day}$) | Driving hydrological inflow for soil water balance |

---

## 4. Ingestion Resilience & Caching Architecture

To resolve audit finding #13 (unbounded requests) and #14 (lack of local caching), the client (`src/weather/nasa_power.py`) was engineered with:
1. **Network Timeout:** Strict $15.0\text{ s}$ socket connect and read timeouts.
2. **Exponential Backoff:** 3 retry attempts with sleep intervals: $1.0\text{ s} \to 2.0\text{ s} \to 4.0\text{ s}$ upon encountering HTTP 429, 500, 502, 503, or 504.
3. **Local Raw JSON Caching:** Saved directly to `data/raw/nasa_power_24.469_88.330_20190101_20240101.json` ($354\text{ KB}$).
4. **Processed CSV Persistence:** Cleaned and structured dataframe stored at `data/processed/weather_processed_daily.csv` ($93.1\text{ KB}$).
5. **Metadata & Schema Registry:** Automated creation of `weather_raw_metadata.csv` and `weather_parameter_dictionary.csv`.
6. **Offline Determinism:** If raw JSON or processed CSV exists on disk, the system executes without network access, guaranteeing 100% offline reproducibility.

---

## 5. Statistical Data Quality & Plausibility Audit

The ingested 1,827-day series for Godagari was audited for missingness, anomalies, and physical limits:

### 5.1 Summary Statistics (2019-01-01 to 2024-01-01)

| Parameter | Count | Mean | Std Dev | Min | 25th % | 50th % (Median) | 75th % | Max | Plausibility Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| $T_{max}$ ($^\circ\text{C}$) | 1,827 | **31.42** | 4.95 | 16.58 | 28.72 | 31.78 | 34.82 | **43.83** | **VALID** (Barind Heatwave) |
| $T_{min}$ ($^\circ\text{C}$) | 1,827 | **20.81** | 5.95 | **7.11** | 15.65 | 23.49 | 25.86 | 29.74 | **VALID** (Winter Cold Spell) |
| $RH$ ($\%$) | 1,827 | **69.86** | 18.42 | **17.69** | 56.56 | 73.31 | 84.81 | **97.31** | **VALID** (Dry pre-monsoon vs. depression) |
| $u_2$ ($\text{m/s}$) | 1,827 | **1.79** | 0.87 | 0.48 | 1.18 | 1.56 | 2.18 | **6.97** | **VALID** (Pre-monsoon squalls) |
| $R_s$ ($\text{MJ/m}^2/\text{d}$) | 1,827 | **17.77** | 4.68 | 2.16 | 14.54 | 18.29 | 21.35 | **28.51** | **VALID** (Cloudy monsoon vs. clear pre-monsoon) |
| $P$ ($\text{mm/day}$) | 1,827 | **3.81** | 12.98 | 0.00 | 0.00 | 0.00 | 1.18 | **186.42** | **VALID** (Monsoon cloudburst) |

### 5.2 Key Climatological Insights
- **Total Annual Rainfall:** The 5-year mean precipitation is **$1,391.2\text{ mm/year}$**, consistent with Bangladesh Meteorological Department (BMD) Rajshahi station normals ($1,400–1,500\text{ mm}$).
- **Seasonality:** Over $82\%$ of annual rainfall falls during the Kharif-2 monsoon window (June–October).
- **Rabi Drought:** The November–March window experiences extended dry spells exceeding 90 consecutive days with total rainfall $< 15\text{ mm}$, demonstrating why wheat and boro rice require irrigation.
- **Completeness:** 0 missing values (0.00% missingness). No $-999$ sentinel flags present.

---

## 6. Scientific Limitations & Disclosure

1. **Spatial Scale:** NASA POWER is derived from MERRA-2 ($0.5^\circ \times 0.625^\circ$), representing grid-cell averages of approximately $50\text{ km} \times 60\text{ km}$. While adequate for regional water balance trends, localized convective showers may not match individual farm-gate rain gauges.
2. **Rainfall Correction:** While NASA POWER `PRECTOTCORR` applies satellite-gauge merging, satellite precipitation tends to slightly underestimate peak convective cloudburst intensities in the humid tropics.
3. **Usage Recommendation:** When available, local ground rain-gauge measurements from BMD Rajshahi or Member 3 tipping-bucket sensors should be fused into the pipeline using the provided `soil_adapter.py`.
