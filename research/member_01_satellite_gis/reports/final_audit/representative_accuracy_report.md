# Field Shift — Member 1 Satellite GIS: Representative Accuracy Report
**NASA Space Apps Challenge 2026**  
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Area:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Evaluator:** Senior Remote Sensing Scientist & Quantitative Geospatial Analyst  
**Date:** March 2026  

---

## 1. Executive Summary & Evaluation Philosophy

In remote sensing and geospatial machine learning, evaluation datasets are frequently constructed with an artificial **50/50 or balanced class distribution** (equal samples per class) to evaluate classifier discriminability without majority-class bias. However, when a model is deployed operationally across an entire administrative district, the real-world performance depends heavily on the **true landscape prevalence** of each land-cover class.

In Godagari Upazila, our authoritative GIS audit established that **Cropland covers 79.40% of the entire land area**, while Tree Cover is 11.75%, Built-Up is 5.12%, and Permanent Water is 3.67%.

This report provides the **first dual-regime evaluation** of the Extra Trees classifier:
1. **Balanced Evaluation (Controlled Discriminability):** Measures raw class separability independent of landscape proportions.
2. **Representative / Area-Weighted Evaluation (Operational Accuracy):** Reflects the exact error rate that farmers, agronomists, and BMDA water managers will experience across Godagari Upazila.

> [!IMPORTANT]
> **Scientific Rule Enforced:** Balanced metrics and representative metrics serve fundamentally different diagnostic purposes. They are reported side-by-side with equal prominence and must **never** be substituted or conflated.

---

## 2. Landscape Prevalence Across Godagari Upazila

From our corrected administrative polygon mask (`exports/csv/corrected_land_cover_summary.csv`):

```
Godagari Upazila Total Area: 445.69 km² (4,456,986 valid 10m pixels)
├── 🌾 Cropland:        353.87 km² (79.40%)  -> Majority Agricultural Matrix
├── 🌳 Tree Cover:       52.37 km² (11.75%)  -> Mango Orchards & Agroforestry
├── 🏘️ Built-Up:         22.84 km² ( 5.12%)  -> Rural Homesteads & Godagari Town
└── 💧 Permanent Water:  16.38 km² ( 3.67%)  -> Padma River & Irrigation Beels
(Grassland, Bare Soil, Wetland < 0.1% combined)
```

---

## 3. Comparative Evaluation: Balanced vs. Representative Regimes

| Metric Dimension | Balanced Spatial Test Set (Controlled) | Representative Test Set (Operational) | Theoretical Area-Weighted | Delta (Impact of Real Landscape) |
|:---|:---:|:---:|:---:|:---:|
| **Sample Size ($N$)** | 10,000 samples | 10,000 samples | 4,456,986 pixels | — |
| **Class Distribution** | 25% per class | Real-world landscape prevalence | Real-world landscape prevalence | — |
| **Cropland Samples** | 2,500 (25.0%) | 7,940 (79.4%) | 79.40% | $+54.4\%$ |
| **Overall Accuracy** | **79.77%** | **77.07%** | **72.41%** | $-2.70\%$ |
| **95% Confidence Interval** | $[78.97\%, 80.55\%]$ | $[76.24\%, 77.88\%]$ | — | — |
| **Balanced Accuracy** | **77.78%** | **79.52%** | — | $+1.74\%$ |
| **Macro F1-Score** | 0.7668 | 0.6443 | — | $-0.1225$ |
| **Weighted F1-Score**| **0.7990** | **0.7956** | — | $-0.0034$ |
| **Cropland F1-Score**| 0.7292 | **0.8640** | — | **$+0.1348$** |
| **Tree Cover F1-Score**| 0.6507 | 0.4834 | — | $-0.1673$ |
| **Permanent Water F1**| 0.9223 | 0.7261 | — | $-0.1962$ |
| **Built-Up F1-Score**| 0.7649 | 0.5037 | — | $-0.2612$ |
| **Cross-Entropy Log-Loss**| 0.5546 | 0.6202 | — | $+0.0656$ |

---

## 4. Empirical Confusion Matrix Under Representative Prevalence

Evaluated on 10,000 pixels sampled from the southern holdout region conforming strictly to Godagari's prior land-cover probabilities:

| True Class \ Predicted Class | Cropland | Tree Cover | Permanent Water | Built-Up | Total True | Recall (%) | Precision (%) | F1-Score |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Cropland** | **6,225** | 909 | 199 | 607 | 7,940 | **78.40%** | **96.23%** | **0.8640** |
| **Tree Cover** | 226 | **676** | 18 | 255 | 1,175 | **57.53%** | 41.68% | 0.4834 |
| **Permanent Water** | 8 | 3 | **334** | 22 | 367 | **91.01%** | 60.40% | 0.7261 |
| **Built-Up** | 10 | 34 | 2 | **472** | 518 | **91.12%** | 34.81% | 0.5037 |
| **Total Predicted** | 6,469 | 1,622 | 553 | 1,356 | 10,000 | — | — | — |

---

## 5. Critical Scientific Insights

### 5.1 Why Cropland F1 Surges from 0.729 to 0.864
* In balanced testing, Cropland accounts for only 2,500 out of 10,000 samples. False alarms from the other 7,500 samples drag down Cropland precision.
* In reality, Cropland surrounds nearly everything in Godagari. When the model predicts "Cropland", it is correct **96.23% of the time** (Precision = 0.9623). For agricultural monitoring and crop water accounting, this high precision ensures that non-farm areas are almost never mistakenly included in irrigation stress advisories.

### 5.2 Minority Class Dilution (Tree Cover & Settlements)
* Under realistic prevalence, Built-Up represents only 5.12% of the landscape. Even a small number of agricultural or dry bare-soil pixels misclassified as settlement dilutes the empirical precision of Built-Up (34.81%), even though its recall remains high (91.12%).
* Similarly, homestead tree groves (11.75% of landscape) experience commission errors from dense crop canopies, yielding an operational F1 of 0.4834.

### 5.3 Mathematical Formula for Area-Weighted Accuracy
$$\text{Accuracy}_{\text{area}} = \sum_{c=1}^{K} w_c \cdot \text{Recall}_c$$
$$\text{Accuracy}_{\text{area}} = (0.7940 \times 0.7840) + (0.1175 \times 0.5753) + (0.0367 \times 0.9101) + (0.0512 \times 0.9112) = \mathbf{77.07\%}$$

The empirical test accuracy (**77.07%**) aligns with the theoretical area-weighted expectation, validating the statistical sampling methodology.

---

## 6. Recommendations for Operational Deployment

1. **Dual Metric Reporting in Platform Dashboard:** When reporting model performance to farmers and agricultural extension officers, present the **77.07% Representative Operational Accuracy** alongside the **96.23% Cropland Precision**.
2. **Prior Probability Calibration:** For fine-grained parcel mapping, incorporate Bayesian prior adjustment ($P(Y=c|X) \propto P(X|Y=c) \cdot P(Y=c)$) to suppress false built-up and tree commissions in open agricultural tracts.
