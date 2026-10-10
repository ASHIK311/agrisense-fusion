/**
 * AgriSense Fusion - Water Balance & Root-Zone Soil Moisture Engine
 * 
 * References:
 * - FAO Irrigation and Drainage Paper No. 56, Chapter 8 (Allen et al., 1998)
 * - Field Shift Technical Blueprint, Section 3.3 & 3.4
 */

/**
 * Calculate Total Available Water (TAW) in the root zone
 * TAW = 1000 * (theta_fc - theta_wp) * Zr
 * 
 * @param {number} thetaFC Volumetric water content at field capacity (0-1)
 * @param {number} thetaWP Volumetric water content at wilting point (0-1)
 * @param {number} rootDepthM Effective root depth in metres
 * @returns {number} TAW in mm
 */
function calculateTAW(thetaFC, thetaWP, rootDepthM) {
  if (thetaFC === undefined || thetaWP === undefined || rootDepthM === undefined) return null;
  if (thetaFC <= thetaWP || rootDepthM <= 0) return null;
  return Math.round(1000 * (thetaFC - thetaWP) * rootDepthM * 100) / 100;
}

/**
 * Calculate Root-Zone Depletion (Dr) from current sensor soil moisture
 * Dr = 1000 * (theta_fc - theta) * Zr
 * 
 * Clamped between 0 (at or above field capacity) and TAW (at wilting point).
 * 
 * @param {number} thetaFC Field capacity (0-1)
 * @param {number} theta Current calibrated volumetric water content (0-1)
 * @param {number} rootDepthM Root depth in metres
 * @param {number} taw Total available water in mm
 * @returns {Object} { depletionMm, depletionPct, waterStatus, warnings }
 */
function calculateRootZoneDepletion(thetaFC, theta, rootDepthM, taw) {
  const warnings = [];
  if (theta === undefined || theta === null || isNaN(theta)) {
    return {
      depletionMm: null,
      depletionPct: null,
      waterStatus: 'unknown',
      warnings: ['Current soil moisture reading theta is missing']
    };
  }

  if (theta < 0 || theta > 0.65) {
    warnings.push(`Soil moisture reading ${theta} is outside typical physical range [0.0, 0.65]`);
  }

  // Unclamped raw depletion
  const rawDepletion = 1000 * (thetaFC - theta) * rootDepthM;
  let status = 'optimal';
  let clampedDepletion = rawDepletion;

  if (rawDepletion <= 0) {
    clampedDepletion = 0;
    status = 'saturated';
    warnings.push('Soil moisture is at or above field capacity (potential saturation/ponding)');
  } else if (rawDepletion >= taw) {
    clampedDepletion = taw;
    status = 'wilting_danger';
    warnings.push('Root-zone depletion has reached or exceeded permanent wilting point!');
  } else if (rawDepletion > taw * 0.5) {
    status = 'stress_warning';
    warnings.push('Depletion exceeds 50% of TAW (readily available water depleted, irrigation advised)');
  } else {
    status = 'optimal';
  }

  const depletionPct = taw > 0 ? Math.round((clampedDepletion / taw) * 100) : 0;

  return {
    depletionMm: Math.round(clampedDepletion * 100) / 100,
    rawDepletionMm: Math.round(rawDepletion * 100) / 100,
    depletionPct,
    waterStatus: status,
    warnings
  };
}

/**
 * Calculate water stress coefficient Ks
 * Ks = (TAW - Dr) / ((1 - p) * TAW) when Dr > RAW
 * 
 * @param {number} taw Total available water in mm
 * @param {number} dr Current root-zone depletion in mm
 * @param {number} [p=0.5] Depletion fraction before stress begins
 * @returns {number} Ks (between 0.0 and 1.0)
 */
function calculateWaterStressKs(taw, dr, p = 0.5) {
  if (!taw || taw <= 0 || dr === null || dr === undefined) return 1.0;
  const raw = p * taw;
  if (dr <= raw) return 1.0;
  if (dr >= taw) return 0.0;
  return Math.max(0, Math.min(1, (taw - dr) / ((1 - p) * taw)));
}

/**
 * Perform single-day water balance update
 * Dr,t = Dr,t-1 + ETc - Peff - I + DP + RO
 * 
 * @param {Object} params
 * @param {number} params.drPrevious Previous day depletion in mm
 * @param {number} params.etc Crop evapotranspiration in mm/day
 * @param {number} params.precipitationMm Daily total precipitation in mm
 * @param {number} [params.irrigationMm=0] Daily irrigation applied in mm
 * @param {number} params.taw Total available water in mm
 * @returns {Object} Updated depletion and breakdown
 */
function calculateDailyWaterBalance(params) {
  const warnings = [];
  const {
    drPrevious = 0,
    etc = 0,
    precipitationMm = 0,
    irrigationMm = 0,
    taw = 50
  } = params;

  // Effective precipitation: light rain (<3mm) mostly evaporates from canopy, heavy rain produces runoff
  let peff = 0;
  let runoff = 0;
  if (precipitationMm > 3) {
    // USDA-SCS empirical adjustment
    peff = Math.min(precipitationMm * 0.8, precipitationMm - 2);
    if (precipitationMm > 40) {
      runoff = precipitationMm - peff;
      warnings.push(`Heavy rainfall event (${precipitationMm} mm): substantial runoff estimated (${runoff.toFixed(1)} mm)`);
    }
  }

  // Preliminary balance
  let drNew = drPrevious + etc - peff - irrigationMm;
  let deepPercolation = 0;

  if (drNew < 0) {
    deepPercolation = Math.abs(drNew);
    drNew = 0; // cannot hold water beyond field capacity
    warnings.push(`Deep percolation occurred: ${deepPercolation.toFixed(1)} mm drained below root zone`);
  } else if (drNew > taw) {
    warnings.push(`Root-zone depletion exceeded TAW (${taw} mm): soil at severe drought stress`);
    drNew = taw;
  }

  return {
    drNext: Math.round(drNew * 100) / 100,
    peff: Math.round(peff * 100) / 100,
    irrigationMm: Math.round(irrigationMm * 100) / 100,
    deepPercolation: Math.round(deepPercolation * 100) / 100,
    runoff: Math.round(runoff * 100) / 100,
    warnings
  };
}

module.exports = {
  calculateTAW,
  calculateRootZoneDepletion,
  calculateWaterStressKs,
  calculateDailyWaterBalance
};
