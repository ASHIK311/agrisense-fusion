# Member 3: Data Dictionary & Standardization Schema

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Study Area:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Date:** November 10, 2026  

---

## 1. Primary In-Situ Soil Sensor Dataset Schema (`soil_sensor_dataset.csv`)

| Field Name | Data Type | Physical Range / Values | Units | Description & Agronomic Meaning |
|---|---|:---:|:---:|---|
| **`timestamp_utc`** | `ISO 8601 String` | Valid datetime UTC | `YYYY-MM-DDTHH:MM:SSZ` | Coordinated Universal Time of observation. |
| **`device_id`** | `String` | `FS-GODAGARI-001` | Identifier | Unique serial identifier of the transmitting ESP32 node. |
| **`sensor_id`** | `String` | `SOIL-MOISTURE-001` | Identifier | Sub-sensor identifier on the device bus. |
| **`latitude`** | `Float` | $-90.0 \text{ to } +90.0$ | Decimal Degrees | Certified WGS 84 latitude of field probe installation. |
| **`longitude`** | `Float` | $-180.0 \text{ to } +180.0$| Decimal Degrees | Certified WGS 84 longitude of field probe installation. |
| **`site_id`** | `String` | Alphanumeric | Identifier | Field plot name or farmer co-op code (e.g. `GODAGARI-HIGH-BARIND-01`). |
| **`depth_cm`** | `Float` | $0.0 \text{ to } 100.0$ | $\text{cm}$ | Vertical depth below soil surface to center of probe blade (default: 10.0 cm). |
| **`soil_moisture_raw`**| `Integer` | $0 \text{ to } 4095$ | Counts (12-bit) | Raw uncalibrated ADC output from capacitive probe on ESP32 GPIO 34. |
| **`soil_moisture_vwc`**| `Float` | $0.0000 \text{ to } 1.0000$| $\text{m}^3/\text{m}^3$ (Volume fraction)| Volumetric Water Content. Null if sensor fault or disconnected. |
| **`soil_temperature_c`**| `Float`| $-10.0 \text{ to } 65.0$ | $^\circ\text{C}$ | Soil temperature measured by waterproof DS18B20 digital 1-Wire probe. |
| **`air_temperature_c`** | `Float`| $-20.0 \text{ to } 60.0$ | $^\circ\text{C}$ | Ambient microclimate air temperature measured by DHT22. |
| **`air_humidity_percent`**| `Float`| $0.0 \text{ to } 100.0$ | $\%$ | Ambient relative humidity measured by DHT22 sensor. |
| **`battery_voltage_v`**| `Float` | $3.00 \text{ to } 4.30$ | $\text{V}$ (Volts DC) | Measured Li-Ion battery terminal voltage via 1/2 resistor divider. |
| **`source`** | `String` | Enum | Classification | `REAL_FIELD_SENSOR` vs `SIMULATED_TEST_DATA`. |
| **`data_source`** | `String` | Enum | Origin Tag | `ESP32_PHYSICAL_HARDWARE` vs `ESP32_SIMULATED_NODE`. |
| **`calibration_status`**| `String` | Enum | Calibration | `UNCALIBRATED`, `AIR_WATER_NORMALIZED`, `LAB_CALIBRATED`. |
| **`quality_flag`** | `String` | Enum | Quality Tag | `valid`, `sensor_fault_temp_disconnected`, `sensor_fault_moisture_saturation`, `suspect_outlier`. |
| **`is_simulated`** | `Boolean` | `true` / `false` | Integrity Flag | Strict boolean flag guaranteeing simulated records are never misrepresented as real field readings. |
| **`event_id`** | `UUIDv4 String` | 36-char Hex UUID | Identifier | Unique cryptographic event identifier for ingress deduplication and idempotency. |

---

## 2. NASA SMAP Satellite Model Schema (`smap_soil_moisture.csv`)

| Field Name | Data Type | Units | Source & Meaning |
|---|---|:---:|---|
| **`date`** | `ISO Date` | `YYYY-MM-DD` | Aggregated daily observation date. |
| **`sm_surface_m3_m3`** | `Float` | $\text{m}^3/\text{m}^3$ | Topsoil volumetric moisture (0–5 cm) from NASA SMAP L4 reanalysis (SPL4SMGP/008). |
| **`sm_rootzone_m3_m3`**| `Float` | $\text{m}^3/\text{m}^3$ | Integrated root-zone volumetric moisture (0–100 cm). |
| **`sm_surface_wetness`** | `Float` | Fraction $[0, 1]$ | Dimensionless relative wetness degree of surface layer. |
| **`sm_rootzone_wetness`**| `Float` | Fraction $[0, 1]$ | Dimensionless relative wetness degree of root-zone soil column. |
| **`soil_temp_layer1_c`**| `Float` | $^\circ\text{C}$ | Surface soil layer temperature converted from Kelvin ($K - 273.15$). |
| **`native_spatial_resolution_km`**| `Float` | $\text{km}$ | Native SMAP EASE-Grid 2.0 resolution ($9.0\text{ km}$). |
| **`citation`** | `String` | Reference | Formal scientific citation for satellite-reanalysis product. |

---

## 3. ISRIC SoilGrids Profile Schema (`soilgrids_properties.csv`)

| Field Name | Data Type | Units | Description & Barind Soil Interpretation |
|---|---|:---:|---|
| **`depth_interval`** | `String` | $\text{cm}$ | Standard depth interval: `0-5cm`, `5-15cm`, `15-30cm`, `30-60cm`, `60-100cm`. |
| **`clay_percent`** | `Float` | $\%$ | Clay mineral fraction ($<2\mu\text{m}$). Increases from 32% in topsoil to 44% in subsoil. |
| **`silt_percent`** | `Float` | $\%$ | Silt mineral fraction ($2-50\mu\text{m}$). 39% to 44% across profile. |
| **`sand_percent`** | `Float` | $\%$ | Sand mineral fraction ($50-2000\mu\text{m}$). 17% to 24%. |
| **`usda_texture_class`**| `String` | Text | USDA textural classification: Silty Clay Loam $\rightarrow$ Dense Silty Clay Plow-Pan. |
| **`bulk_density_g_cm3`**| `Float` | $\text{g/cm}^3$ | Dry soil bulk density ($\rho_b$). Dense plow pan at 15–30 cm ($1.45\text{ g/cm}^3$). |
| **`ph_h2o`** | `Float` | $\text{pH}$ units | Soil pH measured in water extract ($5.8 \text{ to } 6.8$, moderately acidic). |
| **`soil_organic_carbon_g_kg`** | `Float` | $\text{g/kg}$ | Soil Organic Carbon (SOC). Low fertility topsoil ($8.5\text{ g/kg} \approx 0.85\%$). |
| **`total_nitrogen_g_kg`** | `Float` | $\text{g/kg}$ | Total Kjeldahl nitrogen ($0.26 \text{ to } 0.75\text{ g/kg}$). |
| **`theta_field_capacity_est`** | `Float` | $\text{m}^3/\text{m}^3$ | Estimated Field Capacity ($\theta_{FC}$) derived from pedotransfer texture functions. |
| **`theta_wilting_point_est`** | `Float` | $\text{m}^3/\text{m}^3$ | Estimated Permanent Wilting Point ($\theta_{WP}$) from pedotransfer functions. |
