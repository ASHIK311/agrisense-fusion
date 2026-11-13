# SCIENTIFIC ISSUES, LIMITATIONS & DISCREPANCIES AUDIT
## Member 4 Subsystem: Bangladesh Crop Intelligence & Agronomy System (Correction_v2)
### Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
**Audit Date:** 2026-11-10  
**Auditor:** Independent Senior Research Auditor & Forensic Data Scientist  
**Scope:** Deep-dive code inspection, mathematical recalculation, and cross-artifact verification

---

## 1. Executive Summary

This document provides a forensic inventory of all scientific issues, limitations, mathematical discrepancies, and documentation errata identified during the independent audit of Member 4's `Correction_v2` subsystem.

While `Correction_v2` represents an enormous leap forward in software engineering, reproducibility, and scientific integrity compared to the initial submission—successfully eliminating hardcoded paths, rejecting flawed ML models, and achieving 100% pass on automated tests—a rigorous forensic examination reveals **nine specific scientific caveats and discrepancies** that must be explicitly acknowledged by the system architect and backend integrator before platform deployment.

---

## 2. Forensic Issues Matrix

| # | Issue / Finding | Severity Category | File Reference & Location | Scientific Impact & Consequence | Blocks Freeze? |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **01** | **Crop Calendar Weather Linkage Truncated to Godagari Only** | **Deliverable Defect** | `data/processed/crop_calendar_weather_linkage.csv` (Line 110 of `build_calendar_and_rotation.py`) | Contains only 6 rows (Godagari only). The report claimed nationwide 2,796 weather-linked schedules; national table was never generated. | **NO (Ready with Limitations)** |
| **02** | **Typographical Weight Error in Suitability Formula (0.0 vs 0.1)** | **Documentation Errata** | `reports/MASTER_FINAL_REPORT.md` & `reports/CROP_SUITABILITY_REPORT.md` | Report formula printed `+ 0.1 * A_S5`. Actual code and raw data strictly weight Not Suitable (S5) as `0.0`. Implementation is scientifically superior to report text. | **NO (Non-Blocking)** |
| **03** | **Temporal Resolution Mislabeling (`daily_et0` is Monthly)** | **Schema Misnomer** | `data/processed/daily_et0_national.csv` & `daily_etc_national.csv` | Files are named `daily_*`, but contain 27,960 and 58,250 monthly records with monthly mean daily rate and monthly depth. Not a 365-day calendar time series. | **NO (Non-Blocking)** |
| **04** | **Assumed Constants in Penman-Monteith ET0 Formulation** | **Scientific Simplification** | `src/irrigation/fao56_engine.py` (Lines 80–95) | Assumes fixed wind speed $u_2 = 1.8\text{ m/s}$, fixed elevation $z = 20\text{ m}$, and lookup RH defaults rather than local NASA POWER MERRA-2 wind and humidity. | **NO (Non-Blocking)** |
| **05** | **Net Climatic Deficit vs Gross Field Irrigation Demand** | **Agronomic Limitation** | `data/processed/net_irrigation_requirement.csv` | Model computes $\text{Net IWR} = \max(0, \text{ET}_c - P_{\text{eff}})$. Omits rice puddling water (150–250 mm), deep percolation (2–4 mm/day), and canal losses (30–40%). | **NO (Non-Blocking)** |
| **06** | **Discrepancy Between Rotation Narrative and Model Demand** | **Discrepancy** | `reports/CROP_ROTATION_REPORT.md` vs `net_irrigation_requirement.csv` | Narrative claimed Maize takes 165 mm (saving 71% vs Boro), but model calculates Maize full $\text{ET}_c$ deficit as 475.8 mm. Narrative used deficit irrigation literature. | **NO (Non-Blocking)** |
| **07** | **Nearest-Neighbor Spatial Assignment for 167 Upazilas** | **Data Lineage Limitation** | `src/climate/nasa_power_pipeline.py` (Lines 40–75) | 167 upazilas were assigned climate from the nearest of 299 existing points (mean distance 18.4 km) rather than queried live from the API. | **NO (Non-Blocking)** |
| **08** | **BARC 466 Upazila Baseline vs Recent NICAR Bifurcations** | **Geospatial Scope** | `data/reference/bangladesh_admin_reference.csv` | Covers 466 agricultural upazilas (BARC baseline). Does not break out ~24 post-2000 newly bifurcated rural upazilas (e.g., Ashuganj, Subarnachar, Pekua). | **NO (Non-Blocking)** |
| **09** | **Godagari Coordinate Discrepancy in Report Text vs CSV** | **Documentation Errata** | `reports/MASTER_FINAL_REPORT.md` vs `upazila_coordinate_reference.csv` | Report text claimed 24.469°N, 88.330°E with invalid Easting 432,048 m. The actual CSV contains true physical centroid 24.5024°N, 88.4494°E (Easting 646,853 m). | **NO (Non-Blocking)** |

---

## 3. Detailed Forensic Investigation of Key Issues

### Issue 1: Crop Calendar Weather Linkage Truncation
- **Audit Discovery:** In `src/calendar/build_calendar_and_rotation.py`, the calendar master schedule was correctly expanded to all 466 upazilas (2,796 rows in `national_crop_calendar.csv`). However, when joining seasonal weather normals, the script contains the following line:
  ```python
  for _, c_row in df_national_calendar[
      df_national_calendar["upazila_code"] == godagari_code
  ].iterrows():
  ```
- **Consequence:** `data/processed/crop_calendar_weather_linkage.csv` contains **only 6 records** (all for Godagari Upazila). The automated test `test_13_crop_calendar_weather_linkage` merely checked `len(df) > 0`, allowing this truncation to go undetected.
- **Remediation for Production:** The backend integrator should generate weather normals on demand by joining `national_crop_calendar.csv` with `national_upazila_climate_monthly.csv` in SQL.

### Issue 2: Typographical Weight Error in Crop Suitability Report (0.0 vs 0.1)
- **Audit Discovery:** The markdown report texts (`MASTER_FINAL_REPORT.md` and `CROP_SUITABILITY_REPORT.md`) state:
  $$\text{Suitability Score} = \frac{1.0 \cdot A_{S1} + 0.8 \cdot A_{S2} + 0.6 \cdot A_{S3} + 0.4 \cdot A_{S4} + 0.1 \cdot A_{S5}}{A_{\text{total}}}$$
- **Consequence:** In `src/suitability/suitability_engine.py` (Line 38), the code actually uses:
  ```python
  score = (
      (v_suit * 1.0)
      + (suit * 0.8)
      + (m_suit * 0.6)
      + (marg_suit * 0.4)
      + (not_suit * 0.0)
  )
  ```
  Independent mathematical recalculation confirms that Godagari's reported scores (Aman 78.92%, Maize 73.44%, Wheat 57.41%, Aus 40.98%, Boro 40.51%) are **strictly reproducible only when $A_{S5}$ is weighted 0.0**. If weighted 0.1, scores become 79.03%, 74.20%, etc.
- **Auditor Verdict:** The actual code and data are **scientifically correct** (land that is "Not Suitable" should carry zero weight). The text in the report was a typographical misprint.

### Issue 3 & 4: FAO-56 Penman-Monteith Input Resolution & Parameter Assumptions
- **Audit Discovery:** Files `daily_et0_national.csv` and `daily_etc_national.csv` represent **monthly aggregated time steps** (27,960 rows for 466 upazilas × 60 months).
- **Consequence:** ET0 was calculated by calling `calculate_daily_et0` using monthly mean temperatures and monthly mean solar radiation at a single midpoint day of the year (DOY 15, 45, 74, etc.).
- Furthermore, the engine assumed:
  - $u_2 = 1.8\text{ m/s}$ (uniform across all upazilas and months).
  - $z = 20.0\text{ m}$ (uniform elevation).
  - Relative humidity was taken from a static national monthly table (`{1: 72%, 2: 65%, 3: 55%, ...}`).
- **Auditor Verdict:** This is a standard regional agro-climatic approximation for macro-planning, but backend developers must not mistake `daily_et0_national.csv` for 365 daily observations.

### Issue 5 & 6: Net Climatic Deficit vs Field Irrigation Pumping Demand
- **Audit Discovery:** In `net_irrigation_requirement.csv`, the formula implemented is:
  $$\text{IWR} = \max(0, \text{ET}_c - P_{\text{eff}})$$
- **Consequence:** In flooded rice cultivation (Boro and transplanted Aman), water balance must include:
  1. **Land soaking & puddling:** $150\text{--}250\text{ mm}$ upfront water depth.
  2. **Subsoil percolation:** $1.5\text{--}4.0\text{ mm/day}$ ($45\text{--}120\text{ mm/month}$) lost through the plow pan.
  3. **Conveyance & distribution efficiency:** $60\text{--}70\%$ efficiency in unlined earthen canals.
- **Auditor Verdict:** The $569.5\text{ mm}$ ($5,695\text{ m}^3\text{/ha}$) computed for Godagari Boro is the **Net Crop Climatic Deficit**. The actual **Gross Groundwater Volume Pumped** by tube wells is typically **$1,000\text{--}1,250\text{ mm}$ ($10,000\text{--}12,500\text{ m}^3\text{/ha}$)**. This distinction must be prominently displayed on frontend dashboards.

### Issue 7: Nearest-Neighbor Climate Interpolation for 167 Upazilas
- **Audit Discovery:** To scale from Member 4's 299 original upazilas to 466 upazilas, `nasa_power_pipeline.py` performed spatial nearest-neighbor assignment (`haversine_distance_km`) rather than fetching new data from NASA's API.
- **Consequence:** The column `spatial_data_type` transparently labels records as `DIRECT_NASA_POWER_QUERY` (299 upazilas) or `MERRA2_GRID_CELL_INTERPOLATION` (167 upazilas). The mean distance to the source point is $18.4\text{ km}$.
- **Auditor Verdict:** Given that MERRA-2 native grid resolution is $0.5^\circ \times 0.625^\circ$ ($\approx 55 \times 62\text{ km}$), assigning points within $18\text{ km}$ is physically sound and conforms to standard meteorological interpolation.

---

## 4. Summary of Scientific Status

1. **Observed vs Modeled Data:** Historical crop yields (1961–2024) and BARC land suitability are real observed official government datasets. Climate data is satellite-assimilated MERRA-2 reanalysis. ET0, effective rainfall, and Net IWR are physically modeled variables.
2. **Yield Prediction:** Machine learning regression trees for yield prediction have been completely rejected and disabled. No unsupported predictive accuracy claims exist in `Correction_v2`.
3. **Reproducibility:** All scripts execute deterministically in $< 1.5$ seconds using open-source Python libraries (`pandas`, `numpy`, `scipy`, `pyyaml`).

---
*Certified by Senior Research Auditor & Forensic Data Scientist.*
