# Member 3: ESP32 Firmware Setup & Flashing Guide

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**MCU Platform:** ESP32 DevKit v1 (30-pin WROOM-32, 4MB Flash)  
**Date:** November 10, 2026  

---

## 1. Toolchain & Required Development Environment

The firmware is designed for compilation under either **PlatformIO IDE** (recommended for automated dependency resolution) or the **Arduino IDE 2.x**.

### 1.1 Required Software Libraries

| Library Name | Author / Maintainer | Version Required | Purpose in Firmware |
|---|---|:---:|---|
| **`ArduinoJson`** | Benoit Blanchon | `^6.21.3` or `^7.0.0` | Structuring and serialization of JSON telemetry packets |
| **`OneWire`** | Paul Stoffregen | `^2.3.7` | Bit-banged Dallas 1-Wire communication on GPIO 4 |
| **`DallasTemperature`** | Miles Burton | `^3.9.1` | Temperature reading and scratchpad parsing for DS18B20 |
| **`DHT sensor library`**| Adafruit | `^1.4.4` | AM2302 / DHT22 single-bus pulse-width decoding |
| **`Adafruit Unified Sensor`** | Adafruit | `^1.1.9` | Hardware abstraction layer dependency for DHT |

---

## 2. Configuration & Pre-Flashing Setup

1. Navigate to the `firmware/` directory:
   ```bash
   cd "F:/nasa project/Member 3/firmware"
   ```
2. Duplicate the configuration template to create your local `config.h`:
   ```bash
   cp config.example.h config.h
   ```
3. Open `config.h` in an editor and configure:
   * `WIFI_SSID`: Local field Wi-Fi gateway or mobile cellular hotspot.
   * `WIFI_PASSWORD`: Wi-Fi WPA2 pre-shared key.
   * `INGRESS_HOST`: IP address or domain of the Field Shift Express 5 server.
   * `INGRESS_PORT`: Default `3000`.
   * `DEVICE_ID`: Unique node identifier (e.g. `FS-GODAGARI-001`).
   * `API_AUTH_TOKEN`: Secret Bearer token configured in the server `.env`.

---

## 3. Flashing via Arduino IDE 2.x

1. Open `firmware/esp32_soil_monitor.ino` in Arduino IDE.
2. Under **Tools > Board**, select **ESP32 Dev Module**.
3. Configure the following board settings:
   * **CPU Frequency:** `240MHz (WiFi/BT)`
   * **Flash Frequency:** `80MHz`
   * **Flash Mode:** `QIO`
   * **Flash Size:** `4MB (32Mb)`
   * **Partition Scheme:** `Default 4MB with spiffs (1.2MB APP / 1.5MB SPIFFS)`
   * **Upload Speed:** `921600` (or `115200` if cable issues occur)
4. Connect the ESP32 to the PC using a high-quality micro-USB data cable. Select the detected COM port under **Tools > Port**.
5. Click **Upload**. (If the board hangs at `Connecting........_____`, press and hold the **BOOT** button on the ESP32 until the flashing progress percentage begins).

---

## 4. Verification via Serial Monitor

1. Open the Serial Monitor (**Tools > Serial Monitor**) and set the baud rate to **`115200 baud`**.
2. Press the **EN / RST** button on the ESP32.
3. The expected terminal output will display:
   ```text
   ========================================================
    Field Shift - Member 3: ESP32 IoT Soil Monitor
    Device ID: FS-GODAGARI-001 | Firmware: 1.0.0-PROD
   ========================================================
   [DATA] Ingest Payload: {"device_id":"FS-GODAGARI-001","event_id":"4f8a9e21-5c3b-410a-b258-0d12e873ac91","observed_at":"2026-11-10T10:05:00Z","soil_moisture_vwc":"0.2850","soil_temp_c":"26.50","air_temp_c":"31.20","relative_humidity_pct":"48.50","soil_ph":null,"calibration_version":"cal-barind-clayloam-2026.1","quality_status":"uncalibrated_raw","is_simulated":false,"raw_payload":{"soil_moisture_raw_adc":2150,"sensor_depth_cm":10.0,"battery_voltage_v":"3.88","site_id":"GODAGARI-HIGH-BARIND-01","firmware_version":"1.0.0-PROD"}}
   [WIFI] Connecting to AP... .... Connected!
   [INGRESS] Payload delivered successfully (HTTP 201)
   [POWER] Entering deep sleep for 900 seconds...
   ```
