/**
 * Field Shift - AgriSense Fusion IoT Node
 * Member 3: Production ESP32 Soil & In-Situ Environmental Monitor
 *
 * Microcontroller: ESP32-WROOM-32 (DevKit v1)
 * Target Region: Godagari Upazila, Rajshahi District, Bangladesh
 *
 * Features:
 * - Ultra-low-power deep sleep (15-min cycle, ~35µA sleep draw)
 * - High-side P-MOSFET power gating for sensors (eliminates phantom drain)
 * - 64-sample noise-filtered ADC1 reading for capacitive moisture
 * - Dallas 1-Wire DS18B20 digital soil temperature with fault detection
 * - DHT22 ambient microclimate temperature and humidity sensing
 * - NTP time synchronization with ISO 8601 UTC formatting
 * - Cryptographic UUIDv4 generation for idempotent ingest
 * - Offline SPIFFS flash buffering for network outages
 * - Full JSON compatibility with Field Shift backend (sensorService.js)
 *
 * Version: 1.0.0-PROD
 * Date: November 10, 2026
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <time.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include <esp_system.h>
#include <esp_sleep.h>

// Load configuration
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.example.h"
#endif

// ==============================================================================
// HARDWARE INSTANTIATION
// ==============================================================================
OneWire oneWire(PIN_DS18B20_ONEWIRE);
DallasTemperature ds18b20(&oneWire);
DHT dht(PIN_DHT22_DATA, DHT22);

// NTP Time Configuration
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0;       // UTC Time (0 hours offset)
const int   daylightOffset_sec = 0;  // No daylight savings in UTC

// ==============================================================================
// DATA STRUCTURES
// ==============================================================================
struct SensorReading {
  char event_id[37];
  char observed_at[25];
  int raw_moisture_adc;
  float moisture_vwc;
  bool moisture_valid;
  float soil_temp_c;
  bool soil_temp_valid;
  float air_temp_c;
  bool air_temp_valid;
  float air_humidity_pct;
  bool air_humidity_valid;
  float battery_voltage;
  const char* quality_status;
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Generate a cryptographically random RFC 4122 compliant UUIDv4 string
 */
void generateUUID(char* outBuffer) {
  uint8_t randBytes[16];
  for (int i = 0; i < 16; i += 4) {
    uint32_t r = esp_random();
    memcpy(&randBytes[i], &r, 4);
  }
  // Set version to 0100 (UUIDv4)
  randBytes[6] = (randBytes[6] & 0x0F) | 0x40;
  // Set variant to 10xx (RFC 4122)
  randBytes[8] = (randBytes[8] & 0x3F) | 0x80;

  snprintf(outBuffer, 37,
    "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    randBytes[0], randBytes[1], randBytes[2], randBytes[3],
    randBytes[4], randBytes[5],
    randBytes[6], randBytes[7],
    randBytes[8], randBytes[9],
    randBytes[10], randBytes[11], randBytes[12], randBytes[13], randBytes[14], randBytes[15]
  );
}

/**
 * Get current UTC timestamp in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
 */
bool getISOTimestamp(char* outBuffer, size_t maxLen) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 2000)) {
    // If NTP unsynchronized, construct fallback marker
    snprintf(outBuffer, maxLen, "1970-01-01T00:00:00Z");
    return false;
  }
  strftime(outBuffer, maxLen, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return true;
}

/**
 * Energize / De-energize high-side MOSFET power gate
 */
void setSensorPower(bool enable) {
  pinMode(PIN_POWER_GATE, OUTPUT);
  if (enable) {
    digitalWrite(PIN_POWER_GATE, LOW); // Active LOW turns ON P-MOSFET
    delay(SENSOR_WARMUP_MS);           // Allow power rail and bypass caps to settle
  } else {
    digitalWrite(PIN_POWER_GATE, HIGH); // Turns OFF P-MOSFET (high impedance)
  }
}

/**
 * Multi-sample oversampling for ADC1 to eliminate RF switching ripple
 */
int readFilteredADC(uint8_t pin, int samples) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(200);
  }
  return (int)(sum / samples);
}

// ==============================================================================
// SENSOR SAMPLING ROUTINE
// ==============================================================================
void collectSensorData(SensorReading &data) {
  generateUUID(data.event_id);
  getISOTimestamp(data.observed_at, sizeof(data.observed_at));

  // 1. Power ON Sensors
  setSensorPower(true);

  // 2. Read Capacitive Soil Moisture Sensor (ADC1_CH6 - GPIO 34)
  analogSetPinAttenuation(PIN_SOIL_ANALOG, ADC_11db); // 0V to ~3.1V range
  data.raw_moisture_adc = readFilteredADC(PIN_SOIL_ANALOG, ADC_SAMPLE_COUNT);

  // Range and saturation sanity check
  if (data.raw_moisture_adc < 500 || data.raw_moisture_adc > 4050) {
    data.moisture_valid = false;
    data.moisture_vwc = -1.0;
  } else {
    data.moisture_valid = true;
    // Transparent uncalibrated linear interpolation between Air and Water
    float clampedADC = constrain(data.raw_moisture_adc, ADC_WATER_WET, ADC_AIR_DRY);
    // In capacitive sensors, lower ADC count = higher water permittivity
    data.moisture_vwc = (float)(ADC_AIR_DRY - clampedADC) / (float)(ADC_AIR_DRY - ADC_WATER_WET);
    data.moisture_vwc = constrain(data.moisture_vwc, 0.0, 1.0);
  }

  // 3. Read DS18B20 Digital Soil Temperature (GPIO 4)
  ds18b20.begin();
  ds18b20.setResolution(11); // 0.125°C resolution (375ms conversion)
  ds18b20.requestTemperatures();
  float tempC = ds18b20.getTempCByIndex(0);

  // Detect disconnected or faulty hardware sentinels (-127°C or +85°C unread register)
  if (tempC == DEVICE_DISCONNECTED_C || tempC == 85.0 || tempC < -10.0 || tempC > 65.0) {
    data.soil_temp_valid = false;
    data.soil_temp_c = -999.0;
  } else {
    data.soil_temp_valid = true;
    data.soil_temp_c = tempC;
  }

  // 4. Read DHT22 Microclimate Ambient Sensor (GPIO 15)
  dht.begin();
  float humidity = dht.readHumidity();
  float airTemp = dht.readTemperature();

  if (isnan(humidity) || humidity < 0.0 || humidity > 100.0) {
    data.air_humidity_valid = false;
    data.air_humidity_pct = -999.0;
  } else {
    data.air_humidity_valid = true;
    data.air_humidity_pct = humidity;
  }

  if (isnan(airTemp) || airTemp < -20.0 || airTemp > 65.0) {
    data.air_temp_valid = false;
    data.air_temp_c = -999.0;
  } else {
    data.air_temp_valid = true;
    data.air_temp_c = airTemp;
  }

  // 5. Read Battery Voltage (GPIO 35 through 100k/100k voltage divider)
  analogSetPinAttenuation(PIN_BATTERY_ADC, ADC_11db);
  int rawBattADC = readFilteredADC(PIN_BATTERY_ADC, 32);
  // ADC 11dB = 3.3V reference / 4095 counts * 2 (divider ratio) * 1.05 (calibration factor)
  data.battery_voltage = ((float)rawBattADC / 4095.0) * 3.3 * 2.0 * 1.05;

  // 6. Power OFF Sensors immediately to conserve energy
  setSensorPower(false);

  // 7. Determine Quality Status Flag
  if (!data.moisture_valid || !data.soil_temp_valid) {
    data.quality_status = "sensor_fault";
  } else {
    data.quality_status = "uncalibrated_raw";
  }
}

// ==============================================================================
// JSON SERIALIZATION & NETWORK INGRESS
// ==============================================================================
String buildPayloadJSON(const SensorReading &data) {
  StaticJsonDocument<768> doc;

  doc["device_id"] = DEVICE_ID;
  doc["event_id"] = data.event_id;
  doc["observed_at"] = data.observed_at;

  // Primary agricultural variables (null if invalid / disconnected)
  if (data.moisture_valid) {
    doc["soil_moisture_vwc"] = serialized(String(data.moisture_vwc, 4));
  } else {
    doc["soil_moisture_vwc"] = nullptr;
  }

  if (data.soil_temp_valid) {
    doc["soil_temp_c"] = serialized(String(data.soil_temp_c, 2));
  } else {
    doc["soil_temp_c"] = nullptr;
  }

  if (data.air_temp_valid) {
    doc["air_temp_c"] = serialized(String(data.air_temp_c, 2));
  } else {
    doc["air_temp_c"] = nullptr;
  }

  if (data.air_humidity_valid) {
    doc["relative_humidity_pct"] = serialized(String(data.air_humidity_pct, 2));
  } else {
    doc["relative_humidity_pct"] = nullptr;
  }

  // Mandatory metadata & engineering telemetry
  doc["soil_ph"] = nullptr; // Explicitly null (no unvalidated pH probe claimed)
  doc["calibration_version"] = CALIBRATION_VERSION;
  doc["quality_status"] = data.quality_status;
  doc["is_simulated"] = false; // Authentic physical node execution

  // Raw diagnostic payload object
  JsonObject raw = doc.createNestedObject("raw_payload");
  raw["soil_moisture_raw_adc"] = data.raw_moisture_adc;
  raw["sensor_depth_cm"] = SENSOR_DEPTH_CM;
  raw["battery_voltage_v"] = serialized(String(data.battery_voltage, 2));
  raw["site_id"] = SITE_ID;
  raw["firmware_version"] = FIRMWARE_VERSION;

  String output;
  serializeJson(doc, output);
  return output;
}

// ==============================================================================
// OFFLINE STORAGE & NETWORK TRANSMISSION
// ==============================================================================
void bufferReadingLocally(const String &jsonPayload) {
  if (!SPIFFS.begin(true)) {
    Serial.println(F("[STORAGE] SPIFFS mount failed."));
    return;
  }
  File file = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_APPEND);
  if (!file) {
    Serial.println(F("[STORAGE] Failed to open offline buffer for appending."));
    return;
  }
  file.println(jsonPayload);
  file.close();
  Serial.println(F("[STORAGE] Reading appended to offline buffer."));
}

bool transmitPayload(const String &jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  String url = "http://" + String(INGRESS_HOST) + ":" + String(INGRESS_PORT) + String(INGRESS_PATH);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(API_AUTH_TOKEN));
  http.setTimeout(5000); // 5-second timeout

  int httpCode = http.POST(jsonPayload);
  bool success = false;

  if (httpCode == 201 || httpCode == 200) {
    Serial.printf("[INGRESS] Payload delivered successfully (HTTP %d)\n", httpCode);
    success = true;
  } else if (httpCode == 409) {
    Serial.println(F("[INGRESS] Duplicate event_id detected (Idempotent success)."));
    success = true;
  } else {
    Serial.printf("[INGRESS] Transmission failed with HTTP error: %d\n", httpCode);
    success = false;
  }

  http.end();
  return success;
}

void flushOfflineBuffer() {
  if (!SPIFFS.begin(true) || !SPIFFS.exists(OFFLINE_BUFFER_FILE)) {
    return;
  }

  File file = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_READ);
  if (!file) return;

  Serial.println(F("[STORAGE] Flushing cached offline readings..."));
  String tempBuffer = "";
  int flushed = 0;

  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      if (transmitPayload(line)) {
        flushed++;
      } else {
        tempBuffer += line + "\n";
      }
    }
  }
  file.close();

  // Rewrite buffer with any remaining unsent lines
  if (tempBuffer.length() > 0) {
    File rewrite = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_WRITE);
    rewrite.print(tempBuffer);
    rewrite.close();
  } else {
    SPIFFS.remove(OFFLINE_BUFFER_FILE);
  }
  Serial.printf("[STORAGE] Successfully flushed %d offline records.\n", flushed);
}

// ==============================================================================
// ARDUINO ENTRYPOINTS: SETUP & DEEP SLEEP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n========================================================"));
  Serial.println(F(" Field Shift - Member 3: ESP32 IoT Soil Monitor"));
  Serial.printf( " Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
  Serial.println(F("========================================================"));

  // 1. Collect In-Situ Readings
  SensorReading currentReading;
  collectSensorData(currentReading);
  String payload = buildPayloadJSON(currentReading);
  Serial.print(F("[DATA] Ingest Payload: "));
  Serial.println(payload);

  // 2. Connect to Wi-Fi with Strict Timeout
  Serial.print(F("[WIFI] Connecting to AP... "));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }

  // 3. Transmit or Buffer
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F(" Connected!"));
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

    // First transmit current reading
    bool sent = transmitPayload(payload);
    if (!sent) {
      bufferReadingLocally(payload);
    } else {
      // Flush backlog if any exists
      flushOfflineBuffer();
    }
  } else {
    Serial.println(F(" Timed out! Entering offline mode."));
    bufferReadingLocally(payload);
  }

  // 4. Clean Shutdown & Deep Sleep Entry
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  Serial.printf("[POWER] Entering deep sleep for %d seconds...\n", DEEP_SLEEP_SECONDS);
  Serial.flush();

  esp_sleep_enable_timer_wakeup((uint64_t)DEEP_SLEEP_SECONDS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Never reached in deep sleep duty-cycled architecture
}
