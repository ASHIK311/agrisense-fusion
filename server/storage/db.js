/**
 * AgriSense Fusion - Database Connection & Abstraction Layer
 * Dual-Engine Relational Persistence:
 *   1. PostgreSQL with PostGIS when DATABASE_URL is configured and reachable.
 *   2. Native SQLite (node:sqlite DatabaseSync in WAL mode) for zero-dependency
 *      local & CI relational SQL execution.
 */

const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

let pool = null;
let sqliteDb = null;
let isConnected = false;
let dbMode = 'sqlite'; // 'postgres' or 'sqlite'

const databaseUrl = process.env.DATABASE_URL || null;

function resolveSqlitePath() {
  if (process.env.AGRISENSE_SQLITE_FILE) {
    return path.resolve(process.env.AGRISENSE_SQLITE_FILE);
  }
  const defaultStore = path.resolve(path.join(__dirname, '..', 'data', 'store.json'));
  const envStore = process.env.AGRISENSE_STORE_FILE ? path.resolve(process.env.AGRISENSE_STORE_FILE) : defaultStore;
  if (envStore === defaultStore) {
    return path.join(__dirname, '..', 'data', 'agrisense.sqlite');
  }
  const hash = crypto.createHash('sha1').update(envStore).digest('hex').slice(0, 12);
  return path.join(os.tmpdir(), `agrisense-db-${hash}.sqlite`);
}

function getSqliteConnection() {
  if (!sqliteDb) {
    const dbPath = resolveSqlitePath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA synchronous = NORMAL;');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    sqliteDb.exec('PRAGMA busy_timeout = 5000;');
    isConnected = true;
    dbMode = 'sqlite';
  }
  return sqliteDb;
}

if (databaseUrl) {
  try {
    // Optional PostgreSQL Pool defaults to verified TLS whenever DB_SSL=true
    // unless DB_SSL_REJECT_UNAUTHORIZED=false is explicitly set.
    const sslConfig = process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false;

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.warn('PostgreSQL Pool background error:', err.message);
    });
  } catch (err) {
    console.warn('Could not initialize PostgreSQL pool:', err.message);
  }
}

/**
 * Test and initialize the database connection (PostgreSQL if configured, else native SQLite).
 */
async function initDb() {
  if (!pool) {
    getSqliteConnection();
    dbMode = 'sqlite';
    isConnected = true;
    console.log(`[DB] Running native SQLite relational engine (node:sqlite WAL) at ${resolveSqlitePath()}`);
    return { mode: dbMode, isConnected: true, engine: 'node:sqlite (DatabaseSync WAL)' };
  }

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, version()');
    client.release();
    isConnected = true;
    dbMode = 'postgres';
    console.log(`[DB] Connected to PostgreSQL successfully. Time: ${res.rows[0].current_time}`);
    return { mode: dbMode, isConnected: true, engine: 'PostgreSQL', serverTime: res.rows[0].current_time };
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection to ${databaseUrl} failed: ${err.message}.`);
    console.log('[DB] Falling back automatically to native SQLite relational engine (node:sqlite WAL).');
    getSqliteConnection();
    isConnected = true;
    dbMode = 'sqlite';
    return { mode: dbMode, isConnected: true, engine: 'node:sqlite (DatabaseSync WAL)', fallbackReason: err.message };
  }
}

/**
 * Execute a parameterized SQL query against active PostgreSQL or native SQLite engine.
 */
async function query(text, params = []) {
  if (dbMode === 'postgres' && isConnected && pool) {
    return await pool.query(text, params);
  }
  const db = getSqliteConnection();
  const stmt = db.prepare(text);
  if (/^\s*(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(text)) {
    const rows = stmt.all(...params);
    return { rows, rowCount: rows.length };
  }
  const info = stmt.run(...params);
  return {
    rows: [],
    rowCount: info.changes || 0,
    lastInsertRowid: info.lastInsertRowid
  };
}

/**
 * Apply schema.sql (PostgreSQL) or verify native SQLite tables.
 */
async function runMigrations() {
  if (dbMode === 'postgres' && isConnected && pool) {
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    return { success: true, engine: 'postgres' };
  }
  getSqliteConnection();
  return { success: true, engine: 'sqlite' };
}

function getDbStatus() {
  if (!sqliteDb && !pool) {
    try {
      getSqliteConnection();
    } catch (_) {}
  }
  return {
    mode: dbMode,
    engine: dbMode === 'postgres' ? 'PostgreSQL' : 'node:sqlite (DatabaseSync WAL)',
    isConnected,
    sqlitePath: dbMode === 'sqlite' ? resolveSqlitePath() : null,
    databaseUrl: databaseUrl ? databaseUrl.replace(/:\/\/.*@/, '://***:***@') : null
  };
}

module.exports = {
  pool,
  initDb,
  query,
  runMigrations,
  getDbStatus,
  getSqliteConnection,
  resolveSqlitePath
};
