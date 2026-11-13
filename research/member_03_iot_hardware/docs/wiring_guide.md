# Member 3: Physical Wiring & Connection Guide

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**MCU Platform:** ESP32 DevKit v1 (30-pin WROOM-32)  
**Date:** November 10, 2026  

---

## 1. Pin-to-Pin Connection Schedule

```
+-----------------------------------------------------------------------------------------------+
| SENSOR / MODULE          | MODULE PIN | WIRE COLOR | CONNECT TO ESP32 PIN | PASSIVE COMPONENT |
+-----------------------------------------------------------------------------------------------+
| Capacitive Soil Moisture | VCC        | Red        | Switched 3.3V (P-FET)| None (Use 3.3V!)  |
| Capacitive Soil Moisture | GND        | Black      | Common System GND    | None              |
| Capacitive Soil Moisture | AOUT       | Yellow     | GPIO 34 (ADC1_CH6)   | 100nF cap to GND  |
|                          |            |            |                      |                   |
| DS18B20 Soil Temperature | VDD (Red)  | Red        | Switched 3.3V (P-FET)| None              |
| DS18B20 Soil Temperature | GND (Black)| Black      | Common System GND    | None              |
| DS18B20 Soil Temperature | DQ (Yellow)| Yellow     | GPIO 4               | 4.7kΩ to Switched |
|                          |            |            |                      | 3.3V Rail         |
|                          |            |            |                      |                   |
| DHT22 Ambient Temp & RH  | Pin 1 (VDD)| Red        | Switched 3.3V (P-FET)| None              |
| DHT22 Ambient Temp & RH  | Pin 2 (DAT)| White/Blue | GPIO 15              | 10kΩ to Switched  |
|                          |            |            |                      | 3.3V Rail         |
| DHT22 Ambient Temp & RH  | Pin 4 (GND)| Black      | Common System GND    | None              |
|                          |            |            |                      |                   |
| Si2301 P-MOSFET Switch   | Gate (G)   | Orange     | GPIO 25              | 100kΩ to V_BATT   |
| Si2301 P-MOSFET Switch   | Source (S) | Red        | Main 3.3V Rail (LDO) | None              |
| Si2301 P-MOSFET Switch   | Drain (D)  | Brown      | Switched 3.3V Rail   | 10µF Tantalum Cap |
|                          |            |            |                      |                   |
| Battery Voltage Divider  | Top (100k) | Red        | 18650 Battery (+)    | 100kΩ / 100kΩ     |
| Battery Voltage Divider  | Center     | Green      | GPIO 35 (ADC1_CH7)   | 10nF cap to GND   |
| Battery Voltage Divider  | Bot (100k) | Black      | Common System GND    | None              |
|                          |            |            |                      |                   |
| Solar Panel 6V           | (+) Lead   | Red        | CN3065 Solar IN (+)  | None              |
| Solar Panel 6V           | (-) Lead   | Black      | CN3065 Solar IN (-)  | None              |
| 18650 Li-Ion Cell        | (+) Lead   | Red        | CN3065 BATT (+)      | 18650 Holder      |
| 18650 Li-Ion Cell        | (-) Lead   | Black      | CN3065 BATT (-)      | 18650 Holder      |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Critical Assembly Precautions

> [!CAUTION] Never Connect 5V to ESP32 Pins
> The ESP32 GPIO and ADC pins are strictly rated for a maximum of **3.6V**. Connecting a 5V power supply or an unattenuated 5V sensor output to GPIO 34, GPIO 4, or GPIO 15 will permanently destroy the ESP32 input stage. Always power the capacitive sensor and pull-ups from the regulated 3.3V rail.

> [!IMPORTANT] ADC1 vs ADC2 Pin Selection
> The capacitive soil moisture sensor **MUST** be connected to an **ADC1** pin (GPIO 32, 33, 34, 35, 36, or 39). GPIO 34 was selected because it is input-only and avoids boot-strapping pin conflicts. Do **NOT** use ADC2 pins (GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27) for analog inputs because the internal Wi-Fi driver uses ADC2, causing runtime crashes or garbage readings when transmitting.

> [!TIP] Pull-Up Resistors for 1-Wire and DHT22
> The DS18B20 sensor will fail to initialize and return `-127.0°C` if the 4.7kΩ pull-up resistor between its data line (DQ) and 3.3V is missing. Similarly, the DHT22 requires a 10kΩ pull-up resistor. Keep lead lengths under 2 meters to avoid capacitive bus degradation.
