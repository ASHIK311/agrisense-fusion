# Target Rule Verification & Scientific Grounding Report

**Subsystem Name:** Pre-Monsoon Heat & Atmospheric Desiccation Screening System  
**Audited Target:** `heat_drought_risk` (Renamed to `acute_heat_desiccation_risk`)  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Dataset Reference:** `cleaned_weather_dataset.csv` (1,827 daily records, 2019-01-01 to 2024-01-01)  
**Date:** November 10, 2026  

---

## 1. Mathematical Definition & 100% Rule Reconstruction Proof

The target column in `cleaned_weather_dataset.csv` was mathematically reverse-engineered and evaluated across all 1,827 rows. The exact governing equation is:

$$\text{Risk}(i) = \begin{cases} 1 & \text{if } t_{\max}[i] \ge 35.0^\circ\text{C} \;\land\; \text{humidity}[i] \le 50.0\% \;\land\; \text{rainfall}[i] \le 1.0\text{ mm} \\ 0 & \text{otherwise} \end{cases}$$

### Quantitative Rule Verification Results
* **Total Rows Evaluated:** 1,827 days
* **Observed Positive Records in Dataset:** 139 days (7.61%)
* **Observed Negative Records in Dataset:** 1,688 days (92.39%)
* **Synthesized Rule Matches:** 1,827 / 1,827
* **Mismatches Between Rule and CSV Column:** **0 (Zero)**
* **Mathematical Fidelity:** **100.00%**

---

## 2. Seasonal Distribution of Positive Events

The 139 positive events occur almost exclusively in the pre-monsoon summer (Kharif-1 season), centered on the months of March and April:

| Month | Total Days | Risk Days ($N$) | Risk Frequency (%) | Mean $T_{\max}$ on Risk Days | Mean $RH$ on Risk Days | Agronomic Season |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **January** | 156 | 0 | 0.00% | — | — | Rabi (Winter Dry) |
| **February** | 141 | 2 | 1.42% | 35.2°C | 43.1% | Rabi (Late Winter) |
| **March** | 155 | 57 | **36.77%** | 37.8°C | 38.6% | Kharif-1 (Early Summer) |
| **April** | 150 | 68 | **45.33%** | 39.8°C | 34.2% | Kharif-1 (Peak Heat Season) |
| **May** | 155 | 11 | 7.10% | 38.5°C | 46.2% | Kharif-1 (Late Summer) |
| **June** | 150 | 1 | 0.67% | 36.1°C | 48.9% | Kharif-2 (Monsoon Transition) |
| **July** | 155 | 0 | 0.00% | — | — | Kharif-2 (Monsoon Wet) |
| **August** | 155 | 0 | 0.00% | — | — | Kharif-2 (Monsoon Wet) |
| **September** | 150 | 0 | 0.00% | — | — | Kharif-2 (Monsoon Wet) |
| **October** | 155 | 0 | 0.00% | — | — | Kharif-2 (Post-Monsoon) |
| **November** | 150 | 0 | 0.00% | — | — | Rabi (Early Winter) |
| **December** | 155 | 0 | 0.00% | — | — | Rabi (Mid Winter) |

**Key Finding:** 125 out of 139 events (89.9%) occur in March and April. The zero frequency from July to January reflects high monsoon atmospheric moisture ($RH > 80\%$) and cool winter temperatures ($T_{\max} < 28^\circ\text{C}$).

---

## 3. Agronomic Critique: Why This Is Not Agricultural Drought

### 3.1 The Physical Reality of Single-Day Low Precipitation
In Bangladesh's monsoonal climate:
* Over **67.2% of all calendar days (1,228 / 1,827 days)** have $\text{rainfall} \le 1.0\text{ mm}$.
* **56.0% of days (1,023 / 1,827 days)** have zero rainfall.
* A single day having $P \le 1.0\text{ mm}$ is the normal state of affairs for over two-thirds of the year.

### 3.2 Agricultural Drought vs. Atmospheric Desiccation
* **Agricultural Drought:** A prolonged root-zone soil water deficit where soil moisture drops below the threshold of readily available water ($D_r > \text{RAW}$), causing stomatal closure, reduced transpiration, and permanent cell damage. It requires tracking cumulative multi-week soil water depletion.
* **Atmospheric Desiccation (The Actual Target):** The combination of $T_{\max} \ge 35.0^\circ\text{C}$ and $RH \le 50.0\%$ creates an extreme atmospheric **Vapour Pressure Deficit ($\text{VPD} > 3.0\text{ kPa}$)**. Even if an irrigated field has sufficient water in the soil, the atmosphere extracts moisture from crop canopies faster than root vascular systems can supply it, causing temporary midday wilting and spikelet sterility in flowering Boro rice and maize.

**Correct Scientific Label:** **Acute Atmospheric Heat Desiccation Event**.

---

## 4. Rule-Reconstruction Benchmark Comparison

To avoid misrepresenting machine learning accuracy as predictive drought intelligence, we benchmarked four algorithms on an identical 80/20 stratified test split ($N=366$):

| Architecture / Method | True Negatives (TN) | False Positives (FP) | False Negatives (FN) | True Positives (TP) | Accuracy | Recall (Sensitivity) | F1-Score | ROC AUC | Role & Interpretation |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Direct Deterministic Rule** | **338** | **0** | **0** | **28** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | **Ground Truth Baseline (Zero parameters)** |
| **Random Forest (100 Trees)** | **338** | **0** | **0** | **28** | **1.0000** | **1.0000** | **1.0000** | **1.0000** | Perfect rule boundary reconstruction |
| **XGBoost (Member 2 Model)** | **338** | **0** | **1** | **27** | **0.9973** | **0.9643** | **0.9818** | **1.0000** | **Exact match to Member 2's plots** |
| **Logistic Regression** | **334** | **4** | **5** | **23** | **0.9754** | **0.8214** | **0.8364** | **0.9947** | Linear hyperplane approximation |

### Crucial Scientific Takeaway
* The direct Python rule outperforms XGBoost on test recall ($100\%$ vs. $96.43\%$) because XGBoost makes a leaf threshold approximation error on a borderline sample.
* XGBoost's 99.7% accuracy reflects **rule approximation fidelity**, NOT forecasting accuracy for real-world agricultural crop damage.
