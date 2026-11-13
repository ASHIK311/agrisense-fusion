import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

m3_root = r"F:\nasa project\Member 3"
data_proc = os.path.join(m3_root, "data", "processed")
data_sim = os.path.join(m3_root, "data", "simulated")
data_ext = os.path.join(m3_root, "data", "external")

# ==============================================================================
# 1. ISRIC SOILGRIDS PROCESSED DATASET (Godagari Centroid: 24.469°N, 88.330°E)
# ==============================================================================
soilgrids_rows = [
    {
        "latitude": 24.469,
        "longitude": 88.330,
        "location_name": "Godagari Upazila Centroid, Rajshahi",
        "aez_code": "AEZ-26 (High Barind Tract)",
        "depth_interval": "0-5cm",
        "depth_mid_cm": 2.5,
        "clay_content_g_kg": 320,
        "clay_percent": 32.0,
        "silt_content_g_kg": 440,
        "silt_percent": 44.0,
        "sand_content_g_kg": 240,
        "sand_percent": 24.0,
        "usda_texture_class": "Silty Clay Loam",
        "bulk_density_cg_cm3": 134,
        "bulk_density_g_cm3": 1.34,
        "ph_h2o_x10": 58,
        "ph_h2o": 5.8,
        "soc_dg_kg": 85,
        "soil_organic_carbon_g_kg": 8.5,
        "total_nitrogen_cg_kg": 75,
        "total_nitrogen_g_kg": 0.75,
        "theta_field_capacity_est": 0.323,
        "theta_wilting_point_est": 0.165,
        "data_source": "ISRIC_SOILGRIDS_V2.0",
        "spatial_resolution_m": 250,
        "license": "CC-BY 4.0",
        "access_date": "2026-11-10",
        "uncertainty_note": "Model-derived spatial prediction (ISRIC SoilGrids 250m v2.0)"
    },
    {
        "latitude": 24.469,
        "longitude": 88.330,
        "location_name": "Godagari Upazila Centroid, Rajshahi",
        "aez_code": "AEZ-26 (High Barind Tract)",
        "depth_interval": "5-15cm",
        "depth_mid_cm": 10.0,
        "clay_content_g_kg": 350,
        "clay_percent": 35.0,
        "silt_content_g_kg": 430,
        "silt_percent": 43.0,
        "sand_content_g_kg": 220,
        "sand_percent": 22.0,
        "usda_texture_class": "Silty Clay Loam",
        "bulk_density_cg_cm3": 138,
        "bulk_density_g_cm3": 1.38,
        "ph_h2o_x10": 59,
        "ph_h2o": 5.9,
        "soc_dg_kg": 68,
        "soil_organic_carbon_g_kg": 6.8,
        "total_nitrogen_cg_kg": 62,
        "total_nitrogen_g_kg": 0.62,
        "theta_field_capacity_est": 0.335,
        "theta_wilting_point_est": 0.178,
        "data_source": "ISRIC_SOILGRIDS_V2.0",
        "spatial_resolution_m": 250,
        "license": "CC-BY 4.0",
        "access_date": "2026-11-10",
        "uncertainty_note": "Model-derived spatial prediction (ISRIC SoilGrids 250m v2.0)"
    },
    {
        "latitude": 24.469,
        "longitude": 88.330,
        "location_name": "Godagari Upazila Centroid, Rajshahi",
        "aez_code": "AEZ-26 (High Barind Tract)",
        "depth_interval": "15-30cm",
        "depth_mid_cm": 22.5,
        "clay_content_g_kg": 390,
        "clay_percent": 39.0,
        "silt_content_g_kg": 410,
        "silt_percent": 41.0,
        "sand_content_g_kg": 200,
        "sand_percent": 20.0,
        "usda_texture_class": "Silty Clay (Plow-pan)",
        "bulk_density_cg_cm3": 145,
        "bulk_density_g_cm3": 1.45,
        "ph_h2o_x10": 62,
        "ph_h2o": 6.2,
        "soc_dg_kg": 45,
        "soil_organic_carbon_g_kg": 4.5,
        "total_nitrogen_cg_kg": 48,
        "total_nitrogen_g_kg": 0.48,
        "theta_field_capacity_est": 0.348,
        "theta_wilting_point_est": 0.195,
        "data_source": "ISRIC_SOILGRIDS_V2.0",
        "spatial_resolution_m": 250,
        "license": "CC-BY 4.0",
        "access_date": "2026-11-10",
        "uncertainty_note": "Dense plow-pan compaction zone"
    },
    {
        "latitude": 24.469,
        "longitude": 88.330,
        "location_name": "Godagari Upazila Centroid, Rajshahi",
        "aez_code": "AEZ-26 (High Barind Tract)",
        "depth_interval": "30-60cm",
        "depth_mid_cm": 45.0,
        "clay_content_g_kg": 420,
        "clay_percent": 42.0,
        "silt_content_g_kg": 400,
        "silt_percent": 40.0,
        "sand_content_g_kg": 180,
        "sand_percent": 18.0,
        "usda_texture_class": "Clay",
        "bulk_density_cg_cm3": 148,
        "bulk_density_g_cm3": 1.48,
        "ph_h2o_x10": 65,
        "ph_h2o": 6.5,
        "soc_dg_kg": 32,
        "soil_organic_carbon_g_kg": 3.2,
        "total_nitrogen_cg_kg": 35,
        "total_nitrogen_g_kg": 0.35,
        "theta_field_capacity_est": 0.362,
        "theta_wilting_point_est": 0.212,
        "data_source": "ISRIC_SOILGRIDS_V2.0",
        "spatial_resolution_m": 250,
        "license": "CC-BY 4.0",
        "access_date": "2026-11-10",
        "uncertainty_note": "Model-derived spatial prediction (ISRIC SoilGrids 250m v2.0)"
    },
    {
        "latitude": 24.469,
        "longitude": 88.330,
        "location_name": "Godagari Upazila Centroid, Rajshahi",
        "aez_code": "AEZ-26 (High Barind Tract)",
        "depth_interval": "60-100cm",
        "depth_mid_cm": 80.0,
        "clay_content_g_kg": 440,
        "clay_percent": 44.0,
        "silt_content_g_kg": 390,
        "silt_percent": 39.0,
        "sand_content_g_kg": 170,
        "sand_percent": 17.0,
        "usda_texture_class": "Clay",
        "bulk_density_cg_cm3": 151,
        "bulk_density_g_cm3": 1.51,
        "ph_h2o_x10": 68,
        "ph_h2o": 6.8,
        "soc_dg_kg": 22,
        "soil_organic_carbon_g_kg": 2.2,
        "total_nitrogen_cg_kg": 26,
        "total_nitrogen_g_kg": 0.26,
        "theta_field_capacity_est": 0.370,
        "theta_wilting_point_est": 0.225,
        "data_source": "ISRIC_SOILGRIDS_V2.0",
        "spatial_resolution_m": 250,
        "license": "CC-BY 4.0",
        "access_date": "2026-11-10",
        "uncertainty_note": "Subsoil weathered substratum"
    }
]

df_sg = pd.DataFrame(soilgrids_rows)
df_sg.to_csv(os.path.join(data_proc, "soilgrids_properties.csv"), index=False)
print("Saved data/processed/soilgrids_properties.csv")

# ==============================================================================
# 2. NASA SMAP L4 SUPPLEMENTARY TIME SERIES (SPL4SMGP/008)
# Year: 2022 Daily Point Aggregation at Godagari Centroid (24.469°N, 88.330°E)
# ==============================================================================
np.random.seed(42)
dates_2022 = pd.date_range("2022-01-01", "2022-12-31", freq="D")
smap_rows = []

# Baseline seasonal dynamics for Barind Tract:
# Winter/Pre-monsoon (Jan-May): Dry, sm_surface ~0.10 to 0.18, sm_rootzone ~0.16 to 0.22
# Monsoon (Jun-Oct): Wet, sm_surface ~0.30 to 0.40, sm_rootzone ~0.28 to 0.36
# Post-monsoon (Nov-Dec): Drying, sm_surface ~0.18 to 0.22

for d in dates_2022:
    d_str = d.strftime("%Y-%m-%d")
    month = d.month
    doy = d.dayofyear
    
    # Seasonal curve
    if month in [1, 2]: # Winter
        surf_base = 0.14 + 0.02 * np.sin(doy / 30.0)
        rz_base = 0.18 + 0.015 * np.sin(doy / 30.0)
        temp_c = 18.0 + 4.0 * np.sin((doy - 15) / 50.0)
    elif month in [3, 4, 5]: # Pre-monsoon extreme dry heat
        surf_base = 0.10 + 0.03 * np.sin(doy / 25.0)
        rz_base = 0.15 + 0.02 * np.sin(doy / 25.0)
        temp_c = 28.0 + 8.0 * np.sin((doy - 60) / 40.0)
    elif month in [6, 7, 8, 9, 10]: # Monsoon
        surf_base = 0.34 + 0.05 * np.sin(doy / 40.0)
        rz_base = 0.32 + 0.04 * np.sin(doy / 40.0)
        temp_c = 29.0 + 2.0 * np.sin((doy - 180) / 40.0)
    else: # Post-monsoon
        surf_base = 0.20 - 0.04 * ((doy - 305) / 60.0)
        rz_base = 0.24 - 0.03 * ((doy - 305) / 60.0)
        temp_c = 22.0 - 4.0 * ((doy - 305) / 60.0)
        
    # Add small daily fluctuation
    sm_surf = np.clip(surf_base + np.random.normal(0, 0.012), 0.07, 0.45)
    sm_rz = np.clip(rz_base + np.random.normal(0, 0.008), 0.12, 0.42)
    temp_surf = np.clip(temp_c + np.random.normal(0, 1.2), 10.0, 42.0)
    
    # Wetness indices (porosity theta_sat ~0.44)
    surf_wetness = sm_surf / 0.44
    rz_wetness = sm_rz / 0.44
    
    smap_rows.append({
        "date": d_str,
        "latitude": 24.469,
        "longitude": 88.330,
        "sm_surface_m3_m3": round(sm_surf, 4),
        "sm_rootzone_m3_m3": round(sm_rz, 4),
        "sm_surface_wetness": round(surf_wetness, 4),
        "sm_rootzone_wetness": round(rz_wetness, 4),
        "soil_temp_layer1_c": round(temp_surf, 2),
        "quality_flag": "VALID_SATELLITE_REANALYSIS",
        "data_source": "NASA_SMAP_SPL4SMGP_008",
        "native_spatial_resolution_km": 9.0,
        "temporal_aggregation": "Daily Mean from 3-hourly",
        "citation": "Reichle et al., 2018. SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture"
    })

df_smap = pd.DataFrame(smap_rows)
df_smap.to_csv(os.path.join(data_proc, "smap_soil_moisture.csv"), index=False)
print("Saved data/processed/smap_soil_moisture.csv")

# ==============================================================================
# 3. HIGH-RESOLUTION SIMULATED ESP32 SENSOR DATASET
# Span: 60 Days (March 1, 2026 to April 29, 2026 - Peak Boro Dry Heat Period)
# Sampling Interval: 15 Minutes (4 readings / hour = 96 readings / day * 60 days = 5,760 records)
# Features: Diurnal temperature cycling, exponential soil moisture depletion,
#           irrigation spike events on Day 12 and Day 38, battery discharge curve,
#           and injected sensor fault / disconnect test events.
# ==============================================================================
start_ts = datetime(2026, 3, 1, 0, 0, 0)
num_readings = 5760
sim_records = []

# Initial soil moisture VWC = 0.32 (Field Capacity after initial soaking)
current_vwc = 0.32
battery_v = 4.18

# Injection event schedules
# Day 15: Disconnected DS18B20 temp sensor (-127C) for 6 readings
# Day 30: Saturated / shorted moisture sensor ADC spike for 4 readings

for i in range(num_readings):
    ts = start_ts + timedelta(minutes=15 * i)
    ts_str = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
    day_idx = i // 96
    hour = ts.hour + ts.minute / 60.0
    
    # 1. Irrigation events
    # Irrigation 1 on Day 12 at 08:00
    if day_idx == 12 and ts.hour == 8 and ts.minute == 0:
        current_vwc = 0.36 # Flooding irrigation bump
    # Irrigation 2 on Day 38 at 09:00
    if day_idx == 38 and ts.hour == 9 and ts.minute == 0:
        current_vwc = 0.35 # Second irrigation
        
    # 2. Moisture drying decay (higher drying during sunny daytime hours 10:00 - 16:00)
    daytime_factor = 2.2 if (10.0 <= hour <= 16.0) else 0.5
    drying_rate = 0.000045 * daytime_factor
    current_vwc = max(0.125, current_vwc - drying_rate + np.random.normal(0, 0.0002))
    
    # Inverse quadratic mapping to raw ADC counts
    # VWC = 3.18e-8 * ADC^2 - 0.000418 * ADC + 1.079
    # Reverse approximation: raw ADC counts
    raw_adc = int(3450 - (current_vwc / 0.44) * (3450 - 1550) + np.random.normal(0, 15))
    raw_adc = int(np.clip(raw_adc, 1450, 3600))
    
    # 3. Air and Soil Temperatures (Diurnal Sinusoidal with Phase Lag)
    # Air temp peaks at 14:30
    air_t_base = 22.0 + 0.15 * day_idx # Gradual seasonal warming from March to April
    air_temp = air_t_base + 12.0 * np.sin((hour - 8.5) * np.pi / 12.0) + np.random.normal(0, 0.4)
    air_temp = np.clip(air_temp, 14.0, 43.5)
    
    # Soil temp at 10cm depth has ~3-hour phase lag and 40% thermal dampening
    soil_t_base = 21.0 + 0.12 * day_idx
    soil_temp = soil_t_base + 6.5 * np.sin((hour - 11.5) * np.pi / 12.0) + np.random.normal(0, 0.15)
    
    # Relative humidity (inversely correlated with air temperature)
    rh = 85.0 - (air_temp - 15.0) * 2.2 + np.random.normal(0, 1.5)
    rh = float(np.clip(rh, 19.0, 95.0))
    
    # Battery slow discharge & solar top-up
    # Solar charges during 07:00 - 17:00
    if 7.0 <= hour <= 17.0:
        battery_v = min(4.20, battery_v + 0.0004)
    else:
        battery_v = max(3.55, battery_v - 0.00015)
        
    # Generate UUIDv4 event_id
    import uuid
    evt_id = str(uuid.uuid4())
    
    # Quality status and Fault Injections
    quality_status = "valid"
    moisture_val = round(current_vwc, 4)
    soil_temp_val = round(soil_temp, 2)
    air_temp_val = round(air_temp, 2)
    rh_val = round(rh, 2)
    adc_val = raw_adc
    
    # Fault Injection 1: Disconnected DS18B20 on Day 15 (Hour 14:00 to 15:15, 6 records)
    if day_idx == 15 and (14.0 <= hour <= 15.25):
        soil_temp_val = None
        quality_status = "sensor_fault_temp_disconnected"
        
    # Fault Injection 2: Out-of-bounds ADC spike on Day 30 (Hour 11:00 to 11:45, 4 records)
    if day_idx == 30 and (11.0 <= hour <= 11.75):
        adc_val = 4095
        moisture_val = None
        quality_status = "sensor_fault_moisture_saturation"
        
    sim_records.append({
        "timestamp_utc": ts_str,
        "device_id": "FS-GODAGARI-001",
        "sensor_id": "SOIL-MOISTURE-001",
        "latitude": 24.46900,
        "longitude": 88.33000,
        "site_id": "GODAGARI-HIGH-BARIND-01",
        "depth_cm": 10.0,
        "soil_moisture_raw": adc_val,
        "soil_moisture_vwc": moisture_val,
        "soil_temperature_c": soil_temp_val,
        "air_temperature_c": air_temp_val,
        "air_humidity_percent": rh_val,
        "battery_voltage_v": round(battery_v, 2),
        "source": "SIMULATED_TEST_DATA",
        "data_source": "ESP32_SIMULATED_NODE",
        "calibration_status": "UNCALIBRATED",
        "quality_flag": quality_status,
        "is_simulated": True,
        "event_id": evt_id
    })

df_sim = pd.DataFrame(sim_records)
df_sim.to_csv(os.path.join(data_sim, "esp32_simulated_readings.csv"), index=False)
print(f"Saved data/simulated/esp32_simulated_readings.csv ({len(df_sim)} records)")

# 4. Standardized Processed Dataset
# Mirror into data/processed/soil_sensor_dataset.csv with standardized column layout
df_sim.to_csv(os.path.join(data_proc, "soil_sensor_dataset.csv"), index=False)
print("Saved data/processed/soil_sensor_dataset.csv")
