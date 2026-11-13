/**
 * AgriSense Fusion - Master Storage Service (Native SQLite + Atomic JSON Mirror)
 * Provides ACID relational SQL persistence via Node.js built-in node:sqlite (DatabaseSync WAL)
 * synchronized with atomic JSON backup recovery (.json + .bak), populated with verified
 * scientific datasets from Members 1-6. Enforces multi-tenant isolation & demo immutability.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const BAK_FILE = path.join(DATA_DIR, 'store.json.bak');
const DEFAULT_SQLITE_FILE = path.join(DATA_DIR, 'agrisense.sqlite');
const MASTER_SEED_FILE = path.join(DATA_DIR, 'master_database_seed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Track open SQLite connections for clean shutdown without locking temporary test directories
const registeredDbHandles = [];
let exitHookRegistered = false;

function registerExitCleanup() {
  if (exitHookRegistered) return;
  exitHookRegistered = true;
  process.on('exit', () => {
    for (const handle of registeredDbHandles) {
      try {
        if (handle.db && typeof handle.db.close === 'function') {
          handle.db.close();
        }
      } catch (_) {}
      if (handle.isTemp && handle.sqliteFile) {
        for (const suffix of ['', '-wal', '-shm']) {
          try {
            const p = `${handle.sqliteFile}${suffix}`;
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch (_) {}
        }
      }
    }
  });
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

function parsePayloadRow(row) {
  if (!row || !row.payload_json) return null;
  try {
    return JSON.parse(row.payload_json);
  } catch (_) {
    return null;
  }
}

class StorageService {
  constructor(customStoreFile = null) {
    const envStoreFile = process.env.AGRISENSE_STORE_FILE ? path.resolve(process.env.AGRISENSE_STORE_FILE) : null;
    const resolvedStoreFile = path.resolve(customStoreFile || envStoreFile || STORE_FILE);
    this.storeFile = resolvedStoreFile;
    this.bakFile = `${resolvedStoreFile}.bak`;
    this.isDefaultStore = resolvedStoreFile === path.resolve(STORE_FILE);

    if (process.env.AGRISENSE_SQLITE_FILE && this.isDefaultStore) {
      this.sqliteFile = path.resolve(process.env.AGRISENSE_SQLITE_FILE);
      this.isTempSqlite = false;
    } else if (this.isDefaultStore) {
      this.sqliteFile = DEFAULT_SQLITE_FILE;
      this.isTempSqlite = false;
    } else {
      const storeHash = crypto.createHash('sha1').update(resolvedStoreFile).digest('hex').slice(0, 12);
      this.sqliteFile = path.join(os.tmpdir(), `agrisense-store-${storeHash}.sqlite`);
      this.isTempSqlite = true;
    }

    this.db = null;
    this.state = null;
    this.masterSeed = null;
    this.lastSaveError = null;
    this.lastRecoveryStatus = 'CLEAN_LOAD';
    this.init();
  }

  initSqliteSchema() {
    registerExitCleanup();
    const dbDir = path.dirname(this.sqliteFile);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new DatabaseSync(this.sqliteFile);
    registeredDbHandles.push({ db: this.db, sqliteFile: this.sqliteFile, isTemp: this.isTempSqlite });

    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT,
        role TEXT NOT NULL DEFAULT 'farmer',
        created_at TEXT,
        updated_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

      CREATE TABLE IF NOT EXISTS farms (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        district TEXT,
        upazila TEXT,
        aez_code TEXT,
        latitude REAL,
        longitude REAL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_farms_user ON farms(user_id);

      CREATE TABLE IF NOT EXISTS fields (
        id TEXT PRIMARY KEY,
        farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        area_m2 REAL,
        soil_type TEXT,
        theta_fc REAL,
        theta_wp REAL,
        root_depth_m REAL,
        current_crop TEXT,
        is_demo INTEGER NOT NULL DEFAULT 0,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id);

      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        field_id TEXT,
        name TEXT NOT NULL,
        firmware_version TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        calibration_version TEXT,
        last_seen_at TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY,
        device_id TEXT NOT NULL,
        field_id TEXT,
        event_id TEXT,
        observed_at TEXT,
        received_at TEXT,
        soil_moisture_vwc REAL,
        soil_temp_c REAL,
        air_temp_c REAL,
        relative_humidity_pct REAL,
        soil_ph REAL,
        quality_status TEXT,
        calibration_status TEXT DEFAULT 'UNCALIBRATED',
        is_simulated INTEGER NOT NULL DEFAULT 1,
        payload_json TEXT NOT NULL,
        UNIQUE(device_id, event_id)
      );
      CREATE INDEX IF NOT EXISTS idx_readings_field ON sensor_readings(field_id, id DESC);
      CREATE INDEX IF NOT EXISTS idx_readings_event ON sensor_readings(device_id, event_id);

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        farm_id TEXT NOT NULL,
        field_id TEXT,
        alert_type TEXT,
        severity TEXT,
        title TEXT,
        is_acknowledged INTEGER NOT NULL DEFAULT 0,
        is_resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alerts_farm ON alerts(farm_id, is_resolved);

      CREATE TABLE IF NOT EXISTS assistant_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        created_at TEXT,
        updated_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conv_user ON assistant_conversations(user_id);

      CREATE TABLE IF NOT EXISTS assistant_feedback (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        message_id TEXT,
        rating INTEGER,
        created_at TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nasa_weather_cache (
        cache_key TEXT PRIMARY KEY,
        cached_at TEXT,
        payload_json TEXT NOT NULL
      );
    `);
  }

  syncStateToSqlite() {
    if (!this.db || !this.state || typeof this.state !== 'object') return false;

    const runTx = () => {
      this.db.exec('BEGIN IMMEDIATE;');
      try {
        this.db.exec(`
          DELETE FROM assistant_feedback;
          DELETE FROM assistant_conversations;
          DELETE FROM alerts;
          DELETE FROM sensor_readings;
          DELETE FROM devices;
          DELETE FROM fields;
          DELETE FROM farms;
          DELETE FROM users;
          DELETE FROM nasa_weather_cache;
        `);

        const insUser = this.db.prepare(
          'INSERT INTO users (id, email, full_name, role, created_at, updated_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        for (const u of (this.state.users || [])) {
          insUser.run(
            String(u.id),
            String(u.email || ''),
            u.full_name || null,
            String(u.role || 'farmer'),
            u.created_at || null,
            u.updated_at || null,
            JSON.stringify(u)
          );
        }

        const insFarm = this.db.prepare(
          'INSERT INTO farms (id, user_id, name, district, upazila, aez_code, latitude, longitude, is_demo, is_public, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const f of (this.state.farms || [])) {
          insFarm.run(
            String(f.id),
            f.user_id || null,
            String(f.name || ''),
            f.district || null,
            f.upazila || null,
            f.aez_code || null,
            f.latitude ?? null,
            f.longitude ?? null,
            f.is_demo ? 1 : 0,
            f.is_public ? 1 : 0,
            f.createdAt || f.created_at || null,
            JSON.stringify(f)
          );
        }

        const farmIdSet = new Set((this.state.farms || []).map((f) => String(f.id)));
        const insField = this.db.prepare(
          'INSERT INTO fields (id, farm_id, name, area_m2, soil_type, theta_fc, theta_wp, root_depth_m, current_crop, is_demo, is_public, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const fl of (this.state.fields || [])) {
          if (!farmIdSet.has(String(fl.farm_id))) continue;
          insField.run(
            String(fl.id),
            String(fl.farm_id),
            String(fl.name || ''),
            fl.area_m2 ?? null,
            fl.soil_type || null,
            fl.theta_fc ?? null,
            fl.theta_wp ?? null,
            fl.root_depth_m ?? null,
            fl.current_crop || null,
            fl.is_demo ? 1 : 0,
            fl.is_public ? 1 : 0,
            fl.created_at || fl.createdAt || null,
            JSON.stringify(fl)
          );
        }

        const insDevice = this.db.prepare(
          'INSERT INTO devices (id, field_id, name, firmware_version, is_active, calibration_version, last_seen_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const d of (this.state.devices || [])) {
          insDevice.run(
            String(d.id),
            d.field_id || null,
            String(d.name || d.id),
            d.firmware_version || null,
            d.is_active === false ? 0 : 1,
            d.calibration_version || null,
            d.last_seen_at || null,
            JSON.stringify(d)
          );
        }

        const insReading = this.db.prepare(
          'INSERT OR REPLACE INTO sensor_readings (id, device_id, field_id, event_id, observed_at, received_at, soil_moisture_vwc, soil_temp_c, air_temp_c, relative_humidity_pct, soil_ph, quality_status, calibration_status, is_simulated, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const r of (this.state.readings || [])) {
          insReading.run(
            Number.isFinite(Number(r.id)) ? Number(r.id) : null,
            String(r.device_id || 'esp32-node-raj-01'),
            r.field_id || null,
            r.event_id || null,
            r.observed_at || null,
            r.received_at || null,
            r.soil_moisture_vwc ?? null,
            r.soil_temp_c ?? null,
            r.air_temp_c ?? null,
            r.relative_humidity_pct ?? null,
            r.soil_ph ?? null,
            r.quality_status || 'valid',
            r.calibration_status || 'UNCALIBRATED',
            r.is_simulated === false ? 0 : 1,
            JSON.stringify(r)
          );
        }

        const insAlert = this.db.prepare(
          'INSERT INTO alerts (id, farm_id, field_id, alert_type, severity, title, is_acknowledged, is_resolved, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const a of (this.state.alerts || [])) {
          insAlert.run(
            String(a.id),
            String(a.farm_id || ''),
            a.field_id || null,
            a.alert_type || null,
            a.severity || 'warning',
            a.title || null,
            a.is_acknowledged ? 1 : 0,
            a.is_resolved ? 1 : 0,
            a.created_at || null,
            JSON.stringify(a)
          );
        }

        const insConv = this.db.prepare(
          'INSERT INTO assistant_conversations (id, user_id, title, created_at, updated_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)'
        );
        for (const c of (this.state.assistant_conversations || [])) {
          insConv.run(
            String(c.id),
            String(c.user_id || ''),
            c.title || null,
            c.created_at || null,
            c.updated_at || null,
            JSON.stringify(c)
          );
        }

        const insFb = this.db.prepare(
          'INSERT INTO assistant_feedback (id, conversation_id, message_id, rating, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)'
        );
        for (const fb of (this.state.assistant_feedback || [])) {
          insFb.run(
            String(fb.id),
            fb.conversation_id || null,
            fb.message_id || null,
            fb.rating ?? null,
            fb.created_at || null,
            JSON.stringify(fb)
          );
        }

        const insCache = this.db.prepare(
          'INSERT INTO nasa_weather_cache (cache_key, cached_at, payload_json) VALUES (?, ?, ?)'
        );
        for (const [k, entry] of Object.entries(this.state.nasa_weather_cache || {})) {
          insCache.run(
            String(k),
            entry?.cachedAt || null,
            JSON.stringify(entry)
          );
        }

        this.db.exec('COMMIT;');
        return true;
      } catch (err) {
        try { this.db.exec('ROLLBACK;'); } catch (_) {}
        throw err;
      }
    };

    try {
      return runTx();
    } catch (err) {
      console.warn('[StorageService] SQLite sync error:', err.message);
      return false;
    }
  }

  /**
   * Executes a read-only or parameterized SQL query directly on the SQLite database.
   */
  querySqlite(sql, params = []) {
    if (!this.db) throw new Error('SQLite database not initialized.');
    const stmt = this.db.prepare(sql);
    if (/^\s*(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(sql)) {
      return stmt.all(...params);
    }
    return stmt.run(...params);
  }

  /**
   * Returns relational SQLite table counts and journal diagnostics.
   */
  getSqliteDiagnostics() {
    if (!this.db) return null;
    const journalMode = this.db.prepare('PRAGMA journal_mode').get();
    const counts = {
      users: this.db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
      farms: this.db.prepare('SELECT COUNT(*) AS c FROM farms').get().c,
      fields: this.db.prepare('SELECT COUNT(*) AS c FROM fields').get().c,
      devices: this.db.prepare('SELECT COUNT(*) AS c FROM devices').get().c,
      sensor_readings: this.db.prepare('SELECT COUNT(*) AS c FROM sensor_readings').get().c,
      alerts: this.db.prepare('SELECT COUNT(*) AS c FROM alerts').get().c,
      assistant_conversations: this.db.prepare('SELECT COUNT(*) AS c FROM assistant_conversations').get().c,
      assistant_feedback: this.db.prepare('SELECT COUNT(*) AS c FROM assistant_feedback').get().c,
      nasa_weather_cache: this.db.prepare('SELECT COUNT(*) AS c FROM nasa_weather_cache').get().c
    };
    return {
      engine: 'node:sqlite (DatabaseSync)',
      journal_mode: journalMode?.journal_mode || 'wal',
      sqlite_file: this.isTempSqlite ? '[ephemeral-test-sqlite]' : this.sqliteFile,
      table_counts: counts
    };
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

    // 4. Initialize SQLite relational schema & synchronize seed/recovered state
    this.initSqliteSchema();
    this.syncStateToSqlite();
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
          try {
            const tempBakPre = `${targetBak}.tmp.pre.${tempSuffix}`;
            if (fs.existsSync(tempBakPre)) fs.unlinkSync(tempBakPre);
          } catch (_) {}
        }
      }

      // Strictly atomic rename with bounded retry backoff (NEVER non-atomic copyFileSync)
      let replaced = false;
      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts && !replaced; attempt++) {
        try {
          fs.renameSync(tempFile, targetFile);
          replaced = true;
          this.lastSaveError = null;
        } catch (renameErr) {
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

      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }

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
        // Synchronize verified atomic state into relational SQLite engine
        if (this.db) {
          this.syncStateToSqlite();
        }
      }

      return replaced;
    } catch (err) {
      this.lastSaveError = err.message || String(err);
      console.error('[StorageService] Atomic persistence save failed:', err.message);
      return false;
    }
  }

  // --- Users & Auth (SQLite-Backed) ---
  getUsers() {
    if (this.db) {
      const rows = this.db.prepare('SELECT payload_json FROM users ORDER BY rowid ASC').all();
      return rows.map(parsePayloadRow).filter(Boolean);
    }
    return this.state.users || [];
  }

  getUserByEmail(email) {
    if (!email) return null;
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1').get(email);
      return parsePayloadRow(row);
    }
    return (this.state.users || []).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getUserById(id) {
    if (!id) return null;
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM users WHERE id = ? LIMIT 1').get(id);
      return parsePayloadRow(row);
    }
    return (this.state.users || []).find((u) => u.id === id) || null;
  }

  saveUser(user) {
    if (!this.state.users) this.state.users = [];
    const idx = this.state.users.findIndex((u) => u.id === user.id);
    const saved = idx >= 0
      ? { ...this.state.users[idx], ...user, updated_at: new Date().toISOString() }
      : { ...user };
    if (idx >= 0) {
      this.state.users[idx] = saved;
    } else {
      this.state.users.push(saved);
    }
    if (this.db) {
      this.db.prepare(`
        INSERT INTO users (id, email, full_name, role, created_at, updated_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          full_name = excluded.full_name,
          role = excluded.role,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
      `).run(
        String(saved.id),
        String(saved.email || ''),
        saved.full_name || null,
        String(saved.role || 'farmer'),
        saved.created_at || null,
        saved.updated_at || null,
        JSON.stringify(saved)
      );
    }
    this.save();
    return saved;
  }

  // --- Farms (Multi-Tenant Scoped, SQLite-Backed) ---
  getFarms(userContext = null) {
    if (this.db) {
      let rows;
      if (!userContext) {
        rows = this.db.prepare('SELECT payload_json FROM farms WHERE is_public = 1 OR is_demo = 1 ORDER BY rowid ASC').all();
      } else if (userContext.role === 'admin') {
        rows = this.db.prepare('SELECT payload_json FROM farms ORDER BY rowid ASC').all();
      } else {
        rows = this.db.prepare('SELECT payload_json FROM farms WHERE is_public = 1 OR is_demo = 1 OR user_id = ? ORDER BY rowid ASC').all(userContext.id);
      }
      return rows.map(parsePayloadRow).filter(Boolean);
    }
    const list = this.state.farms || [];
    if (!userContext) {
      return list.filter((f) => f.is_public === true || f.is_demo === true);
    }
    if (userContext.role === 'admin') {
      return list;
    }
    return list.filter((f) => f.is_public === true || f.is_demo === true || f.user_id === userContext.id);
  }

  getFarmById(id, userContext = null) {
    const farm = this.db
      ? parsePayloadRow(this.db.prepare('SELECT payload_json FROM farms WHERE id = ? LIMIT 1').get(id))
      : (this.state.farms || []).find((f) => f.id === id);
    if (!farm) return null;

    if (farm.is_public === true || farm.is_demo === true) {
      return farm;
    }
    if (!userContext) {
      return null;
    }
    if (userContext.role === 'admin' || farm.user_id === userContext.id) {
      return farm;
    }
    return null;
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
    if (this.db) {
      this.db.prepare(`
        INSERT INTO farms (id, user_id, name, district, upazila, aez_code, latitude, longitude, is_demo, is_public, created_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(newFarm.id),
        newFarm.user_id || null,
        String(newFarm.name || ''),
        newFarm.district || null,
        newFarm.upazila || null,
        newFarm.aez_code || null,
        newFarm.latitude ?? null,
        newFarm.longitude ?? null,
        newFarm.is_demo ? 1 : 0,
        newFarm.is_public ? 1 : 0,
        newFarm.createdAt,
        JSON.stringify(newFarm)
      );
    }
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
    if (this.db) {
      this.db.prepare(`
        UPDATE farms
        SET name = ?, district = ?, upazila = ?, aez_code = ?, latitude = ?, longitude = ?, payload_json = ?
        WHERE id = ?
      `).run(
        String(farm.name || ''),
        farm.district || null,
        farm.upazila || null,
        farm.aez_code || null,
        farm.latitude ?? null,
        farm.longitude ?? null,
        JSON.stringify(farm),
        String(farm.id)
      );
    }
    this.save();
    return { success: true, farm };
  }

  // --- Fields (Multi-Tenant Scoped, SQLite-Backed) ---
  getFields(userContext = null) {
    if (this.db) {
      let rows;
      if (!userContext) {
        rows = this.db.prepare('SELECT payload_json FROM fields WHERE is_public = 1 OR is_demo = 1 ORDER BY rowid ASC').all();
      } else if (userContext.role === 'admin') {
        rows = this.db.prepare('SELECT payload_json FROM fields ORDER BY rowid ASC').all();
      } else {
        rows = this.db.prepare(`
          SELECT f.payload_json
          FROM fields f
          JOIN farms fm ON f.farm_id = fm.id
          WHERE fm.is_public = 1 OR fm.is_demo = 1 OR fm.user_id = ?
          ORDER BY f.rowid ASC
        `).all(userContext.id);
      }
      return rows.map(parsePayloadRow).filter(Boolean);
    }
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
    if (this.db) {
      const rows = this.db.prepare('SELECT payload_json FROM fields WHERE farm_id = ? ORDER BY rowid ASC').all(farmId);
      return rows.map(parsePayloadRow).filter(Boolean);
    }
    return (this.state.fields || []).filter((f) => f.farm_id === farmId);
  }

  getFieldById(fieldId, userContext = null) {
    const field = this.db
      ? parsePayloadRow(this.db.prepare('SELECT payload_json FROM fields WHERE id = ? LIMIT 1').get(fieldId))
      : (this.state.fields || []).find((f) => f.id === fieldId);
    if (!field) return null;

    if (field.is_public === true || field.is_demo === true) {
      return field;
    }
    const farm = this.getFarmById(field.farm_id, userContext);
    if (!farm) return null;
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
    if (this.db) {
      this.db.prepare(`
        INSERT INTO fields (id, farm_id, name, area_m2, soil_type, theta_fc, theta_wp, root_depth_m, current_crop, is_demo, is_public, created_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(newField.id),
        String(newField.farm_id),
        String(newField.name || ''),
        newField.area_m2 ?? null,
        newField.soil_type || null,
        newField.theta_fc ?? null,
        newField.theta_wp ?? null,
        newField.root_depth_m ?? null,
        newField.current_crop || null,
        newField.is_demo ? 1 : 0,
        newField.is_public ? 1 : 0,
        newField.created_at,
        JSON.stringify(newField)
      );
    }
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
    if (this.db) {
      this.db.prepare(`
        UPDATE fields
        SET name = ?, area_m2 = ?, soil_type = ?, theta_fc = ?, theta_wp = ?, root_depth_m = ?, current_crop = ?, payload_json = ?
        WHERE id = ?
      `).run(
        String(field.name || ''),
        field.area_m2 ?? null,
        field.soil_type || null,
        field.theta_fc ?? null,
        field.theta_wp ?? null,
        field.root_depth_m ?? null,
        field.current_crop || null,
        JSON.stringify(field),
        String(field.id)
      );
    }
    this.save();
    return { success: true, field };
  }

  // --- Devices & Telemetry (SQLite-Backed) ---
  getDevices(userContext = null) {
    if (this.db) {
      const rows = this.db.prepare('SELECT payload_json FROM devices ORDER BY rowid ASC').all();
      return rows.map(parsePayloadRow).filter(Boolean);
    }
    return this.state.devices || [];
  }

  getDeviceById(id) {
    if (!id) return null;
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM devices WHERE id = ? LIMIT 1').get(id);
      return parsePayloadRow(row);
    }
    return (this.state.devices || []).find((d) => d.id === id) || null;
  }

  getReadings(fieldId = null, limit = 50) {
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 50;
    if (this.db) {
      const rows = fieldId
        ? this.db.prepare('SELECT payload_json FROM sensor_readings WHERE field_id = ? ORDER BY id DESC LIMIT ?').all(fieldId, safeLimit)
        : this.db.prepare('SELECT payload_json FROM sensor_readings ORDER BY id DESC LIMIT ?').all(safeLimit);
      return rows.map(parsePayloadRow).filter(Boolean);
    }
    let list = this.state.readings || [];
    if (fieldId) {
      list = list.filter((r) => r.field_id === fieldId);
    }
    return list.slice(-safeLimit).reverse();
  }

  getLatestReading(fieldId = null) {
    const list = this.getReadings(fieldId, 1);
    return list.length > 0 ? list[0] : null;
  }

  hasEventId(eventId, deviceId = null) {
    if (!eventId) return false;
    if (this.db) {
      const row = deviceId
        ? this.db.prepare('SELECT 1 AS found FROM sensor_readings WHERE event_id = ? AND device_id = ? LIMIT 1').get(eventId, deviceId)
        : this.db.prepare('SELECT 1 AS found FROM sensor_readings WHERE event_id = ? LIMIT 1').get(eventId);
      return Boolean(row);
    }
    return (this.state.readings || []).some((r) =>
      deviceId ? (r.event_id === eventId && r.device_id === deviceId) : r.event_id === eventId
    );
  }

  addReading(reading) {
    if (!this.state.readings) this.state.readings = [];
    const maxFromDb = this.db
      ? (this.db.prepare('SELECT COALESCE(MAX(id), 0) AS max_id FROM sensor_readings').get().max_id || 0)
      : 0;
    const maxFromState = this.state.readings.length > 0
      ? Math.max(...this.state.readings.map((r) => r.id || 0))
      : 0;
    const newId = Math.max(maxFromDb, maxFromState) + 1;

    const record = {
      id: newId,
      received_at: new Date().toISOString(),
      is_simulated: true, // Always enforce honest simulation flag
      calibration_status: 'UNCALIBRATED',
      ...reading
    };
    this.state.readings.push(record);
    if (this.db) {
      this.db.prepare(`
        INSERT OR REPLACE INTO sensor_readings (id, device_id, field_id, event_id, observed_at, received_at, soil_moisture_vwc, soil_temp_c, air_temp_c, relative_humidity_pct, soil_ph, quality_status, calibration_status, is_simulated, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        String(record.device_id || 'esp32-node-raj-01'),
        record.field_id || null,
        record.event_id || null,
        record.observed_at || null,
        record.received_at,
        record.soil_moisture_vwc ?? null,
        record.soil_temp_c ?? null,
        record.air_temp_c ?? null,
        record.relative_humidity_pct ?? null,
        record.soil_ph ?? null,
        record.quality_status || 'valid',
        record.calibration_status || 'UNCALIBRATED',
        record.is_simulated === false ? 0 : 1,
        JSON.stringify(record)
      );
    }
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
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM nasa_weather_cache WHERE cache_key = ? LIMIT 1').get(key);
      if (row) return parsePayloadRow(row);
    }
    return this.state.nasa_weather_cache?.[key] || null;
  }

  setCachedNasa(key, data) {
    if (!this.state.nasa_weather_cache) this.state.nasa_weather_cache = {};
    const entry = {
      cachedAt: new Date().toISOString(),
      data
    };
    this.state.nasa_weather_cache[key] = entry;
    if (this.db) {
      this.db.prepare(`
        INSERT INTO nasa_weather_cache (cache_key, cached_at, payload_json)
        VALUES (?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET cached_at = excluded.cached_at, payload_json = excluded.payload_json
      `).run(String(key), entry.cachedAt, JSON.stringify(entry));
    }
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

  // --- Alerts Engine (Multi-Tenant Scoped, SQLite-Backed) ---
  getAlerts(farmId = null, activeOnly = false, userContext = null) {
    if (this.db) {
      if (farmId) {
        const farm = this.getFarmById(farmId, userContext);
        if (!farm) return [];
        const sql = activeOnly
          ? 'SELECT payload_json FROM alerts WHERE farm_id = ? AND is_resolved = 0 ORDER BY rowid DESC'
          : 'SELECT payload_json FROM alerts WHERE farm_id = ? ORDER BY rowid DESC';
        return this.db.prepare(sql).all(farmId).map(parsePayloadRow).filter(Boolean);
      }
      if (userContext && userContext.role === 'admin') {
        const sql = activeOnly
          ? 'SELECT payload_json FROM alerts WHERE is_resolved = 0 ORDER BY rowid DESC'
          : 'SELECT payload_json FROM alerts ORDER BY rowid DESC';
        return this.db.prepare(sql).all().map(parsePayloadRow).filter(Boolean);
      }
      const allowedFarms = new Set(this.getFarms(userContext).map((f) => f.id));
      const sql = activeOnly
        ? 'SELECT farm_id, payload_json FROM alerts WHERE is_resolved = 0 ORDER BY rowid DESC'
        : 'SELECT farm_id, payload_json FROM alerts ORDER BY rowid DESC';
      return this.db.prepare(sql).all()
        .filter((r) => allowedFarms.has(r.farm_id))
        .map(parsePayloadRow)
        .filter(Boolean);
    }

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
    if (this.db) {
      this.db.prepare(`
        INSERT INTO alerts (id, farm_id, field_id, alert_type, severity, title, is_acknowledged, is_resolved, created_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(alert.id),
        String(alert.farm_id),
        alert.field_id || null,
        alert.alert_type || null,
        alert.severity || 'warning',
        alert.title || null,
        alert.is_acknowledged ? 1 : 0,
        alert.is_resolved ? 1 : 0,
        alert.created_at,
        JSON.stringify(alert)
      );
    }
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
    if (this.db) {
      this.db.prepare('UPDATE alerts SET is_acknowledged = 1, payload_json = ? WHERE id = ?')
        .run(JSON.stringify(alert), String(alert.id));
    }
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
    if (this.db) {
      this.db.prepare('UPDATE alerts SET is_resolved = 1, payload_json = ? WHERE id = ?')
        .run(JSON.stringify(alert), String(alert.id));
    }
    this.save();
    return { success: true, alert };
  }

  // --- Assistant Conversations & Feedback (Multi-Tenant Scoped, SQLite-Backed) ---
  getAssistantConversations(userId = null) {
    if (!userId) {
      return [];
    }
    if (this.db) {
      const rows = this.db.prepare('SELECT payload_json FROM assistant_conversations WHERE user_id = ? ORDER BY rowid ASC').all(userId);
      return rows.map(parsePayloadRow).filter(Boolean);
    }
    const list = this.state.assistant_conversations || [];
    return list.filter((c) => c.user_id === userId);
  }

  getAssistantConversationRaw(id) {
    if (!id) return null;
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM assistant_conversations WHERE id = ? LIMIT 1').get(id);
      return parsePayloadRow(row);
    }
    const list = this.state.assistant_conversations || [];
    return list.find((c) => c.id === id) || null;
  }

  getAssistantConversationById(id, userId = null) {
    if (!id || !userId) return null;
    if (this.db) {
      const row = this.db.prepare('SELECT payload_json FROM assistant_conversations WHERE id = ? AND user_id = ? LIMIT 1').get(id, userId);
      return parsePayloadRow(row);
    }
    const list = this.state.assistant_conversations || [];
    const conv = list.find((c) => c.id === id);
    if (!conv || conv.user_id !== userId) return null;
    return conv;
  }

  saveAssistantConversation(conv) {
    if (!conv || !conv.user_id) {
      return null;
    }
    if (!this.state.assistant_conversations) this.state.assistant_conversations = [];
    const idx = this.state.assistant_conversations.findIndex((c) => c.id === conv.id);
    const now = new Date().toISOString();
    const saved = idx >= 0
      ? { ...this.state.assistant_conversations[idx], ...conv, updated_at: now }
      : { ...conv, created_at: conv.created_at || now, updated_at: now };

    if (idx >= 0) {
      this.state.assistant_conversations[idx] = saved;
    } else {
      this.state.assistant_conversations.push(saved);
    }

    if (this.db) {
      this.db.prepare(`
        INSERT INTO assistant_conversations (id, user_id, title, created_at, updated_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
      `).run(
        String(saved.id),
        String(saved.user_id),
        saved.title || null,
        saved.created_at || now,
        saved.updated_at || now,
        JSON.stringify(saved)
      );
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
    if (this.db) {
      this.db.prepare('DELETE FROM assistant_conversations WHERE id = ? AND user_id = ?').run(id, userId);
    }
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
    if (this.db) {
      this.db.prepare(`
        INSERT INTO assistant_feedback (id, conversation_id, message_id, rating, created_at, payload_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        String(record.id),
        record.conversation_id || null,
        record.message_id || null,
        record.rating ?? null,
        record.created_at,
        JSON.stringify(record)
      );
    }
    this.save();
    return record;
  }
}

const storage = new StorageService();
module.exports = storage;
module.exports.StorageService = StorageService;
