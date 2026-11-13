# Field Shift — Member 1 Satellite GIS: Machine Learning Pipeline Audit
**NASA Space Apps Challenge 2026**  
**Spatial Autocorrelation Audit, Leakage Elimination, and Validation Protocols**  

---

## 1. Spatial Leakage Audit
* **Vulnerability in Geospatial ML:** Random pixel train/test splitting suffers from massive spatial autocorrelation (Tobler's First Law of Geography). Pixels 10m away from training pixels share near-identical spectral and atmospheric noise, artificially inflating accuracy scores to $>98\%$.
* **Corrective Solution Enforced:** Implemented **Geographical Spatial Block Splitting**:
  - **Training Partition (North Block):** $Y > 2,718,000	ext{ m}$ (10,000 balanced samples).
  - **Testing Partition (South Block):** $Y \le 2,718,000	ext{ m}$ (10,000 balanced samples).
  - **Spatial Separation:** Zero geographic overlap; models are forced to generalize to unseen geographic terrain.
  - **Data Hygiene:** 0 duplicate rows, 0 null/infinite values, 100% strict balance across classes.

## 2. Feature Schema & Normalization
The audited feature schema (`models/final_feature_schema.json`) utilizes 10 engineered features:
1. `Blue_B02` (Surface Reflectance)
2. `Green_B03` (Surface Reflectance)
3. `Red_B04` (Chlorophyll absorption)
4. `NIR_B08` (Mesophyll cell structure)
5. `SWIR1_B11` (Water absorption)
6. `NDVI_Rabi` (Winter greenness)
7. `NDWI_McFeeters` (Open water index)
8. `NDMI_Moisture` (Canopy hydration)
9. `EVI_Rabi` (Enhanced vegetation index)
10. `Delta_NDVI_Kharif_Rabi` (Multi-temporal phenological amplitude)
