/**
 * AgriSense Fusion - Post-Audit Security & Multi-Tenant Regression Test Suite
 * Validates Phase 1 & Phase 2 security hardening, rate limiting,
 * cross-tenant isolation, demo immutability, and uncalibrated model route disclosures.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const __tmpStoreDir = (() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-sec-test-'));
  const file = path.join(dir, 'store.json');
  fs.copyFileSync(path.join(__dirname, '../data/store.json'), file);
  process.env.AGRISENSE_STORE_FILE = file;
  return dir;
})();
process.on('exit', () => {
  try {
    require('fs').rmSync(__tmpStoreDir, { recursive: true, force: true });
  } catch {}
});
const app = require('../index');
const authService = require('../services/authService');
const { _authLimiterInstance } = require('../middleware/rateLimiter');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function apiRequest(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  let responseBody;
  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }
  return { status: response.status, body: responseBody, headers: response.headers };
}

describe('AgriSense Fusion Security & Multi-Tenant Regression Suite', () => {

  // 1. Startup / Production JWT Secret Validation
  test('01. Production mode strictly rejects missing or weak JWT_SECRET (< 32 chars)', () => {
    assert.throws(
      () => authService.validateJwtSecret('production', undefined),
      /minimum 32 characters required/
    );
    assert.throws(
      () => authService.validateJwtSecret('production', 'too-short-secret'),
      /minimum 32 characters required/
    );
    const validSecret = 'a-very-strong-production-jwt-secret-key-with-more-than-32-chars';
    assert.equal(authService.validateJwtSecret('production', validSecret), true);
  });

  // 2. Rejection of invalid/expired JWT tokens (HTTP 403)
  test('02. Rejects invalid or forged JWT tokens with HTTP 403', async () => {
    const res = await apiRequest('/api/v1/auth/me', {
      headers: { 'Authorization': 'Bearer forged.invalid.token' }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // 3. Unauthorized write rejections on farms and fields (HTTP 401)
  test('03. Rejects unauthorized mutations on farms and fields with HTTP 401', async () => {
    const farmWriteRes = await apiRequest('/api/v1/farms', {
      method: 'POST',
      body: { name: 'Hacker Farm', latitude: 24.4, longitude: 88.3 }
    });
    assert.equal(farmWriteRes.status, 401);

    const fieldWriteRes = await apiRequest('/api/v1/fields', {
      method: 'POST',
      body: { farm_id: 'farm-barind-01', name: 'Unauthorized Field' }
    });
    assert.equal(fieldWriteRes.status, 401);
  });

  // 4. Cross-user farm/field access isolation
  test('04. Enforces strict multi-tenant isolation between user accounts', async () => {
    // User A registers
    const userAEmail = `tenant_a_${Date.now()}@test.org`;
    const regARes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: { email: userAEmail, password: 'SecurePassword123!', fullName: 'Tenant A Farmer' }
    });
    assert.equal(regARes.status, 201);
    const tokenA = regARes.body.token;

    // User A creates Farm A
    const farmARes = await apiRequest('/api/v1/farms', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: { name: 'Tenant A Secret Plot', latitude: 24.469, longitude: 88.330 }
    });
    assert.equal(farmARes.status, 201);
    const farmAId = farmARes.body.farm.id;

    // User B registers
    const userBEmail = `tenant_b_${Date.now()}@test.org`;
    const regBRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: { email: userBEmail, password: 'SecurePassword123!', fullName: 'Tenant B Farmer' }
    });
    assert.equal(regBRes.status, 201);
    const tokenB = regBRes.body.token;

    // User B tries to view Farm A -> 404 (scoped query)
    const viewRes = await apiRequest(`/api/v1/farms/${farmAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(viewRes.status, 404);

    // User B tries to update Farm A -> 403 Forbidden
    const updateRes = await apiRequest(`/api/v1/farms/${farmAId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}` },
      body: { name: 'Hijacked Farm' }
    });
    assert.equal(updateRes.status, 403);

    // User B tries to create field inside Farm A -> 403 or 404 (access denied / target farm not accessible)
    const fieldRes = await apiRequest('/api/v1/fields', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` },
      body: { farm_id: farmAId, name: 'Cross-Tenant Injected Field', area_m2: 5000 }
    });
    assert.ok([403, 404].includes(fieldRes.status));
  });

  // 5. Unauthorized alert mutations rejected (HTTP 401)
  test('05. Rejects unauthorized alert acknowledge and resolve requests with HTTP 401', async () => {
    const ackRes = await apiRequest('/api/v1/alerts/alert-demo-01/acknowledge', {
      method: 'PATCH'
    });
    assert.equal(ackRes.status, 401);

    const resolveRes = await apiRequest('/api/v1/alerts/alert-demo-01/resolve', {
      method: 'PATCH'
    });
    assert.equal(resolveRes.status, 401);
  });

  // 6. Sensor ingestion without credentials rejected (HTTP 401), and accepted with x-device-key
  test('06. Ingests telemetry only when authenticated by x-device-key or bearer token', async () => {
    const unauthRes = await apiRequest('/api/v1/sensor-readings', {
      method: 'POST',
      body: {
        event_id: `UNAUTH-${Date.now()}`,
        device_id: 'ROGUE-NODE',
        soil_moisture_vwc: 0.22
      }
    });
    assert.equal(unauthRes.status, 401);
    assert.match(unauthRes.body.error, /Authentication required/i);

    // With x-device-key
    const authDeviceRes = await apiRequest('/api/v1/sensor-readings', {
      method: 'POST',
      headers: { 'x-device-key': 'esp32-hardware-key-dev-barind' },
      body: {
        event_id: `VALID-KEY-${Date.now()}`,
        device_id: 'ESP32-NODE-01',
        sensor_id: 'FDR-01',
        soil_moisture_vwc: 0.23,
        soil_temperature_c: 25.5
      }
    });
    assert.equal(authDeviceRes.status, 201);
    assert.equal(authDeviceRes.body.success, true);
    assert.equal(authDeviceRes.body.is_simulated, true);
  });

  // 7. Auth rate limiting returns HTTP 429 when threshold exceeded
  test('07. Auth rate limiter blocks abusive requests with HTTP 429', async () => {
    _authLimiterInstance.reset();
    const mockReq = { ip: '192.168.1.100' };
    let wasBlocked = false;

    for (let i = 0; i < 15; i++) {
      let statusCode = 200;
      let resBody = null;
      const mockRes = {
        setHeader: () => {},
        status: (code) => {
          statusCode = code;
          return {
            json: (obj) => { resBody = obj; }
          };
        }
      };
      _authLimiterInstance.middleware()(mockReq, mockRes, () => {});
      if (statusCode === 429) {
        wasBlocked = true;
        assert.equal(resBody.error, 'TOO_MANY_REQUESTS');
        break;
      }
    }
    assert.equal(wasBlocked, true, 'Rate limiter should have triggered HTTP 429');
    _authLimiterInstance.reset();
  });

  // 8. Registration accepts both fullName and full_name, returning HTTP 400 for invalid inputs
  test('08. Registration accepts both fullName and full_name, rejecting invalid payloads with HTTP 400', async () => {
    // Using fullName
    const resA = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: `fullname_${Date.now()}@agrisense.test`,
        password: 'ValidPassword123!',
        fullName: 'Dr. Agronomist A'
      }
    });
    assert.equal(resA.status, 201);
    assert.equal(resA.body.user.full_name, 'Dr. Agronomist A');

    // Using full_name
    const resB = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: `underscore_${Date.now()}@agrisense.test`,
        password: 'ValidPassword123!',
        full_name: 'Dr. Agronomist B'
      }
    });
    assert.equal(resB.status, 201);
    assert.equal(resB.body.user.full_name, 'Dr. Agronomist B');

    // Missing password -> 400
    const resC = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: `invalid_${Date.now()}@agrisense.test`,
        fullName: 'Missing Password User'
      }
    });
    assert.equal(resC.status, 400);

    // Missing email -> 400
    const resD = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        password: 'ValidPassword123!',
        fullName: 'Missing Email User'
      }
    });
    assert.equal(resD.status, 400);
  });

  // 9. Read-only demo farm modification rejected with HTTP 403
  test('09. Demo farm records are protected as immutable read-only (HTTP 403)', async () => {
    // Authenticate a user
    const regRes = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: `demoguard_${Date.now()}@agrisense.test`,
        password: 'ValidPassword123!',
        fullName: 'Demo Guard User'
      }
    });
    const token = regRes.body.token;

    // Attempt to update farm-barind-01
    const editRes = await apiRequest('/api/v1/farms/farm-barind-01', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: { name: 'Attempted Overwrite of Demo Farm' }
    });
    assert.equal(editRes.status, 403);
    assert.match(editRes.body.message, /immutable baseline records|read-only/i);
  });

  // 10. Disclosed status routes (/classify-crop -> 422 BLOCKED, /predict-yield -> 501 NOT_IMPLEMENTED)
  test('10. Uncalibrated/failed models return honest HTTP status codes (422 BLOCKED, 501 NOT_IMPLEMENTED)', async () => {
    // POST /api/v1/satellite/classify-crop
    const cropClassifyRes = await apiRequest('/api/v1/satellite/classify-crop', {
      method: 'POST',
      body: { ndvi: 0.45, ndwi: -0.1 }
    });
    assert.equal(cropClassifyRes.status, 422);
    assert.equal(cropClassifyRes.body.status, 'BLOCKED');
    assert.match(cropClassifyRes.body.message, /Fine-grained crop species identification/i);

    // POST /api/v1/agronomy/predict-yield
    const yieldRes = await apiRequest('/api/v1/agronomy/predict-yield', {
      method: 'POST',
      body: { crop: 'Boro Rice', nitrogen: 100 }
    });
    assert.equal(yieldRes.status, 501);
    assert.equal(yieldRes.body.status, 'NOT_IMPLEMENTED');
    assert.match(yieldRes.body.message, /Machine-learning crop yield forecasting model is intentionally excluded/i);
  });

  // 11. Zero-division guards in satellite indices endpoint
  test('11. Satellite indices endpoint returns valid values and handles zero denominators safely', async () => {
    const indicesRes = await apiRequest('/api/v1/satellite/indices?nir=0.4&red=0.1&swir1=0.2&swir2=0.15');
    assert.equal(indicesRes.status, 200);
    assert.equal(indicesRes.body.success, true);
    assert.equal(typeof indicesRes.body.indices.ndvi, 'number');
    assert.equal(typeof indicesRes.body.indices.ndwi, 'number');

    // Edge case: zero values (nir=0, red=0)
    const zeroRes = await apiRequest('/api/v1/satellite/indices?nir=0&red=0&swir1=0&swir2=0&blue=0&green=0');
    assert.equal(zeroRes.status, 200);
    assert.equal(zeroRes.body.indices.ndvi, 0);
    assert.equal(zeroRes.body.indices.ndwi, 0);
  });

  // 12. Report CSV and JSON formats
  test('12. Consolidated report export supports both CSV and JSON formats', async () => {
    const jsonRes = await apiRequest('/api/v1/reports/export?format=json');
    assert.equal(jsonRes.status, 200);
    assert.equal(jsonRes.body.success, true);

    const csvRes = await apiRequest('/api/v1/reports/export?format=csv');
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.headers.get('content-type'), /text\/csv/);
    assert.match(csvRes.body, /date,t_max,t_min,rainfall/);
  });
});
