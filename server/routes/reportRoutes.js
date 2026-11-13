/**
 * AgriSense Fusion - Agronomic Intelligence Reporting & Data Export Routes
 * /api/v1/reports
 * Supports consolidated reporting and multi-format exports (CSV, JSON).
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');
const { optionalAuth } = require('../middleware/auth');
const { calculateReferenceET, calculateCropET } = require('../physics/penmanMonteith');
const { calculateTAW, calculateRootZoneDepletion } = require('../physics/waterBalance');

// GET /api/v1/reports/summary
router.get('/summary', optionalAuth, (req, res) => {
  const requestedFarmId = req.query.farm_id;
  const requestedFieldId = req.query.field_id;
  const farmId = requestedFarmId || 'farm-barind-01';

  const farm = storage.getFarmById(farmId, req.user);
  if (!farm) {
    return res.status(404).json({
      success: false,
      error: 'FARM_NOT_FOUND_OR_DENIED',
      message: 'Farm not found or access denied.'
    });
  }

  let field;
  if (requestedFieldId) {
    field = storage.getFieldById(requestedFieldId, req.user);
    if (!field || (requestedFarmId && field.farm_id !== farm.id)) {
      return res.status(404).json({
        success: false,
        error: 'FIELD_NOT_FOUND_OR_DENIED',
        message: 'Field not found or access denied.'
      });
    }
  } else {
    const farmFields = storage.getFieldsByFarm(farm.id, req.user);
    field = farmFields.find((f) => f.id === 'field-godagari-a') || farmFields[0];
    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'FIELD_NOT_FOUND',
        message: 'No accessible fields found for this farm.'
      });
    }
  }
  const reading = storage.getLatestReading(field.id) || {
    soil_moisture_vwc: 0.224,
    soil_temp_c: 26.8,
    air_temp_c: 29.5,
    relative_humidity_pct: 74.2,
    soil_ph: 6.4,
    is_simulated: true
  };

  const weatherRecords = storage.getWeatherRecords(10);
  const latestWeather = weatherRecords.length > 0 ? weatherRecords[weatherRecords.length - 1] : {
    t_max: 30.5,
    t_min: 18.2,
    rainfall: 0.0,
    humidity: 68.0,
    wind_speed: 2.1,
    solar_radiation: 16.5
  };

  const et0Res = calculateReferenceET({
    tMean: ((latestWeather.t_max || 30.5) + (latestWeather.t_min || 18.2)) / 2,
    tMax: latestWeather.t_max || 30.5,
    tMin: latestWeather.t_min || 18.2,
    rhMean: latestWeather.humidity || 68.0,
    solarRadiationMJ: latestWeather.solar_radiation || 16.5,
    windSpeed10m: latestWeather.wind_speed || 2.1,
    elevationM: farm.elevation_m || 28.0
  });

  const cropKc = 1.05;
  const cropEtRes = calculateCropET(et0Res.et0, cropKc);
  const taw = calculateTAW(field.theta_fc, field.theta_wp, field.root_depth_m);
  const depletionRes = calculateRootZoneDepletion(field.theta_fc, reading.soil_moisture_vwc, field.root_depth_m, taw);

  const diseases = storage.getDiseases('Rice').slice(0, 3);
  const groundwater = storage.getGroundwater(farm.id);
  const satelliteMeta = storage.getSatelliteMetadata();

  const report = {
    report_id: `REP-AGRI-${Date.now()}`,
    generated_at: new Date().toISOString(),
    challenge: 'NASA Space Apps Challenge 2026: Field Shift',
    farm: {
      name: farm.name,
      district: farm.district,
      upazila: farm.upazila,
      coordinates: `${farm.latitude}°N, ${farm.longitude}°E`
    },
    field: {
      name: field.name,
      area_hectares: Math.round((field.area_m2 / 10000) * 100) / 100,
      soil_type: field.soil_type_label,
      current_crop: field.current_crop
    },
    satellite_intelligence: {
      model_accuracy: satelliteMeta.verified_performance?.block_c_holdout_overall_accuracy || 85.77,
      pure_interior_accuracy: satelliteMeta.verified_performance?.block_c_pure_interior_accuracy || 90.64,
      boundary_mixed_accuracy: satelliteMeta.verified_performance?.block_c_boundary_mixed_accuracy || 75.92,
      classification: 'Cropland (High Confidence)'
    },
    weather_and_climate: {
      source: 'NASA POWER Daily Point (24.3636°N, 88.6241°E, ~34.8 km ESE of Godagari)',
      t_max: latestWeather.t_max,
      t_min: latestWeather.t_min,
      humidity: latestWeather.humidity,
      rainfall_mm: latestWeather.rainfall,
      consecutive_dry_days: latestWeather.consecutive_dry_days || 0
    },
    physics_water_balance: {
      model: 'FAO-56 Penman-Monteith (Full Parity)',
      reference_et0_mm_day: et0Res.et0,
      crop_etc_mm_day: cropEtRes.etc,
      soil_taw_mm: taw,
      current_depletion_mm: depletionRes.depletionMm,
      depletion_percentage: depletionRes.depletionPct,
      irrigation_status: depletionRes.waterStatus
    },
    in_situ_soil_telemetry: {
      soil_moisture_vwc: reading.soil_moisture_vwc,
      soil_temp_c: reading.soil_temp_c,
      soil_ph: reading.soil_ph,
      is_simulated: true,
      calibration_status: 'UNCALIBRATED',
      provenance: 'Simulated ESP32/FDR Prototype — Uncalibrated'
    },
    disease_screening: diseases.map((d) => ({
      name: d.disease_name,
      scientific_name: d.scientific_name,
      management_practice: d.management?.cultural_control || 'Standard phytosanitary sanitation'
    })),
    aquifer_sustainability: {
      well_identifier: groundwater[0]?.well_identifier || 'DTW-BMDA-GODAGARI-42',
      depth_to_groundwater_m: groundwater[0]?.depth_below_surface_m || 26.4,
      critical_threshold_m: 28.0,
      annual_drawdown_rate_m: 0.65,
      warning_level: groundwater[0]?.warning_level || 'warning',
      is_simulated: true,
      provenance: 'Synthetic proxy derived from published BMDA trendlines'
    },
    executive_recommendation: {
      action: 'Explore water-saving pulse/oilseed relay sequences (Mustard / Lentil) in provisional MCDA simulations.',
      rationale: 'Provisional scenario modeling compares pulse/oilseed sequences against high-demand Boro rice under local crop coefficients; field-level water savings vary with soils, rainfall, and irrigation efficiency and require local agronomic validation.'
    }
  };

  res.json({ success: true, report });
});

// CSV Export Generator Helper (Multi-tenant scoped for sensor telemetry)
function generateCsvExport(type, res, userContext = null, fieldId = null) {
  if (type === 'telemetry' || type === 'sensor') {
    if (fieldId && !storage.getFieldById(fieldId, userContext)) {
      return res.status(404).json({ success: false, error: 'FIELD_NOT_FOUND_OR_DENIED' });
    }
    const accessibleIds = new Set(storage.getFields(userContext).map((f) => f.id));
    const readings = (storage.state?.readings || [])
      .filter((r) => (fieldId ? r.field_id === fieldId : accessibleIds.has(r.field_id)))
      .slice(-100)
      .reverse();
    const headers = 'event_id,observed_at,soil_moisture_vwc,soil_temp_c,air_temp_c,relative_humidity_pct,soil_ph,is_simulated\n';
    const rows = readings.map((r) => 
      `${r.event_id},${r.observed_at},${r.soil_moisture_vwc},${r.soil_temp_c},${r.air_temp_c},${r.relative_humidity_pct},${r.soil_ph},${r.is_simulated}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="godagari_sensor_readings.csv"');
    return res.send(headers + rows);
  }

  // Default: weather
  const records = storage.getWeatherRecords(100);
  const headers = 'date,t_max,t_min,rainfall,humidity,wind_speed,solar_radiation,vpd_kpa,consecutive_dry_days\n';
  const rows = records.map((r) => 
    `${r.date},${r.t_max},${r.t_min},${r.rainfall},${r.humidity},${r.wind_speed},${r.solar_radiation},${r.vpd_kpa},${r.consecutive_dry_days}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="godagari_weather_archive.csv"');
  return res.send(headers + rows);
}

// GET /api/v1/reports/export/csv
router.get('/export/csv', optionalAuth, (req, res) => {
  return generateCsvExport(req.query.type, res, req.user, req.query.field_id || null);
});

// GET /api/v1/reports/export (Supports ?format=csv and ?format=json)
router.get('/export', optionalAuth, (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();
  const type = req.query.type || 'weather';
  const requestedFieldId = req.query.field_id || null;

  if (format === 'csv') {
    return generateCsvExport(type, res, req.user, requestedFieldId);
  }

  // JSON export (multi-tenant scoped for sensor telemetry)
  if (type === 'telemetry' || type === 'sensor') {
    if (requestedFieldId && !storage.getFieldById(requestedFieldId, req.user)) {
      return res.status(404).json({ success: false, error: 'FIELD_NOT_FOUND_OR_DENIED' });
    }
    const accessibleIds = new Set(storage.getFields(req.user).map((f) => f.id));
    const readings = (storage.state?.readings || [])
      .filter((r) => (requestedFieldId ? r.field_id === requestedFieldId : accessibleIds.has(r.field_id)))
      .slice(-100)
      .reverse();
    return res.json({ success: true, count: readings.length, type: 'sensor_telemetry', is_simulated: true, readings });
  }

  const weather = storage.getWeatherRecords(100);
  return res.json({ success: true, count: weather.length, type: 'weather_archive', weather });
});

module.exports = router;
