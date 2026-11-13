# Member 3: IoT Soil Monitoring System — Bill of Materials (BOM)

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Target Deployment Area:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Document Version:** 1.0.0 (Production Blueprint)  
**Date:** November 10, 2026  

---

## 1. System Overview & Component Selection

The field monitoring node is engineered around an **ESP32 DevKit v1 (30-pin/38-pin WROOM-32)** microcontroller operating on a 15-minute ultra-low-power deep-sleep cycle. The node integrates three distinct sensing domains:
1. **Soil Moisture Sensing:** V1.2 / V2.0 Capacitive Analog Soil Moisture Sensor (Corrosion-resistant, non-resistive).
2. **Soil Temperature Sensing:** Waterproof probe-encapsulated DS18B20 digital 1-Wire temperature sensor.
3. **Microclimate Ambient Sensing:** DHT22 (AM2302) or SHT31-D digital ambient temperature and relative humidity sensor.
4. **Autonomous Power System:** 6V 3W Monocrystalline Solar Panel + CN3065 / TP4056 Solar Li-Ion Management + 18650 3.7V 3000mAh Battery + Ultra-Low Quiescent LDO Regulator (HT7333).

---

## 2. Granular Bill of Materials (Per Field Node)

| Item # | Component Name | Manufacturer / Part # | Key Technical Specifications | Voltage Range | Qty | Unit Cost (USD) | Est. Cost (BDT) | Primary Sourcing |
|:---:|---|---|---|:---:|:---:|:---:|:---:|---|
| **1** | **Microcontroller Unit (MCU)** | Espressif ESP32-WROOM-32 (NodeMCU-32S / DevKit v1) | Dual-core Tensilica LX6 @ 240MHz, 520KB SRAM, 4MB Flash, 2.4GHz Wi-Fi + BLE, ULP Coprocessor, Deep Sleep ~10µA | 3.0V – 3.6V (3.3V Logic) | 1 | $4.50 | 540 BDT | Local electronics distributor / DigiKey |
| **2** | **Capacitive Soil Moisture Sensor** | DFRobot / Generic V1.2 / V2.0 Capacitive Sensor | TLC555 timer oscillator circuit, 1.5MHz measurement frequency, analog DC output (1.2V–2.8V), non-exposed copper traces | 3.3V (VCC tied to 3.3V) | 1 | $2.20 | 265 BDT | Local agricultural IoT vendor |
| **3** | **Digital Soil Temperature Sensor** | Maxim Integrated DS18B20 Waterproof Probe | Dallas 1-Wire protocol, 9–12 bit resolution (0.0625°C), accuracy ±0.5°C (-10°C to +85°C), 1m/3m waterproof stainless steel tube | 3.0V – 5.5V | 1 | $2.80 | 335 BDT | Standard industrial sensor market |
| **4** | **Ambient Temperature & Humidity Sensor** | Aosong DHT22 (AM2302) / Sensirion SHT31-D | Single-bus digital or I2C, 0–100% RH (±2% accuracy), -40°C to +80°C (±0.5°C accuracy), filtered mesh cap | 3.3V – 5.5V | 1 | $3.50 | 420 BDT | Standard environmental market |
| **5** | **Li-Ion Energy Storage** | Panasonic NCR18650B / Samsung 30Q | 3.7V nominal, 3000–3400 mAh capacity, integrated PCB protection (overcharge, overdischarge, short-circuit) | 2.8V – 4.2V | 1 | $4.00 | 480 BDT | Certified battery supplier |
| **6** | **Solar Energy Harvesting Module** | Waveshare / Consonance CN3065 Mini Solar Charger | Dedicated MPPT-tracking solar battery charger IC for single-cell Li-Ion, red/green status LEDs, JST connector | 4.4V – 6.0V solar in | 1 | $2.50 | 300 BDT | Electronics component store |
| **7** | **Photovoltaic Solar Panel** | 6V 3W–5W Monocrystalline Panel | Tempered glass laminated, aluminum frame, IP65 waterproof, peak current ~500mA @ 6V | 6.0V Vmp | 1 | $6.00 | 720 BDT | Solar energy equipment vendor |
| **8** | **High-Efficiency Low-Dropout Regulator** | Holtek HT7333-A / Torex XC6206 | 3.3V fixed output, ultra-low quiescent current ($I_q \approx 4\mu\text{A}$), 250mA max output, dropout voltage ~100mV @ 100mA | 3.5V – 12V in | 1 | $0.40 | 50 BDT | Component stock |
| **9** | **Sensor Power Gating Switch** | Vishay Si2301 P-Channel MOSFET or 2N3906 PNP | High-side power switch controlled by ESP32 GPIO 25 to completely de-power sensors during deep sleep | 3.3V / -20V Vds | 1 | $0.30 | 35 BDT | SMD component reel |
| **10** | **Passive Components** | 4.7kΩ 1/4W Resistor, 10kΩ Resistors, 100µF & 10µF Tantalum Capacitors | 1-Wire pull-up resistor (4.7kΩ), DHT22 pull-up (10kΩ), power decoupling caps | N/A | 1 set | $0.50 | 60 BDT | Passive hardware reel |
| **11** | **Weatherproof Enclosure** | IP66 / IP67 ABS Industrial Junction Box | 150mm × 100mm × 70mm, silicone sealing gasket, stainless steel lid screws, UV-stabilized polycarbonate/ABS | N/A | 1 | $4.50 | 540 BDT | Industrial electrical enclosure |
| **12** | **Cable Glands & Wiring Accessories** | PG7 & PG9 Nylon Waterproof Glands | IP68 rated, rubber compression collars for 3mm–8mm cable diameters | N/A | 3 | $1.20 | 145 BDT | Electrical hardware store |
| **13** | **Mounting Hardware & Pole Clamp** | Stainless Steel U-Bolts & 1.5m Galvanized Conduit | Weatherproof 25mm diameter conduit pole, mounting bracket for solar panel and enclosure | N/A | 1 set | $4.00 | 480 BDT | Local hardware supply |
| **TOTAL** | **Complete Field Ready Subsystem** | **Estimated Total Cost per Production Node** | — | — | — | **$37.40** | **4,470 BDT** | Complete Unit BOM |

---

## 3. ESP32 Analog-to-Digital Converter (ADC) Constraints & Conditioning

### Crucial Engineering Constraints:
1. **ADC Non-Linearity:** The internal SAR ADCs on the ESP32 (ADC1 and ADC2) exhibit significant non-linearity near ground ($<0.15\text{V}$) and near saturation ($>3.15\text{V}$). The linear measurement corridor is between **0.15V and 3.10V** with 11dB attenuation (`ADC_ATTEN_DB_11`).
2. **ADC2 Wi-Fi Conflict:** `ADC2` (GPIO pins 0, 2, 4, 12, 13, 14, 15, 25, 26, 27) cannot be used while the Wi-Fi or BLE radio is active because the RF driver multiplexes the same SAR converter. **Therefore, the capacitive soil moisture sensor analog output is strictly wired to `ADC1` (GPIO 34), which operates completely independently of the Wi-Fi radio.**
3. **Input Voltage Range Protection:** The capacitive sensor must be powered from the stabilized **3.3V rail** (NOT 5V). At 3.3V VCC, the sensor's analog output ranges from ~1.2V (saturated wet) to ~2.8V (dry air). This falls squarely within the safe 0.0V–3.3V operating envelope of GPIO 34 without needing an external voltage divider.
4. **Internal Attenuation Calibration:** Firmware uses `analogSetPinAttenuation(SOIL_PIN, ADC_11db)` and multiple-sample averaging (64 samples over 200ms) to cancel high-frequency ADC switching noise.
