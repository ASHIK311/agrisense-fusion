# Member 2 — Production-Ready Subsystem
## Pre-Monsoon Heat & Atmospheric Desiccation Screening System

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Status:** **SCIENTIFICALLY CORRECTED & READY TO FREEZE**  

---

## 📁 Production Directory Structure & Asset Index

```
F:\nasa project\data set that we test\member 2\Member_2_Production_System\
│
├── final_scientific_report.md              # Master Comprehensive Scientific & Engineering Report
├── target_rule_validation.md               # 100% Reverse-Engineering & Agronomic Target Audit
├── model_serialization_verification.md     # JSON Migration & Numerical Parity Verification Report
├── reproducibility_results.md              # Full Replication Logs, Benchmarks & Holdouts
├── scientific_limitations.md               # Boundary Conditions, Safe vs Prohibited Claims
├── README.md                               # This Directory Index & User Guide
│
├── NASA_POWER_parameter_provenance.csv     # Granular NASA GMAO MERRA-2 & CERES Metadata
├── historical_weather_summary.csv          # 5-Year Annual Climatology (2019-2023)
├── monthly_seasonal_analysis.csv           # 12-Month Climatology & Risk Frequency Table
├── hot_dry_event_analysis.csv              # Consecutive Pre-Monsoon Heat Spell Catalogue
├── weather_with_dryness_indicators.csv     # Enriched Dataset with VPD, 7d/30d Rain, CDD
│
├── predict_risk.py                         # Standalone Production Python Inference Engine
├── requirements.txt                        # Minimal Software Dependencies
├── drought_heat_model.json                 # Re-serialized Portable Native XGBoost Model
│
└── charts/                                 # 300 DPI Production Visualization Figures
    ├── monthly_rainfall_distribution.png   # Monthly Rainfall & Agro-Ecological Seasons
    ├── temperature_trends.png              # Historical Tmax/Tmin & Physiological Thresholds
    ├── humidity_trends.png                 # Annual Relative Humidity Cycle & Desiccation Zone
    ├── hot_dry_event_frequency.png         # Monthly/Annual Heatmap of Acute Desiccation Days
    └── consecutive_spell_durations.png     # Frequency Distribution of Heat Spell Lengths
```

---

## 🚀 How to Run the Standalone Inference Engine

The standalone script `predict_risk.py` operates without external dependencies beyond `numpy` and `xgboost`:

```bash
cd "F:\nasa project\data set that we test\member 2\Member_2_Production_System"
python predict_risk.py
```

### Python API Integration Example:
```python
from predict_risk import WeatherRiskPredictor

predictor = WeatherRiskPredictor("drought_heat_model.json")

# Input daily meteorological observation:
daily_weather = {
    "t_max": 39.8,           # °C (Daily Maximum Air Temperature)
    "t_min": 24.2,           # °C (Daily Minimum Air Temperature)
    "rainfall": 0.0,         # mm/day (Precipitation)
    "humidity": 34.5,        # % (Relative Humidity)
    "wind_speed": 2.1,       # m/s (2m Wind Speed)
    "solar_radiation": 24.1  # MJ/m²/day (Surface Solar Irradiance)
}

result = predictor.predict(daily_weather)
print(result)
```

**Expected JSON Output:**
```json
{
  "heat_desiccation_risk": 1,
  "risk_probability": 0.9984,
  "rule_evaluation": true,
  "is_heatwave_temperature": true,
  "is_rice_sterility_risk": true,
  "is_acute_low_humidity": true,
  "daily_rainfall_mm": 0.0,
  "units": {
    "temperature": "Celsius",
    "humidity": "Percentage",
    "rainfall": "mm/day",
    "wind_speed": "m/s",
    "solar_radiation": "MJ/m^2/day"
  }
}
```

---

## 🔒 Preserved Original Assets (DO NOT DELETE)

In accordance with strict audit preservation rules, all original submissions remain unmodified in `F:\nasa project\data set that we test\member 2\`:
* `cleaned_weather_dataset.csv` (Original NASA POWER extraction)
* `drought_heat_model.joblib` (Legacy pickled model)
* `WhatsApp Image 2026-11-10 at 3.10.47 PM.jpeg` (Original Confusion Matrix)
* `WhatsApp Image 2026-11-10 at 3.11.34 PM.jpeg` (Original ROC Curve)

---

## ⚖️ Presentation Integrity Summary

* **Safe Claim:** "A verified NASA POWER pre-monsoon heat and atmospheric desiccation screening system calibrated for crop thermal stress in the High Barind Tract."
* **Prohibited Claim:** Do **not** claim 99.7% agricultural drought forecasting accuracy. The model reconstructs an acute atmospheric desiccation rule, not multi-week root-zone moisture exhaustion.
