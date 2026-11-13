/**
 * Live End-to-End Workflow Audit with Strict Content Assertions (P1-07)
 * Verifies HTTP status codes, non-null domain fields, scientific disclosures, and numeric invariants across all 11 critical workflows.
 */
const http = require('http');
const assert = require('node:assert/strict');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const AUDIT_PORT = Number(process.env.AUDIT_PORT || process.env.PORT || 5000);

async function runAudit() {
  console.log('=== STARTING 11 CRITICAL WORKFLOWS LIVE AUDIT (STRICT CONTENT ASSERTIONS) ===');

  // Workflow 1: Register and login
  const regEmail = `auditor_${Date.now()}@agrisense.test`;
  const regRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: regEmail,
    password: 'SecurePassword123!',
    fullName: 'Independent Forensic Auditor',
    role: 'researcher',
    affiliation: 'NASA Space Apps Audit Team'
  });
  assert.strictEqual(regRes.status, 201, 'W1: Auth Register must return 201');
  assert.ok(regRes.body?.token && regRes.body.token.length > 20, 'W1: Must return valid JWT token');
  assert.strictEqual(regRes.body?.user?.email, regEmail, 'W1: User email must match');
  console.log('1. Auth Register ->', regRes.status, 'TOKEN VERIFIED | User:', regRes.body.user.email);
  const token = regRes.body.token;

  // Workflow 2: Create Farm
  const farmRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/farms',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    name: 'Godagari Pilot Plot 402',
    district: 'Rajshahi',
    upazila: 'Godagari',
    aez_code: 'AEZ-26',
    latitude: 24.471,
    longitude: 88.332,
    elevation_m: 28.5
  });
  assert.strictEqual(farmRes.status, 201, 'W2: Create Farm must return 201');
  assert.ok(farmRes.body?.farm?.id, 'W2: Farm ID must be non-null');
  assert.strictEqual(farmRes.body.farm.is_demo, false, 'W2: Created farm must be tenant-owned (is_demo: false)');
  const farmId = farmRes.body.farm.id;
  console.log('2. Create Farm ->', farmRes.status, 'FarmId:', farmId);

  // Workflow 3: Create Field
  const fieldRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/fields',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    farm_id: farmId,
    name: 'Block-D Rabi Wheat Trial',
    current_crop: 'Wheat',
    area_m2: 18000,
    soil_type: 'clay_loam',
    theta_fc: 0.32,
    theta_wp: 0.14,
    root_depth_m: 0.40
  });
  assert.strictEqual(fieldRes.status, 201, 'W3: Create Field must return 201');
  assert.ok(fieldRes.body?.field?.id, 'W3: Field ID must be non-null');
  assert.strictEqual(fieldRes.body.field.farm_id, farmId, 'W3: Field must link to parent farmId');
  const fieldId = fieldRes.body.field.id;
  console.log('3. Create Field ->', fieldRes.status, 'FieldId:', fieldId);

  // Workflow 4: Assign Crop & Query Suitability
  const suitRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/agronomy/suitability?upazila=Godagari',
    method: 'GET'
  });
  assert.strictEqual(suitRes.status, 200, 'W4: Agronomy Suitability must return 200');
  assert.ok(Array.isArray(suitRes.body?.suitability) && suitRes.body.suitability.length >= 5, 'W4: Must return >= 5 BARC AEZ-26 crops');
  console.log('4. Agronomy Suitability ->', suitRes.status, `Returned ${suitRes.body.suitability.length} crops`);

  // Workflow 5: Retrieve Weather & Compound Risk
  const weatherRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/weather/risk',
    method: 'GET'
  });
  assert.strictEqual(weatherRes.status, 200, 'W5: Weather Risk must return 200');
  assert.ok(weatherRes.body?.risk_assessment?.risk_level, 'W5: Risk level must be non-null');
  const gridPoint = weatherRes.body?.risk_assessment?.provenance?.grid_point || weatherRes.body?.station;
  assert.strictEqual(gridPoint?.latitude, 24.3636, 'W5: Station latitude must be 24.3636');
  assert.strictEqual(gridPoint?.longitude, 88.6241, 'W5: Station longitude must be 88.6241');
  assert.strictEqual(gridPoint?.distance_to_godagari_km, 34.8, 'W5: Distance to Godagari must be 34.8 km');
  console.log('5. Weather Risk ->', weatherRes.status, 'Risk Level:', weatherRes.body.risk_assessment.risk_level, '| Station: 24.3636°N, 88.6241°E (34.8 km ESE)');

  // Workflow 6: Retrieve Satellite Metadata & Classification
  const satRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/satellite/metadata',
    method: 'GET'
  });
  assert.strictEqual(satRes.status, 200, 'W6: Satellite Metadata must return 200');
  const modelName = satRes.body?.metadata?.model_name;
  assert.ok(modelName && modelName !== 'N/A', 'W6: Satellite model_name must never be N/A');
  assert.strictEqual(modelName, 'RandomForest_21Feat_Deep');
  assert.strictEqual(satRes.body.metadata.spatial_cv_accuracy, '84.63% +/- 3.81%');
  assert.strictEqual(satRes.body.metadata.spatial_cv_macro_f1, '0.8342 +/- 0.0194');
  assert.strictEqual(satRes.body.metadata.spatial_cv_balanced_accuracy, '84.37% +/- 1.16%');
  assert.strictEqual(satRes.body.metadata.block_c_holdout_overall_accuracy, 85.77);
  assert.strictEqual(satRes.body.metadata.block_c_pure_interior_accuracy, 90.64);
  assert.strictEqual(satRes.body.metadata.block_c_boundary_mixed_accuracy, 75.92);
  console.log('6. Satellite Metadata ->', satRes.status, 'Model:', modelName, '| Spatial CV:', satRes.body.metadata.spatial_cv_accuracy, '| Block C Holdout:', satRes.body.metadata.block_c_holdout_overall_accuracy + '%');

  // Workflow 7: Ingest Sensor Reading (using authorized bearer token)
  const eventId = `LIVE-AUDIT-${Date.now()}`;
  const sensorRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/sensor-readings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    event_id: eventId,
    device_id: 'ESP32-NODE-01',
    sensor_id: 'FDR-CLAY-01',
    soil_moisture_vwc: 0.24,
    soil_temperature_c: 26.2,
    battery_voltage_v: 3.85,
    field_id: fieldId
  });
  assert.strictEqual(sensorRes.status, 201, 'W7: Sensor Ingestion must return 201');
  assert.strictEqual(sensorRes.body?.reading?.is_simulated, true, 'W7: Reading must carry is_simulated: true');
  assert.strictEqual(sensorRes.body?.reading?.calibration_status, 'UNCALIBRATED', 'W7: Reading must carry calibration_status: UNCALIBRATED');
  console.log('7. Sensor Ingestion ->', sensorRes.status, 'Simulated:', sensorRes.body.reading.is_simulated, '| Calibration:', sensorRes.body.reading.calibration_status);

  // Workflow 8: Calculate Water Balance (FAO-56)
  const wbRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/physics/water-balance',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
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
  });
  assert.strictEqual(wbRes.status, 200, 'W8: Physics Water Balance must return 200');
  assert.ok(wbRes.body?.metrics?.et0_mm_day > 3.0 && wbRes.body?.metrics?.et0_mm_day < 6.0, 'W8: ET0 must be in physical range [3.0, 6.0]');
  assert.strictEqual(wbRes.body?.metrics?.taw_mm, 72, 'W8: TAW must equal 72 mm');
  assert.strictEqual(wbRes.body?.metrics?.raw_mm, 36, 'W8: RAW must equal 36 mm');
  assert.strictEqual(wbRes.body?.metrics?.depletion_mm, 40, 'W8: Depletion must equal 40 mm');
  assert.strictEqual(wbRes.body?.metrics?.irrigation_needed, true, 'W8: Irrigation needed must be true when Dr (40) >= RAW (36)');
  console.log('8. Physics Water Balance ->', wbRes.status, 'ET0:', wbRes.body.metrics.et0_mm_day, 'mm/day | Depletion:', wbRes.body.metrics.depletion_mm, 'mm | TAW:', wbRes.body.metrics.taw_mm, 'mm');

  // Workflow 9: Run Disease Environmental Screening (including soil-borne Potato Bacterial Wilt)
  const diseaseRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/diseases/screen/environmental?crop=Potato&temp=24&rh=85&soil_temp=29&soil_moisture=0.35',
    method: 'GET'
  });
  assert.strictEqual(diseaseRes.status, 200, 'W9: Disease Screening must return 200');
  assert.ok(Array.isArray(diseaseRes.body?.screened_diseases) && diseaseRes.body.screened_diseases.length >= 2, 'W9: Must return Potato diseases');
  const bacterialWilt = diseaseRes.body.screened_diseases.find((d) => d.disease_id === 'DIS_POTATO_002');
  assert.ok(bacterialWilt, 'W9: Must include Potato Bacterial Wilt (DIS_POTATO_002)');
  assert.strictEqual(bacterialWilt.leaf_wetness_applicable, false, 'W9: Soil-borne Potato Bacterial Wilt must have leaf_wetness_applicable: false');
  assert.strictEqual(bacterialWilt.infection_pathway, 'soil_borne_root_vascular');
  assert.strictEqual(bacterialWilt.risk_level, 'HIGH', 'W9: Soil temp 29°C and VWC 0.35 must trigger HIGH risk for DIS_POTATO_002');
  console.log('9. Disease Screening ->', diseaseRes.status, 'Screened count:', diseaseRes.body.screened_diseases.length, '| DIS_POTATO_002 Risk:', bacterialWilt.risk_level, '(soil-borne, leaf_wetness_applicable=false)');

  // Workflow 10: Generate Recommendations (Crop Rotation Engine)
  const recRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/rotation/compare',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    weights: { water: 0.7, economic: 0.2, soilHealth: 0.1 }
  });
  assert.strictEqual(recRes.status, 200, 'W10: Crop Rotation Engine must return 200');
  const topRotationName = recRes.body?.rankings?.[0]?.name || recRes.body?.topRecommendation?.name;
  assert.ok(topRotationName && topRotationName !== 'N/A', 'W10: Top Rotation name must never be N/A');
  assert.strictEqual(recRes.body?.metadata?.isProvisional, true, 'W10: Rotations must be flagged isProvisional: true');
  console.log('10. Crop Rotation Engine ->', recRes.status, 'Top Rotation:', topRotationName, '| Score:', recRes.body.rankings[0].scores.composite);

  // Workflow 11: Generate Consolidated Report
  const reportRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/reports/summary',
    method: 'GET'
  });
  assert.strictEqual(reportRes.status, 200, 'W11: Consolidated Report must return 200');
  assert.ok(reportRes.body?.report?.report_id, 'W11: Report ID must be non-null');
  console.log('11. Consolidated Report ->', reportRes.status, 'Report ID:', reportRes.body.report.report_id);

  // Explicit Scientific Gate Assertions (422 & 501)
  const cropGateRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/satellite/classify-crop',
    method: 'POST'
  });
  assert.strictEqual(cropGateRes.status, 422, 'Gate: /satellite/classify-crop must return 422 BLOCKED');

  const yieldGateRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/agronomy/predict-yield',
    method: 'POST'
  });
  assert.strictEqual(yieldGateRes.status, 501, 'Gate: /agronomy/predict-yield must return 501 NOT_IMPLEMENTED');

  const forecastGateRes = await request({
    hostname: 'localhost',
    port: AUDIT_PORT,
    path: '/api/v1/weather/forecast',
    method: 'GET'
  });
  assert.strictEqual(forecastGateRes.status, 501, 'Gate: /weather/forecast must return 501 NOT_IMPLEMENTED');

  console.log('12. Scientific Gates Verified -> /satellite/classify-crop (422), /agronomy/predict-yield (501), /weather/forecast (501)');
  console.log('=== ALL 11 CRITICAL WORKFLOWS + 3 SCIENTIFIC GATES PASSED STRICT CONTENT ASSERTIONS ===');
}

runAudit().catch((err) => {
  console.error('LIVE WORKFLOW AUDIT FAILED:', err);
  process.exit(1);
});
