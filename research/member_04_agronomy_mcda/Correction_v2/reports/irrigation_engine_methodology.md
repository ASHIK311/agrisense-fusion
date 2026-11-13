# FAO-56 Reference Evapotranspiration & Irrigation Engine Methodology
## Field Shift — Member 4 Subsystem Correction_v2
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Date:** November 2026  
**Auditor / Irrigation Specialist:** Senior FAO-56 Irrigation & Water Resources Engineer  

---

## 1. Executive Summary & Audit Resolution

The previous audit flagged three critical deficiencies in Member 4's water requirement deliverables:
1. **Unassigned Rice $K_c$:** All 255 Rice records had missing / null $K_c$ values.
2. **Missing Reference Evapotranspiration ($\text{ET}_0$):** Penman-Monteith $\text{ET}_0$ was not calculated from NASA weather data.
3. **No Distinction Between $\text{ET}_c$, Rainfall, and Irrigation Demand:** Crop evapotranspiration was confused with irrigation needs, and effective rainfall was not calculated.

In `Correction_v2`, a full **FAO-56 Irrigation Engineering Engine** was constructed:
- Implemented standard FAO-56 Penman-Monteith daily $\text{ET}_0$ combination equation.
- Integrated phenological 4-stage crop coefficients ($K_c$) calibrated for Bangladesh rice varieties from BRRI (Bangladesh Rice Research Institute) and wheat/maize varieties from BARI (Bangladesh Agricultural Research Institute).
- Computed monthly effective rainfall ($P_{\text{eff}}$) via the USDA Soil Conservation Service (SCS) formula.
- Calculated Net Irrigation Water Requirement ($\text{IWR} = \max(0, \text{ET}_c - P_{\text{eff}})$) and volumetric irrigation depth ($1\text{ mm} = 10\text{ m}^3/\text{ha}$).
- Constructed root-zone water balance tracking readily available water (RAW), total available water (TAW), and irrigation triggers.

---

## 2. FAO-56 Penman-Monteith Formulation

The standard FAO-56 Penman-Monteith equation (Allen et al., 1998, Eq. 6) calculates reference evapotranspiration ($\text{ET}_0$) from a hypothetical grass reference surface:

$$\text{ET}_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T_{\text{mean}} + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

### Component Equations Implemented:
1. **Mean Saturation Vapor Pressure ($e_s$):**
   $$e^\circ(T) = 0.6108 \exp\left(\frac{17.27 T}{T + 237.3}\right),\quad e_s = \frac{e^\circ(T_{\text{max}}) + e^\circ(T_{\text{min}})}{2}\quad (\text{kPa})$$
2. **Actual Vapor Pressure ($e_a$):**
   $$e_a = e_s \times \left(\frac{\text{RH}_{\text{mean}}}{100}\right)\quad (\text{kPa})$$
3. **Slope of Saturation Vapor Pressure Curve ($\Delta$):**
   $$\Delta = \frac{4098 \left[0.6108 \exp\left(\frac{17.27 T_{\text{mean}}}{T_{\text{mean}} + 237.3}\right)\right]}{(T_{\text{mean}} + 237.3)^2}\quad (\text{kPa}/^\circ\text{C})$$
4. **Atmospheric Pressure ($P$) & Psychrometric Constant ($\gamma$):**
   $$P = 101.3 \left(\frac{293 - 0.0065 z}{293}\right)^{5.26}\quad (\text{kPa}),\quad \gamma = 0.000665 P\quad (\text{kPa}/^\circ\text{C})$$
5. **Net Radiation ($R_n$):**
   $$R_{ns} = (1 - 0.23) R_s,\quad R_{nl} = \sigma \left(\frac{T_{\text{max},K}^4 + T_{\text{min},K}^4}{2}\right) (0.34 - 0.14 \sqrt{e_a}) \left(1.35 \frac{R_s}{R_{so}} - 0.35\right)$$
   $$R_n = R_{ns} - R_{nl},\quad G_{\text{day}} = 0.0\text{ MJ}/\text{m}^2/\text{day}$$

---

## 3. Crop Coefficient ($K_c$) Reference Matrix

Documented in `data/reference/crop_stage_kc_reference.csv`:

| Crop | Season | Initial ($K_{c,\text{ini}}$) | Dev ($K_{c,\text{dev}}$) | Mid ($K_{c,\text{mid}}$) | Late ($K_{c,\text{late}}$) | Agronomic Authority |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Aman Rice** | Kharif-2 (Monsoon) | 1.05 (20d) | 1.15 (30d) | 1.20 (40d) | 0.90 (30d) | BRRI Rice Production Manual |
| **Boro Rice** | Rabi (Winter Irrigated) | 1.10 (25d) | 1.20 (35d) | 1.30 (40d) | 0.95 (30d) | BRRI Irrigation & Water Mgmt |
| **Aus Rice** | Kharif-1 (Pre-Monsoon) | 1.05 (20d) | 1.15 (30d) | 1.25 (40d) | 0.90 (25d) | BRRI / FAO-56 Table 12 |
| **Wheat** | Rabi (Winter) | 0.40 (20d) | 0.80 (30d) | 1.15 (40d) | 0.40 (25d) | BWMRI Dinajpur & Rajshahi |
| **Maize** | Rabi / Kharif-1 | 0.40 (20d) | 0.85 (35d) | 1.20 (40d) | 0.60 (30d) | BARI Agronomy Division |

---

## 4. Godagari Upazila Case Study: The Boro Groundwater Crisis

In Godagari Upazila (High Barind Tract):
- In **April**, peak $\text{ET}_0 = 6.35\text{ mm/day}$.
- Boro Rice is in mid-season heading/flowering stage ($K_{c,\text{mid}} = 1.30$).
- Daily $\text{ET}_c = 1.30 \times 6.35 = 8.26\text{ mm/day}$ ($82.6\text{ m}^3/\text{ha/day}$).
- Effective rainfall in April is near zero ($\le 15\text{ mm}$).
- Monthly net irrigation requirement exceeds **$240\text{ mm} + \text{percolation losses} \approx 350\text{ mm}$**.
- This massive moisture deficit forces deep-tube well over-extraction, depleting the regional aquifer and confirming why Boro Rice is ranked Rank 5 (Marginally Suitable) in Godagari.
