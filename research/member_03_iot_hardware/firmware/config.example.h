/**
 * Field Shift - AgriSense Fusion IoT Node
 * Member 3: ESP32 Soil & In-Situ Environmental Monitor
 * Configuration Template (Rename to config.h)
 */

#ifndef CONFIG_H
#define CONFIG_H

// ==============================================================================
// 1. NODE IDENTIFIERS & METADATA
// ==============================================================================
#define DEVICE_ID             "FS-GODAGARI-001"
#define SENSOR_ID_MOISTURE    "SOIL-MOISTURE-001"
#define SENSOR_ID_TEMP        "SOIL-TEMP-001"
#define SENSOR_ID_AMBIENT     "AMB-DHT22-001"
#define SITE_ID               "GODAGARI-HIGH-BARIND-01"
#define HARDWARE_REVISION     "ESP32-SOIL-REV1.2"
#define FIRMWARE_VERSION      "1.0.0-PROD"
#define CALIBRATION_VERSION   "cal-barind-clayloam-2026.1"

// Geographic Coordinates (Null / Default unless certified GPS survey is completed)
#define LATITUDE_DEFAULT      24.46900
#define LONGITUDE_DEFAULT     88.33000
#define SENSOR_DEPTH_CM       10.0

// ==============================================================================
// 2. NETWORK CREDENTIALS & INGRESS ENDPOINT
// ==============================================================================
#define WIFI_SSID             "YOUR_WIFI_SSID"
#define WIFI_PASSWORD         "YOUR_WIFI_PASSWORD"
#define WIFI_TIMEOUT_MS       10000     // 10-second connection timeout

// Field Shift Express 5 Backend Ingress Endpoint
#define INGRESS_HOST          "192.168.1.100" // Replace with server IP / Domain
#define INGRESS_PORT          3000
#define INGRESS_PATH          "/api/sensor-readings"
#define API_AUTH_TOKEN        "FS_SECRET_SENSOR_BEARER_TOKEN"

// ==============================================================================
// 3. HARDWARE GPIO PIN MAPPING (ESP32 WROOM-32)
// ==============================================================================
#define PIN_SOIL_ANALOG       34        // ADC1_CH6 (Capacitive Moisture Sensor)
#define PIN_DS18B20_ONEWIRE   4         // Dallas 1-Wire Soil Temp (4.7kΩ pullup)
#define PIN_DHT22_DATA        15        // Ambient Temp & RH (10kΩ pullup)
#define PIN_POWER_GATE        25        // High-side P-MOSFET gate (Active LOW to power sensors)
#define PIN_BATTERY_ADC       35        // ADC1_CH7 (1/2 Voltage Divider for Li-Ion)

// ==============================================================================
// 4. POWER & DUTY CYCLE TIMING
// ==============================================================================
#define DEEP_SLEEP_SECONDS    900       // 15-minute sleep interval (900 seconds)
#define SENSOR_WARMUP_MS      50        // 50ms stabilization delay after power gating
#define ADC_SAMPLE_COUNT      64        // Number of samples for ADC noise averaging

// ==============================================================================
// 5. CALIBRATION CONSTANTS (Default Uncalibrated Baseline)
// ==============================================================================
// Raw 12-bit ADC values in air and water at 3.3V VCC
#define ADC_AIR_DRY           3450      // Dry air raw reading
#define ADC_WATER_WET         1550      // Water immersion raw reading
#define CALIBRATION_STATUS    "UNCALIBRATED" // "UNCALIBRATED" or "LAB_CALIBRATED"

// Offline Flash Buffer Configuration
#define OFFLINE_BUFFER_FILE   "/offline_readings.json"
#define MAX_OFFLINE_RECORDS   500

#endif // CONFIG_H
