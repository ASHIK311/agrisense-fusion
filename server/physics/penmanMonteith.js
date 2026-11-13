/**
 * AgriSense Fusion - Physics Engine
 * FAO-56 Penman-Monteith Reference Evapotranspiration (ET0) & Crop Evapotranspiration (ETc)
 * 
 * Standardized to 100% parity with Member 5 Python reference implementation
 * and FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998).
 */

/**
 * Extract integer day of year (J in [1, 366]) from date or ISO string
 * @param {string|Date|number} d Date object, ISO string, or DOY integer
 * @returns {number} Integer day of year
 */
function calculateDayOfYear(d) {
  if (typeof d === 'number' && d >= 1 && d <= 366) {
    return Math.floor(d);
  }
  let dateObj;
  if (!d) {
    dateObj = new Date();
  } else if (typeof d === 'string') {
    // support YYYY-MM-DD or ISO
    dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
  } else if (d instanceof Date) {
    dateObj = d;
  } else {
    dateObj = new Date();
  }
  const start = new Date(Date.UTC(dateObj.getUTCFullYear(), 0, 1));
  const diff = dateObj.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.min(366, Math.max(1, Math.floor(diff / oneDay) + 1));
}

/**
 * Saturation vapour pressure e°(T) in kPa (FAO-56 Eq. 11)
 * @param {number} t Temperature in Celsius
 * @returns {number} Saturation vapour pressure in kPa
 */
function saturationVapourPressure(t) {
  if (typeof t !== 'number' || isNaN(t)) return null;
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
}

/**
 * Mean saturation vapour pressure es in kPa from Tmax and Tmin (FAO-56 Eq. 12)
 * @param {number} tMax Max temperature in °C
 * @param {number} tMin Min temperature in °C
 * @returns {number} Mean saturation vapour pressure in kPa
 */
function meanSaturationVapourPressure(tMax, tMin) {
  const eTmax = saturationVapourPressure(tMax);
  const eTmin = saturationVapourPressure(tMin);
  return (eTmax + eTmin) / 2.0;
}

/**
 * Slope of saturation vapour pressure curve (Delta) in kPa/°C (FAO-56 Eq. 13)
 * @param {number} t Temperature in Celsius
 * @returns {number} Slope Delta in kPa/°C
 */
function slopeVapourPressureCurve(t) {
  if (typeof t !== 'number' || isNaN(t)) return null;
  const es = saturationVapourPressure(t);
  return (4098.0 * es) / Math.pow(t + 237.3, 2);
}

/**
 * Atmospheric pressure P in kPa at elevation z (FAO-56 Eq. 7)
 * @param {number} elevationM Elevation in metres
 * @returns {number} Pressure in kPa
 */
function atmosphericPressure(elevationM = 20) {
  return 101.3 * Math.pow((293.0 - 0.0065 * elevationM) / 293.0, 5.26);
}

/**
 * Psychrometric constant (gamma) in kPa/°C (FAO-56 Eq. 8)
 * @param {number} elevationM Elevation in metres
 * @returns {number} Gamma in kPa/°C
 */
function psychrometricConstant(elevationM = 20) {
  const p = atmosphericPressure(elevationM);
  return 0.000665 * p;
}

/**
 * Convert wind speed at height z to 2m height (u2) (FAO-56 Eq. 47)
 * @param {number} uz Wind speed in m/s
 * @param {number} [zm=10] Measurement height in metres
 * @returns {number} Wind speed at 2m in m/s
 */
function convertWind10mTo2m(uz, zm = 10) {
  if (typeof uz !== 'number' || isNaN(uz)) return 2.0;
  if (Math.abs(zm - 2.0) < 0.05) return Math.max(0, uz);
  return Math.max(0, uz * (4.87 / Math.log(67.8 * zm - 5.42)));
}

/**
 * Astronomical Solar Geometry: Extraterrestrial Radiation Ra in MJ/m²/day (FAO-56 Eq. 21)
 * @param {number} latitudeDeg Latitude in decimal degrees
 * @param {number} dayOfYear Day of year [1, 366]
 * @returns {number} Ra in MJ/m²/day
 */
function calculateExtraterrestrialRadiation(latitudeDeg, dayOfYear) {
  const phi = (latitudeDeg * Math.PI) / 180.0;
  const j = dayOfYear;
  const dr = 1.0 + 0.033 * Math.cos((2.0 * Math.PI / 365.0) * j);
  const delta = 0.409 * Math.sin((2.0 * Math.PI / 365.0) * j - 1.39);

  const term = -Math.tan(phi) * Math.tan(delta);
  const clampedTerm = Math.max(-1.0, Math.min(1.0, term));
  const omegaS = Math.acos(clampedTerm);

  const factor = (24.0 * 60.0 / Math.PI) * 0.0820 * dr;
  const inner = omegaS * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(omegaS);
  return Math.max(0.0, factor * inner);
}

/**
 * Clear-sky solar radiation Rso in MJ/m²/day (FAO-56 Eq. 37)
 * @param {number} ra Extraterrestrial radiation in MJ/m²/day
 * @param {number} elevationM Elevation in metres
 * @returns {number} Rso in MJ/m²/day
 */
function calculateClearSkyRadiation(ra, elevationM = 20) {
  return (0.75 + 2e-5 * elevationM) * ra;
}

/**
 * Full Net Radiation Calculation (FAO-56 Eq. 38, 39, 40)
 * Including Stefan-Boltzmann Net Longwave Radiation Rnl
 * 
 * @param {number} tMax Max temperature in °C
 * @param {number} tMin Min temperature in °C
 * @param {number} ea Actual vapour pressure in kPa
 * @param {number} rs Solar radiation in MJ/m²/day
 * @param {number} rso Clear-sky solar radiation in MJ/m²/day
 * @param {number} [albedo=0.23] Surface albedo (0.23 for standard grass reference)
 * @returns {Object} { rns, rnl, rn, fCd }
 */
function calculateNetRadiation(tMax, tMin, ea, rs, rso, albedo = 0.23) {
  // 1. Net shortwave radiation (Rns)
  const rns = (1.0 - albedo) * rs;

  // 2. Cloudiness fraction (f_cd) - FAO-56 Eq. 39
  let fCd;
  if (rso > 0) {
    const relRs = Math.min(1.0, Math.max(0.3, rs / rso));
    fCd = Math.max(0.05, Math.min(1.0, 1.35 * relRs - 0.35));
  } else {
    fCd = 0.5;
  }

  // 3. Stefan-Boltzmann law for longwave radiation (Rnl)
  // sigma = 4.903e-9 MJ K^-4 m^-2 day^-1
  const tMaxK4 = Math.pow(tMax + 273.16, 4);
  const tMinK4 = Math.pow(tMin + 273.16, 4);
  const meanTempK4 = (tMaxK4 + tMinK4) / 2.0;

  // Net emissivity term: (0.34 - 0.14 * sqrt(ea))
  const emissivityTerm = 0.34 - 0.14 * Math.sqrt(Math.max(0.0, ea));
  const rnl = 4.903e-9 * meanTempK4 * emissivityTerm * fCd;

  // 4. Net radiation (Rn)
  const rn = rns - rnl;
  return { rns, rnl, rn, fCd };
}

/**
 * Calculate FAO-56 Penman-Monteith Reference Evapotranspiration (ET0)
 * 
 * Full physical implementation adhering to FAO-56 and Member 5 Python Reference:
 * ET0 = [ 0.408 * Delta * (Rn - G) + gamma * (900 / (Tmean + 273)) * u2 * (es - ea) ] / [ Delta + gamma * (1 + 0.34 * u2) ]
 * 
 * @param {Object} params
 * @param {string|Date|number} [params.date] Date string or DOY
 * @param {number} [params.tMean] Mean air temperature in °C
 * @param {number} [params.tMax] Max air temp in °C
 * @param {number} [params.tMin] Min air temp in °C
 * @param {number} params.rhMean Relative humidity in %
 * @param {number} [params.rhMax] Max relative humidity in %
 * @param {number} [params.rhMin] Min relative humidity in %
 * @param {number} params.solarRadiationMJ Solar radiation in MJ/m²/day
 * @param {number} [params.windSpeed10m] Wind speed at 10m in m/s
 * @param {number} [params.windSpeed2m] Wind speed at 2m in m/s
 * @param {number} [params.latitude=24.469] Latitude in decimal degrees
 * @param {number} [params.elevationM=28.0] Farm elevation in metres
 * @param {number} [params.albedo=0.23] Canopy albedo
 * @returns {Object} { et0, confidence, warnings, details }
 */
function calculateReferenceET(params) {
  const warnings = [];

  if (!params || typeof params !== 'object') {
    return { et0: null, confidence: 'insufficient_data', warnings: ['Missing meteorological parameter object'], details: null };
  }

  let {
    date,
    tMean,
    tMax,
    tMin,
    rhMean,
    rhMax,
    rhMin,
    solarRadiationMJ,
    windSpeed10m,
    windSpeed2m,
    latitude = 24.469,
    elevationM = 28.0,
    albedo = 0.23
  } = params;

  // Reconcile temperatures
  if (tMax !== undefined && tMin !== undefined && !isNaN(tMax) && !isNaN(tMin)) {
    if (tMean === undefined || tMean === null || isNaN(tMean)) {
      tMean = (tMax + tMin) / 2.0;
    }
  } else if (tMean !== undefined && !isNaN(tMean)) {
    // estimate tMax and tMin with standard diurnal Barind spread (+6°C / -6°C)
    tMax = tMean + 5.5;
    tMin = tMean - 5.5;
    warnings.push('tMax/tMin inferred from tMean using diurnal amplitude approximation');
  } else {
    warnings.push('Air temperature is missing');
  }

  if (rhMean === undefined || rhMean === null || isNaN(rhMean)) {
    if (rhMax !== undefined && rhMin !== undefined && !isNaN(rhMax) && !isNaN(rhMin)) {
      rhMean = (rhMax + rhMin) / 2.0;
    } else {
      warnings.push('Relative humidity (RH2M) is missing');
    }
  }

  if (solarRadiationMJ === undefined || solarRadiationMJ === null || isNaN(solarRadiationMJ)) {
    warnings.push('Solar radiation (ALLSKY_SFC_SW_DWN) is missing');
  }

  if (warnings.some(w => w.includes('missing'))) {
    return {
      et0: null,
      confidence: 'insufficient_data',
      warnings,
      details: null
    };
  }

  // 1. Day of year & Solar geometry
  const doy = calculateDayOfYear(date);
  const ra = calculateExtraterrestrialRadiation(latitude, doy);
  const rso = calculateClearSkyRadiation(ra, elevationM);

  // 2. Wind speed at 2m
  let u2 = 2.0;
  if (windSpeed2m !== undefined && !isNaN(windSpeed2m)) {
    u2 = Math.max(0, windSpeed2m);
  } else if (windSpeed10m !== undefined && !isNaN(windSpeed10m)) {
    u2 = convertWind10mTo2m(windSpeed10m, 10);
  }

  // 3. Vapour pressures
  const es = meanSaturationVapourPressure(tMax, tMin);
  let ea;
  if (rhMax !== undefined && rhMin !== undefined && !isNaN(rhMax) && !isNaN(rhMin)) {
    const eTmin = saturationVapourPressure(tMin);
    const eTmax = saturationVapourPressure(tMax);
    ea = (eTmin * (rhMax / 100.0) + eTmax * (rhMin / 100.0)) / 2.0;
  } else {
    ea = es * (Math.max(0, Math.min(100, rhMean)) / 100.0);
  }
  // Physical constraint: ea cannot exceed es
  ea = Math.max(0.001, Math.min(ea, es));
  const vpd = Math.max(0.0, es - ea);

  // 4. Slope of saturation vapour pressure curve Delta and Psychrometric constant gamma
  const delta = slopeVapourPressureCurve(tMean);
  const gamma = psychrometricConstant(elevationM);

  // 5. Full Net Radiation (Rns - Rnl)
  const rad = calculateNetRadiation(tMax, tMin, ea, solarRadiationMJ, rso, albedo);
  const rn = rad.rn;
  const g = 0.0; // Soil heat flux G is negligible for 24-hour daily steps

  // 6. Penman-Monteith Formulation
  const radiationTerm = 0.408 * delta * (rn - g);
  const aerodynamicTerm = gamma * (900.0 / (tMean + 273.0)) * u2 * vpd;
  const denominator = delta + gamma * (1.0 + 0.34 * u2);

  let rawEt0 = 0.0;
  if (denominator > 0) {
    rawEt0 = (radiationTerm + aerodynamicTerm) / denominator;
  } else {
    warnings.push('Zero or negative denominator in Penman-Monteith equation');
  }

  // Clamping to physical minimum 0.0
  let isClampedLow = false;
  let finalEt0 = 0.0;
  if (rawEt0 < 0.0) {
    finalEt0 = 0.0;
    isClampedLow = true;
    warnings.push('Negative mathematical ET0 clamped to 0.0 mm/day (condensation/dew formation)');
  } else {
    finalEt0 = Math.round(rawEt0 * 100) / 100;
  }

  const confidence = warnings.length === 0 ? 'high' : warnings.length <= 1 ? 'medium' : 'low';

  return {
    et0: finalEt0,
    confidence,
    warnings,
    details: {
      dayOfYear: doy,
      tMean: Math.round(tMean * 100) / 100,
      tMax: Math.round(tMax * 100) / 100,
      tMin: Math.round(tMin * 100) / 100,
      rhMean: Math.round(rhMean * 10) / 10,
      u2: Math.round(u2 * 100) / 100,
      es: Math.round(es * 1000) / 1000,
      ea: Math.round(ea * 1000) / 1000,
      vpd: Math.round(vpd * 1000) / 1000,
      ra: Math.round(ra * 100) / 100,
      rso: Math.round(rso * 100) / 100,
      rns: Math.round(rad.rns * 100) / 100,
      rnl: Math.round(rad.rnl * 100) / 100,
      rn: Math.round(rn * 100) / 100,
      delta: Math.round(delta * 1000) / 1000,
      gamma: Math.round(gamma * 1000) / 1000,
      radiationTerm: Math.round(radiationTerm * 1000) / 1000,
      aerodynamicTerm: Math.round(aerodynamicTerm * 1000) / 1000,
      isClampedLow
    }
  };
}

/**
 * Calculate Crop Evapotranspiration (ETc)
 * ETc = Kc * ET0
 * ETc,adj = Ks * Kc * ET0
 * 
 * @param {number} et0 Reference ET in mm/day
 * @param {number} kc Crop coefficient (0.2 to 1.3 typical)
 * @param {number} [ks=1.0] Water stress coefficient (0.0 to 1.0)
 * @returns {Object} { etc, etcAdj, kc, ks, warnings }
 */
function calculateCropET(et0, kc, ks = 1.0) {
  const warnings = [];
  if (et0 === null || et0 === undefined || isNaN(et0)) {
    return { etc: null, etcAdj: null, kc: null, ks: null, warnings: ['ET0 input is unavailable'] };
  }
  if (kc === null || kc === undefined || isNaN(kc) || kc < 0) {
    return { etc: null, etcAdj: null, kc: null, ks: null, warnings: ['Invalid or missing crop coefficient Kc'] };
  }

  const validKs = Math.max(0.0, Math.min(1.0, ks));
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
  calculateDayOfYear,
  saturationVapourPressure,
  meanSaturationVapourPressure,
  slopeVapourPressureCurve,
  atmosphericPressure,
  psychrometricConstant,
  convertWind10mTo2m,
  calculateExtraterrestrialRadiation,
  calculateClearSkyRadiation,
  calculateNetRadiation,
  calculateReferenceET,
  calculateCropET
};
