/**
 * AgriSense Fusion - Local Persistent Store
 * Serves as development persistence layer with identical schema contract to PostgreSQL.
 * Written with atomic file replacement to prevent corrupted state.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Seed Data for Northern Bangladesh (Barind Tract & Agro-Ecological Zones)
const DEFAULT_INITIAL_STATE = {
  farms: [
    {
      id: 'farm-barind-01',
      name: 'Godagari Agricultural Research Hub (বরেন্দ্র ট্র্যাক্ট, রাজশাহী)',
      district: 'Rajshahi',
      division: 'Rajshahi',
      latitude: 24.469,
      longitude: 88.330,
      elevation_m: 28.0,
      timezone: 'Asia/Dhaka',
      groundwaterZone: 'Barind High Risk (Critically Depleting Aquifer)',
      createdAt: '2026-10-01T00:00:00Z'
    },
    {
      id: 'farm-rangpur-02',
      name: 'Mithapukur Climate-Smart Demonstration Field (মিঠাপুকুর, রংপুর)',
      district: 'Rangpur',
      division: 'Rangpur',
      latitude: 25.580,
      longitude: 89.280,
      elevation_m: 32.0,
      timezone: 'Asia/Dhaka',
      groundwaterZone: 'Tista Floodplain (Moderate)',
      createdAt: '2026-10-01T00:00:00Z'
    },
    {
      id: 'farm-bogura-03',
      name: 'Sherpur Diversified Horticulture Farm (শেরপুর, বগুড়া)',
      district: 'Bogura',
      division: 'Rajshahi',
      latitude: 24.673,
      longitude: 89.418,
      elevation_m: 20.0,
      timezone: 'Asia/Dhaka',
      groundwaterZone: 'Karatoya Basin (Stable)',
      createdAt: '2026-10-01T00:00:00Z'
    }
  ],
  fields: [
    {
      id: 'field-godagari-a',
      farm_id: 'farm-barind-01',
      name: 'Plot A-1: High Terrace Loam',
      area_m2: 12000,
      soil_type: 'clay_loam',
      soil_type_label: 'Barind Red Clay Loam (ভারী এঁটেল দোআঁশ)',
      theta_fc: 0.32, // Field capacity (32% VWC)
      theta_wp: 0.14, // Wilting point (14% VWC)
      root_depth_m: 0.40,
      current_crop: 'Mustard (Relay Sowing)',
      previous_crops: ['T_AMAN_RICE'],
      target_rotations: ['rot-legume-pulse-water-smart', 'rot-maize-mung-aman']
    },
    {
      id: 'field-mithapukur-b',
      farm_id: 'farm-rangpur-02',
      name: 'Plot B-2: Sandy Alluvial Silt',
      area_m2: 8500,
      soil_type: 'silt_loam',
      soil_type_label: 'Tista Alluvial Silt Loam (পলি দোআঁশ)',
      theta_fc: 0.28,
      theta_wp: 0.10,
      root_depth_m: 0.35,
      current_crop: 'Fallow / Pre-seeding',
      previous_crops: ['BORO_RICE', 'T_AMAN_RICE'],
      target_rotations: ['rot-potato-mung-aman', 'rot-maize-mung-aman']
    }
  ],
  devices: [
    {
      id: 'esp32-node-raj-01',
      field_id: 'field-godagari-a',
      name: 'AgriSense ESP32 Field Probe #1',
      firmware_version: 'v2.4.1-esp32-freertos',
      is_active: true,
      calibration_version: 'cal-fdr-2026.1',
      last_seen_at: new Date().toISOString()
    }
  ],
  readings: [
    {
      id: 1,
      device_id: 'esp32-node-raj-01',
      field_id: 'field-godagari-a',
      event_id: 'evt-seed-1001-rajshahi',
      observed_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      received_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      soil_moisture_vwc: 0.224, // 22.4% VWC
      soil_temp_c: 26.8,
      air_temp_c: 29.5,
      relative_humidity_pct: 74.2,
      soil_ph: 6.4,
      quality_status: 'valid',
      calibration_version: 'cal-fdr-2026.1',
      is_simulated: true, // honestly labeled demo seed
      raw_payload: { adc_val: 1845, sensor_type: 'Capacitive_FDR_v2' }
    }
  ],
  nasa_weather_cache: {},
  groundwater_readings: [
    {
      id: 1,
      farm_id: 'farm-barind-01',
      well_identifier: 'DTW-BMDA-GODAGARI-42',
      observed_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      depth_below_surface_m: 26.4,
      critical_threshold_m: 28.0,
      warning_level: 'warning',
      annual_drawdown_rate_m: 0.65,
      is_simulated: true
    },
    {
      id: 2,
      farm_id: 'farm-rangpur-02',
      well_identifier: 'DTW-TISTA-MITHA-18',
      observed_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      depth_below_surface_m: 9.8,
      critical_threshold_m: 16.0,
      warning_level: 'normal',
      annual_drawdown_rate_m: 0.12,
      is_simulated: true
    }
  ]
};

class StorageService {
  constructor() {
    this.state = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      } else {
        this.state = JSON.parse(JSON.stringify(DEFAULT_INITIAL_STATE));
        this.save();
      }
    } catch (err) {
      console.warn('Could not read existing store.json, using default state:', err.message);
      this.state = JSON.parse(JSON.stringify(DEFAULT_INITIAL_STATE));
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${STORE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempFile, STORE_FILE);
    } catch (err) {
      console.error('Failed to save store.json:', err.message);
    }
  }

  getFarms() {
    return this.state.farms || [];
  }

  getFarmById(id) {
    return (this.state.farms || []).find((f) => f.id === id) || null;
  }

  getFieldsByFarm(farmId) {
    return (this.state.fields || []).filter((f) => f.farm_id === farmId);
  }

  getFieldById(fieldId) {
    return (this.state.fields || []).find((f) => f.id === fieldId) || null;
  }

  getDevices() {
    return this.state.devices || [];
  }

  getReadings(fieldId = null, limit = 50) {
    let list = this.state.readings || [];
    if (fieldId) {
      list = list.filter((r) => r.field_id === fieldId);
    }
    return list.slice(-limit).reverse();
  }

  getLatestReading(fieldId = null) {
    const list = this.getReadings(fieldId, 1);
    return list.length > 0 ? list[0] : null;
  }

  hasEventId(eventId) {
    return (this.state.readings || []).some((r) => r.event_id === eventId);
  }

  addReading(reading) {
    if (!this.state.readings) this.state.readings = [];
    const newId = (this.state.readings.length > 0
      ? Math.max(...this.state.readings.map((r) => r.id || 0))
      : 0) + 1;
    const record = { id: newId, received_at: new Date().toISOString(), ...reading };
    this.state.readings.push(record);
    this.save();
    return record;
  }

  getCachedNasa(key) {
    return this.state.nasa_weather_cache?.[key] || null;
  }

  setCachedNasa(key, data) {
    if (!this.state.nasa_weather_cache) this.state.nasa_weather_cache = {};
    this.state.nasa_weather_cache[key] = {
      cachedAt: new Date().toISOString(),
      data
    };
    this.save();
  }

  getGroundwater(farmId) {
    return (this.state.groundwater_readings || []).filter((g) => g.farm_id === farmId);
  }
}

const storage = new StorageService();
module.exports = storage;
