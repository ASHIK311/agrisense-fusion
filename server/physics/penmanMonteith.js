/**
 * AgriSense Fusion - Physics Engine
 * FAO-56 Penman-Monteith Reference Evapotranspiration (ET0) & Crop Evapotranspiration (ETc)
 * 
 * References:
 * - FAO Irrigation and Drainage Paper No. 56, Chapter 2 (Allen et al., 1998)
 * - Field Shift Technical Blueprint, Section 3.1 & 3.2
 */

/**
 * Saturation vapour pressure e°(T) in kPa
 * @param {number} t Temperature in Celsius
 * @returns {number} Saturation vapour pressure in kPa
 */
function saturationVapourPressure(t) {
  if (typeof t !== 'number' || isNaN(t)) return null;
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
}

/**
 * Slope of saturation vapour pressure curve (Delta) in kPa/°C
 * @param {number} t Temperature in Celsius
 * @returns {number} Slope Delta in kPa/°C
 */
function slopeVapourPressureCurve(t) {
  if (typeof t !== 'number' || isNaN(t)) return null;
  const es = saturationVapourPressure(t);
  return (4098 * es) / Math.pow(t + 237.3, 2);
}

/**
 * Atmospheric pressure P in kPa at elevation z (metres above sea level)
 * @param {number} elevationM Elevation in metres
 * @returns {number} Pressure in kPa
 */
function atmosphericPressure(elevationM = 20) {
  return 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26);
}

/**
 * Psychrometric constant (gamma) in kPa/°C
 * @param {number} elevationM Elevation in metres
 * @returns {number} Gamma in kPa/°C
 */
function psychrometricConstant(elevationM = 20) {
  const p = atmosphericPressure(elevationM);
  return 0.000665 * p;
}

/**
 * Convert wind speed at 10m height (NASA WS10M) to 2m height (u2)
 * using the FAO-56 logarithmic wind profile:
 * u2 = u_z * 4.87 / ln(67.8 * z - 5.42)
 * For z = 10m: 4.87 / ln(672.58) = 4.87 / 6.511 = 0.748
 * @param {number} ws10m Wind speed at 10m in m/s
 * @returns {number} Wind speed at 2m in m/s
 */
function convertWind10mTo2m(ws10m) {
  if (typeof ws10m !== 'number' || isNaN(ws10m)) return 2.0; // standard default assumption
  return ws10m * (4.87 / Math.log(67.8 * 10 - 5.42));
}

/**
 * Calculate FAO-56 Penman-Monteith Reference Evapotranspiration (ET0)
 * 
 * Formula:
 * ET0 = [ 0.408 * Delta * (Rn - G) + gamma * (900 / (T + 273)) * u2 * (es - ea) ] / [ Delta + gamma * (1 + 0.34 * u2) ]
 * 
 * @param {Object} params
 * @param {number} params.tMean Mean air temperature in °C
 * @param {number} [params.tMax] Max air temp in °C
 * @param {number} [params.tMin] Min air temp in °C
 * @param {number} params.rhMean Relative humidity in %
 * @param {number} params.solarRadiationMJ Solar radiation in MJ/m²/day (ALLSKY_SFC_SW_DWN)
 * @param {number} [params.windSpeed10m] Wind speed at 10m in m/s (NASA POWER WS10M)
 * @param {number} [params.windSpeed2m] Direct wind speed at 2m in m/s
 * @param {number} [params.elevationM=20] Farm elevation in metres
 * @returns {Object} { et0, warnings, confidence, details }
 */
function calculateReferenceET(params) {
  const warnings = [];

  if (!params || typeof params !== 'object') {
    return { et0: null, confidence: 'insufficient_data', warnings: ['Missing meteorological parameter object'] };
  }

  const {
    tMean,
    tMax,
    tMin,
    rhMean,
    solarRadiationMJ,
    windSpeed10m,
    windSpeed2m,
    elevationM = 20
  } = params;

  // Validate mandatory inputs
  if (tMean === undefined || tMean === null || isNaN(tMean)) {
    warnings.push('Mean air temperature (T2M) is missing');
  }
  if (rhMean === undefined || rhMean === null || isNaN(rhMean)) {
    warnings.push('Relative humidity (RH2M) is missing');
  }
  if (solarRadiationMJ === undefined || solarRadiationMJ === null || isNaN(solarRadiationMJ)) {
    warnings.push('Solar radiation (ALLSKY_SFC_SW_DWN) is missing');
  }

  if (warnings.length > 0) {
    return {
      et0: null,
      confidence: 'insufficient_data',
      warnings,
      details: null
    };
  }

  // 1. Wind speed at 2m
  let u2 = 2.0;
  if (windSpeed2m !== undefined && !isNaN(windSpeed2m)) {
    u2 = windSpeed2m;
  } else if (windSpeed10m !== undefined && !isNaN(windSpeed10m)) {
    u2 = convertWind10mTo2m(windSpeed10m);
    warnings.push('Wind speed converted from 10m to 2m using FAO-56 logarithmic profile');
  } else {
    warnings.push('Default 2.0 m/s wind speed assumed (no wind observation)');
  }

  // 2. Vapour pressures
  let es;
  if (tMax !== undefined && tMin !== undefined && !isNaN(tMax) && !isNaN(tMin)) {
    es = (saturationVapourPressure(tMax) + saturationVapourPressure(tMin)) / 2;
  } else {
    es = saturationVapourPressure(tMean);
    warnings.push('Saturated vapour pressure calculated from mean temperature instead of daily max/min');
  }

  const clampedRh = Math.max(0, Math.min(100, rhMean));
  const ea = (clampedRh / 100) * es;
  const vpd = Math.max(0, es - ea); // Vapour Pressure Deficit in kPa

  // 3. Delta and Gamma
  const delta = slopeVapourPressureCurve(tMean);
  const gamma = psychrometricConstant(elevationM);

  // 4. Net radiation Rn
  // Net shortwave Rns = (1 - albedo) * Rs, reference crop albedo = 0.23
  // Net longwave Rnl approximation for daily steps:
  // Rn = Rns - Rnl approx. 0.65 * Rs (conservative agricultural approximation when net longwave isn't measured)
  const Rns = (1 - 0.23) * solarRadiationMJ; // MJ/m²/day
  // Rnl is typically 15-25% of Rns in sub-tropical sub-humid climates
  const Rn = Math.max(0, Rns * 0.75); // Net radiation estimate in MJ/m²/day
  const G = 0; // Soil heat flux is negligible on a 24-hr daily scale (FAO-56 eq. 42)

  // 5. FAO-56 Penman-Monteith Numerator & Denominator
  const radiationTerm = 0.408 * delta * (Rn - G);
  const windTerm = gamma * (900 / (tMean + 273)) * u2 * vpd;
  const denominator = delta + gamma * (1 + 0.34 * u2);

  const et0 = (radiationTerm + windTerm) / denominator;
  const normalizedEt0 = Math.max(0, Math.round(et0 * 100) / 100);

  const confidence = warnings.length === 0 ? 'high' : warnings.length <= 2 ? 'medium' : 'low';

  return {
    et0: normalizedEt0, // mm/day
    confidence,
    warnings,
    details: {
      tMean,
      u2: Math.round(u2 * 100) / 100,
      es: Math.round(es * 1000) / 1000,
      ea: Math.round(ea * 1000) / 1000,
      vpd: Math.round(vpd * 1000) / 1000,
      Rn: Math.round(Rn * 100) / 100,
      delta: Math.round(delta * 1000) / 1000,
      gamma: Math.round(gamma * 1000) / 1000
    }
  };
}

/**
 * Calculate Crop Evapotranspiration (ETc)
 * ETc = Kc * ET0
 * 
 * @param {number} et0 Reference ET in mm/day
 * @param {number} kc Crop coefficient (0.2 to 1.3 typical)
 * @param {number} [ks=1.0] Water stress coefficient (0.0 to 1.0)
 * @returns {Object} { etc, etcAdj, warnings }
 */
function calculateCropET(et0, kc, ks = 1.0) {
  const warnings = [];
  if (et0 === null || et0 === undefined || isNaN(et0)) {
    return { etc: null, etcAdj: null, warnings: ['ET0 input is unavailable'] };
  }
  if (kc === null || kc === undefined || isNaN(kc) || kc < 0) {
    return { etc: null, etcAdj: null, warnings: ['Invalid or missing crop coefficient Kc'] };
  }

  const validKs = Math.max(0, Math.min(1.0, ks));
  const etc = Math.round(et0 * kc * 100) / 100;
  const etcAdj = Math.round(et0 * kc * validKs * 100) / 100;

  if (validKs < 1.0) {
    warnings.push(`Water stress coefficient Ks=${validKs.toFixed(2)} applied due to root-zone depletion`);
  }

  return {
    etc,
    etcAdj,
    kc,
    ks: validKs,
    warnings
  };
}

module.exports = {
  saturationVapourPressure,
  slopeVapourPressureCurve,
  atmosphericPressure,
  psychrometricConstant,
  convertWind10mTo2m,
  calculateReferenceET,
  calculateCropET
};
