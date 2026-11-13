const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const __tmpSingletonDir = (() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-persist-singleton-'));
  const file = path.join(dir, 'store.json');
  fs.copyFileSync(path.join(__dirname, '../data/store.json'), file);
  process.env.AGRISENSE_STORE_FILE = file;
  return dir;
})();
process.on('exit', () => {
  try {
    require('fs').rmSync(__tmpSingletonDir, { recursive: true, force: true });
  } catch {}
});
const { StorageService } = require('../storage/storageService');

test('Storage Service Persistence Safety & Backup Recovery Suite', async (t) => {
  const TEST_DIR = path.join(__dirname, 'temp_persistence_test');
  const TEST_STORE = path.join(TEST_DIR, 'test_store.json');
  const TEST_BAK = `${TEST_STORE}.bak`;

  // Setup isolated test environment
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const storage = new StorageService(TEST_STORE);

  t.after(() => {
    try {
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  await t.test('01. Atomic save maintains verified backup file', () => {
    const canaryEmail = `canary_${Date.now()}@agrisense.test`;
    storage.saveUser({
      id: `usr-canary-${Date.now()}`,
      email: canaryEmail,
      full_name: 'Canary Persistence Safety Test User',
      role: 'farmer'
    });

    assert.ok(fs.existsSync(TEST_STORE), 'test_store.json must exist');
    assert.ok(fs.existsSync(TEST_BAK), 'test_store.json.bak must exist');

    const bakRaw = fs.readFileSync(TEST_BAK, 'utf-8');
    const parsedBak = JSON.parse(bakRaw);
    assert.ok(Array.isArray(parsedBak.users), 'Backup must have users array');
  });

  await t.test('02. StorageService recovers cleanly from backup upon primary store corruption', () => {
    const recoveryCanary = {
      id: `usr-recovery-canary-${Date.now()}`,
      email: `recovered_${Date.now()}@agrisense.test`,
      full_name: 'Recovery Sentinel',
      role: 'researcher'
    };
    storage.saveUser(recoveryCanary);

    // Verify written to backup
    assert.ok(fs.existsSync(TEST_BAK), 'Backup file must exist before corruption simulation');
    const beforeBak = JSON.parse(fs.readFileSync(TEST_BAK, 'utf-8'));
    assert.ok(beforeBak.users.some((u) => u.id === recoveryCanary.id), 'Canary must be present in backup');

    // Simulate mid-write truncation/corruption on primary store file
    fs.writeFileSync(TEST_STORE, '{"truncated_corrupted_json_mid_write": [1, 2, 3', 'utf-8');

    // Re-initialize isolated storage instance
    const recoveredStorage = new StorageService(TEST_STORE);

    // Verify clean recovery from backup
    assert.ok(recoveredStorage.state !== null, 'Storage state must not be null');
    const recoveredUser = recoveredStorage.getUserById(recoveryCanary.id);
    assert.ok(recoveredUser, 'Canary user must be successfully recovered from backup');
    assert.strictEqual(recoveredUser.email, recoveryCanary.email);
  });

  await t.test('03. Concurrent rapid atomic writes maintain valid JSON integrity', () => {
    for (let i = 0; i < 20; i++) {
      storage.state.nasa_weather_cache[`rapid_key_${i}`] = { val: i, ts: Date.now() };
      storage.save();
    }

    const raw = fs.readFileSync(TEST_STORE, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(raw), 'Primary store must remain valid parseable JSON after rapid writes');
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.nasa_weather_cache['rapid_key_19'].val, 19);
  });

  await t.test('04. Process interruption during temp write never corrupts store.json or .bak', () => {
    const interruptedTmp = `${TEST_STORE}.tmp.99999.${Date.now()}.interrupted`;
    fs.writeFileSync(interruptedTmp, '{"incomplete_interrupted_process_write": true', 'utf-8');

    const reinitStorage = new StorageService(TEST_STORE);
    assert.strictEqual(reinitStorage.lastRecoveryStatus, 'CLEAN_LOAD');
    const currentRaw = fs.readFileSync(TEST_STORE, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(currentRaw));
    if (fs.existsSync(interruptedTmp)) {
      fs.unlinkSync(interruptedTmp);
    }
  });

  await t.test('05. Failed atomic rename never falls back to non-atomic copyFileSync and preserves valid store.json & .bak', () => {
    const baselineMarker = `marker-before-rename-fail-${Date.now()}`;
    storage.state.nasa_weather_cache.safe_marker = baselineMarker;
    assert.strictEqual(storage.save(), true);

    const beforeStoreRaw = fs.readFileSync(TEST_STORE, 'utf-8');
    const beforeBakRaw = fs.readFileSync(TEST_BAK, 'utf-8');

    // Simulate OS-level rename lock failure (EBUSY/EPERM) on target store file
    const originalRenameSync = fs.renameSync;
    const originalCopyFileSync = fs.copyFileSync;
    let copyCalledOnTarget = false;

    fs.renameSync = (oldPath, newPath) => {
      if (newPath === TEST_STORE) {
        const err = new Error('EBUSY: resource busy or locked, rename');
        err.code = 'EBUSY';
        throw err;
      }
      return originalRenameSync(oldPath, newPath);
    };
    fs.copyFileSync = (src, dest, mode) => {
      if (dest === TEST_STORE) {
        copyCalledOnTarget = true;
      }
      return originalCopyFileSync(src, dest, mode);
    };

    try {
      storage.state.nasa_weather_cache.safe_marker = 'should-not-overwrite-non-atomically';
      const saveResult = storage.save();

      assert.strictEqual(saveResult, false, 'save() must return false when atomic rename fails after retries');
      assert.strictEqual(copyCalledOnTarget, false, 'save() must NEVER call non-atomic copyFileSync on target store.json');
      assert.ok(storage.lastSaveError && storage.lastSaveError.includes('EBUSY'), 'Must record lastSaveError');

      // Verify existing store.json and .bak were preserved untouched
      const afterStoreRaw = fs.readFileSync(TEST_STORE, 'utf-8');
      const afterBakRaw = fs.readFileSync(TEST_BAK, 'utf-8');
      assert.strictEqual(afterStoreRaw, beforeStoreRaw, 'Existing valid store.json must remain intact');
      assert.strictEqual(afterBakRaw, beforeBakRaw, 'Existing valid .bak must remain intact');
      assert.strictEqual(JSON.parse(afterStoreRaw).nasa_weather_cache.safe_marker, baselineMarker);
    } finally {
      fs.renameSync = originalRenameSync;
      fs.copyFileSync = originalCopyFileSync;
      storage.state.nasa_weather_cache.safe_marker = baselineMarker;
    }
  });

  await t.test('06. Multi-instance concurrent conflict writes preserve valid JSON and backup', async () => {
    const instanceA = new StorageService(TEST_STORE);
    const instanceB = new StorageService(TEST_STORE);

    const tasks = [];
    for (let i = 0; i < 10; i++) {
      tasks.push(Promise.resolve().then(() => {
        instanceA.state.nasa_weather_cache[`instA_${i}`] = i;
        return instanceA.save();
      }));
      tasks.push(Promise.resolve().then(() => {
        instanceB.state.nasa_weather_cache[`instB_${i}`] = i;
        return instanceB.save();
      }));
    }
    await Promise.all(tasks);

    const storeParsed = JSON.parse(fs.readFileSync(TEST_STORE, 'utf-8'));
    const bakParsed = JSON.parse(fs.readFileSync(TEST_BAK, 'utf-8'));
    assert.ok(storeParsed && typeof storeParsed === 'object');
    assert.ok(bakParsed && typeof bakParsed === 'object');
  });

  await t.test('07. Clean seed recovery when both primary store.json and .bak are corrupted', () => {
    const CORRUPT_STORE = path.join(TEST_DIR, 'both_corrupt_store.json');
    const CORRUPT_BAK = `${CORRUPT_STORE}.bak`;
    fs.writeFileSync(CORRUPT_STORE, '<<<CORRUPT_PRIMARY_JSON', 'utf-8');
    fs.writeFileSync(CORRUPT_BAK, '<<<CORRUPT_BACKUP_JSON', 'utf-8');

    const freshRecovery = new StorageService(CORRUPT_STORE);
    assert.strictEqual(freshRecovery.lastRecoveryStatus, 'RESET_FROM_SEED_BOTH_CORRUPT');
    assert.ok(Array.isArray(freshRecovery.state.farms) && freshRecovery.state.farms.length >= 3);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(CORRUPT_STORE, 'utf-8')));
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(CORRUPT_BAK, 'utf-8')));
  });

  await t.test('08. Native SQLite relational engine (node:sqlite WAL) persists and queries domain tables in parity with atomic store', async () => {
    const dbLayer = require('../storage/db');
    await dbLayer.initDb();
    const status = dbLayer.getDbStatus();
    assert.strictEqual(status.mode, 'sqlite');
    assert.strictEqual(status.isConnected, true);

    const diag = storage.getSqliteDiagnostics();
    assert.ok(diag, 'SQLite diagnostics must be available');
    assert.strictEqual(diag.journal_mode, 'wal');
    assert.ok(diag.table_counts.farms >= 3, 'SQLite farms table must contain seeded farms');
    assert.ok(diag.table_counts.fields >= 3, 'SQLite fields table must contain seeded fields');
    assert.ok(diag.table_counts.devices >= 1, 'SQLite devices table must contain seeded device');
    assert.ok(diag.table_counts.users >= 2, 'SQLite users table must contain persisted test users');

    // Parameterized SQL JOIN query verification
    const joined = storage.querySqlite(
      `SELECT f.id AS field_id, fm.district AS district
       FROM fields f
       JOIN farms fm ON f.farm_id = fm.id
       WHERE fm.id = ?`,
      ['farm-barind-01']
    );
    assert.ok(Array.isArray(joined) && joined.length >= 2, 'SQLite JOIN query must return Barind plots');
    assert.strictEqual(joined[0].district, 'Rajshahi');
  });

  await t.test('09. Automatic SQLite schema migration upgrades legacy global event_id UNIQUE table to composite UNIQUE(device_id, event_id)', () => {
    const crypto = require('crypto');
    const os = require('os');
    const { DatabaseSync } = require('node:sqlite');

    const LEGACY_STORE = path.join(TEST_DIR, 'legacy_schema_store.json');
    const storeHash = crypto.createHash('sha1').update(path.resolve(LEGACY_STORE)).digest('hex').slice(0, 12);
    const legacySqlitePath = path.join(os.tmpdir(), `agrisense-store-${storeHash}.sqlite`);

    // Create a legacy SQLite database containing the old global event_id TEXT UNIQUE schema
    const seedState = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/store.json'), 'utf-8'));
    seedState.readings = [
      {
        id: 1,
        device_id: 'esp32-node-raj-01',
        field_id: 'field-godagari-a',
        event_id: 'evt-legacy-shared-99',
        observed_at: '2026-11-01T00:00:00.000Z',
        received_at: '2026-11-01T00:00:01.000Z',
        soil_moisture_vwc: 0.24,
        is_simulated: true
      }
    ];
    fs.writeFileSync(LEGACY_STORE, JSON.stringify(seedState, null, 2), 'utf-8');

    const legacyDb = new DatabaseSync(legacySqlitePath);
    legacyDb.exec(`
      CREATE TABLE sensor_readings (
        id INTEGER PRIMARY KEY,
        device_id TEXT NOT NULL,
        field_id TEXT,
        event_id TEXT UNIQUE,
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
        payload_json TEXT NOT NULL
      );
    `);
    legacyDb.prepare(
      'INSERT INTO sensor_readings (id, device_id, field_id, event_id, soil_moisture_vwc, payload_json) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(1, 'esp32-node-raj-01', 'field-godagari-a', 'evt-legacy-shared-99', 0.24, JSON.stringify(seedState.readings[0]));
    legacyDb.close();

    // Opening StorageService on the legacy DB must automatically migrate to UNIQUE(device_id, event_id)
    const migrated = new StorageService(LEGACY_STORE);
    const schemaRow = migrated.querySqlite(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sensor_readings'"
    )[0];
    assert.match(schemaRow.sql, /UNIQUE\s*\(\s*device_id\s*,\s*event_id\s*\)/i);

    // Second device reusing the same event_id must NOT overwrite device 1's row
    migrated.addReading({
      device_id: 'esp32-node-raj-02',
      field_id: 'field-godagari-a',
      event_id: 'evt-legacy-shared-99',
      observed_at: '2026-11-01T01:00:00.000Z',
      soil_moisture_vwc: 0.27,
      is_simulated: true
    });

    const rows = migrated.querySqlite(
      'SELECT device_id, event_id, soil_moisture_vwc FROM sensor_readings WHERE event_id = ? ORDER BY device_id ASC',
      ['evt-legacy-shared-99']
    );
    assert.strictEqual(rows.length, 2, 'Both devices must coexist after migrating from legacy global UNIQUE schema');
    assert.strictEqual(rows[0].device_id, 'esp32-node-raj-01');
    assert.strictEqual(rows[1].device_id, 'esp32-node-raj-02');
    assert.strictEqual(migrated.hasEventId('evt-legacy-shared-99', 'esp32-node-raj-01'), true);
    assert.strictEqual(migrated.hasEventId('evt-legacy-shared-99', 'esp32-node-raj-02'), true);
  });
});
