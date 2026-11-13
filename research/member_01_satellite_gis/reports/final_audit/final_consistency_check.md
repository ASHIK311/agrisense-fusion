# Field Shift — Member 1: Final Report Consistency & Verification Audit

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Role:** Member 1 — Senior Remote Sensing Scientist & ML Engineering Auditor  
**Study Area:** Godagari Upazila, Rajshahi, Bangladesh (445.69 km², EPSG:32645)  
**Execution Timestamp:** 2026-11-10 15:10:00  

---

## Executive Summary of Verification Results

| Audit Item | Verification Scope | Status | Evidence & Resolution |
| :--- | :--- | :---: | :--- |
| **1. Spatial Leakage Verification** | Boundary proximity & buffer inspection across 5 folds | **PASS** | Confirmed contiguous latitudinal block partitioning without buffer zones. Sample counts within 100m of seams documented (e.g. 79 vs 80 samples at Boundary 1). The claim "zero spatial leakage" has been completely purged and replaced with transparent disclosure of boundary autocorrelation limitations. |
| **2. Confusion Matrix Consistency** | Re-evaluation of retained `optimized_model.pkl` on Block C | **PASS** | Re-ran predictions directly from `models/optimized_model.pkl` on Block C ($N=6,000$). Resolved the discrepancy caused by a temporary refit on A+B in the audit script. Re-established exact parity: Acc = 85.77% (5,146 / 6,000), Pure = 90.64% (3,639 / 4,015), Mixed = 75.92% (1,507 / 1,985). Updated `confusion_matrix.csv` and `per_class_metrics.csv`. |
| **3. Spatial CV Metric Verification** | Direct recalculation of fold accuracy vs balanced accuracy | **PASS** | Inspected raw predictions and CSV data. Confirmed Accuracy and Balanced Accuracy are distinct across all folds (Fold 1: 80.09% vs 83.09%; Fold 5: 89.63% vs 86.05%; Mean Acc: 84.63% ± 3.81%, Mean Balanced Acc: 84.37% ± 1.16%). Identified previous identical values as a manual copy-paste formatting artifact in the chat response Markdown table. |
| **4. Accuracy Target Wording** | Replacement of absolute non-achievability claims | **PASS** | Replaced all absolute statements with the exact required phrasing: *"95% accuracy was not achieved under the current data, reference-label quality, spatial validation design, and 10m Sentinel-2 workflow."* |
| **5. Area-Weighted Accuracy Status** | Verification of removal of unsupported 83.67% claim | **PASS** | Confirmed that the 83.67% figure has been purged from all reports, README, API metadata, and presentation text. Official status retained as *"Not Yet Independently Established"*. |
| **6. Final Pipeline & Model Integrity** | Non-destruction of models, test execution, schema parity | **PASS** | Baseline (`final_model.pkl`) and optimized (`optimized_model.pkl`) models preserved untouched. 25/25 FastAPI tests passed (100%). 7/7 pipeline integrity checks passed (100%). Raster inference parity verified (100%). |

---

## 1. Spatial Leakage Detailed Inspection

- **Partitioning Method:** Contiguous latitudinal block partitioning based on sample row percentiles:
  - Fold 1: Rows 20 – 764 ($N = 3,998$)
  - Fold 2: Rows 764 – 1,240 ($N = 3,998$)
  - Fold 3: Rows 1,240 – 1,605 ($N = 3,994$)
  - Fold 4: Rows 1,605 – 2,034 ($N = 4,009$)
  - Fold 5: Rows 2,034 – 2,611 ($N = 4,001$)
- **Buffer Zone Inspection:** No geographic exclusion buffer was applied between adjacent folds.
- **Empirical Boundary Proximity:**
  - Boundary 1 (Row 764): 79 samples in Fold 1 and 80 samples in Fold 2 lie within 100m of the line.
  - Boundary 2 (Row 1,240): 104 samples in Fold 2 and 75 samples in Fold 3 lie within 100m.
  - Boundary 3 (Row 1,605): 165 samples in Fold 3 and 175 samples in Fold 4 lie within 100m.
  - Boundary 4 (Row 2,034): 110 samples in Fold 4 and 118 samples in Fold 5 lie within 100m.
- **Documentation Correction:** All claims of "zero spatial leakage" have been removed across the repository and replaced with: *"contiguous spatial block partition without inter-block buffer zones; residual spatial autocorrelation across boundary seams remains an inherent methodological limitation."*

---

## 2. Confusion Matrix & Prediction Re-Run

Re-running the retained `models/optimized_model.pkl` on the exact Block C feature matrix ($N = 6,000$):

$$\text{Accuracy} = \frac{825 + 846 + 2,529 + 946}{6,000} = \frac{5,146}{6,000} = \mathbf{85.7667\% \approx 85.77\%}$$

### Verified Matrix (`reports/final_audit/confusion_matrix.csv`)

| True Class \ Pred Class | Pred Cropland | Pred Tree_Cover | Pred Permanent_Water | Pred Built_Up | Total True ($n_{i\cdot}$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **True Cropland** | **825** | 86 | 26 | 20 | **957** |
| **True Tree_Cover** | 180 | **846** | 8 | 208 | **1,242** |
| **True Permanent_Water** | 61 | 19 | **2,529** | 137 | **2,746** |
| **True Built_Up** | 3 | 106 | 0 | **946** | **1,055** |
| **Total Predicted ($n_{\cdot j}$)** | **1,069** | **1,057** | **2,563** | **1,311** | **6,000** |

- **Pure Interior Correct:** $3,639 / 4,015 = \mathbf{90.6351\% \approx 90.64\%}$
- **Mixed Boundary Correct:** $1,507 / 1,985 = \mathbf{75.9194\% \approx 75.92\%}$
- **Root Cause of Off-Diagonal Discrepancy in Audit Script:** Phase 6 of `execute_final_scientific_audit.py` had fitted a new model on Block A + Block B ($N = 14,000$, yielding 88.00% holdout accuracy) and saved its confusion matrix, instead of evaluating the existing serialized model (`models/optimized_model.pkl`, which was fitted on Block A, $N = 7,996$). Both `confusion_matrix.csv` and `per_class_metrics.csv` have been overwritten with the exact predictions from the retained production model.

---

## 3. Spatial Cross-Validation Metrics (Exact Values)

From the underlying dataset and `reports/final_audit/spatial_validation_results.csv`:

| Fold Index | Evaluated Block | Accuracy (%) | Balanced Accuracy (%) | Macro-F1 | Calibrated Log-Loss | Primary Class Driver |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **Fold 1** | Northern High Barind | **80.09%** | **83.09%** | 0.8036 | 0.5234 | Cropland dominant; minority water/built-up have high recall. |
| **Fold 2** | North-Central Barind | **81.64%** | **84.27%** | 0.8301 | 0.4814 | Transition plateau; balanced recall across classes. |
| **Fold 3** | Central Terraces | **86.18%** | **83.56%** | 0.8370 | 0.3669 | High water/tree precision; low built-up sample count. |
| **Fold 4** | South-Central Plains | **85.63%** | **84.90%** | 0.8452 | 0.4174 | Uniform performance across all 4 classes. |
| **Fold 5** | Southern Padma River | **89.63%** | **86.05%** | 0.8549 | 0.3151 | Padma River dominant (water recall 97.94%). |
| **Mean ± Std** | **Full Territory** | **84.63% ± 3.81%** | **84.37% ± 1.16%** | **0.8342 ± 0.0194** | **0.4208 ± 0.0768** | **Robust spatial generalization.** |

Accuracy and Balanced Accuracy are not equal. Their divergence reflects the physical latitudinal shift from northern clay agriculture to southern alluvial river systems.

---

## 4. Unresolved Scientific Limitations

1. **Crop Species Separation Remains Blocked:** ESA WorldCover 2021 provides generic Cropland boundaries (Class 40). Parcel-level crop species (Rice vs Wheat vs Maize) cannot be classified without verified DAE field GPS boundary survey shapefiles.
2. **Reference Label Latency (2021 vs 2022–2025):** Morphodynamics of Padma River char sandbars and rapid conversion of rice paddies to commercial mango orchards introduce genuine physical differences against 2021 global reference labels.
3. **10m Mixed Boundary Pixels (18.39% of Landscape):** Sub-pixel interleaving of corrugated tin roofs, courtyard mango trees, and bare soil within single 10m pixels remains the primary empirical factor preventing higher accuracy.
4. **B11 Resampling:** Resampling Band B11 (SWIR1) from 20m to 10m does not create genuine 10m spatial detail.
