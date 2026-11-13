# NASA POWER CLIMATE DATA & QUALITY AUDIT REPORT
## Nationwide Meteorological Pipeline (2020–2024)
### Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)

---

## 1. Executive Summary & Audit Rectification

The audit identified two severe vulnerabilities in the previous climate pipeline:
1. **Ambiguous Precipitation Units (30-fold Error):** The NASA POWER variable `PRECTOTCORR` represents daily precipitation rate in $\text{mm/day}$. In several legacy scripts, this rate was treated as total monthly rainfall depth, underestimating monthly rainfall by a factor of 28 to 31 (e.g., 10.5 mm/day recorded as 10.5 mm monthly instead of 325.5 mm).
2. **Missing Coverage for 167 Upazilas:** Due to administrative mismatches, climate time series were only fetched for 299 upazilas.

In **Correction_v2**, the climate pipeline was completely re-engineered:
- **Coverage:** Expanded to all **466 agricultural upazilas** across **60 continuous months** (January 2020 through December 2024), totaling **27,960 location-month observations**.
- **Data Completeness:** **0 missing values** across all essential meteorological parameters.
- **Precipitation Conversion:** Two explicit, unambiguous columns are now provided: `prectotcorr_daily_rate_mm_per_day` and `precipitation_monthly_total_mm = rate \times \text{days\_in\_month}`.

---

## 2. NASA POWER Parameters & Physical Definitions

All parameters are derived from NASA's Modern-Era Retrospective analysis for Research and Applications, Version 2 (MERRA-2) assimilation and Goddard Earth Observing System (GEOS) models:

| Parameter Code | Physical Parameter | Native Unit | Operational Range in Bangladesh | Agronomic & Hydrological Use |
| :--- | :--- | :---: | :---: | :--- |
| **`T2M`** | Temperature at 2 Meters | $^\circ\text{C}$ | $15.2\text{--}32.8^\circ\text{C}$ | Base temperature for Penman-Monteith $\text{ET}_0$ |
| **`T2M_MAX`** | Daily Maximum Temperature at 2m | $^\circ\text{C}$ | $21.4\text{--}40.8^\circ\text{C}$ | Heat stress screening at flowering/anthesis |
| **`T2M_MIN`** | Daily Minimum Temperature at 2m | $^\circ\text{C}$ | $8.5\text{--}28.2^\circ\text{C}$ | Cold injury screening (Boro seedling stage) |
| **`ALLSKY_SFC_SW_DWN`** | All-Sky Surface Shortwave Solar Radiation | $\text{MJ/m}^2/\text{day}$ | $10.8\text{--}24.5\text{ MJ/m}^2/\text{day}$ | Net radiation ($R_n$) calculation for $\text{ET}_0$ |
| **`PRECTOTCORR`** | Bias-Corrected Precipitation Daily Rate | $\text{mm/day}$ | $0.0\text{--}26.4\text{ mm/day}$ | Converted to monthly depth for water balance |
| **`RH2M`** | Relative Humidity at 2 Meters | $\%$ | $48.2\text{--}89.6\%$ | Actual vapor pressure ($e_a$) derivation |
| **`WS2M`** | Wind Speed at 2 Meters | $\text{m/s}$ | $0.9\text{--}4.6\text{ m/s}$ | Aerodynamic resistance term in Penman-Monteith |

---

## 3. Spatial Interpolation & Grid Offset Analysis

NASA POWER MERRA-2 meteorological grids have a native spatial resolution of $0.5^\circ\text{ latitude} \times 0.625^\circ\text{ longitude}$ ($\approx 55\text{ km} \times 62\text{ km}$ at Bangladesh latitudes).

For each of the 466 upazila centroids:
- The nearest MERRA-2 grid node was queried.
- Great-circle geodesic distance from the upazila centroid to the nearest grid centroid was computed:
  - **Mean Distance:** $18.4\text{ km}$
  - **Median Distance:** $17.1\text{ km}$
  - **Maximum Distance:** $34.2\text{ km}$ (in complex coastal/hilly margins)
- All upazila climate records are tagged with `grid_offset_distance_km` to ensure full geospatial transparency.

---

## 4. Climatic Profile: Godagari Pilot vs National Normal

A comparison of Godagari Upazila (Barind Tract, Rajshahi) against the Bangladesh national average demonstrates the extreme seasonal aridity of the pilot study area:

| Metric | Godagari Upazila (Barind) | Bangladesh National Average | Agronomic Significance |
| :--- | :---: | :---: | :--- |
| **Annual Rainfall** | $1,392\text{ mm}$ | $2,084\text{ mm}$ | Godagari receives **33.2% less rain** than national mean. |
| **Winter Rainfall (Nov–Feb)** | $24.8\text{ mm}$ | $41.2\text{ mm}$ | Virtually zero rainfall during peak Boro rice vegetative stage. |
| **Peak Summer Max Temp** | $39.4^\circ\text{C}$ (April) | $35.1^\circ\text{C}$ | Severe heat stress risk for flowering Rabi cereals. |
| **Solar Radiation** | $19.2\text{ MJ/m}^2/\text{day}$ | $18.1\text{ MJ/m}^2/\text{day}$ | High photosynthetic potential, but drives high $\text{ET}_0$. |
| **Annual Reference $\text{ET}_0$** | $1,542\text{ mm}$ | $1,388\text{ mm}$ | **Evaporative demand exceeds annual rainfall.** |

---

## 5. Artifact Reference

- `data/processed/national_upazila_climate_monthly.csv` (27,960 continuous records)
- `data/reference/climate_parameter_metadata.csv` (Detailed parameter definitions, units, and ranges)
- `reports/climate_missingness_report.csv` (Audit table confirming 0.00% missing values across all parameters)
