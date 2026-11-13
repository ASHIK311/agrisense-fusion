/**
 * AgriSense Fusion - Full API Integration Test Suite
 * Validates all unified /api/v1/* endpoints across all 6 Member domains.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const __tmpStoreDir = (() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-api-test-'));
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

let server;
let baseUrl;
let authToken;

before(async () => {
  await new Promise((resolve) => {
    // Listen on dynamic ephemeral port
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

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, body, headers: response.headers };
}

describe('AgriSense Fusion Core API v1 Integration Suite', () => {

  test('01. GET /api/health reports healthy, SQLite WAL engine, and active member features', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.match(res.body.storageMode, /SQLite|PostgreSQL/i);
    assert.equal(res.body.dbConnected, true);
    assert.ok(res.body.sqliteDiagnostics?.table_counts?.farms >= 3);
    assert.equal(res.body.features.member1_satellite_gis, true);
    assert.equal(res.body.features.member2_weather_risk, true);
    assert.equal(res.body.features.member5_fao56_physics_water_balance, true);
    assert.equal(res.body.features.member6_disease_knowledge_base, true);
  });

  test('02. POST /api/v1/auth/register registers a new user', async () => {
    const uniqueEmail = `farmer-${Date.now()}@agrisense.barind`;
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'securePassword123!',
        fullName: 'Md. Tariqul Islam',
        role: 'farmer',
        organization: 'Barind Agro Cooperative'
      })
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Token must be issued');
    assert.equal(res.body.user.role, 'farmer');
    authToken = res.body.token; // Save for subsequent calls
  });

  test('03. GET /api/v1/auth/me returns authenticated user profile', async () => {
    const res = await request('/api/v1/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.full_name, 'Md. Tariqul Islam');
  });

  test('04. GET /api/v1/farms lists demonstration farms', async () => {
    const res = await request('/api/v1/farms');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.farms.length >= 3, 'Must have at least 3 demo farms');
    assert.ok(res.body.farms.some((f) => f.id === 'farm-barind-01'));
  });

  test('05. GET /api/v1/farms/:id returns details with fields and groundwater', async () => {
    const res = await request('/api/v1/farms/farm-barind-01');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.farm.district, 'Rajshahi');
    assert.ok(res.body.fields.length >= 1);
  });

  test('06. GET /api/v1/fields lists agricultural fields', async () => {
    const res = await request('/api/v1/fields');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.fields.length >= 2);
  });

  test('07. GET /api/v1/weather/history returns historical NASA POWER data', async () => {
    const res = await request('/api/v1/weather/history?limit=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 10);
    assert.ok(res.body.summary.total_days >= 1800, 'Must have 5 full years');
  });

  test('08. GET /api/v1/weather/risk evaluates Member 2 compound risk', async () => {
    const res = await request('/api/v1/weather/risk');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.risk_assessment.risk_level);
    assert.ok(res.body.risk_assessment.provenance);
  });

  test('09. POST /api/v1/sensor-readings ingests calibrated ESP32 telemetry', async () => {
    const eventId = `evt-test-${Date.now()}`;
    const res = await request('/api/v1/sensor-readings', {
      method: 'POST',
      body: JSON.stringify({
        device_id: 'esp32-node-raj-01',
        event_id: eventId,
        observed_at: new Date().toISOString(),
        field_id: 'field-godagari-a',
        soil_moisture_vwc: 0.245,
        soil_temp_c: 25.4,
        air_temp_c: 28.2,
        relative_humidity_pct: 72.0,
        soil_ph: 6.4,
        battery_v: 3.95
      })
    });
    assert.ok(res.status === 200 || res.status === 201, `Status was ${res.status}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.is_simulated, true);

    // Test duplicate detection (HTTP 409)
    const dupRes = await request('/api/v1/sensor-readings', {
      method: 'POST',
      body: JSON.stringify({
        device_id: 'esp32-node-raj-01',
        event_id: eventId,
        observed_at: new Date().toISOString(),
        soil_moisture_vwc: 0.245
      })
    });
    assert.equal(dupRes.status, 409);
  });

  test('10. GET /api/v1/satellite/metadata returns Member 1 validated metrics', async () => {
    const res = await request('/api/v1/satellite/metadata');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.metadata.verified_performance.block_c_holdout_overall_accuracy, 85.77);
    assert.equal(res.body.metadata.verified_performance.block_c_pure_interior_accuracy, 90.64);
    assert.equal(res.body.metadata.runtime_exported_subset?.rf_21feat_subset?.trees_exported, 35);
    assert.equal(res.body.metadata.runtime_exported_subset?.rf_21feat_subset?.total_trained_trees, 250);
    assert.equal(res.body.metadata.runtime_exported_subset?.rf_21feat_subset?.block_c_holdout_overall_accuracy, 85.47);
    assert.equal(res.body.metadata.runtime_exported_subset?.rf_15feat_subset?.block_c_holdout_overall_accuracy, 83.98);
  });

  test('11. POST /api/v1/satellite/classify executes serialized Random Forest ensemble (15-feat & 21-feat)', async () => {
    const croplandFeatures = [
      0.045, 0.078, 0.062, 0.345, 0.182, // B02, B03, B04, B08, B11
      0.695, -0.631, 0.309, 0.542, 0.285, // Indices
      0.180, 0.720, 0.540, 0.245, 0.190  // Temporal stats
    ];
    const res = await request('/api/v1/satellite/classify', {
      method: 'POST',
      body: JSON.stringify({ features: croplandFeatures, parcel_id: 'field-godagari-a' })
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.source === 'MEMBER_1_RANDOM_FOREST_ENSEMBLE_ENGINE' || res.body.source === 'MEMBER_1_FASTAPI_LIVE');
    assert.equal(res.body.prediction.class_label, 'Cropland');
    assert.ok(res.body.prediction.confidence > 0.5);
    assert.equal(res.body.provenance?.trees_evaluated, 35);
    assert.equal(res.body.provenance?.total_trained_trees, 180);
    assert.equal(res.body.provenance?.runtime_subset_metrics?.block_c_overall_accuracy, 83.98);

    // Permanent water vector check through trained decision trees
    const waterFeatures = [
      0.068, 0.095, 0.055, 0.038, 0.025,
      -0.43, 0.428, 0.206, -0.061, -0.08,
      -0.25, 0.05, 0.30, 0.12, -0.04
    ];
    const waterRes = await request('/api/v1/satellite/classify', {
      method: 'POST',
      body: JSON.stringify({ features: waterFeatures, parcel_id: 'pond-01' })
    });
    assert.equal(waterRes.status, 200);
    assert.equal(waterRes.body.prediction.class_label, 'Permanent_Water');
    assert.ok(waterRes.body.prediction.confidence > 0.85);

    // Genuine 21-feature Random Forest inference check + Block C holdout sample vector parity
    const fs = require('fs');
    const path = require('path');
    const { classifyFeatures } = require('../services/satelliteClassifier');
    const sampleBundlePath = path.join(
      __dirname,
      '../../research/member_01_satellite_gis/reports/final_audit/block_c_holdout_sample_vectors.json'
    );
    const sampleBundle = JSON.parse(fs.readFileSync(sampleBundlePath, 'utf-8'));
    assert.equal(sampleBundle.samples.length, 40);

    const sample21 = sampleBundle.samples[0];
    const res21 = await request('/api/v1/satellite/classify', {
      method: 'POST',
      body: JSON.stringify({ features: sample21.features_21, parcel_id: 'block-c-holdout-21' })
    });
    assert.equal(res21.status, 200);
    assert.equal(res21.body.source, 'MEMBER_1_RANDOM_FOREST_ENSEMBLE_ENGINE');
    assert.equal(res21.body.prediction.class_id, sample21.pred_runtime_21);
    assert.equal(res21.body.provenance?.feature_count, 21);
    assert.equal(res21.body.provenance?.model_name, 'RandomForest_21Feat_Deep_RuntimeEnsemble');
    assert.equal(res21.body.provenance?.trees_evaluated, 35);
    assert.equal(res21.body.provenance?.total_trained_trees, 250);
    assert.equal(res21.body.provenance?.runtime_subset_metrics?.block_c_overall_accuracy, 85.47);
    assert.equal(res21.body.provenance?.runtime_subset_metrics?.agreement_with_full_pkl_pct, 97);
    assert.equal(res21.body.provenance?.offline_full_model_metrics?.block_c_overall_accuracy, 85.77);

    // Cross-check all 40 real Block C holdout sample vectors against Python evaluation output
    for (const vec of sampleBundle.samples) {
      const pred21 = classifyFeatures(vec.features_21);
      const pred15 = classifyFeatures(vec.features_15);
      assert.equal(pred21.class_id, vec.pred_runtime_21);
      assert.equal(pred15.class_id, vec.pred_runtime_15);
    }

    // Re-execute serialized 35-tree ensembles in Node.js across ALL 6,000 Block C holdout feature vectors
    const features6000Path = path.join(
      __dirname,
      '../../research/member_01_satellite_gis/reports/final_audit/block_c_holdout_6000_features.csv'
    );
    const featLines = fs.readFileSync(features6000Path, 'utf-8').trim().split(/\r?\n/);
    assert.equal(featLines.length, 6001);
    const featHeaders = featLines[0].split(',');
    const idx21 = sampleBundle.feature_names_21.map((fn) => featHeaders.indexOf(fn));
    const idx15 = sampleBundle.feature_names_15.map((fn) => featHeaders.indexOf(fn));
    const yTrueCol = featHeaders.indexOf('y_true');
    const full21Col = featHeaders.indexOf('pred_full_21feat_250t');
    const full15Col = featHeaders.indexOf('pred_full_15feat_180t');

    let correct21 = 0;
    let agree21 = 0;
    let correct15 = 0;
    let agree15 = 0;
    for (let i = 1; i < featLines.length; i += 1) {
      const cells = featLines[i].split(',');
      const vec21 = idx21.map((c) => Number(cells[c]));
      const vec15 = idx15.map((c) => Number(cells[c]));
      const yTrue = Number(cells[yTrueCol]);
      const full21 = Number(cells[full21Col]);
      const full15 = Number(cells[full15Col]);

      const pred21 = classifyFeatures(vec21);
      const pred15 = classifyFeatures(vec15);
      if (pred21.class_id === yTrue) correct21 += 1;
      if (pred21.class_id === full21) agree21 += 1;
      if (pred15.class_id === yTrue) correct15 += 1;
      if (pred15.class_id === full15) agree15 += 1;
    }
    assert.equal(correct21, 5128);
    assert.equal(agree21, 5820);
    assert.equal(correct15, 5039);
    assert.equal(agree15, 5784);
  });

  test('12. GET /api/v1/agronomy/suitability returns BARC AEZ 26 crop ratings', async () => {
    const res = await request('/api/v1/agronomy/suitability');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.suitability.length > 0);
  });

  test('13. POST /api/v1/physics/water-balance calculates FAO-56 depletion and Ks', async () => {
    const res = await request('/api/v1/physics/water-balance', {
      method: 'POST',
      body: JSON.stringify({
        weather: {
          tMean: 26.5,
          tMax: 32.0,
          tMin: 21.0,
          rhMean: 65.0,
          solarRadiationMJ: 18.5,
          windSpeed10m: 2.2,
          latitude: 24.469,
          elevationM: 28.0
        },
        soil: {
          thetaFC: 0.32,
          thetaWP: 0.14,
          rootDepthM: 0.40,
          theta: 0.22
        },
        crop: {
          kc: 1.05,
          depletionFraction: 0.50
        }
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.metrics.taw_mm, 72.0);
    assert.ok(res.body.metrics.et0_mm_day > 0);
    assert.ok(res.body.metrics.etc_mm_day > 0);
  });

  test('14. GET /api/v1/diseases lists 17 validated Bangladesh diseases', async () => {
    const res = await request('/api/v1/diseases');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.total, 17);
  });

  test('15. GET /api/v1/diseases/research/papers returns 60 verified papers with DOIs', async () => {
    const res = await request('/api/v1/diseases/research/papers');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 60);
    assert.equal(res.body.all_dois_verified, true);
  });

  test('16. GET /api/v1/diseases/screen/environmental screens microclimate risk', async () => {
    const res = await request('/api/v1/diseases/screen/environmental?crop=Rice&temp_c=28&rh_pct=85&leaf_wetness_hours=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.screened_diseases.length > 0);
    assert.ok(res.body.screened_diseases[0].risk_level);
  });

  test('17. GET /api/v1/alerts lists system alerts', async () => {
    const res = await request('/api/v1/alerts');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.total >= 1);
  });

  test('18. GET /api/v1/groundwater returns BMDA deep tubewell readings', async () => {
    const res = await request('/api/v1/groundwater');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.readings.length >= 2);
  });

  test('19. GET /api/v1/reports/summary generates consolidated agronomic report', async () => {
    const res = await request('/api/v1/reports/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.report.report_id);
    assert.ok(res.body.report.satellite_intelligence);
    assert.ok(res.body.report.physics_water_balance);
  });

  test('20. GET /api/v1/dashboard aggregates live system state for UI', async () => {
    const res = await request('/api/v1/dashboard');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.farm);
    assert.ok(res.body.field);
    assert.ok(res.body.weather);
    assert.ok(res.body.physics);
    assert.ok(res.body.sensor);
  });

  test('21. GET /api/v1/satellite/scenes loads Sentinel-2 metadata from 407-scene CSV catalog', async () => {
    const res = await request('/api/v1/satellite/scenes?limit=8&max_cloud_pct=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.total_catalog_scenes >= 400, `Expected >=400 scenes, got ${res.body.total_catalog_scenes}`);
    assert.equal(res.body.scenes.length, 8);
    assert.ok(res.body.scenes[0].scene_id.startsWith('S2'));
    assert.ok(res.body.scenes[0].cloud_pct <= 10);
  });

});
