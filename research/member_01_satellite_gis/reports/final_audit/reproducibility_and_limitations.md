# Field Shift — Member 1: Reproducibility Guide & Scientific Limitations

---

## 1. Reproducibility Configuration

- **Python Version:** 3.12.10
- **Scikit-Learn Version:** 1.9.1
- **LightGBM Version:** 4.7.0
- **XGBoost Version:** 3.4.1
- **Random Seed:** 42 (Enforced across sample extraction, spatial splits, and estimators)
- **Model Serialized Files:**
  - Baseline Model (15 features): `models/final_model.pkl` (23.5 MB)
  - Optimized Model (21 features): `models/optimized_model.pkl` (7.5 MB compressed)
  - Feature Schema: `models/optimized_feature_schema.json`

## 2. Scientific Limitations

1. **Crop Species Delineation (Rice vs Wheat vs Maize) Remains BLOCKED:**
   - The reference dataset is ESA WorldCover 2021 (Class 40: Cropland). It provides generic cropland boundaries but zero crop-species ground truth.
   - Without verified DAE (Department of Agricultural Extension) cadastral field parcel survey polygons with GPS geotags, crop-species classification cannot be trained or validated without scientific fabrication.
2. **Temporal Ground-Truth Latency:**
   - Reference labels are from 2021; satellite imagery spans 2022–2025. Annual dynamic shifts (e.g. Padma River char sedimentation, conversion of paddies to mango orchards) introduce legitimate physical differences.
3. **10m Mixed-Pixel Boundary Blurring:**
   - Disaggregating mixed settlements from surrounding orchards requires sub-meter commercial imagery (e.g. PlanetScope / WorldView) or UAV orthomosaics.

