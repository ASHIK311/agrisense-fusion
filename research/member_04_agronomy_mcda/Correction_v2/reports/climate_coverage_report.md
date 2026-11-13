# National Climate Coverage & NASA POWER Expansion Report
## Field Shift — Member 4 Subsystem Correction_v2
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Date:** November 2026  
**Auditor / Engineer:** Senior Climate & Earth Observation Specialist  

---

## 1. Executive Summary & Audit Correction

The previous forensic audit identified three major limitations in Member 4's climate deliverable:
1. **Limited Geographic Coverage:** Only 299 upazilas were queried; 167 upazilas were excluded due to name mismatches.
2. **Precipitation Unit Confusion:** Precipitation was stored as `mm/day` (daily rate), creating severe risk of underestimation if used as monthly accumulated rainfall.
3. **Missing Solar Radiation Handling:** `ALLSKY_SFC_SW_DWN` contained 10,764 missing values prior to 1984.

In `Correction_v2`:
- **National Coverage:** Expanded to **all 466 official agricultural upazilas** across all 64 districts in Bangladesh.
- **Precipitation Rectification:** Provided both the raw MERRA-2 daily rate (`prectotcorr_daily_rate_mm_per_day`) and the calculated monthly accumulated rainfall depth (`precipitation_monthly_total_mm = rate * days_in_month`).
- **Spatial Grid Attribution:** Upazilas directly queried retain `DIRECT_NASA_POWER_QUERY`; the remaining 167 upazilas are attributed to their containing 0.5° x 0.625° MERRA-2 grid cell via geographic centroid interpolation, recording exact offset distances in km.

---

## 2. Dataset Schema & Parameters

The expanded dataset `data/processed/national_upazila_climate_monthly.csv` contains 27,960 location-month records (2020–2024 continuous):

| Column Name | Data Type | Units / Range | Description |
| :--- | :--- | :--- | :--- |
| `division_name` | String | 8 Divisions | Administrative division of Bangladesh |
| `district_name` | String | 64 Districts | Administrative district |
| `upazila_name` | String | 466 Upazilas | Official agricultural upazila |
| `upazila_code` | String | BBS / Geocode | Unique administrative code |
| `latitude` | Float | 20.6°N to 26.6°N | WGS84 decimal latitude |
| `longitude` | Float | 88.0°E to 92.7°E | WGS84 decimal longitude |
| `year` | Integer | 2020 to 2024 | Calendar year |
| `month` | Integer | 1 to 12 | Calendar month |
| `date` | String | YYYY-MM | ISO date string |
| `prectotcorr_daily_rate_mm_per_day` | Float | 0.0 to 35.0 mm/day | NASA POWER MERRA-2 mean daily precipitation |
| `days_in_month` | Integer | 28, 29, 30, 31 | Calendar days in month (leap-year aware) |
| `precipitation_monthly_total_mm` | Float | 0.0 to 1,150.0 mm | Monthly accumulated rainfall depth |
| `t2m_mean_degc` | Float | 15.0°C to 33.0°C | Monthly mean temperature at 2 meters |
| `t2m_max_degc` | Float | 22.0°C to 42.0°C | Monthly mean daily maximum temperature |
| `t2m_min_degc` | Float | 8.0°C to 28.0°C | Monthly mean daily minimum temperature |
| `allsky_sfc_sw_dwn_mj_per_m2_day` | Float | 10.0 to 26.0 MJ/m²/day | Solar surface insolation irradiance |
| `spatial_data_type` | String | DIRECT / INTERPOLATED | Ingestion provenance flag |
| `grid_offset_distance_km` | Float | 0.0 to 25.0 km | Distance to representative sampling coordinate |

---

## 3. Climate Profile for Godagari Upazila (High Barind Tract)

For Godagari Upazila (24.502°N, 88.449°E):
- **Pre-Monsoon Peak Temperatures (April–May):** Mean daily maximums reach **37.8°C to 40.2°C**, reflecting intense thermal advection characteristic of the dry Barind tract.
- **Winter Minima (January):** Mean minimum temperatures drop to **10.5°C to 11.8°C**.
- **Monsoon Rainfall (June–September):** Accumulated rainfall peaks in July/August (~280–350 mm/month), followed by a rapid post-monsoon cessation in October.
