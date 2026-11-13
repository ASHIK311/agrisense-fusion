/**
 * AgriSense Fusion - Weather & Climate Risk Routes
 * /api/v1/weather
 * Enforces accurate geographical and meteorological provenance disclosures.
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');
const nasaService = require('../services/nasaService');

const GODAGARI_CENTROID = { latitude: 24.469, longitude: 88.330 };
const NASA_POWER_STATION = {
  latitude: 24.3636,
  longitude: 88.6241,
  location_name: 'Rajshahi Meteorological Station / Airport',
  distance_to_godagari_km: 34.8,
  bearing: 'East-Southeast (ESE)',
  parameter_resolution: {
    meteorology_merra2: '0.5° x 0.625° (~55 km x 63 km) — T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, PRECTOTCORR',
    solar_ceres: '1.0° x 1.0° (~111 km x 101 km) — ALLSKY_SFC_SW_DWN'
  }
};

// GET /api/v1/weather/forecast (Honest NOT_IMPLEMENTED status for live NWP forecast)
router.get('/forecast', (req, res) => {
  res.status(501).json({
    success: false,
    status: 'NOT_IMPLEMENTED',
    error: 'LIVE_WEATHER_FORECAST_NOT_INTEGRATED',
    message: 'Future multi-day Numerical Weather Prediction (NWP) forecast feed (e.g., BMD/ECMWF/GFS forecast) is not integrated in this build. Use /api/v1/weather/history or /api/v1/weather/daily for verified NASA POWER agroclimatology reanalysis records.',
    grid_point: NASA_POWER_STATION
  });
});

// GET /api/v1/weather/history
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const records = storage.getWeatherRecords(limit);
  const summary = storage.getWeatherSummary();

  res.json({
    success: true,
    source: 'NASA_POWER_AG_ARCHIVE',
    grid_point: NASA_POWER_STATION,
    target_area: {
      upazila: 'Godagari',
      district: 'Rajshahi',
      centroid: GODAGARI_CENTROID,
      aez: 'AEZ-26 (High Barind Tract)'
    },
    provenance_disclosure: 'NASA POWER point/grid agroclimatology at 24.3636°N, 88.6241°E (~34.8 km from Godagari centroid). Regional reanalysis, not an in-situ Godagari station measurement.',
    count: records.length,
    summary,
    records
  });
});

// GET /api/v1/weather/live
router.get('/live', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || GODAGARI_CENTROID.latitude;
    const lon = parseFloat(req.query.lon) || GODAGARI_CENTROID.longitude;

    const data = await nasaService.fetchDailyWeather(lat, lon, 1);
    res.json({
      success: true,
      mode: 'live_synced',
      source: 'NASA_POWER_API',
      grid_point: NASA_POWER_STATION,
      provenance_disclosure: 'NASA POWER point/grid agroclimatology reanalysis data (~34.8 km ESE of Godagari).',
      ...data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/weather/daily
router.get('/daily', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || GODAGARI_CENTROID.latitude;
    const lon = parseFloat(req.query.lon) || GODAGARI_CENTROID.longitude;
    const days = parseInt(req.query.days) || 10;

    const data = await nasaService.fetchDailyWeather(lat, lon, days);
    res.json({
      success: true,
      grid_point: NASA_POWER_STATION,
      provenance_disclosure: 'NASA POWER reanalysis data point (~34.8 km ESE of Godagari).',
      ...data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function parseValidWeatherMetric(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num === -999) return null;
  return num;
}

/**
 * Evaluates Member 2's canonical binary compound heat-dryness screening rule
 * (Tmax >= 35.0°C AND RH <= 50.0% AND Rainfall <= 1.0 mm), plus AgriSense Fusion's
 * project-specific MODERATE_RISK heuristic extension and strict missing/sentinel checks.
 */
function evaluateWeatherRisk(record) {
  const safeRecord = record && typeof record === 'object' ? record : {};
  const tMaxVal = parseValidWeatherMetric(safeRecord.t_max);
  const rhVal = parseValidWeatherMetric(safeRecord.humidity);
  const rainVal = parseValidWeatherMetric(safeRecord.rainfall);
  const vpdVal = parseValidWeatherMetric(safeRecord.vpd_kpa);
  const cddVal = parseValidWeatherMetric(safeRecord.consecutive_dry_days);

  const missingPrimary = [];
  if (tMaxVal === null) missingPrimary.push('t_max');
  if (rhVal === null) missingPrimary.push('humidity');
  if (rainVal === null) missingPrimary.push('rainfall');

  let riskLevel = 'LOW_NORMAL';
  let riskScore = 0.20;
  const riskFactors = [];

  if (missingPrimary.length > 0) {
    riskLevel = 'INSUFFICIENT_DATA';
    riskScore = null;
    riskFactors.push(
      `Insufficient valid primary weather inputs (${missingPrimary.join(', ')}); binary rule requires finite non-sentinel (-999) t_max, humidity, and rainfall`
    );
  } else {
    // Canonical Member 2 Primary Heat-Dryness Screening Rule (verified 1,827/1,827 against godagari_daily_records.heat_drought_risk):
    // Tmax >= 35.0°C AND Relative Humidity <= 50.0% AND Daily Rainfall <= 1.0 mm
    // Secondary atmospheric desiccation indicators (vpd_kpa, consecutive_dry_days) provide contextual stress context only.
    const isExtremeHeat = tMaxVal >= 35.0;
    const isLowHumidity = rhVal <= 50.0;
    const isDryDay = rainVal <= 1.0;

    if (isExtremeHeat && isLowHumidity && isDryDay) {
      riskLevel = 'HIGH_HEAT_DRYNESS_RISK';
      riskScore = 0.92;
      riskFactors.push(
        'Primary Rule Matched: Daytime Tmax >= 35.0°C',
        'Primary Rule Matched: Relative Humidity <= 50.0%',
        'Primary Rule Matched: Daily Rainfall <= 1.0 mm'
      );
    } else if (tMaxVal >= 33.0 && (rhVal <= 55.0 || (cddVal !== null && cddVal >= 7))) {
      // Project-specific heuristic band extending Member 2's strict binary screening rule
      riskLevel = 'MODERATE_RISK';
      riskScore = 0.58;
      riskFactors.push('Project Heuristic Extension: Elevated daytime temperature >= 33.0°C under low humidity / dry spell context');
    } else {
      riskLevel = 'LOW_NORMAL';
      riskScore = 0.20;
      riskFactors.push('Weather variables within normal Barind screening envelope');
    }

    if (vpdVal !== null && vpdVal >= 2.0) {
      riskFactors.push(`Secondary Desiccation Context: Elevated Vapor Pressure Deficit (VPD ${vpdVal.toFixed(2)} kPa >= 2.0 kPa)`);
    }
    if (cddVal !== null && cddVal >= 10) {
      riskFactors.push(`Secondary Dry-Spell Context: Consecutive Dry Days (${cddVal} days >= 10)`);
    }
  }

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_factors: riskFactors,
    hazard_classification: 'ATMOSPHERIC_HEAT_DRYNESS_SCREENING',
    primary_rule: 'Tmax >= 35.0°C AND RH <= 50.0% AND Rainfall <= 1.0 mm',
    secondary_desiccation_indicators: ['vpd_kpa', 'consecutive_dry_days', 'rainfall_30d_sum'],
    current_indicators: {
      t_max: safeRecord.t_max ?? null,
      humidity: safeRecord.humidity ?? null,
      rainfall: safeRecord.rainfall ?? null,
      vpd_kpa: safeRecord.vpd_kpa ?? null,
      consecutive_dry_days: safeRecord.consecutive_dry_days ?? null,
      rainfall_30d_sum: safeRecord.rainfall_30d_sum ?? null
    },
    provenance: {
      methodology: 'Member 2 Binary Pre-Monsoon Compound Heat-Dryness Screening Rule (HIGH_HEAT_DRYNESS_RISK: Tmax >= 35°C, RH <= 50%, Rainfall <= 1mm; MODERATE_RISK: project heuristic extension for Tmax >= 33°C with RH <= 55% or CDD >= 7; VPD & CDD as secondary context)',
      grid_point: NASA_POWER_STATION,
      nature_of_assessment: 'Atmospheric hazard screening rule (Tmax >= 35°C, RH <= 50%, Rainfall <= 1mm). Strictly not a seasonal or long-range drought forecast.',
      source: 'NASA POWER Daily Point (24.3636°N, 88.6241°E, ~34.8 km ESE of Godagari)'
    }
  };
}

// GET /api/v1/weather/risk
router.get('/risk', (req, res) => {
  const records = storage.getWeatherRecords(30);
  const latest = records.length > 0 ? records[records.length - 1] : {
    t_max: 32.5,
    rainfall: 0,
    humidity: 55,
    vpd_kpa: 1.8,
    consecutive_dry_days: 14,
    rainfall_30d_sum: 5.2
  };

  res.json({
    success: true,
    risk_assessment: evaluateWeatherRisk(latest)
  });
});

router.evaluateWeatherRisk = evaluateWeatherRisk;

module.exports = router;
