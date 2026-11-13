# Field Shift — Member 1: Final Scientific Audit & Consistency Report

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Subsystem:** Member 1 — Satellite Image Processing, Remote Sensing & ML Subsystem  
**Study Area:** Godagari Upazila, Rajshahi, Bangladesh (445.69 km², EPSG:32645)  
**Execution Timestamp:** 2026-11-10 15:10:00  

---

## 1. Executive Summary & Audit Verdict

A rigorous scientific audit and verification check was conducted on Member 1's satellite land-cover classification subsystem using all 12 preprocessed Sentinel-2 L2A scenes (2022–2025) and ESA WorldCover 2021 reference labels.

### Key Verified Empirical Findings:
1. **Retained Production Model:** `RandomForest_21Feat_Deep` ([`models/optimized_model.pkl`](file:///F:/nasa%20project/data%20set%20that%20we%20test/Member_1_Satellite_GIS/models/optimized_model.pkl)) (250 trees, max_depth=22, min_samples_split=3, 21 multi-temporal features).
2. **5-Fold Spatial Cross-Validation Performance:**
   - **Mean Spatial Accuracy:** **84.63% ± 3.81%**
   - **Mean Balanced Accuracy:** **84.37% ± 1.16%**
   - **Mean Macro-F1 Score:** **0.8342 ± 0.0194**
   - **Mean Calibrated Log-Loss:** **0.4208 ± 0.0768**
   - *Spatial Separation Method & Limitation:* Contiguous latitudinal block partition without inter-block buffer zones. Inspection shows samples exist within 100m of fold boundary seams; therefore, residual spatial autocorrelation near boundary lines remains an inherent methodological limitation.
3. **Block C Development Holdout Performance ($N = 6,000$):**
   - **Class-Balanced Holdout Accuracy:** **85.77%** [95% Wilson CI: 84.86% – 86.63%] ($5,146 / 6,000$ correct).
   - **Pure Interior Centroid Accuracy:** **90.64%** [95% Wilson CI: 89.69% – 91.50%] ($3,639 / 4,015$ correct).
   - **Mixed Boundary Pixel Accuracy:** **75.92%** [95% Wilson CI: 73.99% – 77.75%] ($1,507 / 1,985$ correct).
   - **Balanced Accuracy:** **84.02%** | **Macro-F1:** **0.8257** | **Weighted-F1:** **0.8589** | **Log-Loss:** **0.4550**.
4. **Accuracy Target Assessment:**
   - **95% accuracy was not achieved under the current data, reference-label quality, spatial validation design, and 10m Sentinel-2 workflow.** Sub-pixel spectral mixing across 18.39% of boundary pixels remains the primary empirical constraint.
5. **Area-Weighted Landscape Accuracy Status:**
   - Officially labeled: **Not Yet Independently Established**. Post-hoc synthetic weighting was audited and rejected because the southern Block C holdout violates full-landscape sampling representativeness.

---

## 2. Model Selection Decision: KEEP CURRENT OPTIMIZED MODEL

Under the strict model selection rules:
- Candidate Extra Trees 21-Feat ($84.64\% \pm 3.86\%$) showed higher variance across spatial folds and lower Built-Up precision.
- Gradient boosting candidates (LightGBM and XGBoost) exhibited higher sensitivity to sub-pixel boundary mixing in rural homestead settlements.
- Candidate spectral indices (SAVI, MSAVI, GNDVI, NDTI) were evaluated and confirmed to be $>95\%$ collinear with existing features (SAVI with NDVI $r=0.9947$; NDTI with BSI $r=-0.9669$), adding no new biophysical information.
- The retained `RandomForest_21Feat_Deep` model remains the most stable, reproducible, and balanced classifier.
