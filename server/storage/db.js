/**
 * AgriSense Fusion - Database Connection & Abstraction Layer
 * Supports PostgreSQL with PostGIS when DATABASE_URL is available,
 * and seamlessly provides fallback hooks for the local persistent store.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
let isConnected = false;
let dbMode = 'local_file'; // 'postgres' or 'local_file'

const databaseUrl = process.env.DATABASE_URL || null;

if (databaseUrl) {
  try {
    // Runtime CRUD persists to local JSON storage (storageService.js); this optional PostgreSQL Pool
    // defaults to verified TLS whenever DB_SSL=true unless DB_SSL_REJECT_UNAUTHORIZED=false is explicitly set.
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
 * Test and initialize the database connection
 */
async function initDb() {
  if (!pool) {
    dbMode = 'local_file';
    console.log('[DB] No DATABASE_URL specified. Running in resilient local storage mode.');
    return { mode: dbMode, isConnected: false };
  }

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, version()');
    client.release();
    isConnected = true;
    dbMode = 'postgres';
    console.log(`[DB] Connected to PostgreSQL successfully. Time: ${res.rows[0].current_time}`);
    return { mode: dbMode, isConnected: true, serverTime: res.rows[0].current_time };
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection to ${databaseUrl} failed: ${err.message}.`);
    console.log('[DB] Falling back automatically to persistent local storage mode.');
    isConnected = false;
    dbMode = 'local_file';
    return { mode: dbMode, isConnected: false, error: err.message };
  }
}

/**
 * Execute a parameterized SQL query on PostgreSQL (if active)
 */
async function query(text, params) {
  if (dbMode === 'postgres' && isConnected && pool) {
    return await pool.query(text, params);
  }
  throw new Error('PostgreSQL engine is not active in current environment.');
}

/**
 * Apply schema.sql to PostgreSQL database
 */
async function runMigrations() {
  if (dbMode !== 'postgres' || !isConnected || !pool) {
    return { success: false, reason: 'Database is in local_file mode' };
  }
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  return { success: true };
}

function getDbStatus() {
  return {
    mode: dbMode,
    isConnected,
    databaseUrl: databaseUrl ? databaseUrl.replace(/:\/\/.*@/, '://***:***@') : null
  };
}

module.exports = {
  pool,
  initDb,
  query,
  runMigrations,
  getDbStatus
};
