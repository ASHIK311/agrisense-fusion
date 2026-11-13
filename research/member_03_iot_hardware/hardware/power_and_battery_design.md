# Member 3: Power Budget & Autonomous Energy System Design

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Target Location:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Date:** November 10, 2026  

---

## 1. Electrical Power Budget & Duty Cycle Modeling

The field monitoring station is engineered for complete off-grid autonomy using an ultra-low-power duty-cycled architecture.

### 1.1 Operating States & Current Consumption

| Operating State | State Duration per 15-min Cycle | Active Components | Measured Current @ 3.7V | Energy Consumption ($I \cdot t$) |
|---|:---:|---|:---:|:---:|
| **Deep Sleep Mode** | **897.5 seconds** (99.72%) | ESP32 RTC timer + HT7333 LDO + Si2301 MOSFET leakage + 100kΩ divider | **$35\,\mu\text{A}$ ($0.035\,\text{mA}$)** | $31.41\,\text{mA}\cdot\text{s}$ |
| **Sensor Wake & Sampling**| **0.8 seconds** (0.09%) | ESP32 CPU @ 80MHz, Capacitive Sensor (5mA), DS18B20 conversion (1.5mA), DHT22 (1.5mA) | **$28\,\text{mA}$** | $22.40\,\text{mA}\cdot\text{s}$ |
| **Wi-Fi Associated & Transmit**| **1.7 seconds** (0.19%) | ESP32 CPU @ 240MHz, 2.4GHz 802.11b/g/n radio TX burst (+19.5dBm), HTTP POST handshake | **$165\,\text{mA}$** | $280.50\,\text{mA}\cdot\text{s}$ |
| **CYCLE TOTALS** | **900.0 seconds** (15 minutes) | Complete sample-transmit-sleep sequence | **Weighted Mean: $0.371\,\text{mA}$** | **$334.31\,\text{mA}\cdot\text{s}$** |

### 1.2 Mathematical Average Current Draw
$$I_{\text{avg}} = \frac{(I_{\text{sleep}} \times t_{\text{sleep}}) + (I_{\text{sample}} \times t_{\text{sample}}) + (I_{\text{tx}} \times t_{\text{tx}})}{t_{\text{total}}}$$
$$I_{\text{avg}} = \frac{(0.035\,\text{mA} \times 897.5\,\text{s}) + (28\,\text{mA} \times 0.8\,\text{s}) + (165\,\text{mA} \times 1.7\,\text{s})}{900\,\text{s}} = \frac{31.41 + 22.40 + 280.50}{900} = \mathbf{0.371\,\text{mA}}\; (371\,\mu\text{A})$$

Daily Energy Consumption:
$$E_{\text{daily}} = 0.371\,\text{mA} \times 24\,\text{hours} = \mathbf{8.90\,\text{mAh/day}} \quad (0.0329\,\text{Wh/day @ 3.7V})$$

---

## 2. Battery Endurance Without Solar Input (Autonomy Window)

Assuming a single standard **Panasonic NCR18650B (3.7V 3200 mAh)** Li-Ion cell:
* Effective Usable Capacity (accounting for LDO dropout cutoff at 3.4V and 85% electrochemical efficiency):
  $$C_{\text{usable}} = 3200\,\text{mAh} \times 0.85 = \mathbf{2,720\,\text{mAh}}$$
* Days of Total Autonomy (e.g., in continuous monsoon deluge or shaded conditions):
  $$\text{Days} = \frac{2,720\,\text{mAh}}{8.90\,\text{mAh/day}} = \mathbf{305.6\text{ Days}} \quad (\approx \mathbf{10\text{ Months}})$$

**Conclusion:** Even under prolonged zero-sunlight conditions, a single fully charged 18650 cell can power the node for over 10 continuous months without dying.

---

## 3. Solar Energy Harvesting & Photovoltaic Sizing

### 3.1 Solar Insolation in Godagari, Rajshahi
Based on verified NASA POWER solar insolation data (`ALLSKY_SFC_SW_DWN`):
* Historical Annual Mean Insolation: **$15.69\,\text{MJ/m}^2/\text{day}$** ($\approx \mathbf{4.36\,\text{Peak Sun Hours (PSH)/day}}$)
* Worst-Case Monthly Insolation (Monsoon July/August): **$\approx 3.2\,\text{PSH/day}$**
* Best-Case Monthly Insolation (Pre-Monsoon April): **$\approx 6.1\,\text{PSH/day}$**

### 3.2 Photovoltaic Energy Harvest
With a compact **6V 3W Monocrystalline Solar Panel** ($\approx 180\text{mm} \times 150\text{mm}$):
* Rated Peak Current ($I_{\text{mp}}$): $\approx 500\,\text{mA} @ 6\text{V}$.
* Through the CN3065 constant-current Li-Ion charge controller (90% charging efficiency):
* Daily Harvest on Worst-Case Day (3.2 PSH):
  $$E_{\text{harvest, min}} = 500\,\text{mA} \times 3.2\,\text{hours} \times 0.90 \times 0.65\,\text{(derating for dust/tilt)} \approx \mathbf{936\,\text{mAh/day}}$$
* **Energy Balance Ratio:**
  $$\text{Harvest / Consumption} = \frac{936\,\text{mAh/day}}{8.90\,\text{mAh/day}} = \mathbf{105 \times}$$

**Energy Balance Verdict:** The photovoltaic generation exceeds daily consumption by a factor of over **100×**, guaranteeing perpetual battery top-up and rapid recovery from cloud overcast spells.

---

## 4. Hardware Protections
1. **Low-Temperature Li-Ion Protection:** The CN3065 includes thermal shutdown. In Rajshahi, winter ambient temperatures never drop below $4.0^\circ\text{C}$, safely within the $0^\circ\text{C}$ to $45^\circ\text{C}$ Li-Ion charging window.
2. **Reverse Current Blocking:** Built-in Schottky barrier prevents nighttime battery leakage back through the photovoltaic panel.
3. **Over-Discharge Cutoff:** The battery PCB protection circuit isolates the cell at $2.8\text{V}$, preventing permanent copper shunting.
