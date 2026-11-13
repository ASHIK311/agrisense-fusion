# Member 3: Sensor Specifications & Operating Envelopes

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Date:** November 10, 2026  

---

## 1. Primary In-Situ Soil Sensors

### 1.1 Capacitive Soil Moisture Sensor (v1.2 / v2.0)
* **Measurement Principle:** Frequency Domain Reflectometry (FDR) / Relative Permittivity. The sensor acts as a variable capacitor whose capacitance changes proportionally to the dielectric permittivity of the surrounding medium ($\varepsilon_{\text{air}} \approx 1$, $\varepsilon_{\text{dry soil}} \approx 3\text{--}5$, $\varepsilon_{\text{water}} \approx 80$).
* **Oscillator Circuit:** On-board TLC555 timer generating an analog voltage proportional to charging/discharging time.
* **Operating Voltage:** 3.3V DC nominal (2.5V – 5.0V maximum).
* **Output Voltage Range (at 3.3V VCC):**
  * Dry Air ($0\%\text{ VWC}$): $\approx 2.70\text{V} - 2.85\text{V}$ (Raw ADC: ~3350 – 3550)
  * Saturated Tap Water ($100\%\text{ VWC}$ equivalent): $\approx 1.20\text{V} - 1.35\text{V}$ (Raw ADC: ~1450 – 1650)
  * Saturated Barind Silty Clay Loam ($\approx 42\%\text{ VWC}$): $\approx 1.55\text{V} - 1.70\text{V}$ (Raw ADC: ~1900 – 2100)
* **Measurement Depth:** Integrated along the 70mm active probe blade (represents 0–10 cm topsoil moisture when inserted vertically).
* **Corrosion Resistance:** Solder-mask insulated copper traces prevent direct galvanic contact with soil water, avoiding the rapid electrolytic copper degradation that plagues resistive soil sensors in Bangladesh's mineralized groundwater.

### 1.2 DS18B20 Digital Waterproof Soil Temperature Sensor
* **Measurement Principle:** Direct-to-digital bandgap temperature sensor inside a hermetically sealed 316 stainless steel capsule (6mm diameter × 50mm length) with PVC/Silicone waterproof jacketed cable.
* **Communication Protocol:** Dallas 1-Wire serial bus.
* **Operating Range:** $-55^\circ\text{C}$ to $+125^\circ\text{C}$.
* **Accuracy:** $\pm 0.5^\circ\text{C}$ across the agricultural range of $-10^\circ\text{C}$ to $+85^\circ\text{C}$.
* **Resolution:** Configured to **11-bit** ($0.125^\circ\text{C}$ resolution, conversion time $\approx 375\text{ ms}$) or **12-bit** ($0.0625^\circ\text{C}$, conversion time $750\text{ ms}$).
* **Error Detection Sentinel:** A reading of **$-127.0^\circ\text{C}$** indicates a missing pull-up resistor or disconnected sensor cable; **$+85.0^\circ\text{C}$** indicates power-on default register unread condition.

---

## 2. Microclimate Ambient Sensors (Optional / Co-located)

### 2.1 DHT22 (AM2302) Ambient Temperature & Humidity Sensor
* **Measurement Principle:** Polymer capacitor relative humidity element and NTC thermistor with an onboard 8-bit microcontroller emitting digital serial frames.
* **Operating Voltage:** 3.3V – 5.5V DC.
* **Humidity Measurement Range:** 0% to 100% RH with $\pm 2\%\text{ RH}$ typical accuracy (10%–90% range).
* **Temperature Measurement Range:** $-40^\circ\text{C}$ to $+80^\circ\text{C}$ with $\pm 0.5^\circ\text{C}$ accuracy.
* **Sampling Frequency:** Maximum 0.5 Hz (1 sample every 2 seconds).
* **Failure Modes:** Saturated condensation causing sticky 100% readings; prolonged solar exposure leading to casing UV degradation. Requires mounting inside an ambient radiation shield (Stevenson screen or multi-plate louvered shield).

---

## 3. Sensor Operating Envelopes in Godagari Agro-Ecological Zone

| Environmental Parameter | Historical Minimum (Godagari) | Historical Maximum (Godagari) | Sensor Operational Rating | Safety Margin |
|---|:---:|:---:|:---:|:---:|
| **Ambient Air Temperature** | $+4.8^\circ\text{C}$ (Jan 2019) | $+44.3^\circ\text{C}$ (April 2023) | $-40^\circ\text{C} \text{ to } +80^\circ\text{C}$ | Safe ($\Delta > 35^\circ\text{C}$) |
| **Topsoil Temperature (10cm)**| $+12.0^\circ\text{C}$ (Winter) | $+38.5^\circ\text{C}$ (Pre-monsoon peak) | $-55^\circ\text{C} \text{ to } +125^\circ\text{C}$ | Safe ($\Delta > 85^\circ\text{C}$) |
| **Soil Relative Permittivity** | $\approx 3.2$ (Oven-dry Barind clay) | $\approx 35.0$ (Flooded paddy) | $1.0 \text{ to } 80.0$ | Full range covered |
| **Relative Humidity** | $18.9\%$ (Pre-monsoon heatwave) | $100\%$ (Monsoon cloudburst) | $0\% \text{ to } 100\%$ | Full range covered |
| **Dust / Particulate Exposure**| Severe (Winter/Summer Barind dust) | Severe | IP66 Enclosure / Sintered probe | Hermetic seal required |
