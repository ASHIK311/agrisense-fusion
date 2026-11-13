const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const __tmpStoreDir = (() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-device-auth-test-'));
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

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('ESP32 Hardware Authentication & Bypass Eradication Suite', async (t) => {
  const validReadingPayload = {
    device_id: 'esp32-node-raj-01',
    field_id: 'field-godagari-a',
    event_id: `evt-auth-test-${Date.now()}`,
    soil_moisture_vwc: 0.245,
    soil_temp_c: 27.2,
    air_temp_c: 30.1,
    relative_humidity_pct: 71.0,
    soil_ph: 6.5,
    raw_payload: { adc_val: 1890 }
  };

  await t.test('01. Rejects sensor ingestion when no auth credentials provided (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sensor-readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validReadingPayload, event_id: `evt-no-auth-${Date.now()}` })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Authentication required|failed/i);
  });

  await t.test('02. Strictly rejects invalid x-device-key even with valid registered device_id (HTTP 401 - Defect B Verification)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sensor-readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': 'attacker-forged-key-12345'
      },
      body: JSON.stringify({ ...validReadingPayload, event_id: `evt-forged-key-${Date.now()}` })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 401, 'Must return 401 when x-device-key is invalid, even for known device_id');
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Invalid or unauthorized device key/i);
  });

  await t.test('03. Accepts sensor ingestion with authorized system device key (HTTP 201)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sensor-readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': 'agrisense-device-key-2026'
      },
      body: JSON.stringify({ ...validReadingPayload, event_id: `evt-valid-key-${Date.now()}` })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.reading.is_simulated, true);
  });

  await t.test('04. Accepts sensor ingestion with valid user Bearer token (HTTP 201)', async () => {
    const token = authService.generateToken({
      id: 'usr-farmer-test',
      email: 'farmer@agrisense.test',
      role: 'farmer'
    });

    const res = await fetch(`${baseUrl}/api/v1/sensor-readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...validReadingPayload, event_id: `evt-bearer-token-${Date.now()}` })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
  });
});
