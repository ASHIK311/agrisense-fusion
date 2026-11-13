# Field Shift — Member 1 Satellite GIS: Model Benchmark & Ablation Report
**NASA Space Apps Challenge 2026**  
**Empirical Comparison of 4 Algorithms and Feature Ablation Study**  

---

## 1. Multi-Model Benchmark Results (Zero Spatial Leakage Evaluation)

| Model Candidate | Overall Accuracy (%) | Balanced Acc (%) | Macro F1 | Weighted F1 | Log-Loss | Cropland F1 | Fit Time (s) | Infer (µs/sample) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Extra Trees (Selected)** | **79.77%** | **77.78%** | **0.7668** | **0.7990** | **0.5546** | **0.7292** | **0.17 s** | **3.57 µs** |
| Random Forest (Baseline) | 79.23% | 77.31% | 0.7617 | 0.7929 | 0.5897 | 0.7236 | 0.30 s | 3.70 µs |
| LightGBM | 79.09% | 77.11% | 0.7603 | 0.7919 | 0.7292 | 0.7250 | 0.23 s | 2.56 µs |
| XGBoost | 78.78% | 76.94% | 0.7573 | 0.7888 | 0.6521 | 0.7236 | 0.62 s | 1.18 µs |

* **Selection Rationale:** Extra Trees achieved the highest overall accuracy (79.77%), highest weighted F1 (0.7990), highest Cropland F1 (0.7292), and lowest cross-entropy log-loss (0.5546), showing superior calibration and robustness against localized noise.

## 2. Feature Ablation Study

| Experiment ID | Feature Subset | Feature Count | Overall Accuracy (%) | Weighted F1 |
|:---|:---|:---:|:---:|:---:|
| **Exp A** | Spectral Bands Only (B02, B03, B04, B08, B11) | 5 | 73.44% | 0.7404 |
| **Exp B** | Indices Only (NDVI, NDWI, NDMI, EVI) | 4 | 61.01% | 0.6187 |
| **Exp C** | Spectral Bands + Indices | 9 | 74.55% | 0.7509 |
| **Exp D (Full Stack)** | **Spectral + Indices + Multi-Temporal Delta-NDVI** | **10** | **79.77%** | **0.7990** |

* **Scientific Conclusion:** Adding the multi-temporal seasonal biomass amplitude ($\Delta	ext{NDVI}$) provided a dramatic $+5.22\%$ accuracy boost over static spectral+index models, proving the necessity of multi-temporal observation for agricultural discrimination.
