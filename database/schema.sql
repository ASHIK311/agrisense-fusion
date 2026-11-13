-- ==============================================================================
-- AgriSense Fusion / Field Shift - PostgreSQL + PostGIS Comprehensive Production Schema
-- Designed for NASA Space Apps Challenge 2026: Field Shift
-- Location: Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)
-- Coordinates: 24.469°N, 88.330°E | CRS: EPSG:4326 (WGS 84) / EPSG:32645 (UTM 45N)
-- ==============================================================================

-- Core Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users and Authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'agronomist', 'researcher', 'admin')),
  organization TEXT,
  phone TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('bn', 'en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- 2. Farms and Locations
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Rajshahi',
  division TEXT NOT NULL DEFAULT 'Rajshahi',
  upazila TEXT NOT NULL DEFAULT 'Godagari',
  aez_code TEXT NOT NULL DEFAULT 'AEZ-26', -- High Barind Tract
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  elevation_m DOUBLE PRECISION NOT NULL DEFAULT 28.0,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  groundwater_zone TEXT DEFAULT 'Barind High Risk (Critically Depleting Aquifer)',
  boundary_geom GEOMETRY(MultiPolygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS farms_coords_idx ON farms(latitude, longitude);
CREATE INDEX IF NOT EXISTS farms_geom_gist ON farms USING GIST (boundary_geom);

-- 3. Agricultural Fields (Parcels)
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_m2 NUMERIC(14,2) NOT NULL CHECK (area_m2 > 0),
  soil_type TEXT NOT NULL DEFAULT 'silty_clay_loam',
  soil_type_label TEXT DEFAULT 'Barind Silty Clay Loam — Saxton & Rawls 2006 PTF Provisional (বরেন্দ্র পলি-এঁটেল দোআঁশ)',
  theta_fc NUMERIC(6,4) NOT NULL DEFAULT 0.3230 CHECK (theta_fc BETWEEN 0 AND 1), -- Field Capacity (m3/m3)
  theta_wp NUMERIC(6,4) NOT NULL DEFAULT 0.1650 CHECK (theta_wp BETWEEN 0 AND 1), -- Wilting Point (m3/m3)
  root_depth_m NUMERIC(6,3) NOT NULL DEFAULT 0.500 CHECK (root_depth_m > 0),
  current_crop TEXT DEFAULT 'Mustard (Relay Sowing)',
  boundary_geom GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, name),
  CHECK (theta_fc > theta_wp)
);
CREATE INDEX IF NOT EXISTS fields_farm_id_idx ON fields(farm_id);
CREATE INDEX IF NOT EXISTS fields_geom_gist ON fields USING GIST (boundary_geom);

-- 4. IoT Edge Sensor Devices (ESP32)
CREATE TABLE IF NOT EXISTS sensor_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uid TEXT NOT NULL UNIQUE, -- e.g. esp32-node-raj-01
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  firmware_version TEXT NOT NULL DEFAULT 'v2.4.1-esp32-freertos',
  is_active BOOLEAN NOT NULL DEFAULT true,
  calibration_version TEXT NOT NULL DEFAULT 'cal-fdr-2026.1',
  battery_level_pct NUMERIC(5,2),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sensor_devices_field_id_idx ON sensor_devices(field_id);

-- 5. Validated Sensor Readings (Telemetry)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  soil_moisture_vwc NUMERIC(7,5) CHECK (soil_moisture_vwc BETWEEN 0 AND 1),
  air_temp_c NUMERIC(6,2),
  relative_humidity_pct NUMERIC(6,2) CHECK (relative_humidity_pct BETWEEN 0 AND 100),
  soil_ph NUMERIC(4,2) CHECK (soil_ph BETWEEN 0 AND 14),
  soil_temp_c NUMERIC(6,2),
  battery_voltage_v NUMERIC(4,2),
  quality_status TEXT NOT NULL DEFAULT 'valid'
    CHECK (quality_status IN ('unverified','valid','suspect','invalid')),
  calibration_version TEXT DEFAULT 'cal-fdr-2026.1',
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  raw_payload JSONB,
  UNIQUE (device_id, event_id)
);
CREATE INDEX IF NOT EXISTS sensor_readings_device_time_idx ON sensor_readings (device_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS sensor_readings_field_time_idx ON sensor_readings (field_id, observed_at DESC);

-- 6. NASA POWER Daily Weather Archive
CREATE TABLE IF NOT EXISTS nasa_daily_weather (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'NASA_POWER',
  source_date DATE NOT NULL,
  time_standard TEXT NOT NULL DEFAULT 'LST' CHECK (time_standard IN ('LST','UTC')),
  t2m_c NUMERIC(7,3),
  t2m_max_c NUMERIC(7,3),
  t2m_min_c NUMERIC(7,3),
  rh2m_pct NUMERIC(7,3),
  solar_mj_m2_day NUMERIC(10,4),
  precipitation_mm NUMERIC(10,4),
  wind_speed_m_s NUMERIC(8,4),
  vpd_kpa NUMERIC(7,4),
  consecutive_dry_days INTEGER DEFAULT 0,
  heat_drought_risk INTEGER DEFAULT 0,
  source_status TEXT NOT NULL DEFAULT 'valid'
    CHECK (source_status IN ('valid','partial','invalid','simulated_fallback','cached')),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (latitude, longitude, source_date, time_standard)
);
CREATE INDEX IF NOT EXISTS nasa_weather_coords_date_idx ON nasa_daily_weather (latitude, longitude, source_date DESC);

-- 7. Satellite Scenes and LULC Classification (Member 1)
CREATE TABLE IF NOT EXISTS satellite_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_name TEXT NOT NULL UNIQUE,
  acquisition_date DATE NOT NULL,
  satellite_platform TEXT NOT NULL DEFAULT 'Sentinel-2 MSI',
  cloud_coverage_pct NUMERIC(5,2),
  usable_cropland_pixels INTEGER,
  scl_mask_applied BOOLEAN NOT NULL DEFAULT true,
  footprint_geom GEOMETRY(Polygon, 4326),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS satellite_scenes_geom_gist ON satellite_scenes USING GIST (footprint_geom);

CREATE TABLE IF NOT EXISTS satellite_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES satellite_scenes(id) ON DELETE SET NULL,
  classification_date DATE NOT NULL,
  predicted_class_id INTEGER NOT NULL CHECK (predicted_class_id IN (0, 1, 2, 3)),
  predicted_class_label TEXT NOT NULL CHECK (predicted_class_label IN ('Cropland', 'Tree_Cover', 'Permanent_Water', 'Built_Up')),
  confidence NUMERIC(6,4) NOT NULL,
  class_probabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_vector JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version TEXT NOT NULL DEFAULT 'RandomForestClassifier_15Feat_Optimized',
  holdout_accuracy_ref NUMERIC(5,2) DEFAULT 85.77,
  pure_interior_accuracy_ref NUMERIC(5,2) DEFAULT 90.64,
  boundary_mixed_accuracy_ref NUMERIC(5,2) DEFAULT 75.92,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Crop Catalog and Agronomic Coefficients
CREATE TABLE IF NOT EXISTS crop_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_code TEXT NOT NULL UNIQUE,
  crop_name TEXT NOT NULL,
  crop_name_bn TEXT,
  scientific_name TEXT,
  family_name TEXT,
  season TEXT CHECK (season IN ('Rabi', 'Kharif-1', 'Kharif-2', 'Perennial', 'All Season')),
  typical_duration_days INTEGER,
  water_demand_category TEXT CHECK (water_demand_category IN ('low','medium','high','critical_high')),
  water_requirement_mm NUMERIC(8,2),
  depletion_fraction_p NUMERIC(4,2) DEFAULT 0.50,
  min_ph NUMERIC(4,2),
  max_ph NUMERIC(4,2),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS crop_stage_coefficients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  crop_id UUID NOT NULL REFERENCES crop_catalog(id) ON DELETE CASCADE,
  growth_stage TEXT NOT NULL CHECK (growth_stage IN ('initial', 'development', 'mid', 'late')),
  stage_duration_days INTEGER NOT NULL,
  kc NUMERIC(6,3) NOT NULL CHECK (kc >= 0),
  root_depth_m NUMERIC(6,3) NOT NULL,
  source_reference TEXT NOT NULL DEFAULT 'FAO-56 Table 12',
  UNIQUE (crop_id, growth_stage)
);

-- 9. Crop Rotation Schemes & Rules
CREATE TABLE IF NOT EXISTS rotation_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_bn TEXT,
  sequence_description TEXT NOT NULL,
  season_1_crop TEXT NOT NULL,
  season_2_crop TEXT NOT NULL,
  season_3_crop TEXT NOT NULL,
  water_savings_vs_boro_pct NUMERIC(5,2),
  soil_health_rating TEXT CHECK (soil_health_rating IN ('low', 'moderate', 'high', 'excellent')),
  economic_return_rating TEXT CHECK (economic_return_rating IN ('low', 'moderate', 'high', 'very_high')),
  barind_aez_recommended BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- 10. Physics Model Runs (FAO-56 Water Balance)
CREATE TABLE IF NOT EXISTS model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'FAO-56 Penman-Monteith Full Stefan-Boltzmann',
  input_summary JSONB NOT NULL,
  et0_mm_day NUMERIC(9,4) NOT NULL,
  etc_mm_day NUMERIC(9,4) NOT NULL,
  taw_mm NUMERIC(10,4) NOT NULL,
  raw_mm NUMERIC(10,4) NOT NULL,
  root_depletion_mm NUMERIC(10,4) NOT NULL,
  water_stress_ks NUMERIC(5,3) NOT NULL DEFAULT 1.000,
  depletion_pct NUMERIC(6,2) NOT NULL,
  water_status TEXT NOT NULL CHECK (water_status IN ('optimal', 'adequate', 'stress_approaching', 'critical_stress', 'waterlogged')),
  irrigation_recommended BOOLEAN NOT NULL DEFAULT false,
  recommended_depth_mm NUMERIC(8,2) DEFAULT 0.0,
  confidence TEXT NOT NULL DEFAULT 'high' CHECK (confidence IN ('high','medium','low','insufficient_data')),
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS model_runs_field_date_idx ON model_runs (field_id, calculation_date DESC);

-- 11. Disease Knowledge Base & Climate Risk Screening (Member 6)
CREATE TABLE IF NOT EXISTS diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_code TEXT NOT NULL UNIQUE,
  disease_name TEXT NOT NULL,
  disease_name_bn TEXT,
  scientific_name TEXT NOT NULL,
  pathogen_type TEXT NOT NULL CHECK (pathogen_type IN ('Fungus', 'Bacterium', 'Virus', 'Nematode', 'Oomycete')),
  primary_crops JSONB NOT NULL DEFAULT '[]'::jsonb,
  symptoms_description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disease_climate_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  min_temp_c NUMERIC(5,2) NOT NULL,
  opt_temp_min_c NUMERIC(5,2) NOT NULL,
  opt_temp_max_c NUMERIC(5,2) NOT NULL,
  max_temp_c NUMERIC(5,2) NOT NULL,
  min_rh_pct NUMERIC(5,2) NOT NULL,
  opt_rh_pct NUMERIC(5,2) NOT NULL,
  min_leaf_wetness_hours NUMERIC(5,2) NOT NULL DEFAULT 6.0,
  rainfall_conducive BOOLEAN NOT NULL DEFAULT true,
  risk_formula_description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disease_managements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  cultural_control TEXT NOT NULL,
  biological_control TEXT,
  chemical_control TEXT NOT NULL,
  recommended_chemical_dosage TEXT NOT NULL,
  safety_interval_days INTEGER DEFAULT 14
);

CREATE TABLE IF NOT EXISTS disease_resistant_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  variety_name TEXT NOT NULL,
  resistance_level TEXT NOT NULL CHECK (resistance_level IN ('Resistant', 'Moderately Resistant', 'Tolerant')),
  releasing_institute TEXT NOT NULL CHECK (releasing_institute IN ('BRRI', 'BARI', 'BINA', 'CIMMYT/BARI', 'IRRI/BRRI'))
);

CREATE TABLE IF NOT EXISTS disease_research_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  paper_title TEXT NOT NULL,
  authors TEXT NOT NULL,
  journal TEXT NOT NULL,
  publication_year INTEGER NOT NULL,
  doi TEXT NOT NULL UNIQUE,
  is_bangladesh_focused BOOLEAN NOT NULL DEFAULT true
);

-- 12. Automated Alerting Engine
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('drought_heat', 'water_stress', 'disease_risk', 'groundwater_critical', 'sensor_fault', 'system_notice')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  title_bn TEXT,
  message TEXT NOT NULL,
  message_bn TEXT,
  trigger_source TEXT NOT NULL, -- e.g. 'NASA_POWER', 'ESP32_FDR', 'FAO56_ENGINE', 'MEMBER6_DISEASE_KB'
  trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS alerts_farm_created_idx ON alerts (farm_id, created_at DESC);

-- 13. Groundwater Monitoring (Barind Tubewells)
CREATE TABLE IF NOT EXISTS groundwater_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  well_identifier TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  depth_below_surface_m NUMERIC(7,3) NOT NULL,
  critical_threshold_m NUMERIC(7,3) NOT NULL DEFAULT 28.0,
  annual_drawdown_rate_m NUMERIC(6,3) NOT NULL DEFAULT 0.650,
  warning_level TEXT NOT NULL DEFAULT 'normal' CHECK (warning_level IN ('normal','warning','critical')),
  is_simulated BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS groundwater_farm_idx ON groundwater_readings (farm_id, observed_at DESC);
