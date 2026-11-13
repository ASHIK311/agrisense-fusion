# Member 3: Capacitive Soil Moisture Calibration Results

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Target Soil:** Godagari High Barind Silty Clay Loam ($\rho_b = 1.35\,\text{g/cm}^3$)  
**Status:** **CALIBRATION TEMPLATE & BENCHMARK MODELS GENERATED**  
**Figure Reference:** [`charts/soil_moisture_calibration_curve.png`](file:///F:/nasa%20project/Member%203/charts/soil_moisture_calibration_curve.png)  
**Date:** November 10, 2026  

---

## 1. Regression Models & Transfer Functions

Based on the laboratory reference dataset in `calibration_template.csv` ($N=8$ controlled hydration levels across the agricultural moisture continuum), two calibration models were fitted:

### Model 1: Linear Inverted Transfer Function
$$\theta_{\text{VWC}} = -0.000257 \times \text{ADC} + 0.8811$$

* **Coefficient of Determination ($R^2$):** **$0.9932$**
* **Root Mean Squared Error (RMSE):** **$0.0104$** ($1.04\%\text{ VWC}$)
* **Mean Absolute Error (MAE):** **$0.0084$** ($0.84\%\text{ VWC}$)
* **Suitability:** Suitable for low-cost microcontroller implementation where floating-point quadratic computation is avoided.

### Model 2: Quadratic Polynomial Transfer Function (Recommended)
$$\theta_{\text{VWC}} = 3.18255 \times 10^{-8} \times \text{ADC}^2 - 0.000418 \times \text{ADC} + 1.0793$$

* **Coefficient of Determination ($R^2$):** **$0.9959$**
* **Root Mean Squared Error (RMSE):** **$0.0081$** ($0.81\%\text{ VWC}$)
* **Mean Absolute Error (MAE):** **$0.0068$** ($0.68\%\text{ VWC}$)
* **Suitability:** Captures the slight non-linear curvature of capacitive dielectric response at near-saturation conditions ($>35\%\text{ VWC}$).

---

## 2. Agronomic Calibration Points for Godagari Silty Clay Loam

| Calibration Point | Agronomic Soil State | Ref. VWC ($\text{m}^3/\text{m}^3$) | Ref. VWC (%) | Mean Raw ADC (12-bit) | ADC Std Dev ($\sigma$) | Sensor Voltage @ 3.3V |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **1** | Air-dry soil | $0.0359$ | $3.59\%$ | **3310** | $\pm 12.4$ | $2.67\text{ V}$ |
| **2** | Very dry sub-wilting | $0.1222$ | $12.22\%$ | **2980** | $\pm 14.1$ | $2.40\text{ V}$ |
| **3** | **Permanent Wilting Point ($\theta_{WP}$)** | **$0.1652$** | **$16.52\%$** | **2795** | $\pm 11.8$ | $2.25\text{ V}$ |
| **4** | Moderate irrigation trigger | $0.2310$ | $23.10\%$ | **2510** | $\pm 15.3$ | $2.02\text{ V}$ |
| **5** | Optimal crop moisture | $0.2865$ | $28.65\%$ | **2280** | $\pm 13.7$ | $1.84\text{ V}$ |
| **6** | **Field Capacity ($\theta_{FC}$)** | **$0.3233$** | **$32.33\%$** | **2120** | $\pm 16.2$ | $1.71\text{ V}$ |
| **7** | Post-irrigation high moisture | $0.3808$ | $38.08\%$ | **1940** | $\pm 18.0$ | $1.56\text{ V}$ |
| **8** | Saturation (Paddy puddle) | $0.4363$ | $43.63\%$ | **1820** | $\pm 19.5$ | $1.47\text{ V}$ |

---

## 3. Agronomic Interpretation Guidelines for Irrigation Management

1. **Readily Available Water (RAW) Envelope:**
   * In Barind terrace soils, the readily available soil water reservoir spans between **$\theta_{WP} \approx 16.5\%$** (Raw ADC: ~2795) and **$\theta_{FC} \approx 32.3\%$** (Raw ADC: ~2120).
   * Total Available Water: $\text{TAW} = \theta_{FC} - \theta_{WP} = 0.323 - 0.165 = \mathbf{0.158\,\text{m}^3/\text{m}^3}$ ($158\text{ mm/m of root depth}$).
2. **Irrigation Depletion Triggers:**
   * **Boro Rice:** Maintain above 70% RAW ($\theta \ge 27.5\%$, $\text{ADC} \le 2350$) during vegetative and reproductive stages to avoid spikelet sterility.
   * **Wheat / Maize:** Allow depletion to 50% RAW ($\theta \approx 24.4\%$, $\text{ADC} \approx 2450$) before initiating tubewell pumping, significantly reducing groundwater extraction compared to traditional flooding.
