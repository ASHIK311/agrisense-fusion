const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const __tmpPatchDir = (() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-patch-reg-'));
  const file = path.join(dir, 'store.json');
  fs.copyFileSync(path.join(__dirname, '../data/store.json'), file);
  process.env.AGRISENSE_STORE_FILE = file;
  return dir;
})();

process.on('exit', () => {
  try {
    require('fs').rmSync(__tmpPatchDir, { recursive: true, force: true });
  } catch {}
});

const app = require('../index');

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

async function registerUser(email, password, requestedRole) {
  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: `Patch Test (${requestedRole || 'default'})`,
      email,
      password,
      ...(requestedRole ? { role: requestedRole } : {})
    })
  });
  return { status: res.status, body: await res.json() };
}

test('NASA Demo Minimal Patch — Security & Scientific Regression Suite', async (t) => {
  await t.test('01. Public signup strictly forces role="farmer" regardless of admin/researcher/agronomist escalation', async () => {
    for (const attemptedRole of ['admin', 'researcher', 'agronomist', 'superuser']) {
      const email = `esc_${attemptedRole}_${Date.now()}@agrisense.test`;
      const reg = await registerUser(email, 'SecurePass123!', attemptedRole);
      assert.strictEqual(reg.status, 201);
      assert.strictEqual(reg.body.user.role, 'farmer', `Attempted ${attemptedRole} must downgrade to farmer`);

      const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${reg.body.token}` }
      });
      assert.strictEqual(meRes.status, 200);
      const meBody = await meRes.json();
      assert.strictEqual(meBody.user.role, 'farmer');
    }
  });

  await t.test('02. Security headers present, X-Powered-By disabled, and /favicon.ico never returns 500', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-powered-by'), null);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');

    const fav = await fetch(`${baseUrl}/favicon.ico`);
    assert.ok(fav.status !== 500 && [200, 204, 304].includes(fav.status), `Unexpected favicon status ${fav.status}`);
  });

  await t.test('03. Multi-tenant isolation across reports, telemetry exports, and sensor-readings (no silent fallback)', async () => {
    const userA = await registerUser(`tenantA_${Date.now()}@agrisense.test`, 'PassA1234!');
    const userB = await registerUser(`tenantB_${Date.now()}@agrisense.test`, 'PassB1234!');

    // User A creates a private farm & field & ingests a private sensor reading
    const farmARes = await fetch(`${baseUrl}/api/v1/farms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.body.token}` },
      body: JSON.stringify({ name: 'Private Farm Alpha', district: 'Rajshahi', upazila: 'Godagari', latitude: 24.47, longitude: 88.33 })
    });
    assert.strictEqual(farmARes.status, 201);
    const farmA = (await farmARes.json()).farm;

    const fieldARes = await fetch(`${baseUrl}/api/v1/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.body.token}` },
      body: JSON.stringify({ farm_id: farmA.id, name: 'Secret Plot Alpha', area_m2: 6000 })
    });
    assert.strictEqual(fieldARes.status, 201);
    const fieldA = (await fieldARes.json()).field;

    // Default soil profile applied on omitted inputs
    assert.strictEqual(fieldA.soil_type, 'silty_clay_loam');
    assert.strictEqual(fieldA.theta_fc, 0.323);
    assert.strictEqual(fieldA.theta_wp, 0.165);
    assert.strictEqual(fieldA.root_depth_m, 0.5);

    const readingRes = await fetch(`${baseUrl}/api/v1/sensor-readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.body.token}` },
      body: JSON.stringify({
        device_id: 'esp32-node-raj-01',
        field_id: fieldA.id,
        event_id: `evt-tenant-a-${Date.now()}`,
        soil_moisture_vwc: 0.25
      })
    });
    assert.strictEqual(readingRes.status, 201);

    // User B cannot access User A's report summary, export, or sensor readings
    const repSumB = await fetch(`${baseUrl}/api/v1/reports/summary?farm_id=${farmA.id}`, {
      headers: { Authorization: `Bearer ${userB.body.token}` }
    });
    assert.strictEqual(repSumB.status, 404);

    const repUnknown = await fetch(`${baseUrl}/api/v1/reports/summary?farm_id=nonexistent-farm-xyz`, {
      headers: { Authorization: `Bearer ${userB.body.token}` }
    });
    assert.strictEqual(repUnknown.status, 404);

    const sensFieldB = await fetch(`${baseUrl}/api/v1/sensor-readings?field_id=${fieldA.id}`, {
      headers: { Authorization: `Bearer ${userB.body.token}` }
    });
    assert.strictEqual(sensFieldB.status, 404);

    // Anonymous telemetry list / export must NOT leak User A's private reading
    const anonReadings = await (await fetch(`${baseUrl}/api/v1/sensor-readings?limit=100`)).json();
    assert.ok(!anonReadings.readings.some((r) => r.field_id === fieldA.id), 'Private field readings leaked to anonymous GET');

    const anonExport = await (await fetch(`${baseUrl}/api/v1/reports/export?type=telemetry`)).json();
    const exportedReadings = anonExport.sensor_telemetry || anonExport.data || [];
    assert.ok(!exportedReadings.some((r) => r.field_id === fieldA.id), 'Private field readings leaked in anonymous export');
  });

  await t.test('04. Canonical Barind Silty Clay Loam FAO-56 defaults (79.0 mm TAW / 39.5 mm RAW) + explicit override parity', async () => {
    const tawDefault = await (
      await fetch(`${baseUrl}/api/v1/physics/taw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    ).json();
    assert.strictEqual(tawDefault.taw_mm, 79);
    assert.strictEqual(tawDefault.raw_mm, 39.5);

    const tawCustom = await (
      await fetch(`${baseUrl}/api/v1/physics/taw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thetaFC: 0.32, thetaWP: 0.14, rootDepthM: 0.40 })
      })
    ).json();
    assert.strictEqual(tawCustom.taw_mm, 72);

    const wbDefault = await (
      await fetch(`${baseUrl}/api/v1/physics/water-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thetaCurrent: 0.244 })
      })
    ).json();
    assert.strictEqual(wbDefault.metrics.taw_mm, 79);

    const profileRes = await (await fetch(`${baseUrl}/api/v1/sensor-readings/profile`)).json();
    assert.strictEqual(profileRes.profile.theta_sat, 0.435);
    assert.strictEqual(profileRes.profile.theta_fc, 0.323);
    assert.strictEqual(profileRes.profile.trigger_vwc, 0.244);
    assert.strictEqual(profileRes.profile.theta_wp, 0.165);
    assert.strictEqual(profileRes.profile.root_depth_m, 0.5);
    assert.strictEqual(profileRes.profile.taw_50cm_mm, 79);
    assert.strictEqual(profileRes.profile.raw_50pct_mm, 39.5);
  });

  await t.test('05. Satellite RandomForest_21Feat_Deep reconciliation, groundwater proxy & 3-tier papers provenance', async () => {
    const satMeta = await (await fetch(`${baseUrl}/api/v1/satellite/metadata`)).json();
    const metaJson = JSON.stringify(satMeta);
    assert.strictEqual(satMeta.metadata.model_name, 'RandomForest_21Feat_Deep');
    assert.ok(!metaJson.includes('97.78') && !metaJson.includes('49.67') && !metaJson.includes('0.8388'));
    assert.ok(metaJson.includes('0.8257') && metaJson.includes('84.02'));

    const gwRes = await (await fetch(`${baseUrl}/api/v1/groundwater`)).json();
    assert.strictEqual(gwRes.provenance, 'SYNTHETIC_REGIONAL_PROXY');
    assert.strictEqual(gwRes.is_simulated, true);
    assert.strictEqual(gwRes.has_physical_piezometers, false);
    assert.ok(gwRes.disclosure);

    const papersRes = await (await fetch(`${baseUrl}/api/v1/diseases/research/papers?limit=100`)).json();
    assert.strictEqual(papersRes.count, 60);
    assert.strictEqual(papersRes.total_in_pool, 60);
    assert.deepStrictEqual(papersRes.verification_tiers, {
      full_text_accessible: 48,
      abstract_confirmed: 5,
      metadata_confirmed: 7
    });

    const riskRes = await (await fetch(`${baseUrl}/api/v1/weather/risk`)).json();
    assert.ok(riskRes.risk_assessment.provenance);
    assert.ok(JSON.stringify(riskRes).includes('35'));
  });

  await t.test('06. Crop rotation assistant responses omit unsupported water-saving guarantees', async () => {
    const chatRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Recommend a Barind crop rotation alternative to Boro rice.' })
    });
    assert.strictEqual(chatRes.status, 200);
    const body = await chatRes.json();
    assert.doesNotMatch(body.response, /up to 65%|50% less|saves ~62%/i);
    assert.match(body.response, /provisional|modeled/i);
  });

  await t.test('07. Assistant route validation bounds (4000-char limit & object validation) + rate limit headers', async () => {
    const longChat = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'x'.repeat(4001) })
    });
    assert.strictEqual(longChat.status, 400);

    const longQuery = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'y'.repeat(1001) })
    });
    assert.strictEqual(longQuery.status, 400);

    const badParams = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_name: 'calculate_et0', parameters: ['bad'] })
    });
    assert.strictEqual(badParams.status, 400);

    const okQuery = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'FAO-56 TAW' })
    });
    assert.strictEqual(okQuery.status, 200);
    assert.ok(okQuery.headers.get('x-ratelimit-limit'), 'X-RateLimit-Limit header must be emitted');

    // Also confirm member 179/limit burst actually enforces 429 on assistant routes
    let hit429 = false;
    for (let i = 0; i < 35; i++) {
      const r = await fetch(`${baseUrl}/api/v1/assistant/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'FAO-56 TAW' })
      });
      if (r.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert.strictEqual(hit429, true, 'Assistant rate limiter must return HTTP 429 after quota exceeded');
  });

  await test('08. Member 2 weather heat-dryness rule boundary, sentinel & 1,827-record parity', async () => {
    const fs = require('fs');
    const path = require('path');
    const weatherRoutes = require('../routes/weatherRoutes');
    const evaluateWeatherRisk = weatherRoutes.evaluateWeatherRisk;
    assert.strictEqual(typeof evaluateWeatherRisk, 'function', 'weatherRoutes.evaluateWeatherRisk must be exported');

    // Canonical binary rule positive boundary: Tmax >= 35.0, RH <= 50.0, Rainfall <= 1.0
    const exactPositive = evaluateWeatherRisk({ t_max: 35.0, humidity: 50.0, rainfall: 1.0 });
    assert.strictEqual(exactPositive.risk_level, 'HIGH_HEAT_DRYNESS_RISK');
    assert.strictEqual(exactPositive.risk_score, 0.92);

    // Exact boundary negatives just outside each threshold
    for (const negCase of [
      { label: 't_max 34.9', input: { t_max: 34.9, humidity: 50.0, rainfall: 1.0 } },
      { label: 'humidity 50.1', input: { t_max: 35.0, humidity: 50.1, rainfall: 1.0 } },
      { label: 'rainfall 1.1', input: { t_max: 35.0, humidity: 50.0, rainfall: 1.1 } }
    ]) {
      const out = evaluateWeatherRisk(negCase.input);
      assert.notStrictEqual(out.risk_level, 'HIGH_HEAT_DRYNESS_RISK', `${negCase.label} must not trigger HIGH_HEAT_DRYNESS_RISK`);
      assert.notStrictEqual(out.risk_level, 'INSUFFICIENT_DATA');
    }

    // Project heuristic MODERATE_RISK band vs LOW_NORMAL
    const modByRh = evaluateWeatherRisk({ t_max: 33.0, humidity: 55.0, rainfall: 5.0 });
    assert.strictEqual(modByRh.risk_level, 'MODERATE_RISK');
    assert.strictEqual(modByRh.risk_score, 0.58);
    assert.match(modByRh.provenance.methodology, /project heuristic extension/i);

    const modByCdd = evaluateWeatherRisk({ t_max: 33.0, humidity: 60.0, rainfall: 5.0, consecutive_dry_days: 7 });
    assert.strictEqual(modByCdd.risk_level, 'MODERATE_RISK');

    const lowNormal = evaluateWeatherRisk({ t_max: 32.9, humidity: 55.0, rainfall: 5.0 });
    assert.strictEqual(lowNormal.risk_level, 'LOW_NORMAL');
    assert.strictEqual(lowNormal.risk_score, 0.20);

    // Missing / null / NaN / empty / -999 sentinel inputs must fail closed as INSUFFICIENT_DATA
    for (const invalidCase of [
      { t_max: 36.0, humidity: 45.0, rainfall: undefined },
      { t_max: 36.0, humidity: 45.0, rainfall: null },
      { t_max: 36.0, humidity: 45.0, rainfall: NaN },
      { t_max: 36.0, humidity: 45.0, rainfall: -999 },
      { t_max: -999, humidity: 45.0, rainfall: 0 },
      { t_max: 36.0, humidity: '', rainfall: 0 },
      null
    ]) {
      const out = evaluateWeatherRisk(invalidCase);
      assert.strictEqual(out.risk_level, 'INSUFFICIENT_DATA');
      assert.strictEqual(out.risk_score, null);
    }

    // Full 1,827 / 1,827 mathematical parity against master_database_seed.json
    const seedPath = path.join(__dirname, '../data/master_database_seed.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const dailyRecords = seedData.weather.godagari_daily_records;
    assert.strictEqual(dailyRecords.length, 1827);

    let positives = 0;
    let negatives = 0;
    let mismatches = 0;
    for (const rec of dailyRecords) {
      const evaluated = evaluateWeatherRisk(rec);
      const predictedBinary = evaluated.risk_level === 'HIGH_HEAT_DRYNESS_RISK' ? 1 : 0;
      if (predictedBinary === 1) positives++;
      else negatives++;
      if (predictedBinary !== rec.heat_drought_risk) mismatches++;
    }
    assert.strictEqual(positives, 139);
    assert.strictEqual(negatives, 1688);
    assert.strictEqual(mismatches, 0);

    // Live HTTP GET /api/v1/weather/risk smoke check
    const httpRes = await fetch(`${baseUrl}/api/v1/weather/risk`);
    assert.strictEqual(httpRes.status, 200);
    const httpBody = await httpRes.json();
    assert.strictEqual(httpBody.success, true);
    assert.strictEqual(httpBody.risk_assessment.primary_rule, 'Tmax >= 35.0°C AND RH <= 50.0% AND Rainfall <= 1.0 mm');
    assert.ok(['HIGH_HEAT_DRYNESS_RISK', 'MODERATE_RISK', 'LOW_NORMAL', 'INSUFFICIENT_DATA'].includes(httpBody.risk_assessment.risk_level));
  });

  await t.test('09. Soil parameter provenance reconciliation across seed, SQL DDL schema, physics defaults, fields & RAG KB', async () => {
    const fs = require('fs');
    const path = require('path');

    // 1. Seed canonical Member 3 provisional Silty Clay Loam parameters
    const seedPath = path.join(__dirname, '../data/master_database_seed.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const stdParams = seedData.physics.standard_parameters;
    assert.strictEqual(stdParams.godagari_soil_theta_sat, 0.435);
    assert.strictEqual(stdParams.godagari_soil_theta_fc, 0.323);
    assert.strictEqual(stdParams.godagari_soil_trigger_vwc, 0.244);
    assert.strictEqual(stdParams.godagari_soil_theta_wp, 0.165);
    assert.strictEqual(stdParams.godagari_root_depth_m, 0.5);
    assert.strictEqual(stdParams.godagari_soil_taw_50cm_mm, 79);
    assert.strictEqual(stdParams.godagari_soil_raw_50cm_mm, 39.5);

    // 2. PostgreSQL schema defaults match canonical Member 3 provisional values (no stale 0.3200 / 0.1400 / 0.400)
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    assert.match(schemaSql, /soil_type\s+TEXT\s+NOT NULL\s+DEFAULT\s+'silty_clay_loam'/);
    assert.match(schemaSql, /theta_fc\s+NUMERIC\(6,4\)\s+NOT NULL\s+DEFAULT\s+0\.3230/);
    assert.match(schemaSql, /theta_wp\s+NUMERIC\(6,4\)\s+NOT NULL\s+DEFAULT\s+0\.1650/);
    assert.match(schemaSql, /root_depth_m\s+NUMERIC\(6,3\)\s+NOT NULL\s+DEFAULT\s+0\.500/);
    assert.doesNotMatch(schemaSql, /theta_fc[\s\S]*DEFAULT\s+0\.3200/);
    assert.doesNotMatch(schemaSql, /theta_wp[\s\S]*DEFAULT\s+0\.1400/);

    // 3. Public demo plot A-1 matches canonical defaults over HTTP
    const fieldRes = await fetch(`${baseUrl}/api/v1/fields/field-godagari-a`);
    assert.strictEqual(fieldRes.status, 200);
    const fieldBody = await fieldRes.json();
    assert.strictEqual(fieldBody.field.soil_type, 'silty_clay_loam');
    assert.strictEqual(fieldBody.field.theta_fc, 0.323);
    assert.strictEqual(fieldBody.field.theta_wp, 0.165);
    assert.strictEqual(fieldBody.field.root_depth_m, 0.5);

    // 4. Water-balance default call yields TAW 79 mm & RAW 39.5 mm
    const wbRes = await fetch(`${baseUrl}/api/v1/physics/water-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thetaCurrent: 0.244 })
    });
    assert.strictEqual(wbRes.status, 200);
    const wbBody = await wbRes.json();
    assert.strictEqual(wbBody.metrics.taw_mm, 79);
    assert.strictEqual(wbBody.metrics.raw_mm, 39.5);

    // 5. Persisted RAG knowledge base aligns with 0.323 / 0.165 and never conflates 0.408 PM radiation factor with theta_fc
    const kbPath = path.join(__dirname, '../data/rag_knowledge_base.json');
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    const chunks = Array.isArray(kb) ? kb : (kb.chunks || []);
    const barindChunk = chunks.find((c) => c.id === 'chunk-barind-env-01');
    const sensorChunk = chunks.find((c) => c.id === 'chunk-sensor-iot-01');
    assert.ok(barindChunk && sensorChunk, 'Soil/IoT RAG chunks must exist in rag_knowledge_base.json');
    for (const chunk of [barindChunk, sensorChunk]) {
      assert.match(chunk.content, /0\.323/);
      assert.match(chunk.content, /0\.165/);
      assert.match(chunk.content, /0\.435/);
      assert.match(chunk.content, /0\.244/);
      assert.match(chunk.content, /79\.0 mm/);
      assert.doesNotMatch(chunk.content, /theta_fc\s*=\s*0\.408/i);
      assert.doesNotMatch(chunk.content, /theta_wp\s*=\s*0\.250/i);
    }
  });
});
