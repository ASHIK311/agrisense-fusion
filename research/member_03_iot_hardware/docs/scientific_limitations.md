# Scientific Limitations & Boundary Conditions
## Member 3 — IoT Soil Monitoring & Ground Sensor Subsystem
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Study Area:** Godagari Upazila, Rajshahi District, Bangladesh (AEZ-26 High Barind Tract)  
**Document Classification:** Academic Rigor & Technical Audit Disclosure  
**Status:** CURRENT / RATIFIED

---

## 1. Executive Disclosure of Deployment Status

| Subsystem Domain | Physical Status | Operational Truth |
| :--- | :--- | :--- |
| **Microcontroller & Electronics** | Prototype Design | Physical hardware deployment has **NOT BEEN PERFORMED** in Godagari. Firmware and circuit designs are validated on benchtop and architectural models. |
| **Field Measurements** | Synthetically Modeled | The dataset `data/simulated/esp32_simulated_readings.csv` comprises 5,760 records generated from an agronomically constrained simulation model. Every record has `is_simulated = True` and `source = 'SIMULATED_TEST_DATA'`. |
| **Laboratory Calibration** | Analytical Template | Calibration parameters in `calibration/calibration_results.md` are derived from pedotransfer functions and documented Barind silty clay loam core drying curves. Field calibration is **UNCALIBRATED** until ASTM D2216 oven drying is physically executed on intact cores. |
| **Remote Sensing Data** | Operational Satellite Data | NASA SMAP L4 (`NASA/SMAP/SPL4SMGP/008`) and ISRIC SoilGrids v2.0 are operational satellite and digital soil mapping products. |

---

## 2. Spatial Scale Discrepancies (Point Sensor vs. Satellite Grids)

A central risk in environmental data fusion is the uncritical comparison of point-scale in-situ measurements against coarse satellite grid pixels.

```
+-----------------------------------------------------------------------------------------+
| NASA SMAP Level-4 Soil Moisture Pixel (~9.0 km x 9.0 km = 81.0 km²)                     |
|                                                                                         |
|   +-------------------------------------------------------------------+                 |
|   | ISRIC SoilGrids v2.0 Pixel (250 m x 250 m = 0.0625 km² / 6.25 ha) |                 |
|   |                                                                   |                 |
|   |     +-------------------------------------------------------+     |                 |
|   |     | Field / Agricultural Parcel (~20 m x 50 m = 0.10 ha)  |     |                 |
|   |     |                                                       |     |                 |
|   |     |          (•) In-Situ ESP32 FDR Sensor                 |     |                 |
|   |     |              Sphere of Influence: r ≈ 5-8 cm          |     |                 |
|   |     |              Volume sampled: ~0.0005 m³               |     |                 |
|   |     +-------------------------------------------------------+     |                 |
|   +-------------------------------------------------------------------+                 |
+-----------------------------------------------------------------------------------------+
```

### Key Scale Discrepancies:
1. **Geometric Mismatch:**
   - The capacitive FDR probe samples a volume of approximately $500\text{ cm}^3$ ($0.0005\text{ m}^3$) immediately surrounding the PCB prongs.
   - The NASA SMAP L4 pixel covers $81,000,000\text{ m}^2$ ($81\text{ km}^2$), integrating over diverse land uses, roads, ponds, settlements, and hundreds of micro-watersheds across Godagari.
2. **Topographic & Hydrological Averaging:**
   - Godagari's High Barind Tract features rolling topography (*chala* high ridges and *baid* low valleys). Runoff from ridges collects rapidly in valleys.
   - A single point sensor on a ridge will indicate severe desiccation ($\text{VWC} < 18\%$), while a sensor in a low valley will indicate near-saturation ($\text{VWC} > 36\%$).
   - SMAP L4 averages these opposing extremes into a single regional value ($\approx 26\%$), masking local agricultural stress.
3. **Recommendation for Project Fusion:**
   - **Never assert that SMAP "validates" an in-situ point sensor without spatial downscaling or a dense multi-node wireless mesh.**
   - SMAP provides the regional boundary condition and seasonal trajectory. The ESP32 sensor provides high-frequency field-level decision support (irrigation scheduling).

---

## 3. Dielectric Sensor Physics & Barind Soil Mineralogy

Low-cost capacitive sensors (e.g., Capacitive Soil Moisture Sensor v1.2 / v2.0) measure the **apparent relative complex dielectric permittivity** ($\varepsilon_r$ or $K_a$) of the surrounding medium, not the water content directly.

$$\text{Permittivity of Air } \varepsilon_{\text{air}} \approx 1, \quad \text{Dry Mineral Soil } \varepsilon_{\text{mineral}} \approx 3 - 5, \quad \text{Free Water } \varepsilon_{\text{water}} \approx 80 \text{ at } 20^\circ\text{C}$$

Because water's permittivity is over 16 times higher than that of mineral soil particles, changes in bulk soil permittivity are predominantly driven by water content. However, in the High Barind Tract (AEZ-26), several physical factors complicate this relationship:

### 3.1 Clay Mineralogy & Bound Water
- Barind soils contain 32% to 44% clay (predominantly illite, kaolinite, and minor vermiculite).
- Clay mineral surfaces carry net negative electrical charges, forming a tightly bound water layer (adsorbed water) approximately 1 to 3 molecules thick.
- **Bound water has a restricted rotational mobility, resulting in a dielectric permittivity of $\varepsilon_{\text{bound}} \approx 3.1 - 4.0$, indistinguishable from dry mineral solids.**
- Consequently, capacitive sensors operate at ~1 MHz to 50 MHz frequencies, where they underestimate the total water content in heavy clay compared to sandy soils. Site-specific calibration is mandatory.

### 3.2 Temperature Sensitivity
- The dielectric permittivity of free water exhibits a negative temperature coefficient:
  $$\frac{d\varepsilon_w}{dT} \approx -0.37 \text{ K}^{-1}$$
- Simultaneously, electrical conductivity ($\sigma$) increases with temperature by approximately $+2\% \text{ per } ^\circ\text{C}$, lowering apparent sensor impedance.
- Uncompensated capacitive sensors will register apparent diurnal moisture swings of $\pm 1.5 - 3.0\%\text{ VWC}$ solely due to soil temperature cycling ($20^\circ\text{C} \leftrightarrow 35^\circ\text{C}$), even when true moisture remains static.

### 3.3 Bulk Density & Structural Compaction (Plow Pan)
- Barind soils possess a dense agricultural plow pan (*hardpan*) at 15–30 cm depth, formed by decades of wet puddle tillage for transplanted Aman rice.
- Bulk density jumps from $1.34\text{ g/cm}^3$ in the tilled topsoil (0–10 cm) to $>1.51\text{ g/cm}^3$ in the plow pan.
- Higher bulk density packs more mineral solids into the sensing volume, increasing the baseline dry permittivity and shifting the calibration curve upward.

---

## 4. Analytical Calibration vs. Laboratory Ground Truth

The calibration equations documented in Member 3 are:

$$\text{Linear Model: } \text{VWC} = -0.00025736 \cdot \text{ADC} + 0.88111 \quad (R^2 = 0.9932)$$
$$\text{Quadratic Model: } \text{VWC} = 3.18255\times 10^{-8} \cdot \text{ADC}^2 - 0.00041846 \cdot \text{ADC} + 1.0793 \quad (R^2 = 0.9959)$$

### Methodological Caveat:
- These curves represent an **empirical benchmark model** derived from known Barind soil moisture-density relationships, controlled benchtop sensor voltage envelopes ($V_{\text{air}} \approx 2.9\text{V}$, $V_{\text{water}} \approx 1.3\text{V}$), and the Topp universal equation adapted for clay.
- **Field validity requires executing the physical core drying procedure documented in `calibration/calibration_methodology.md` (ASTM D2216) with soil extracted from the specific installation plot.**
- Using these equations on an uncalibrated field probe introduces an estimated structural error of $\pm 3.5\%\text{ to }\pm 5.0\%\text{ VWC}$.

---

## 5. Agronomic Thresholds & Soil Water Dynamics

For Godagari silty clay loam, agronomic moisture thresholds are defined as:

| Threshold | VWC (%) | Soil Matric Potential ($\psi_m$) | Agronomic Implication |
| :--- | :--- | :--- | :--- |
| **Saturation ($\theta_s$)** | $43.5\%$ | $0\text{ kPa}$ | Anaerobic root stress; surface ponding; common during monsoon rice cultivation. |
| **Field Capacity ($\theta_{\text{fc}}$)** | $32.3\%$ | $-33\text{ kPa}$ | Optimal soil moisture; gravitational water drained; maximum aeration and capillary water. |
| **Irrigation Trigger** | $24.4\%$ | $-100\text{ to }-200\text{ kPa}$ | Readily Available Water (RAW) depleted by $50\%$ ($\text{MAD} = 0.50$); crop stress imminent; trigger irrigation. |
| **Permanent Wilting ($\theta_{\text{pwp}}$)** | $16.5\%$ | $-1500\text{ kPa}$ | Plants unable to exert sufficient suction to extract water; irreversible cell turgor loss and crop death. |

### Diagnostic Caveat:
- In the High Barind Tract, the heavy clay plow pan prevents downward percolation during dry periods, while capillary rise from deep regional groundwater is negligible due to water table depths exceeding $30-40\text{ m}$.
- Topsoil desiccation occurs rapidly during the pre-monsoon (March–May) due to high vapor pressure deficits ($\text{VPD} > 3.0\text{ kPa}$) and temperatures exceeding $38^\circ\text{C}$ (as established in Member 2's audit).

---

## 6. Guidance for System Integration & Data Consumption

1. **Database Storage & API Flags:**
   - Any API endpoint ingesting Member 3 data must persist `is_simulated` and `source` tags.
   - The frontend must display an indicator (e.g., `"Mode: Simulated Test Stream"`) when rendering data from `data/simulated/esp32_simulated_readings.csv`.
2. **Alert Systems & Decision Support:**
   - Do not trigger automated physical irrigation actuators or submit emergency drought relief requests based solely on simulated test stream thresholds.
   - When physical sensors are deployed, implement a rolling 3-reading median filter to discard spurious electrical noise spikes before evaluating irrigation thresholds.
3. **Data Fusion Alignment:**
   - When fusing with Member 1's Sentinel-2 NDVI or Member 2's NASA POWER weather data, temporally resample the 15-minute sensor stream to daily averages (`daily_sensor_summary.csv`).
