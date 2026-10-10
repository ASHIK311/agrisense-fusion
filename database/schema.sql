-- ==============================================================================
-- AgriSense Fusion / Field Shift - PostgreSQL Production Schema
-- Designed for NASA Space Apps Challenge 2026: Field Shift
-- Reference: Field_Shift_Technical_Blueprint.pdf
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Farms and Locations
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT,
  division TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  elevation_m DOUBLE PRECISION,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Agricultural Fields
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_m2 NUMERIC(14,2) CHECK (area_m2 > 0),
  soil_type TEXT,
  theta_fc NUMERIC(6,4) CHECK (theta_fc BETWEEN 0 AND 1), -- Field Capacity (m3/m3)
  theta_wp NUMERIC(6,4) CHECK (theta_wp BETWEEN 0 AND 1), -- Wilting Point (m3/m3)
  root_depth_m NUMERIC(6,3) CHECK (root_depth_m > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, name),
  CHECK (theta_fc IS NULL OR theta_wp IS NULL OR theta_fc > theta_wp)
);

-- 3. IoT Edge Sensor Devices (ESP32)
CREATE TABLE IF NOT EXISTS sensor_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  device_key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  firmware_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Validated Ingested Sensor Readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES sensor_devices(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  soil_moisture_vwc NUMERIC(7,5) CHECK (soil_moisture_vwc BETWEEN 0 AND 1),
  air_temp_c NUMERIC(6,2),
  relative_humidity_pct NUMERIC(6,2) CHECK (relative_humidity_pct BETWEEN 0 AND 100),
  soil_ph NUMERIC(4,2) CHECK (soil_ph BETWEEN 0 AND 14),
  soil_temp_c NUMERIC(6,2),
  quality_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (quality_status IN ('unverified','valid','suspect','invalid')),
  calibration_version TEXT,
  is_simulated BOOLEAN NOT NULL DEFAULT false,
  raw_payload JSONB,
  UNIQUE (device_id, event_id)
);
CREATE INDEX IF NOT EXISTS sensor_readings_device_time_idx
  ON sensor_readings (device_id, observed_at DESC);

-- 5. NASA POWER Daily Weather Cache
CREATE TABLE IF NOT EXISTS nasa_daily_weather (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
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
  source_units JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_status TEXT NOT NULL DEFAULT 'valid'
    CHECK (source_status IN ('valid','partial','invalid','simulated_fallback')),
  UNIQUE (farm_id, source, source_date, time_standard)
);
CREATE INDEX IF NOT EXISTS nasa_weather_date_idx
  ON nasa_daily_weather (farm_id, source_date DESC);

-- 6. Crop Catalog & Agronomic Coefficients (FAO-56)
CREATE TABLE IF NOT EXISTS crop_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_code TEXT NOT NULL UNIQUE,
  crop_name TEXT NOT NULL,
  scientific_name TEXT,
  family_name TEXT,
  season TEXT,
  typical_duration_days INTEGER,
  water_demand_category TEXT CHECK (water_demand_category IN ('low','medium','high','very_high')),
  min_ph NUMERIC(4,2),
  max_ph NUMERIC(4,2),
  notes TEXT,
  CHECK (min_ph IS NULL OR max_ph IS NULL OR min_ph <= max_ph)
);

CREATE TABLE IF NOT EXISTS crop_coefficients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  crop_id UUID NOT NULL REFERENCES crop_catalog(id) ON DELETE CASCADE,
  growth_stage TEXT NOT NULL,
  kc NUMERIC(6,3) NOT NULL CHECK (kc >= 0),
  source_reference TEXT NOT NULL,
  version TEXT NOT NULL,
  UNIQUE (crop_id, growth_stage, version)
);

-- 7. Crop History / Cycles
CREATE TABLE IF NOT EXISTS crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES crop_catalog(id),
  planted_on DATE NOT NULL,
  harvested_on DATE,
  outcome_notes TEXT,
  CHECK (harvested_on IS NULL OR harvested_on >= planted_on)
);
CREATE INDEX IF NOT EXISTS crop_cycles_field_dates_idx
  ON crop_cycles (field_id, planted_on DESC);

-- 8. Crop Rotation Rules Engine
CREATE TABLE IF NOT EXISTS rotation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL,
  version TEXT NOT NULL,
  previous_crop_id UUID REFERENCES crop_catalog(id),
  next_crop_id UUID NOT NULL REFERENCES crop_catalog(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('prohibit','prefer','require','condition')),
  priority INTEGER NOT NULL DEFAULT 100,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (rule_code, version)
);

-- 9. Physics Model Runs (ET0, ETc, Water Balance)
CREATE TABLE IF NOT EXISTS model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  model_version TEXT NOT NULL,
  input_summary JSONB NOT NULL,
  et0_mm_day NUMERIC(9,4),
  etc_mm_day NUMERIC(9,4),
  root_depletion_mm NUMERIC(10,4),
  soil_evaporation_mm_day NUMERIC(9,4),
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low','insufficient_data')),
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Recommendations and Decisions
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_run_id UUID REFERENCES model_runs(id) ON DELETE SET NULL,
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('irrigation','crop_rotation','soil_review')),
  proposed_crop_id UUID REFERENCES crop_catalog(id),
  action_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  rule_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Groundwater Monitoring (Barind Tract Deep Tubewell Aquifer Monitoring)
CREATE TABLE IF NOT EXISTS groundwater_readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  well_identifier TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  depth_below_surface_m NUMERIC(7,3) NOT NULL,
  reference_elevation_m NUMERIC(7,3),
  warning_level TEXT NOT NULL DEFAULT 'normal' CHECK (warning_level IN ('normal','warning','critical')),
  is_simulated BOOLEAN NOT NULL DEFAULT true
);
