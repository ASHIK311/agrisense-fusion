/**
 * Cross-Language Numerical Parity Test: Node.js vs Member 5 Python FAO-56 Engine
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { calculateReferenceET } = require('../physics/penmanMonteith');

describe('FAO-56 Node-Python Cross-Language Numerical Parity', () => {
  const benchmarkPath = path.join(__dirname, 'fao56_benchmark.json');
  const testCases = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

  for (const tc of testCases) {
    test(`Parity Check: ${tc.name}`, () => {
      const p = tc.input;
      const res = calculateReferenceET({
        date: p.date_val,
        tMax: p.t_max,
        tMin: p.t_min,
        solarRadiationMJ: p.rs_mj,
        rhMean: p.rh_mean,
        windSpeed10m: p.wind_speed,
        latitude: p.latitude_deg,
        elevationM: p.elevation_m
      });

      assert.ok(res.et0 !== null, 'ET0 should not be null');
      const expected = tc.expected_python;

      // Check ET0 within 0.05 mm/day
      const et0Diff = Math.abs(res.et0 - expected.et0);
      assert.ok(
        et0Diff <= 0.05,
        `ET0 mismatch in ${tc.name}: node=${res.et0}, python=${expected.et0}, diff=${et0Diff}`
      );

      // Check Net radiation Rn within 0.15 MJ/m2/day
      const rnDiff = Math.abs(res.details.rn - expected.rn);
      assert.ok(
        rnDiff <= 0.15,
        `Rn mismatch in ${tc.name}: node=${res.details.rn}, python=${expected.rn}, diff=${rnDiff}`
      );

      // Check VPD within 0.05 kPa
      const vpdDiff = Math.abs(res.details.vpd - expected.vpd);
      assert.ok(
        vpdDiff <= 0.05,
        `VPD mismatch in ${tc.name}: node=${res.details.vpd}, python=${expected.vpd}, diff=${vpdDiff}`
      );
    });
  }
});
