/**
 * AgriSense Fusion - Unit Test Suite
 * Executed with Node.js built-in test runner: node --test server/tests/unit.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  saturationVapourPressure,
  slopeVapourPressureCurve,
  calculateReferenceET,
  calculateCropET
} = require('../physics/penmanMonteith');

const {
  calculateTAW,
  calculateRootZoneDepletion,
  calculateWaterStressKs,
  calculateDailyWaterBalance
} = require('../physics/waterBalance');

const sensorService = require('../services/sensorService');
const { evaluateCropRotations } = require('../decision/cropRotationEngine');

describe('Physics Engine: FAO-56 Penman-Monteith ET0', () => {
  test('saturationVapourPressure returns expected values for standard temperatures', () => {
    // At 20°C, es should be ~2.34 kPa
    const es20 = saturationVapourPressure(20);
    assert.ok(Math.abs(es20 - 2.338) < 0.05, `Expected ~2.34 kPa, got ${es20}`);

    // At 30°C, es should be ~4.24 kPa
    const es30 = saturationVapourPressure(30);
    assert.ok(Math.abs(es30 - 4.24) < 0.05, `Expected ~4.24 kPa, got ${es30}`);
  });

  test('calculateReferenceET produces realistic reference ET for Northern Bangladesh', () => {
    // Typical sub-tropical day: 28°C, 75% RH, 18 MJ/m2 solar, 2.5 m/s wind
    const result = calculateReferenceET({
      tMean: 28,
      rhMean: 75,
      solarRadiationMJ: 18,
      windSpeed10m: 2.5,
      elevationM: 25
    });

    assert.ok(result.et0 !== null, 'ET0 should not be null');
    assert.ok(result.et0 > 2.5 && result.et0 < 7.0, `ET0 should be in realistic range (3-6 mm/day), got ${result.et0}`);
    assert.strictEqual(result.confidence, 'medium', 'Should note wind 10m to 2m conversion warning');
  });

  test('calculateReferenceET fails gracefully on missing inputs', () => {
    const result = calculateReferenceET({ tMean: null });
    assert.strictEqual(result.et0, null);
    assert.strictEqual(result.confidence, 'insufficient_data');
    assert.ok(result.warnings.length > 0);
  });

  test('calculateCropET correctly scales by Kc', () => {
    const et0 = 4.0;
    const kc = 1.15;
    const cropEt = calculateCropET(et0, kc);
    assert.strictEqual(cropEt.etc, 4.6);
  });
});

describe('Physics Engine: Soil Water Balance & Depletion', () => {
  test('calculateTAW correctly calculates total available water', () => {
    // thetaFC = 0.32, thetaWP = 0.14, Zr = 0.40 m -> TAW = 1000 * 0.18 * 0.40 = 72 mm
    const taw = calculateTAW(0.32, 0.14, 0.40);
    assert.strictEqual(taw, 72);
  });

  test('calculateRootZoneDepletion reports correct depletion and status', () => {
    const taw = 72;
    // theta = 0.23 (depletion = 1000 * (0.32 - 0.23) * 0.4 = 36 mm -> exactly 50%)
    const res = calculateRootZoneDepletion(0.32, 0.23, 0.40, taw);
    assert.strictEqual(res.depletionMm, 36);
    assert.strictEqual(res.depletionPct, 50);
    assert.strictEqual(res.waterStatus, 'optimal');

    // severe drought: theta = 0.13 (below wilting point 0.14)
    const severe = calculateRootZoneDepletion(0.32, 0.13, 0.40, taw);
    assert.strictEqual(severe.waterStatus, 'wilting_danger');
    assert.strictEqual(severe.depletionMm, taw); // clamped to TAW
  });

  test('calculateDailyWaterBalance accounts for rainfall infiltration and percolation', () => {
    const bal = calculateDailyWaterBalance({
      drPrevious: 30,
      etc: 4.5,
      precipitationMm: 15,
      irrigationMm: 0,
      taw: 60
    });

    // Peff should be ~10-12 mm, reducing Dr
    assert.ok(bal.peff > 0, 'Rainfall should produce effective precipitation');
    assert.ok(bal.drNext < 30, 'Depletion should decrease after rain');
  });
});

describe('ESP32 Sensor Ingestion Service', () => {
  test('accepts valid sensor payload with proper identifiers', () => {
    const uniqueEvent = `test-evt-${Date.now()}-${Math.random()}`;
    const result = sensorService.ingestReading({
      device_id: 'esp32-node-raj-01',
      event_id: uniqueEvent,
      observed_at: new Date().toISOString(),
      soil_moisture_vwc: 0.245,
      soil_temp_c: 27.5,
      air_temp_c: 30.1,
      relative_humidity_pct: 71.0,
      soil_ph: 6.5,
      is_simulated: true
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.statusCode, 201);
    assert.strictEqual(result.reading.soil_moisture_vwc, 0.245);
  });

  test('rejects duplicate event_id with HTTP 409', () => {
    const duplicateEvent = `duplicate-test-${Date.now()}`;
    // Ingest first
    sensorService.ingestReading({
      device_id: 'esp32-node-raj-01',
      event_id: duplicateEvent,
      observed_at: new Date().toISOString(),
      soil_moisture_vwc: 0.20
    });

    // Ingest again with same event_id
    const duplicateResult = sensorService.ingestReading({
      device_id: 'esp32-node-raj-01',
      event_id: duplicateEvent,
      observed_at: new Date().toISOString(),
      soil_moisture_vwc: 0.22
    });

    assert.strictEqual(duplicateResult.success, false);
    assert.strictEqual(duplicateResult.statusCode, 409);
    assert.strictEqual(duplicateResult.error, 'DUPLICATE_EVENT_ID');
  });

  test('rejects out-of-range sensor readings', () => {
    const invalidResult = sensorService.ingestReading({
      device_id: 'esp32-node-raj-01',
      event_id: `invalid-range-${Date.now()}`,
      soil_moisture_vwc: 2.5, // > 1.0 impossible VWC
      relative_humidity_pct: 120 // > 100% impossible
    });

    assert.strictEqual(invalidResult.success, false);
    assert.strictEqual(invalidResult.statusCode, 422);
    assert.ok(invalidResult.errors.length >= 2);
  });
});

describe('Crop-Rotation Explorer Multi-Criteria Engine', () => {
  test('ranks water-smart rotations at #1 when water conservation weight is high', () => {
    const result = evaluateCropRotations({
      weights: {
        waterConservation: 90,
        soilHealth: 10,
        heatResilience: 10,
        economicPreference: 10
      },
      soilInfo: { soilType: 'clay_loam', ph: 6.4 },
      previousCrops: ['T_AMAN_RICE']
    });

    assert.ok(result.rankedRotations.length >= 4);
    const top = result.topRecommendation;
    // Top recommendation should be either Mustard-Mung-Aman or Lentil-Aman, NEVER Boro monoculture
    assert.ok(
      top.id === 'rot-legume-pulse-water-smart' || top.id === 'rot-lentil-aman',
      `Expected water-smart rotation, got: ${top.name}`
    );
    // Boro Rice monoculture should be near bottom for water conservation
    const boroRank = result.rankedRotations.find((r) => r.id === 'rot-boro-fallow-aman')?.rank;
    assert.ok(boroRank >= 5, `Boro monoculture should rank near bottom, got rank ${boroRank}`);
  });

  test('ranks commercial cash crop higher when economic weight is prioritized', () => {
    const econResult = evaluateCropRotations({
      weights: {
        waterConservation: 5,
        soilHealth: 5,
        heatResilience: 10,
        economicPreference: 90
      },
      soilInfo: { soilType: 'clay_loam', ph: 6.4 },
      previousCrops: ['T_AMAN_RICE']
    });

    const top = econResult.topRecommendation;
    // When economic profit is prioritized, Maize or Potato rotations should lead
    assert.ok(
      top.id === 'rot-maize-mung-aman' || top.id === 'rot-potato-mung-aman',
      `Expected commercial rotation to lead with high economic weight, got: ${top.name}`
    );
  });

  test('generates transparent reason codes and explanations', () => {
    const result = evaluateCropRotations();
    const first = result.rankedRotations[0];
    assert.ok(first.explanations.length > 0, 'Should include human-readable explanations');
    assert.ok(first.reasonCodes.length > 0, 'Should include machine reason codes');
    assert.ok(first.scores.composite > 0, 'Should have valid composite score');
  });
});
