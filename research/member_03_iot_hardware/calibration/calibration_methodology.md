# Member 3: Capacitive Soil Moisture Calibration Methodology

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Target Soil:** Godagari High Barind Silty Clay Loam  
**Target Location:** Godagari Upazila, Rajshahi District, Bangladesh (24.469°N, 88.330°E)  
**Date:** November 10, 2026  

---

## 1. Physics of Dielectric Soil Moisture Measurement

Capacitive soil moisture sensors measure the apparent dielectric permittivity ($\varepsilon_b$) of the soil-water-air matrix. The sensor's insulated copper traces form a capacitor whose capacitance $C$ is governed by:

$$C = \frac{\varepsilon_0 \cdot \varepsilon_b \cdot A}{d}$$

Where:
* $\varepsilon_0 = 8.854 \times 10^{-12}\,\text{F/m}$ (Permittivity of free space)
* $\varepsilon_b$ = Bulk relative permittivity of the soil matrix
* $A$ = Active surface area of probe capacitor plates
* $d$ = Effective distance between conductive traces

Because the relative permittivity of pure water ($\varepsilon_{\text{water}} \approx 80.0 \text{ at } 20^\circ\text{C}$) is vastly larger than air ($\varepsilon_{\text{air}} \approx 1.0$) and dry mineral soil particles ($\varepsilon_{\text{mineral}} \approx 3.0 \text{ to } 5.0$), any small change in volumetric water content ($VWC$, denoted as $\theta$) produces an immediate change in the dielectric permittivity of the composite medium.

---

## 2. Why Generic Calibrations Fail in the Barind Tract

Factory default linear interpolations (e.g. mapping dry air to 0% and tap water to 100%) introduce **massive estimation errors ($\pm 15\%\text{ to } 25\%\text{ VWC}$)** in the High Barind Tract due to three localized pedological factors:

1. **High Illite & Kaolinite Clay Fractions:** Barind soils possess 30% to 45% clay. Clay minerals have substantial specific surface areas ($>100\,\text{m}^2/\text{g}$), creating a significant fraction of "bound water" whose rotational mobility is constrained, depressing its dielectric permittivity compared to free water.
2. **Elevated Soil Bulk Density:** Deep tubewell cultivation and extensive rotary tillage form a dense subsoil plow-pan with dry bulk densities reaching $\rho_b = 1.35\text{ to } 1.45\,\text{g/cm}^3$, compressing air voids and shifting the baseline capacitance higher than in loose sandy loam.
3. **Piezometric Groundwater Mineralization:** Tubewell irrigation in Rajshahi extracts water with variable electrical conductivity ($\text{EC} = 0.4\text{ to } 0.9\,\text{dS/m}$). Although capacitive sensors isolate DC galvanic currents, high soil solution EC causes parasitic dielectric loss at 1.5MHz oscillator frequencies.

**Conclusion:** Soil-specific, site-calibrated transfer functions are scientifically mandatory before using capacitive sensors for precision irrigation scheduling.

---

## 3. Laboratory Gravimetric Calibration Protocol (ASTM D2216)

The standard procedure for establishing the transfer function between raw ESP32 ADC counts and true volumetric water content ($VWC$) is outlined below:

### Phase A: Soil Preparation
1. Collect a 5 kg composite soil sample from the target root-zone depth (10–30 cm) in Godagari Upazila.
2. Air-dry the soil in a thin layer for 72 hours, gently crush aggregates, and pass through a 2.0 mm brass sieve to remove coarse organic debris.
3. Determine cylinder volume ($V = \pi r^2 h = 500\,\text{cm}^3$). Weigh the empty container to establish tare mass ($M_{\text{tare}}$).

### Phase B: Controlled Moisture Increments
1. Prepare 8 sealed moisture fractions ranging from air-dry ($w \approx 2\%$) to full saturation ($w \approx 32\%$).
2. Add precise volumes of deionized water to the dry soil, mix thoroughly in a sealed container, and allow 24 hours of equilibration in an airtight bag to ensure homogeneous capillary distribution.
3. Pack the soil into the calibration column to match the target field dry bulk density ($\rho_b = 1.35\,\text{g/cm}^3$):
   $$M_{\text{dry, target}} = \rho_b \times V = 1.35\,\text{g/cm}^3 \times 500\,\text{cm}^3 = 675.0\,\text{g}$$

### Phase C: Sensor Interrogation & Core Sampling
1. Vertically insert the capacitive sensor probe into the packed cylinder, ensuring zero air voids along the blade surface.
2. Power the sensor at 3.3V DC via the ESP32 switched rail; record 64 raw ADC samples over 10 seconds; compute mean and variance.
3. Immediately extract a core sample using a precision tare tin ($M_{\text{tin}}$). Weigh wet mass ($M_{\text{wet+tin}}$).
4. Oven-dry the core at **$105^\circ\text{C} \pm 5^\circ\text{C}$ for 24 hours** in a calibrated forced-air drying oven until mass stabilizes.
5. Cool in a desiccator with activated silica gel for 30 minutes; weigh dry mass ($M_{\text{dry+tin}}$).

---

## 4. Mathematical Gravimetric-to-Volumetric Conversion

The gravimetric water content ($w$, mass basis) is calculated as:
$$w = \frac{M_{\text{wet}} - M_{\text{dry}}}{M_{\text{dry}}} = \frac{(M_{\text{wet+tin}} - M_{\text{tin}}) - (M_{\text{dry+tin}} - M_{\text{tin}})}{M_{\text{dry+tin}} - M_{\text{tin}}}$$

The true volumetric water content ($\theta$, volume basis: $\text{m}^3/\text{m}^3$ or $\text{cm}^3/\text{cm}^3$) is calculated using the measured dry bulk density ($\rho_b$) and water density ($\rho_w \approx 1.0\,\text{g/cm}^3$):
$$\theta = w \times \frac{\rho_b}{\rho_w}$$

---

## 5. Scientific Limitations & Disclosure

> [!WARNING] Calibration Status Disclosure
> In full compliance with project transparency directives, we state explicitly that **physical laboratory oven-drying was not executed during this computer-based audit session**. 
> The dataset in `calibration_template.csv` and the resulting polynomial equations represent a mathematically rigorous **pedotransfer-calibrated reference template** parameterized for Barind silty clay loam ($\rho_b = 1.35\,\text{g/cm}^3$). 
> All live firmware data streams and simulated field outputs are maintained with `calibration_status = "UNCALIBRATED"` until site-specific laboratory core drying is physically performed by the field team.
