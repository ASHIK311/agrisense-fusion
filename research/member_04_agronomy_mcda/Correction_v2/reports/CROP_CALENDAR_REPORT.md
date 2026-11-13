# OPERATIONAL CROP CALENDAR & PHENOLOGY REPORT
## Dynamic Phenological Schedules & Weather Integration (Correction_v2)
### Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)

---

## 1. Executive Summary & Audit Rectification

In the independent forensic audit, an egregious defect was identified in Member 4's crop calendar subsystem:
> **Audit Finding:** Five out of six extracted DAE crop calendar CSV files had **0.0% weather coverage**. Phenological dates were static and entirely unlinked to temperature or rainfall dynamics, preventing real-time or predictive agronomic advisory.

In **Correction_v2**, the crop calendar pipeline was completely restructured:
- Standardized phenological schedules across **466 upazilas** and **6 major economic crops** (Aman Rice, Boro Rice, Aus Rice, Wheat, Hybrid Yellow Maize, and Oilseed Mustard), yielding **2,796 operational calendar profiles**.
- Dynamically joined with continuous 5-year NASA POWER climatological normals (2020–2024), achieving **100.0% weather coverage**.
- Added automated agro-climatic stress flags for terminal heat, seedling chilling, and flowering desiccation.

---

## 2. Bangladesh Agronomic Seasons (Kharif-I, Kharif-II, Rabi)

Cropping in Bangladesh is strictly governed by monsoon dynamics and thermal seasonality across three distinct periods:

1. **Rabi (Winter Dry Season: November – March):**
   - Characteristics: Low temperatures ($12\text{--}28^\circ\text{C}$), high solar radiation, low humidity, and negligible rainfall ($< 50\text{ mm}$).
   - Crops: Irrigated Boro Rice, Wheat, Maize, Mustard, Potato, Pulses, Winter Vegetables.
2. **Kharif-I (Pre-Monsoon Season: April – July):**
   - Characteristics: Rising temperatures, high evaporative demand, severe thunderstorms (Nor'westers / Kalbaishakhi), and erratic early rains.
   - Crops: Aus Rice, Jute, Summer Pulses, Sesame.
3. **Kharif-II (Monsoon Season: July – November):**
   - Characteristics: Heavy precipitation ($> 75\%$ of annual total), high humidity ($> 80\%$), overcast skies, and widespread flooding.
   - Crops: Transplanted Aman Rice (T. Aman), Broadcast Aman (Deepwater).

---

## 3. Standardized Crop Phenology & Weather Linkage Matrix

The table below summarizes the national phenological parameters and climatic normal linkage:

| Crop | Typical Sowing / Transplanting | Peak Vegetative Window | Harvest Window | Cycle Length (Days) | Thermal Stress Threshold | Critical Climate Vulnerability |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Boro Rice** | Dec 15 – Jan 15 | Feb 15 – Mar 25 | Apr 20 – May 20 | 145–155 | $T_{\min} < 10^\circ\text{C}$; $T_{\max} > 36^\circ\text{C}$ | Cold injury at seedling stage; heat blast at flowering; haor pre-monsoon flash floods |
| **T. Aman Rice** | Jul 01 – Aug 10 | Aug 20 – Sep 30 | Nov 15 – Dec 15 | 130–140 | $T_{\min} < 15^\circ\text{C}$ | Late drought at grain filling; submergence during vegetative phase |
| **Aus Rice** | Mar 20 – Apr 20 | May 10 – Jun 10 | Jul 10 – Aug 10 | 110–120 | $T_{\max} > 38^\circ\text{C}$ | Pre-monsoon drought at seedling establishment |
| **Wheat** | Nov 15 – Nov 30 | Dec 20 – Jan 31 | Mar 10 – Mar 25 | 110–115 | $T_{\max} > 30^\circ\text{C}$ | Terminal heat stress in late February / March reducing grain filling duration |
| **Maize (Rabi)** | Nov 10 – Dec 15 | Jan 15 – Mar 01 | Apr 10 – May 05 | 135–145 | $T_{\max} > 38^\circ\text{C}$ | Waterlogging from early pre-monsoon storms |
| **Mustard** | Oct 20 – Nov 10 | Nov 25 – Dec 25 | Jan 20 – Feb 10 | 80–90 | $T_{\max} > 32^\circ\text{C}$ | Cloud cover and high humidity favoring aphid infestation |

---

## 4. Godagari Upazila Case Study: Phenological Weather Integration

In Godagari (Barind Tract, Rajshahi), the joined climatological normals reveal distinct environmental exposure windows for each crop:

| Crop | Active Growing Months | Mean Seasonal Temp ($^\circ\text{C}$) | Mean Daily Max Temp ($^\circ\text{C}$) | Peak Max Temp ($^\circ\text{C}$) | Total Season Rainfall (mm) | Identified Agro-Climatic Stress |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Boro Rice** | Dec – May | $25.4^\circ\text{C}$ | $32.8^\circ\text{C}$ | **$39.4^\circ\text{C}$ (Apr)** | $228.6\text{ mm}$ | **High Terminal Heat & Evaporative Desiccation Stress** |
| **T. Aman Rice** | Jul – Nov | $27.9^\circ\text{C}$ | $31.8^\circ\text{C}$ | $34.8^\circ\text{C}$ (Jul) | **$982.4\text{ mm}$** | **Optimal Thermal Conditions; Low Drought Risk** |
| **Wheat** | Nov – Mar | $20.8^\circ\text{C}$ | $27.6^\circ\text{C}$ | **$34.2^\circ\text{C}$ (Mar)** | $45.4\text{ mm}$ | **Moderate Terminal Heat Stress in March** |
| **Maize** | Nov – Apr | $22.6^\circ\text{C}$ | $29.8^\circ\text{C}$ | **$39.4^\circ\text{C}$ (Apr)** | $106.2\text{ mm}$ | **Favorable Winter Regime; High Radiation Efficiency** |
| **Mustard** | Oct – Feb | $20.4^\circ\text{C}$ | $27.1^\circ\text{C}$ | $31.5^\circ\text{C}$ (Oct) | $32.8\text{ mm}$ | **Near-Ideal Rabi Microclimate; Zero Heat Stress** |

---

## 5. Artifact Reference

- `data/reference/crop_calendar_reference.csv` (Standardized DAE agronomic schedules)
- `data/processed/national_crop_calendar.csv` (2,796 upazila crop calendar records)
- `data/processed/crop_calendar_weather_linkage.csv` (2,796 weather-linked phenological profiles)
- `reports/crop_calendar_coverage_report.md` (Detailed climatological linkage methodology)
