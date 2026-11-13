/**
 * AgriSense Fusion - Master Storage Service
 * Provides atomic persistence for development and local testing,
 * populated with verified scientific datasets from Members 1-6.
 * Enforces multi-tenant data isolation and protects demonstration baselines.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const BAK_FILE = path.join(DATA_DIR, 'store.json.bak');
const MASTER_SEED_FILE = path.join(DATA_DIR, 'master_database_seed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Demonstration Farms & Fields for Northern Bangladesh
const DEFAULT_FARMS = [
  {
    id: 'farm-barind-01',
    name: 'Godagari Agricultural Research Hub (বরেন্দ্র ট্র্যাক্ট, রাজশাহী)',
    district: 'Rajshahi',
    division: 'Rajshahi',
    upazila: 'Godagari',
    aez_code: 'AEZ-26',
    latitude: 24.469,
    longitude: 88.330,
    elevation_m: 28.0,
    timezone: 'Asia/Dhaka',
    groundwaterZone: 'Barind High Risk (Critically Depleting Aquifer)',
    is_demo: true,
    is_public: true,
    user_id: null,
    createdAt: '2026-10-01T00:00:00Z',
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [88.325, 24.465],
          [88.335, 24.465],
          [88.335, 24.475],
          [88.325, 24.475],
          [88.325, 24.465]
        ]
      ]
    }
  },
  {
    id: 'farm-rangpur-02',
    name: 'Mithapukur Climate-Smart Demonstration Field (মিঠাপুকুর, রংপুর)',
    district: 'Rangpur',
    division: 'Rangpur',
    upazila: 'Mithapukur',
    aez_code: 'AEZ-03',
    latitude: 25.580,
    longitude: 89.280,
    elevation_m: 32.0,
    timezone: 'Asia/Dhaka',
    groundwaterZone: 'Tista Floodplain (Moderate)',
    is_demo: true,
    is_public: true,
    user_id: null,
    createdAt: '2026-10-01T00:00:00Z',
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [89.275, 25.575],
          [89.285, 25.575],
          [89.285, 25.585],
          [89.275, 25.585],
          [89.275, 25.575]
        ]
      ]
    }
  },
  {
    id: 'farm-bogura-03',
    name: 'Sherpur Diversified Horticulture Farm (শেরপুর, বগুড়া)',
    district: 'Bogura',
    division: 'Rajshahi',
    upazila: 'Sherpur',
    aez_code: 'AEZ-25',
    latitude: 24.673,
    longitude: 89.418,
    elevation_m: 20.0,
    timezone: 'Asia/Dhaka',
    groundwaterZone: 'Level Barind / Karatoya (Stable)',
    is_demo: true,
    is_public: true,
    user_id: null,
    createdAt: '2026-10-01T00:00:00Z',
    boundary_geojson: null
  }
];

const DEFAULT_FIELDS = [
  {
    id: 'field-godagari-a',
    farm_id: 'farm-barind-01',
    name: 'Plot A-1: High Barind Clay Loam',
    area_m2: 12000,
    soil_type: 'silty_clay_loam',
    soil_type_label: 'Barind Silty Clay Loam (Saxton & Rawls Provisional)',
    theta_fc: 0.323,
    theta_wp: 0.165,
    root_depth_m: 0.50,
    current_crop: 'Mustard (BARI Sarisha-14)',
    previous_crops: ['T_AMAN_RICE'],
    target_rotations: ['rot-mustard-mung-aman', 'rot-legume-pulse-water-smart'],
    is_demo: true,
    is_public: true,
    boundary_geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [88.327, 24.467],
          [88.332, 24.467],
          [88.332, 24.472],
          [88.327, 24.472],
          [88.327, 24.467]
        ]
      ]
    }
  },
  {
    id: 'field-godagari-b',
    farm_id: 'farm-barind-01',
    name: 'Plot A-2: Lowland Pulse Relay',
    area_m2: 8000,
    soil_type: 'silty_clay_loam',
    soil_type_label: 'Barind Silty Clay Loam (পলি এঁটেল দোআঁশ)',
    theta_fc: 0.34,
    theta_wp: 0.16,
    root_depth_m: 0.35,
    current_crop: 'Lentil (BARI Masur-8)',
    previous_crops: ['T_AMAN_RICE'],
    target_rotations: ['rot-legume-pulse-water-smart'],
    is_demo: true,
    is_public: true,
    boundary_geojson: null
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
    target_rotations: ['rot-potato-mung-aman', 'rot-maize-mung-aman'],
    is_demo: true,
    is_public: true,
    boundary_geojson: null
  }
];

class StorageService {
  constructor(customStoreFile = null) {
    const envStoreFile = process.env.AGRISENSE_STORE_FILE ? path.resolve(process.env.AGRISENSE_STORE_FILE) : null;
    const resolvedStoreFile = customStoreFile || envStoreFile || STORE_FILE;
    this.storeFile = resolvedStoreFile;
    this.bakFile = `${resolvedStoreFile}.bak`;
    this.state = null;
    this.masterSeed = null;
    this.lastSaveError = null;
    this.lastRecoveryStatus = 'CLEAN_LOAD';
    this.init();
  }

  init() {
    const storeDir = path.dirname(this.storeFile);
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    // 1. Load Master Seed if available
    try {
      if (fs.existsSync(MASTER_SEED_FILE)) {
        const seedRaw = fs.readFileSync(MASTER_SEED_FILE, 'utf-8');
        this.masterSeed = JSON.parse(seedRaw);
      }
    } catch (e) {
      console.warn('Could not load master_database_seed.json:', e.message);
    }

    // 2. Load or initialize store.json with backup recovery
    let loaded = false;
    let primaryCorrupted = false;
    let backupCorrupted = false;
    if (fs.existsSync(this.storeFile)) {
      try {
        const raw = fs.readFileSync(this.storeFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state = parsed;
          loaded = true;
          this.lastRecoveryStatus = 'CLEAN_LOAD';
        }
      } catch (err) {
        primaryCorrupted = true;
        console.warn('[StorageService] store.json corrupted or unreadable. Checking backup:', err.message);
      }
    }

    // Recovery from verified backup if primary store is corrupted
    if (!loaded && fs.existsSync(this.bakFile)) {
      try {
        const bakRaw = fs.readFileSync(this.bakFile, 'utf-8');
        const parsedBak = JSON.parse(bakRaw);
        if (parsedBak && typeof parsedBak === 'object') {
          this.state = parsedBak;
          loaded = true;
          this.lastRecoveryStatus = 'RECOVERED_FROM_BACKUP';
          console.log('[StorageService] Successfully recovered database state from backup!');
          // Immediately restore recovered state to primary store
          this.save();
        }
      } catch (bakErr) {
        backupCorrupted = true;
        console.error('[StorageService] Backup also unreadable:', bakErr.message);
      }
    }

    // Clean initialization if neither exists or both are corrupted
    if (!loaded) {
      if (primaryCorrupted && backupCorrupted) {
        this.lastRecoveryStatus = 'RESET_FROM_SEED_BOTH_CORRUPT';
      } else if (primaryCorrupted) {
        this.lastRecoveryStatus = 'RESET_FROM_SEED_PRIMARY_CORRUPT_NO_BAK';
      } else {
        this.lastRecoveryStatus = 'INITIALIZED_FROM_SEED';
      }
      this.resetState();
    }

    // 3. Ensure all collection arrays exist
    if (!this.state.farms || this.state.farms.length === 0) {
      this.state.farms = JSON.parse(JSON.stringify(DEFAULT_FARMS));
    } else {
      // Ensure default demo farms carry is_demo and is_public flags
      for (const f of this.state.farms) {
        if (f.id.startsWith('farm-barind') || f.id.startsWith('farm-rangpur') || f.id.startsWith('farm-bogura')) {
          f.is_demo = true;
          f.is_public = true;
        }
      }
    }

    if (!this.state.fields || this.state.fields.length === 0) {
      this.state.fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS));
    } else {
      for (const f of this.state.fields) {
        if (f.id.startsWith('field-godagari') || f.id.startsWith('field-mithapukur')) {
          f.is_demo = true;
          f.is_public = true;
        }
      }
    }

    if (!this.state.users) this.state.users = [];
    if (!this.state.devices) this.state.devices = [];
    if (!this.state.readings) this.state.readings = [];
    if (!this.state.alerts) this.state.alerts = [];
    if (!this.state.nasa_weather_cache) this.state.nasa_weather_cache = {};
    if (!this.state.assistant_conversations) this.state.assistant_conversations = [];
    if (!this.state.assistant_feedback) this.state.assistant_feedback = [];

    // Seed initial demo device if empty
    const defaultDevKey = 'agrisense-device-key-2026';
    const defaultDevHash = crypto.createHash('sha256').update(defaultDevKey).digest('hex');

    if (this.state.devices.length === 0) {
      this.state.devices.push({
        id: 'esp32-node-raj-01',
        field_id: 'field-godagari-a',
        name: 'AgriSense ESP32 Field Probe #1',
        firmware_version: 'v2.4.1-esp32-freertos',
        is_active: true,
        api_key_hash: defaultDevHash,
        calibration_version: 'cal-fdr-2026.1',
        last_seen_at: new Date().toISOString()
      });
    } else {
      for (const dev of this.state.devices) {
        if (!dev.api_key_hash && dev.id === 'esp32-node-raj-01') {
          dev.api_key_hash = defaultDevHash;
        }
      }
    }

    // Seed initial reading if empty
    if (this.state.readings.length === 0) {
      this.state.readings.push({
        id: 1,
        device_id: 'esp32-node-raj-01',
        field_id: 'field-godagari-a',
        event_id: 'evt-seed-1001-rajshahi',
        observed_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        received_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        soil_moisture_vwc: 0.224,
        soil_temp_c: 26.8,
        air_temp_c: 29.5,
        relative_humidity_pct: 74.2,
        soil_ph: 6.4,
        quality_status: 'valid',
        calibration_version: 'cal-fdr-2026.1',
        calibration_status: 'UNCALIBRATED',
        is_simulated: true,
        raw_payload: { adc_val: 1845, sensor_type: 'Capacitive_FDR_v2' }
      });
    }

    // Seed initial alerts if empty
    if (this.state.alerts.length === 0) {
      this.state.alerts.push({
        id: 'alt-demo-001',
        farm_id: 'farm-barind-01',
        field_id: 'field-godagari-a',
        alert_type: 'water_stress',
        severity: 'warning',
        title: 'Soil Moisture Depletion Approaching RAW Limit',
        title_bn: 'মাটির আর্দ্রতা ঘাটতি সতর্কীকরণ সীমা স্পর্শ করছে',
        message: 'Plot A-1 root zone depletion is at 62.7% of 79.0 mm TAW (49.5 mm > 39.5 mm RAW). Recommended light irrigation scheduled within 48 hours.',
        trigger_source: 'FAO56_ENGINE',
        is_acknowledged: false,
        is_resolved: false,
        created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
      });
    }

    this.save();
  }

  resetState() {
    const defaultDevKey = 'agrisense-device-key-2026';
    const defaultDevHash = crypto.createHash('sha256').update(defaultDevKey).digest('hex');
    this.state = {
      farms: JSON.parse(JSON.stringify(DEFAULT_FARMS)),
      fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
      users: [],
      devices: [
        {
          id: 'esp32-node-raj-01',
          field_id: 'field-godagari-a',
          name: 'AgriSense ESP32 Field Probe #1',
          firmware_version: 'v2.4.1-esp32-freertos',
          is_active: true,
          api_key_hash: defaultDevHash,
          calibration_version: 'cal-fdr-2026.1',
          last_seen_at: new Date().toISOString()
        }
      ],
      readings: [],
      alerts: [],
      nasa_weather_cache: {},
      assistant_conversations: [],
      assistant_feedback: []
    };
    this.save();
  }

  save() {
    try {
      if (!this.state || typeof this.state !== 'object') {
        this.lastSaveError = 'Invalid state object';
        console.error('[StorageService] Attempted to save invalid state object, aborting save.');
        return false;
      }
      const targetFile = this.storeFile || STORE_FILE;
      const targetBak = this.bakFile || BAK_FILE;
      const dataDir = path.dirname(targetFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const jsonStr = JSON.stringify(this.state, null, 2);
      // Verify valid JSON parse before disk operations
      JSON.parse(jsonStr);

      // Write to unique temporary file
      const tempSuffix = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      const tempFile = `${targetFile}.tmp.${tempSuffix}`;
      fs.writeFileSync(tempFile, jsonStr, 'utf-8');

      // Verify temp file exists and has content
      const stat = fs.statSync(tempFile);
      if (stat.size === 0) {
        throw new Error('Temp file written with 0 bytes.');
      }

      // Maintain backup before replacing ONLY if current targetFile is valid JSON, via atomic rename
      if (fs.existsSync(targetFile)) {
        try {
          const current = fs.readFileSync(targetFile, 'utf-8');
          JSON.parse(current);
          const tempBakPre = `${targetBak}.tmp.pre.${tempSuffix}`;
          fs.writeFileSync(tempBakPre, current, 'utf-8');
          fs.renameSync(tempBakPre, targetBak);
        } catch (bakPreErr) {
          // Do not overwrite valid backup with invalid targetFile; clean up tempBakPre if present
          try {
            const tempBakPre = `${targetBak}.tmp.pre.${tempSuffix}`;
            if (fs.existsSync(tempBakPre)) fs.unlinkSync(tempBakPre);
          } catch (_) {}
        }
      }

      // Strictly atomic rename with bounded exponential/linear retry backoff (NEVER non-atomic copyFileSync)
      let replaced = false;
      let lastRenameErr = null;
      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts && !replaced; attempt++) {
        try {
          fs.renameSync(tempFile, targetFile);
          replaced = true;
          this.lastSaveError = null;
        } catch (renameErr) {
          lastRenameErr = renameErr;
          if (attempt < maxAttempts - 1) {
            const waitMs = Math.min(80, 10 * (attempt + 1));
            const waitUntil = Date.now() + waitMs;
            while (Date.now() < waitUntil) {}
          } else {
            this.lastSaveError = renameErr.message || String(renameErr);
            console.warn(
              '[StorageService] Atomic rename failed after',
              maxAttempts,
              'attempts; preserving existing store.json and .bak without non-atomic overwrite:',
              this.lastSaveError
            );
          }
        }
      }

      // Clean up temporary file if rename did not consume it
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }

      // Atomically update backup to latest verified atomic write
      if (replaced) {
        const tempBakPost = `${targetBak}.tmp.post.${tempSuffix}`;
        try {
          fs.writeFileSync(tempBakPost, jsonStr, 'utf-8');
          fs.renameSync(tempBakPost, targetBak);
        } catch (_) {
          if (fs.existsSync(tempBakPost)) {
            try { fs.unlinkSync(tempBakPost); } catch (__) {}
          }
        }
      }

      return replaced;
    } catch (err) {
      this.lastSaveError = err.message || String(err);
      console.error('[StorageService] Atomic persistence save failed:', err.message);
      return false;
    }
  }

  // --- Users & Auth ---
  getUsers() {
    return this.state.users || [];
  }

  getUserByEmail(email) {
    if (!email) return null;
    return (this.state.users || []).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getUserById(id) {
    return (this.state.users || []).find((u) => u.id === id) || null;
  }

  saveUser(user) {
    if (!this.state.users) this.state.users = [];
    const idx = this.state.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      this.state.users[idx] = { ...this.state.users[idx], ...user, updated_at: new Date().toISOString() };
    } else {
      this.state.users.push(user);
    }
    this.save();
    return user;
  }

  // --- Farms (Multi-Tenant Scoped) ---
  getFarms(userContext = null) {
    const list = this.state.farms || [];
    if (!userContext) {
      // Unauthenticated: return only public demonstration farms
      return list.filter((f) => f.is_public === true || f.is_demo === true);
    }
    if (userContext.role === 'admin') {
      return list;
    }
    // Farmer / Standard User: return public demo farms + owned farms
    return list.filter((f) => f.is_public === true || f.is_demo === true || f.user_id === userContext.id);
  }

  getFarmById(id, userContext = null) {
    const farm = (this.state.farms || []).find((f) => f.id === id);
    if (!farm) return null;

    if (farm.is_public === true || farm.is_demo === true) {
      return farm;
    }
    if (!userContext) {
      return null; // Private farm hidden from unauthenticated viewers
    }
    if (userContext.role === 'admin' || farm.user_id === userContext.id) {
      return farm;
    }
    return null; // Cross-tenant private farm access denied
  }

  createFarm(farm, userContext = null) {
    if (!this.state.farms) this.state.farms = [];
    const newFarm = {
      id: farm.id || `farm-${Date.now()}`,
      createdAt: new Date().toISOString(),
      user_id: userContext ? userContext.id : (farm.user_id || null),
      is_demo: false,
      is_public: false,
      ...farm
    };
    this.state.farms.push(newFarm);
    this.save();
    return newFarm;
  }

  updateFarm(id, updates, userContext = null) {
    const farm = (this.state.farms || []).find((f) => f.id === id);
    if (!farm) {
      return { error: 'NOT_FOUND', statusCode: 404, message: 'Farm not found.' };
    }

    if (farm.is_demo === true) {
      return {
        error: 'DEMO_READ_ONLY',
        statusCode: 403,
        message: 'Demonstration farms are immutable baseline records and cannot be modified.'
      };
    }

    if (userContext && userContext.role !== 'admin' && farm.user_id !== userContext.id) {
      return {
        error: 'FORBIDDEN',
        statusCode: 403,
        message: 'Access denied: You do not have permission to modify this farm.'
      };
    }

    Object.assign(farm, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return { success: true, farm };
  }

  // --- Fields (Multi-Tenant Scoped) ---
  getFields(userContext = null) {
    const list = this.state.fields || [];
    if (!userContext) {
      return list.filter((f) => f.is_public === true || f.is_demo === true);
    }
    if (userContext.role === 'admin') {
      return list;
    }
    const allowedFarms = new Set(this.getFarms(userContext).map((f) => f.id));
    return list.filter((f) => allowedFarms.has(f.farm_id));
  }

  getFieldsByFarm(farmId, userContext = null) {
    const farm = this.getFarmById(farmId, userContext);
    if (!farm) return [];
    return (this.state.fields || []).filter((f) => f.farm_id === farmId);
  }

  getFieldById(fieldId, userContext = null) {
    const field = (this.state.fields || []).find((f) => f.id === fieldId);
    if (!field) return null;

    if (field.is_public === true || field.is_demo === true) {
      return field;
    }
    const farm = this.getFarmById(field.farm_id, userContext);
    if (!farm) return null; // Field belongs to inaccessible farm
    return field;
  }

  createField(field, userContext = null) {
    if (!this.state.fields) this.state.fields = [];
    const farm = (this.state.farms || []).find((f) => f.id === field.farm_id);
    if (!farm) {
      return { error: 'FARM_NOT_FOUND', statusCode: 404, message: 'Associated farm does not exist.' };
    }

    if (farm.is_demo === true) {
      return {
        error: 'DEMO_READ_ONLY',
        statusCode: 403,
        message: 'Cannot create fields on public demonstration farms.'
      };
    }

    if (userContext && userContext.role !== 'admin' && farm.user_id !== userContext.id) {
      return {
        error: 'FORBIDDEN',
        statusCode: 403,
        message: 'Access denied: You do not own the parent farm for this field.'
      };
    }

    const newField = {
      id: field.id || `field-${Date.now()}`,
      created_at: new Date().toISOString(),
      is_demo: false,
      is_public: false,
      ...field
    };
    this.state.fields.push(newField);
    this.save();
    return { success: true, field: newField };
  }

  updateField(id, updates, userContext = null) {
    const field = (this.state.fields || []).find((f) => f.id === id);
    if (!field) {
      return { error: 'NOT_FOUND', statusCode: 404, message: 'Field not found.' };
    }

    if (field.is_demo === true) {
      return {
        error: 'DEMO_READ_ONLY',
        statusCode: 403,
        message: 'Demonstration fields are immutable baseline records and cannot be modified.'
      };
    }

    const farm = (this.state.farms || []).find((f) => f.id === field.farm_id);
    if (farm && userContext && userContext.role !== 'admin' && farm.user_id !== userContext.id) {
      return {
        error: 'FORBIDDEN',
        statusCode: 403,
        message: 'Access denied: You do not have permission to modify fields on this farm.'
      };
    }

    Object.assign(field, updates, { updated_at: new Date().toISOString() });
    this.save();
    return { success: true, field };
  }

  // --- Devices & Telemetry ---
  getDevices(userContext = null) {
    return this.state.devices || [];
  }

  getDeviceById(id) {
    return (this.state.devices || []).find((d) => d.id === id) || null;
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
    const record = {
      id: newId,
      received_at: new Date().toISOString(),
      is_simulated: true, // Always enforce honest simulation flag
      calibration_status: 'UNCALIBRATED',
      ...reading
    };
    this.state.readings.push(record);
    this.save();
    return record;
  }

  // --- Weather ---
  getWeatherRecords(limit = 30) {
    if (this.masterSeed?.weather?.godagari_daily_records) {
      const records = this.masterSeed.weather.godagari_daily_records;
      return records.slice(-limit);
    }
    return [];
  }

  getWeatherSummary() {
    return this.masterSeed?.weather?.summary || null;
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

  // --- Member 1 Satellite Metadata ---
  getSatelliteMetadata() {
    return this.masterSeed?.satellite || {
      verified_performance: {
        model_name: 'RandomForest_21Feat_Deep',
        feature_count: 21,
        block_c_holdout_overall_accuracy: 85.77,
        block_c_macro_f1: 0.8257,
        block_c_balanced_accuracy: 84.02,
        block_c_pure_interior_accuracy: 90.64,
        block_c_boundary_mixed_accuracy: 75.92
      }
    };
  }

  // --- Member 6 Diseases & Research Papers ---
  getDiseases(crop = null) {
    const list = this.masterSeed?.diseases || [];
    if (!crop) return list;
    return list.filter((d) => d.crop.toLowerCase().includes(crop.toLowerCase()));
  }

  getDiseaseById(id) {
    const list = this.masterSeed?.diseases || [];
    return list.find((d) => d.disease_id === id) || null;
  }

  getResearchPapers(limit = 60) {
    const papers = this.masterSeed?.research_papers || [];
    return papers.slice(0, limit);
  }

  // --- Member 4 Agronomy ---
  getAgronomySuitability() {
    return this.masterSeed?.agronomy?.godagari_crop_suitability || [];
  }

  getCropCalendar() {
    return this.masterSeed?.agronomy?.godagari_crop_calendar || [];
  }

  getRotationRecommendations() {
    return this.masterSeed?.agronomy?.godagari_rotation_recommendations || [];
  }

  // --- Groundwater ---
  getGroundwater(farmId) {
    if (this.masterSeed?.groundwater) {
      return this.masterSeed.groundwater.filter((g) => !farmId || g.farm_id === farmId);
    }
    return [];
  }

  // --- Alerts Engine (Multi-Tenant Scoped) ---
  getAlerts(farmId = null, activeOnly = false, userContext = null) {
    let list = this.state.alerts || [];
    if (farmId) {
      const farm = this.getFarmById(farmId, userContext);
      if (!farm) return [];
      list = list.filter((a) => a.farm_id === farmId);
    } else if (!userContext || userContext.role !== 'admin') {
      const allowedFarms = new Set(this.getFarms(userContext).map((f) => f.id));
      list = list.filter((a) => allowedFarms.has(a.farm_id));
    }
    if (activeOnly) list = list.filter((a) => !a.is_resolved);
    return list.slice().reverse();
  }

  createAlert(alertData, userContext = null) {
    if (!this.state.alerts) this.state.alerts = [];
    const farm = this.getFarmById(alertData.farm_id, userContext);
    if (!farm) {
      return { error: 'FARM_NOT_FOUND', statusCode: 404, message: 'Associated farm does not exist or access denied.' };
    }

    const alert = {
      id: alertData.id || `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
      is_acknowledged: false,
      is_resolved: false,
      ...alertData
    };
    this.state.alerts.push(alert);
    this.save();
    return { success: true, alert };
  }

  acknowledgeAlert(id, userContext = null) {
    const alert = (this.state.alerts || []).find((a) => a.id === id);
    if (!alert) return { error: 'NOT_FOUND', statusCode: 404, message: 'Alert not found.' };

    const farm = this.getFarmById(alert.farm_id, userContext);
    if (!farm) {
      return { error: 'FORBIDDEN', statusCode: 403, message: 'Access denied: You do not have permission to acknowledge alerts for this farm.' };
    }

    alert.is_acknowledged = true;
    alert.acknowledged_at = new Date().toISOString();
    this.save();
    return { success: true, alert };
  }

  resolveAlert(id, userContext = null) {
    const alert = (this.state.alerts || []).find((a) => a.id === id);
    if (!alert) return { error: 'NOT_FOUND', statusCode: 404, message: 'Alert not found.' };

    const farm = this.getFarmById(alert.farm_id, userContext);
    if (!farm) {
      return { error: 'FORBIDDEN', statusCode: 403, message: 'Access denied: You do not have permission to resolve alerts for this farm.' };
    }

    alert.is_resolved = true;
    alert.resolved_at = new Date().toISOString();
    this.save();
    return { success: true, alert };
  }

  // --- Assistant Conversations & Feedback (Multi-Tenant Scoped) ---
  getAssistantConversations(userId = null) {
    if (!userId) {
      return [];
    }
    const list = this.state.assistant_conversations || [];
    return list.filter((c) => c.user_id === userId);
  }

  getAssistantConversationRaw(id) {
    if (!id) return null;
    const list = this.state.assistant_conversations || [];
    return list.find((c) => c.id === id) || null;
  }

  getAssistantConversationById(id, userId = null) {
    if (!id || !userId) return null;
    const list = this.state.assistant_conversations || [];
    const conv = list.find((c) => c.id === id);
    if (!conv) return null;
    if (conv.user_id !== userId) {
      return null;
    }
    return conv;
  }

  saveAssistantConversation(conv) {
    if (!conv || !conv.user_id) {
      return null;
    }
    if (!this.state.assistant_conversations) this.state.assistant_conversations = [];
    const idx = this.state.assistant_conversations.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      this.state.assistant_conversations[idx] = {
        ...this.state.assistant_conversations[idx],
        ...conv,
        updated_at: new Date().toISOString()
      };
    } else {
      this.state.assistant_conversations.push({
        ...conv,
        created_at: conv.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.save();
    return conv;
  }

  deleteAssistantConversation(id, userId = null) {
    if (!id || !userId || !this.state.assistant_conversations) return false;
    const idx = this.state.assistant_conversations.findIndex((c) => c.id === id);
    if (idx < 0) return false;
    if (this.state.assistant_conversations[idx].user_id !== userId) {
      return false;
    }
    this.state.assistant_conversations.splice(idx, 1);
    this.save();
    return true;
  }

  saveAssistantFeedback(feedback) {
    if (!this.state.assistant_feedback) this.state.assistant_feedback = [];
    const record = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      ...feedback
    };
    this.state.assistant_feedback.push(record);
    this.save();
    return record;
  }
}

const storage = new StorageService();
module.exports = storage;
module.exports.StorageService = StorageService;
