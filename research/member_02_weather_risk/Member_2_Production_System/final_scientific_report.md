# Field Shift — Member 2 Final Scientific & Technical Report
## Pre-Monsoon Heat & Atmospheric Desiccation Screening System

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Regional Meteorological Station:** Rajshahi BMD Station 41859 (`24.3636°N, 88.6241°E`)  
**Study Centroid Coordinates:** `24.469°N, 88.330°E` (Offset: 34.8 km WNW)  
**Author / Auditor:** Senior Agrometeorologist, NASA POWER Specialist & ML Engineer  
**Date of Scientific Finalization:** November 10, 2026  
**Production System Directory:** [`F:\nasa project\data set that we test\member 2\Member_2_Production_System\`](file:///F:/nasa%20project/data%20set%20that%20we%20test/member%202/Member_2_Production_System/)  

---

## 1. Executive Summary

This report establishes the final, peer-review-grade scientific foundation, data engineering audit, model serialization correction, and historical climatology for **Member 2's individual subsystem** in the *Field Shift* project.

In earlier iterations, Member 2's subsystem was erroneously described as an "Agricultural Drought Prediction Model" boasting 99.7% accuracy. Our scientific audit revealed that:
1. The machine learning model was predicting a synthetic deterministic boolean condition (`t_max >= 35 & humidity <= 50 & rainfall <= 1.0`) directly derived from the input features.
2. Low rainfall on a single day is normal monsoonal climatology (occurring on 67.2% of days) and does **not** physically constitute agricultural drought.
3. The serialized model file `drought_heat_model.joblib` suffered from C++ booster memory corruption and failed to deserialize on external systems.

### Scope of Corrections Completed:
* **Renamed Subsystem:** Formally established as the **Pre-Monsoon Heat & Atmospheric Desiccation Screening System**.
* **Preserved Original Assets:** All original files (`cleaned_weather_dataset.csv`, `drought_heat_model.joblib`, WhatsApp confusion matrix and ROC plots) have been preserved untouched for provenance.
* **Repaired Model Serialization:** Re-serialized the verified XGBoost model into standard native JSON (`drought_heat_model.json`), verified in a fresh Python process with **zero probability delta ($0.00000000$)** and **100% binary prediction parity (366/366)**.
* **Full Data Provenance Audit:** Mapped all 6 parameters to their native NASA GMAO MERRA-2 and CERES satellite sources, explicitly disclosing spatial resolution ($0.5^\circ$ vs $1.0^\circ$) and the 34.8 km geographic offset.
* **Historical Climatological Analytics:** Generated 5-year monthly and annual climatologies, consecutive spell analyses, and 5 high-resolution production charts.
* **Standalone Deployment:** Delivered a production-ready, validated inference engine [`predict_risk.py`](file:///F:/nasa%20project/data%20set%20that%20we%20test/member%202/Member_2_Production_System/predict_risk.py) with dual rule and model outputs, along with minimal [`requirements.txt`](file:///F:/nasa%20project/data%20set%20that%20we%20test/member%202/Member_2_Production_System/requirements.txt).

---

## 2. Scientific Identity & Physical Foundations

### 2.1 Physical Phenomena Distinctions

```
====================================================================================================
PHENOMENON                  PRIMARY DRIVERS                     TIME SCALE       MEMBER 2 COVERAGE
====================================================================================================
Acute Heat Desiccation      Tmax >= 35°C, RH <= 50%, Rain <= 1mm 1 to 5 Days      CORE FOCUS (VERIFIED)
Meteorological Drought      Extended precipitation deficit      1 to 6 Months    Exploratory screening
Soil Moisture Deficit       Dr > RAW in crop root zone          Weeks to Months  Out of scope (No soil data)
Agricultural Drought        Prolonged root-zone water exhaustion Weeks to Months Out of scope (Needs Member 4)
Crop Thermal Stress         Tmax >= 35°C (Spikelet sterility)   Hours to Days    Captured (Flagged)
====================================================================================================
```

### 2.2 Agronomic Impact in the Barind Tract
In Godagari Upazila and the High Barind Tract, the primary crop vulnerable during March and April is **Boro rice** during its reproductive (heading, flowering, and grain-filling) stages:
* **Spikelet Sterility Threshold:** Exposure to ambient air temperatures exceeding $35.0^\circ\text{C}$ for more than 1–2 hours during anthesis (flowering) inhibits anther dehiscence, pollen shedding, and fertilization, leading to high percentages of empty rice grains ("chita").
* **Atmospheric Evaporative Demand:** When high temperatures coincide with dry air ($RH \le 50\%$), the Vapour Pressure Deficit ($\text{VPD}$) spikes above $3.0\text{ kPa}$, inducing severe crop water stress regardless of irrigation availability.

---

## 3. NASA POWER Parameter Provenance & Audit

Every parameter in `cleaned_weather_dataset.csv` was audited against NASA Langley Research Center POWER Daily Point specifications:

| CSV Column | NASA POWER ID | Native Resolution | Underlying Instrument / Model Source | Physical Parameter Description |
|---|---|:---:|---|---|
| `t_max` | `T2M_MAX` | $0.5^\circ \times 0.625^\circ$ | NASA GMAO MERRA-2 2D Assimilation | Daily Maximum 2m Air Temperature (°C) |
| `t_min` | `T2M_MIN` | $0.5^\circ \times 0.625^\circ$ | NASA GMAO MERRA-2 2D Assimilation | Daily Minimum 2m Air Temperature (°C) |
| `rainfall` | `PRECTOTCORR` | $0.5^\circ \times 0.625^\circ$ | GMAO MERRA-2 (Precipitation-corrected) | Corrected Daily Precipitation (mm/day) |
| `humidity` | `RH2M` | $0.5^\circ \times 0.625^\circ$ | MERRA-2 (Derived from QV2M, PS, T2M) | Relative Humidity at 2m Elevation (%) |
| `wind_speed` | `WS2M` | $0.5^\circ \times 0.625^\circ$ | MERRA-2 (Mapped from WS10M via log-law) | Wind Speed at 2m Elevation (m/s) |
| `solar_radiation` | `ALLSKY_SFC_SW_DWN`| $1.0^\circ \times 1.0^\circ$ | NASA FLASHFlux / CERES Satellite Radiometers | Surface Solar Irradiance ($\text{MJ}/\text{m}^2/\text{day}$) |

### Geographic Offset Disclosure:
* **Queried Coordinates:** Latitude `24.3636°N`, Longitude `88.6241°E` (Rajshahi BMD Meteorological Station).
* **Target Centroid (Godagari):** Latitude `24.4690°N`, Longitude `88.3300°E`.
* **Displacement:** $34.8\text{ km}$ bearing $295^\circ$ (West-North-West).
* **Scientific Note:** While synoptic temperature and large-scale atmospheric humidity correlate strongly across this distance, convective monsoon rainfall is localized. This dataset provides a regional macro-meteorological screening index, not an in-situ plot sensor reading.

---

## 4. Target Rule Verification & Baseline Benchmarks

### 4.1 Quantitative Target Audit
The target column `heat_drought_risk` adheres strictly to:
$$\text{Risk} = (t_{\max} \ge 35.0) \land (\text{humidity} \le 50.0) \land (\text{rainfall} \le 1.0)$$
* Total Sample Count: 1,827 days (2019-01-01 to 2024-01-01).
* Positive Samples: **139 (7.61%)**
* Negative Samples: **1,688 (92.39%)**
* Verification Matches: **1,827 / 1,827 (100.00% Zero-Mismatches)**.

### 4.2 Algorithm Benchmarks on Reconstructed Test Split (N=366)

| Model Architecture | TN | FP | FN | TP | Accuracy | Recall | Precision | ROC AUC | Role in Production System |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Direct Deterministic Rule** | **338** | **0** | **0** | **28** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | Primary baseline ($O(1)$ computation) |
| **Random Forest (100 Trees)** | **338** | **0** | **0** | **28** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | Non-linear tree benchmark |
| **XGBoost (Member 2 Model)** | **338** | **0** | **1** | **27** | **0.9973** | **0.9643** | **1.0000** | **1.0000** | **Replicated Member 2 production model** |
| **Logistic Regression** | **334** | **4** | **5** | **23** | **0.9754** | **0.8214** | **0.8519** | **0.9947** | Linear decision benchmark |

---

## 5. Historical Agroclimatological Climatology (2019–2023)

### 5.1 Annual Summary Overview

```
========================================================================================================================
YEAR   DAYS   MEAN TMAX   PEAK TMAX   ANNUAL RAIN   MEAN RH   HOT/DRY DAYS   DAYS TMAX>=35C   DAYS RAIN<=1MM   MAX DRY SPELL
========================================================================================================================
2019    365    30.6°C      41.7°C       1,353.9 mm    73.8%     30 (8.2%)         73            243 (66.6%)        72 Days
2020    366    30.4°C      39.6°C       1,823.1 mm    76.0%     15 (4.1%)         52            236 (64.5%)        63 Days
2021    365    31.0°C      41.6°C       1,556.7 mm    71.9%     38 (10.4%)        84            245 (67.1%)       138 Days
2022    365    31.3°C      42.3°C       1,093.5 mm    70.1%     17 (4.7%)         96            256 (70.1%)        94 Days
2023    365    31.3°C      44.3°C       1,514.8 mm    70.5%     39 (10.7%)        96            248 (67.9%)        78 Days
========================================================================================================================
```

### 5.2 Key Climatological Insights:
1. **Pre-Monsoon Extreme Heat Intensification:** 2023 recorded the highest temperature in the 5-year dataset at **44.34°C** (April 17, 2023), with 96 days exceeding 35°C and 39 acute desiccation risk days.
2. **Consecutive Dry Spells:** In 2021, an unbroken consecutive dry spell ($P \le 1.0\text{ mm}$) lasted **138 consecutive days** (from November 2020 to March 2021), illustrating the extreme dependence of Rabi crops on tubewell groundwater irrigation.
3. **Acute Desiccation Spells:** The longest continuous spell of combined acute heat and low humidity ($T_{\max} \ge 35^\circ\text{C}, RH \le 50\%, P \le 1\text{ mm}$) lasted **20 consecutive days** (March 16 to April 4, 2021, and April 3 to April 22, 2023), representing an extreme agricultural hazard for flowering Boro rice.

---

## 6. Exploratory Meteorological Dryness Indicators

To explore whether the dataset supports continuous multi-day dryness analysis beyond the binary rule, we calculated:

1. **Vapour Pressure Deficit ($\text{VPD}$ in $\text{kPa}$):**
   $$\text{VPD} = e_s(T_{\max}) \left(1 - \frac{RH}{100}\right)$$
   * Dataset Mean: **$1.38\text{ kPa}$** | Historical Peak: **$6.19\text{ kPa}$** (April 17, 2023).
   * Severe Atmospheric Desiccation ($\text{VPD} > 3.0\text{ kPa}$): Observed on **231 days**, primarily in March, April, and May.
2. **Multi-Day Cumulative Rainfall Depletion:**
   * Rolling 7-day and 30-day cumulative precipitation metrics were generated in [`weather_with_dryness_indicators.csv`](file:///F:/nasa%20project/data%20set%20that%20we%20test/member%202/Member_2_Production_System/weather_with_dryness_indicators.csv).
   * Average 30-day rolling rainfall in winter and spring drops below **$15.0\text{ mm}$**, confirming intense dry-season atmospheric demand.
3. **Exploratory Status Warning:** These metrics provide exploratory meteorological screening. They must **not** be presented as root-zone soil water balance models without in-situ soil texture and crop parameters.

---

## 7. Model Serialization & Production Engine Verification

### 7.1 Verification Summary
* Native JSON Model: [`drought_heat_model.json`](file:///F:/nasa%20project/data%20set%20that%20we%20test/member%202/Member_2_Production_System/drought_heat_model.json) (80,568 bytes)
* Cross-platform verified loading: **PASS**
* Test-set binary prediction match (366/366): **100.0%**
* Maximum absolute probability discrepancy: **$0.00000000 \times 10^0$**

### 7.2 Standalone Python Inference Module: `predict_risk.py`
The module [`predict_risk.py`](file:///F:/nasa%20project/data%20set%20that%20we%20test/member%202/Member_2_Production_System/predict_risk.py) operates independently without external dependencies beyond `numpy` and `xgboost`. It accepts arbitrary daily weather dictionaries and returns structured agrometeorological risk diagnostics.
