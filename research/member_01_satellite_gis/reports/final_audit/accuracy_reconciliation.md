# Field Shift — Member 1: Accuracy Metric Reconciliation & Terminology

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Role:** Member 1 — Satellite Image Processing, Remote Sensing & ML Subsystem  

---

## 1. Disambiguation of Evaluation Metrics

| Metric Designation | Value | Sample Basis | Statistical Scope & Validity |
| :--- | :---: | :---: | :--- |
| **5-Fold Spatial Cross-Validation Accuracy** | **84.63% ± 3.81%** | 5 contiguous spatial blocks ($N=20,000$) | Unbiased measure of spatial generalization across geographic gradients. Contiguous block partition without buffer zones (residual spatial autocorrelation across boundary seams remains). |
| **5-Fold Spatial Balanced Accuracy** | **84.37% ± 1.16%** | 5 contiguous spatial blocks ($N=20,000$) | Unweighted mean of recall across all 4 classes across all 5 folds. Varies by fold depending on local class distribution. |
| **5-Fold Spatial Macro-F1 Score** | **0.8342 ± 0.0194** | 5 contiguous spatial blocks ($N=20,000$) | Balanced harmonic metric evaluated across all 5 spatial blocks. |
| **Class-Balanced Development Holdout Accuracy** | **85.77%** | Block C ($N=6,000$ points) | Frozen southern spatial development holdout (3,639 pure correct + 1,507 mixed correct = 5,146 / 6,000). |
| **Pure Interior Centroid Accuracy** | **90.64%** | Homogeneous $3\times 3$ window ($N=4,015$) | True optical discriminative capability when sub-pixel boundary mixing is removed. |
| **Mixed Boundary Pixel Accuracy** | **75.92%** | Heterogeneous $3\times 3$ window ($N=1,985$) | Performance on sub-pixel mixed edges (tin roofs, mango trees, bare soil). |
| **Area-Weighted Godagari Landscape Accuracy** | *Not Independently Established* | Full $445.69\text{ km}^2$ polygon | Post-hoc synthetic weighting was audited and rejected; true area-weighted estimation requires dedicated full-landscape probability sampling conforming to Olofsson et al. (2014). |
| **Representative Operational Benchmark (Baseline)** | **77.07%** | 10,000 empirical representative points | Evaluated on baseline 15-feat model under true landscape prevalence (79.4% Cropland). |

---

## 2. Rejection of Post-Hoc Synthetic Area-Weighted Calculations

### Why Synthetic Area-Weighting Was Rejected:
1. **Inclusion Probability = 0 for 70% of the Upazila:** Block C is a latitudinal spatial partition south of row percentile 70. Northern and central pixels had zero probability of inclusion in this holdout. Design-based inference to the whole Upazila is mathematically invalid.
2. **Physiographic Non-Stationarity:** Southern Godagari is dominated by the Padma River channel and dynamic char sandbars (45.77% of Block C samples are Water). Northern Godagari is the elevated Madhupur clay plateau (High Barind Tract) dominated by contiguous cropland. Extrapolating southern recalls across the whole Upazila assumes unverified spatial stationarity.
3. **Formula Inconsistency:** Standard remote sensing practices (Olofsson et al. 2014) estimate area-adjusted accuracy by multiplying map stratum weights by User's Accuracy (Precision). Multiplying reference area by Producer's Accuracy (Recall) was an ad-hoc heuristic.
4. **Resolution:** Area-weighted landscape accuracy remains officially designated as **Not Yet Independently Established**.
