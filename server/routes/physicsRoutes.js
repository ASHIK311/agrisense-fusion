/**
 * AgriSense Fusion - FAO-56 Physics Engine Routes (Member 5)
 * /api/v1/physics
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { calculateReferenceET, calculateCropET } = require('../physics/penmanMonteith');
const { calculateTAW, calculateRootZoneDepletion, calculateDailyWaterBalance } = require('../physics/waterBalance');

// GET /api/v1/physics/parity-check — Live benchmark verification against fao56_benchmark.json
router.get('/parity-check', (req, res) => {
  try {
    const benchmarkPath = path.join(__dirname, '../tests/fao56_benchmark.json');
    const cases = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
    const results = cases.map((tc) => {
      const p = tc.input;
      const nodeRes = calculateReferenceET({
        date: p.date_val,
        tMax: p.t_max,
        tMin: p.t_min,
        solarRadiationMJ: p.rs_mj,
        rhMean: p.rh_mean,
        windSpeed10m: p.wind_speed,
        latitude: p.latitude_deg,
        elevationM: p.elevation_m,
      });
      const exp = tc.expected_python;
      const et0Diff = Number(Math.abs((nodeRes.et0 ?? 0) - exp.et0).toFixed(6));
      const rnDiff = Number(Math.abs((nodeRes.details?.rn ?? 0) - exp.rn).toFixed(6));
      const vpdDiff = Number(Math.abs((nodeRes.details?.vpd ?? 0) - exp.vpd).toFixed(6));
      const passed = nodeRes.et0 !== null && et0Diff <= 0.05 && rnDiff <= 0.15 && vpdDiff <= 0.05;
      return {
        name: tc.name,
        date: p.date_val,
        node_et0: nodeRes.et0,
        python_et0: exp.et0,
        et0_diff: et0Diff,
        node_rn: nodeRes.details?.rn ?? null,
        python_rn: exp.rn,
        rn_diff: rnDiff,
        node_vpd: nodeRes.details?.vpd ?? null,
        python_vpd: exp.vpd,
        vpd_diff: vpdDiff,
        passed,
      };
    });

    const maxEt0Diff = Math.max(...results.map((r) => r.et0_diff));
    const maxRnDiff = Math.max(...results.map((r) => r.rn_diff));
    const maxVpdDiff = Math.max(...results.map((r) => r.vpd_diff));
    res.json({
      success: true,
      executed_at: new Date().toISOString(),
      benchmark_file: 'server/tests/fao56_benchmark.json',
      tolerance_mm_day: 0.05,
      all_passed: results.every((r) => r.passed),
      max_et0_diff: maxEt0Diff,
      max_rn_diff: maxRnDiff,
      max_vpd_diff: maxVpdDiff,
      cases: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/physics/et0 & /api/v1/physics/evapotranspiration
function handleEt0(req, res) {
  const result = calculateReferenceET(req.body);
  res.json({
    success: result.et0 !== null,
    model: 'FAO-56 Penman-Monteith (Allen et al., 1998)',
    ...result
  });
}
router.post('/et0', handleEt0);
router.post('/evapotranspiration', handleEt0);

// POST /api/v1/physics/etc
router.post('/etc', (req, res) => {
  const { et0, kc = 1.0, ks = 1.0 } = req.body || {};
  const result = calculateCropET(Number(et0), Number(kc), Number(ks));
  res.json({
    success: result.etc !== null,
    model: 'FAO-56 Dual/Single Crop Coefficient (ETc = ET0 * Kc * Ks)',
    ...result
  });
});

// POST /api/v1/physics/taw
router.post('/taw', (req, res) => {
  const { thetaFC = 0.323, thetaWP = 0.165, rootDepthM = 0.50, depletionFraction = 0.50 } = req.body || {};
  const taw = calculateTAW(Number(thetaFC), Number(thetaWP), Number(rootDepthM));
  const raw = taw !== null ? Math.round(taw * Number(depletionFraction) * 10) / 10 : null;
  res.json({
    success: taw !== null,
    taw_mm: taw,
    raw_mm: raw,
    inputs: { thetaFC, thetaWP, rootDepthM, depletionFraction }
  });
});

// POST /api/v1/physics/water-balance
router.post('/water-balance', (req, res) => {
  const { weather = {}, soil = {}, crop = {} } = req.body;

  const et0Res = calculateReferenceET({
    date: weather.date,
    tMean: weather.tMean,
    tMax: weather.tMax,
    tMin: weather.tMin,
    rhMean: weather.rhMean,
    solarRadiationMJ: weather.solarRadiationMJ,
    windSpeed10m: weather.windSpeed10m,
    windSpeed2m: weather.windSpeed2m,
    elevationM: weather.elevationM || 28.0,
    latitude: weather.latitude || 24.469
  });

  const cropKc = crop.kc || 1.0;
  const p = crop.depletionFraction || 0.50; // FAO-56 depletion fraction

  const thetaFC = soil.thetaFC ?? 0.323;
  const thetaWP = soil.thetaWP ?? 0.165;
  const rootDepthM = soil.rootDepthM ?? 0.50;
  const currentTheta = soil.theta !== undefined ? soil.theta : 0.224;

  const taw = calculateTAW(thetaFC, thetaWP, rootDepthM);
  const raw = Math.round(taw * p * 10) / 10;
  const depletionRes = calculateRootZoneDepletion(thetaFC, currentTheta, rootDepthM, taw);

  // Water stress coefficient Ks
  let ks = 1.0;
  if (depletionRes.depletionMm > raw) {
    ks = Math.max(0.0, (taw - depletionRes.depletionMm) / ((1.0 - p) * taw));
    ks = Math.round(ks * 100) / 100;
  }

  const cropEtRes = calculateCropET(et0Res.et0, cropKc, ks);

  const irrigationNeeded = depletionRes.depletionMm >= raw;
  const recommendedDepthMm = irrigationNeeded ? Math.round(depletionRes.depletionMm * 10) / 10 : 0.0;

  res.json({
    success: true,
    physics_model: 'FAO-56 Penman-Monteith & Daily Soil Water Balance',
    metrics: {
      et0_mm_day: et0Res.et0,
      etc_mm_day: cropEtRes.etc,
      etc_adj_mm_day: cropEtRes.etcAdj,
      kc: cropKc,
      ks,
      taw_mm: taw,
      raw_mm: raw,
      depletion_mm: depletionRes.depletionMm,
      depletion_pct: depletionRes.depletionPct,
      water_status: depletionRes.waterStatus,
      irrigation_needed: irrigationNeeded,
      recommended_irrigation_depth_mm: recommendedDepthMm
    },
    radiation_details: et0Res.details,
    confidence: et0Res.confidence,
    warnings: [...et0Res.warnings, ...depletionRes.warnings, ...cropEtRes.warnings]
  });
});

module.exports = router;
